import csv
import io
import re
import uuid
import asyncio
import logging
import os
import json
import urllib.request
import time
import base64
from pathlib import Path
from typing import Dict, List, Optional
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, Response
from fastapi.responses import StreamingResponse
from sqlalchemy.future import select
from sqlalchemy import and_, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError

from datetime import datetime, timezone
import smtplib
import random
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from urllib.parse import quote_plus, urlparse, urlencode
from app.database import get_db, SearchSession, Lead, init_db, SMTPSettings, ScrapeSchedule, GoogleCredentials
from app.schemas import (
    ScrapeRequest,
    SearchSessionResponse,
    LeadResponse,
    PitchRequest,
    SMTPSettingsCreate,
    SMTPSettingsResponse,
    SendEmailRequest,
    CampaignRequest,
    ScrapeScheduleCreate,
    ScrapeScheduleUpdate,
    ScrapeScheduleResponse,
    GoogleCredentialsCreate,
    GoogleCredentialsResponse,
    AICommandRequest,
    AICommandResponse,
    GoogleSheetsExportRequest,
    GmailCampaignRequest
)
from app.scraper import scrape_google_maps
from app.config import settings

logger = logging.getLogger("APIRouter")
router = APIRouter(prefix="/api")

# In-memory progress queues for real-time SSE streaming
progress_queues: Dict[str, List[asyncio.Queue]] = {}

async def broadcast_progress(session_id: str, message: str) -> None:
    """Broadcasts a progress message to all connected clients for a session."""
    if session_id in progress_queues:
        for q in progress_queues[session_id]:
            try:
                q.put_nowait(message)
            except Exception:
                pass

async def run_scraper_task(
    session_id: str,
    keyword: str,
    location: str,
    limit: int,
    skip_previous: bool,
    db_session_factory,
    required_fields: Optional[List[str]] = None,
):
    """Background task runner for scraping and saving to the database."""
    try:
        async def progress_callback(msg: str) -> None:
            await broadcast_progress(session_id, msg)
            logger.info(f"Session {session_id}: {msg}")

        exclude_names = set()
        if skip_previous:
            async with db_session_factory() as db:
                stmt = select(Lead.name).join(SearchSession).where(
                    SearchSession.keyword == keyword,
                    SearchSession.location == location
                )
                res = await db.execute(stmt)
                exclude_names = set(res.scalars().all())
                if exclude_names:
                    await progress_callback(f"[PHASE:EXCLUDE] Found {len(exclude_names)} previously extracted leads to skip during search.")

        # Start extraction
        leads = await scrape_google_maps(
            keyword, location, limit, progress_callback,
            exclude_names=exclude_names,
            required_fields=required_fields or [],
        )
        
        # Save leads to the DB using a fresh session
        async with db_session_factory() as db:
            # Update session status
            stmt = select(SearchSession).where(SearchSession.id == session_id)
            result = await db.execute(stmt)
            session = result.scalar_one_or_none()
            
            if session:
                session.status = "running"
                await db.commit()

            # Insert leads dynamically and handle duplicates
            saved_count = 0
            for lead_data in leads:
                db_lead = Lead(
                    session_id=session_id,
                    name=lead_data["name"],
                    phone=lead_data["phone"],
                    address=lead_data["address"],
                    rating=lead_data["rating"],
                    website=lead_data["website"],
                    website_tech=lead_data.get("website_tech", ""),
                    email=lead_data["email"],
                    email_status=lead_data.get("email_status", "unchecked"),
                    facebook=lead_data.get("facebook"),
                    instagram=lead_data.get("instagram"),
                    linkedin=lead_data.get("linkedin"),
                    youtube=lead_data.get("youtube"),
                    whatsapp=lead_data.get("whatsapp"),
                )
                db.add(db_lead)
                try:
                    await db.commit()
                    saved_count += 1
                except IntegrityError:
                    await db.rollback()
                    # Skip duplicate silently

            # Refresh and complete session status
            result = await db.execute(stmt)
            session = result.scalar_one_or_none()
            if session:
                session.status = "completed"
                session.total_leads = saved_count
                await db.commit()
                
            await progress_callback(f"[PHASE:COMPLETE] Successfully saved {saved_count} unique leads to database.")
            
    except Exception as e:
        logger.error(f"Error in background scraper task: {e}", exc_info=True)
        await broadcast_progress(session_id, f"ERROR: Scraping failed. Details: {str(e)}")
        # Update session status to failed
        async with db_session_factory() as db:
            stmt = select(SearchSession).where(SearchSession.id == session_id)
            result = await db.execute(stmt)
            session = result.scalar_one_or_none()
            if session:
                session.status = "failed"
                await db.commit()
    finally:
        # Send terminal signal to close SSE stream
        await broadcast_progress(session_id, "EOF")
        # Clean up queues
        if session_id in progress_queues:
            del progress_queues[session_id]

@router.post("/scrape")
async def start_scrape(
    payload: ScrapeRequest,
    db: AsyncSession = Depends(get_db)
):
    """Initiates a background B2B lead extraction task."""
    session_id = str(uuid.uuid4())
    
    # Save search session record
    new_session = SearchSession(
        id=session_id,
        keyword=payload.keyword,
        location=payload.location,
        status="running",
        total_leads=0
    )
    db.add(new_session)
    await db.commit()
    
    # Initialize progress queues
    progress_queues[session_id] = []
    
    # Import session creator helper for background worker
    from app.database import async_session
    
    # Dispatch directly to native asyncio event loop
    asyncio.create_task(
        run_scraper_task(
            session_id,
            payload.keyword,
            payload.location,
            payload.limit,
            payload.skip_previous if payload.skip_previous is not None else True,
            async_session,
            required_fields=payload.required_fields or [],
        )
    )
    
    return {"session_id": session_id, "message": "Scraping task dispatched successfully"}

@router.get("/progress/{session_id}")
async def get_progress_stream(session_id: str):
    """Streams real-time execution progress logs via Server-Sent Events (SSE)."""
    if session_id not in progress_queues:
        # If queue is not found, it might have finished or hasn't started.
        # Check database to see status
        return Response("Session is inactive or finished", media_type="text/plain")

    async def event_generator():
        q = asyncio.Queue()
        progress_queues[session_id].append(q)
        try:
            while True:
                message = await q.get()
                if message == "EOF":
                    yield "data: EOF\n\n"
                    break
                yield f"data: {message}\n\n"
        except asyncio.CancelledError:
            # Client disconnected
            logger.info(f"Client disconnected from progress stream {session_id}")
        finally:
            if session_id in progress_queues and q in progress_queues[session_id]:
                progress_queues[session_id].remove(q)

    return StreamingResponse(event_generator(), media_type="text/event-stream")

@router.get("/sessions")
async def get_sessions(db: AsyncSession = Depends(get_db)):
    """Retrieves all past searches and statistics."""
    stmt = select(SearchSession).order_by(SearchSession.created_at.desc())
    result = await db.execute(stmt)
    sessions = result.scalars().all()
    return sessions

def parse_advanced_query(query_str: str) -> dict:
    """
    Google Cloud AIP-160 inspired tokenized query parser.
    Supports: has:email, has:phone, has:website, rating>=4.5, rating>4,
              tech:wordpress, domain:gmail, free text terms
    """
    directives = {
        "text_terms": [],
        "has_email": None,
        "has_phone": None,
        "has_website": None,
        "min_rating": None,
        "rating_op": ">=",
        "technologies": [],
        "domain": None,
    }
    if not query_str or not query_str.strip():
        return directives

    # Tokenize: key:value pairs, quoted strings, rating operators, bare words
    token_re = re.compile(
        r'(?:rating\s*([><=!]+)\s*([\d.]+))'
        r'|(\w+):(\S+)'
        r'|"([^"]+)"'
        r'|(\S+)'
    )

    for m in token_re.finditer(query_str):
        if m.group(1) and m.group(2):  # rating operator
            directives["rating_op"] = m.group(1).strip()
            directives["min_rating"] = float(m.group(2))
        elif m.group(3) and m.group(4):  # key:value token
            key = m.group(3).lower()
            val = m.group(4).lower()
            if key == "has":
                if val == "email":
                    directives["has_email"] = True
                elif val == "phone":
                    directives["has_phone"] = True
                elif val == "website":
                    directives["has_website"] = True
            elif key == "tech":
                directives["technologies"].append(val)
            elif key == "domain":
                directives["domain"] = val
            elif key == "rating":
                # handles rating:4.5 shorthand
                try:
                    directives["min_rating"] = float(val)
                except ValueError:
                    pass
            else:
                # Unknown key:value, treat as free text
                directives["text_terms"].append(m.group(3) + ":" + m.group(4))
        elif m.group(5):  # quoted string
            directives["text_terms"].append(m.group(5))
        elif m.group(6):  # bare word
            directives["text_terms"].append(m.group(6))

    return directives


def apply_search_directives(stmt, directives: dict):
    """Apply parsed query directives as SQLAlchemy filter clauses."""
    # Rating filter with operator support
    if directives["min_rating"] is not None:
        op = directives["rating_op"]
        if op in (">=", "=", "=="):
            stmt = stmt.where(Lead.rating >= directives["min_rating"])
        elif op == ">":
            stmt = stmt.where(Lead.rating > directives["min_rating"])
        elif op == "<=":
            stmt = stmt.where(Lead.rating <= directives["min_rating"])
        elif op == "<":
            stmt = stmt.where(Lead.rating < directives["min_rating"])

    # Boolean presence filters
    if directives["has_email"]:
        stmt = stmt.where(Lead.email.isnot(None)).where(Lead.email != "")
    if directives["has_phone"]:
        stmt = stmt.where(Lead.phone.isnot(None)).where(Lead.phone != "")
    if directives["has_website"]:
        stmt = stmt.where(Lead.website.isnot(None)).where(Lead.website != "")

    # Technology stack filter
    for tech in directives["technologies"]:
        stmt = stmt.where(Lead.website_tech.ilike(f"%{tech}%"))

    # Domain filter
    if directives["domain"]:
        stmt = stmt.where(
            or_(
                Lead.website.ilike(f"%{directives['domain']}%"),
                Lead.email.ilike(f"%{directives['domain']}%")
            )
        )

    # Free text terms (OR across name, phone, address, email, website)
    for term in directives["text_terms"]:
        like_pat = f"%{term}%"
        stmt = stmt.where(
            or_(
                Lead.name.ilike(like_pat),
                Lead.phone.ilike(like_pat),
                Lead.address.ilike(like_pat),
                Lead.email.ilike(like_pat),
                Lead.website.ilike(like_pat),
            )
        )

    return stmt


@router.get("/leads")
async def get_leads(
    session_id: Optional[str] = None,
    search: Optional[str] = None,
    has_email: Optional[bool] = None,
    has_website: Optional[bool] = None,
    min_rating: Optional[float] = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=25, ge=1, le=100),
    db: AsyncSession = Depends(get_db)
):
    """Retrieves leads with searching, pagination, and filtering."""
    stmt = select(Lead)
    
    # Apply filters
    if session_id:
        stmt = stmt.where(Lead.session_id == session_id)
        
    if search:
        directives = parse_advanced_query(search)
        stmt = apply_search_directives(stmt, directives)
        
    if has_email:
        stmt = stmt.where(Lead.email.isnot(None)).where(Lead.email != "")
    if has_website:
        stmt = stmt.where(Lead.website.isnot(None)).where(Lead.website != "")
    if min_rating is not None:
        stmt = stmt.where(Lead.rating >= min_rating)
        
    # Get total count for metadata using optimized SQL count
    from sqlalchemy import func
    count_stmt = select(func.count(Lead.id))
    if session_id:
        count_stmt = count_stmt.where(Lead.session_id == session_id)
    if search:
        count_stmt = apply_search_directives(count_stmt, parse_advanced_query(search))
    if has_email:
        count_stmt = count_stmt.where(Lead.email.isnot(None)).where(Lead.email != "")
    if has_website:
        count_stmt = count_stmt.where(Lead.website.isnot(None)).where(Lead.website != "")
    if min_rating is not None:
        count_stmt = count_stmt.where(Lead.rating >= min_rating)
    
    result_count = await db.execute(count_stmt)
    total_count = result_count.scalar() or 0
    
    # Apply sorting and pagination
    stmt = stmt.order_by(Lead.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(stmt)
    leads = result.scalars().all()
    
    return {
        "leads": leads,
        "page": page,
        "page_size": page_size,
        "total_count": total_count,
        "total_pages": (total_count + page_size - 1) // page_size
    }

@router.get("/export")
async def export_leads(
    session_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Exports all scraped leads for a session to a clean CSV download file."""
    # Verify session
    session_stmt = select(SearchSession).where(SearchSession.id == session_id)
    session_result = await db.execute(session_stmt)
    session = session_result.scalar_one_or_none()
    
    if not session:
        raise HTTPException(status_code=404, detail="Search session not found")
        
    stmt = select(Lead).where(Lead.session_id == session_id).order_by(Lead.created_at.desc())
    result = await db.execute(stmt)
    leads = result.scalars().all()
    
    # Write CSV content to a string buffer
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Write header
    writer.writerow(["Business Name", "Phone", "Address", "Rating", "Website URL", "Website Tech", "Scraped Email", "Email Status", "Facebook URL", "Instagram URL", "LinkedIn URL", "YouTube URL"])
    
    # Write rows
    for lead in leads:
        writer.writerow([
            lead.name,
            lead.phone or "",
            lead.address or "",
            lead.rating if lead.rating is not None else "",
            lead.website or "",
            lead.website_tech or "",
            lead.email or "",
            lead.email_status or "unchecked",
            lead.facebook or "",
            lead.instagram or "",
            lead.linkedin or "",
            lead.youtube or ""
        ])
    
    # Prepare response headers
    output.seek(0)
    filename = f"leads_{session.keyword.replace(' ', '_')}_{session.location.replace(' ', '_')}.csv"
    
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode("utf-8")),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@router.delete("/sessions/{session_id}")
async def delete_session(
    session_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Deletes a historical search session and all its associated leads."""
    stmt = select(SearchSession).where(SearchSession.id == session_id)
    result = await db.execute(stmt)
    session = result.scalar_one_or_none()
    
    if not session:
        raise HTTPException(status_code=404, detail="Search session not found")
        
    await db.delete(session)
    await db.commit()
    return {"message": "Session deleted successfully"}

def get_env_variable(key: str) -> Optional[str]:
    # Check OS env first
    val = os.environ.get(key)
    if val:
        return val
    # Otherwise check .env file in the backend root
    env_path = Path(__file__).resolve().parent.parent / ".env"
    if env_path.exists():
        try:
            with open(env_path, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if not line or line.startswith("#"):
                        continue
                    if "=" in line:
                        k, v = line.split("=", 1)
                        if k.strip() == key:
                            v_val = v.strip()
                            # Strip outer quotes if present
                            if (v_val.startswith('"') and v_val.endswith('"')) or (v_val.startswith("'") and v_val.endswith("'")):
                                v_val = v_val[1:-1]
                            return v_val
        except Exception as e:
            logger.error(f"Error reading .env file: {e}", exc_info=True)
    return None

def generate_heuristics_pitch(lead_name, category, location, rating, website_tech, product_desc):
    subject = f"Outreach for {lead_name} regarding your B2B growth in {location}"
    tech_tags = [t.strip() for t in website_tech.split(",")] if website_tech else []
    if "WordPress" in tech_tags or "Elementor" in tech_tags:
        tech_mention = "I noticed you are currently using WordPress/Elementor for your site. We specialize in speed-optimizing WordPress platforms."
    elif "Shopify" in tech_tags or "WooCommerce" in tech_tags:
        tech_mention = "I saw you run an e-commerce platform with Shopify/WooCommerce. We specialize in cart checkout optimization to increase sales."
    else:
        tech_mention = "I reviewed your website and would love to discuss modernizing your landing page architecture for higher conversion rates."
        
    rating_mention = ""
    if rating and rating >= 4.5:
        rating_mention = f"Congratulations on your impressive {rating}-star rating on Google Maps! It's clear your customers love your service."
    elif rating and rating < 4.0:
        rating_mention = f"I noticed some customer feedback online. We can help you implement automated review capture systems to improve your online presence."
    else:
        rating_mention = "You have a solid foundation in the local search listings."
        
    body = f"Hi there,\n\n{rating_mention}\n\n{tech_mention}\n\nWe help businesses like yours scale their operations with tailored {product_desc}. I'd love to jump on a quick 10-minute call this Thursday to show you how we can help {lead_name} acquire more clients.\n\nBest regards,\nOutbound Sales Team"
    return {"subject": subject, "body": body}

@router.post("/leads/{lead_id}/pitch")
async def generate_lead_pitch(
    lead_id: int,
    payload: PitchRequest,
    db: AsyncSession = Depends(get_db)
):
    # Fetch the lead by ID. If missing, return 404.
    lead_stmt = select(Lead).where(Lead.id == lead_id)
    lead_result = await db.execute(lead_stmt)
    lead = lead_result.scalar_one_or_none()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    # Fetch the lead's session to resolve the location and keyword.
    session_stmt = select(SearchSession).where(SearchSession.id == lead.session_id)
    session_result = await db.execute(session_stmt)
    session = session_result.scalar_one_or_none()
    
    pitch = await build_pitch_for_lead(lead, session, payload.product_desc)

    # Serialize the subject and body as JSON text and save it to the lead's sales_pitch column, then commit.
    pitch_str = json.dumps(pitch)
    lead.sales_pitch = pitch_str
    await db.commit()

    return pitch

async def build_pitch_for_lead(lead: Lead, session: Optional[SearchSession], product_desc: str) -> dict:
    # Check if GEMINI_API_KEY is present.
    api_key = get_env_variable("GEMINI_API_KEY")
    pitch = None

    if api_key:
        try:
            # Call the Gemini REST API with standard urllib.request
            prompt_text = (
                f"You are an outbound sales representative. Write a highly converting B2B sales email pitch.\n\n"
                f"Context about the lead:\n"
                f"- Name: {lead.name}\n"
                f"- Location: {session.location if session else 'Local'}\n"
                f"- Keyword/Category: {session.keyword if session else 'B2B'}\n"
                f"- Rating: {lead.rating if lead.rating is not None else 'N/A'}\n"
                f"- Website Technology: {lead.website_tech if lead.website_tech else 'Unknown'}\n"
                f"- Product/Service offered: {product_desc}\n\n"
                f"You must return the response as a JSON object with two keys:\n"
                f"- \"subject\": The subject line of the email Outreach.\n"
                f"- \"body\": The body content of the email Outreach.\n\n"
                f"Output must be strictly JSON containing only those keys."
            )
            
            url = f"{settings.LLM_API_BASE_URL}/{settings.LLM_MODEL_NAME}:generateContent?key={api_key}"
            req_data = {
                "contents": [{
                    "parts": [{
                        "text": prompt_text
                    }]
                }],
                "generationConfig": {
                    "responseMimeType": "application/json",
                    "responseSchema": {
                        "type": "OBJECT",
                        "properties": {
                            "subject": {"type": "STRING"},
                            "body": {"type": "STRING"}
                        },
                        "required": ["subject", "body"]
                    }
                }
            }
            
            req = urllib.request.Request(
                url,
                data=json.dumps(req_data).encode("utf-8"),
                headers={"Content-Type": "application/json"},
                method="POST"
            )
            
            # Using urllib.request inside a thread pool to avoid blocking the event loop
            def perform_request():
                with urllib.request.urlopen(req, timeout=10) as response:
                    return response.read().decode("utf-8")

            res_body = await asyncio.to_thread(perform_request)
            res_json = json.loads(res_body)
            text_content = res_json["candidates"][0]["content"]["parts"][0]["text"]
            
            # Clean up output string if Gemini wrapped it in markdown code block ticks
            cleaned_text = text_content.strip()
            if cleaned_text.startswith("```"):
                lines = cleaned_text.splitlines()
                if lines[0].startswith("```"):
                    lines = lines[1:]
                if lines[-1].startswith("```"):
                    lines = lines[:-1]
                cleaned_text = "\n".join(lines).strip()

            pitch_json = json.loads(cleaned_text)
            if "subject" in pitch_json and "body" in pitch_json:
                pitch = {
                    "subject": pitch_json["subject"],
                    "body": pitch_json["body"]
                }
            else:
                logger.warning("Gemini JSON response did not contain subject and body keys.")
        except Exception as e:
            logger.error(f"Gemini API pitch generation failed, falling back to heuristics. Error: {e}", exc_info=True)

    if not pitch:
        # Fall back to the heuristics pitch.
        location = session.location if session else "your local area"
        category = session.keyword if session else "services"
        pitch = generate_heuristics_pitch(
            lead_name=lead.name,
            category=category,
            location=location,
            rating=lead.rating,
            website_tech=lead.website_tech,
            product_desc=product_desc
        )

    return pitch

def test_smtp_connection(host, port, username, password, use_tls):
    try:
        server = smtplib.SMTP(host, port, timeout=10)
        server.ehlo()
        if use_tls == 1:
            server.starttls()
            server.ehlo()
        server.login(username, password)
        server.quit()
        return {"status": "success", "message": "Connection verified"}
    except Exception as err:
        return {"status": "error", "message": str(err)}

def send_smtp_email(settings, to_email: str, subject: str, body: str):
    host = settings.host
    port = settings.port
    username = settings.username
    password = settings.password
    sender_email = settings.sender_email
    sender_name = settings.sender_name or ""
    use_tls = settings.use_tls

    msg = MIMEMultipart()
    msg["From"] = f"{sender_name} <{sender_email}>" if sender_name else sender_email
    msg["To"] = to_email
    msg["Subject"] = subject
    msg.attach(MIMEText(body, "plain", "utf-8"))

    server = smtplib.SMTP(host, port, timeout=15)
    server.ehlo()
    if use_tls == 1:
        server.starttls()
        server.ehlo()
    server.login(username, password)
    server.send_message(msg)
    server.quit()

async def run_campaign_task(lead_ids: list[int], product_desc: str, db_session_factory):
    # 1. Retrieve SMTPSettings
    async with db_session_factory() as db:
        smtp_stmt = select(SMTPSettings)
        smtp_result = await db.execute(smtp_stmt)
        settings_db = smtp_result.scalars().first()
        if not settings_db:
            logger.error("Campaign failed: SMTP settings not configured")
            # Update all leads in this campaign to failed
            for lead_id in lead_ids:
                lead_stmt = select(Lead).where(Lead.id == lead_id)
                lead_result = await db.execute(lead_stmt)
                lead = lead_result.scalar_one_or_none()
                if lead:
                    lead.email_sent_status = "failed"
                    lead.email_sent_error = "SMTP settings not configured"
                    lead.email_sent_at = datetime.now(timezone.utc).isoformat()
            await db.commit()
            return
        
        # Extract configuration to a simple class/dict to avoid session detachment issues
        class SMTPConfig:
            def __init__(self, host, port, username, password, sender_email, sender_name, use_tls):
                self.host = host
                self.port = port
                self.username = username
                self.password = password
                self.sender_email = sender_email
                self.sender_name = sender_name
                self.use_tls = use_tls
        
        settings = SMTPConfig(
            host=settings_db.host,
            port=settings_db.port,
            username=settings_db.username,
            password=settings_db.password,
            sender_email=settings_db.sender_email,
            sender_name=settings_db.sender_name,
            use_tls=settings_db.use_tls
        )

    # Loop through lead_ids
    for lead_id in lead_ids:
        async with db_session_factory() as db:
            # Fetch lead
            lead_stmt = select(Lead).where(Lead.id == lead_id)
            lead_result = await db.execute(lead_stmt)
            lead = lead_result.scalar_one_or_none()
            if not lead:
                continue
            
            # Update lead status in SQLite to "pending"
            lead.email_sent_status = "pending"
            await db.commit()
        
        # Fetch lead again/resolve pitch/dispatch in a try/except
        try:
            async with db_session_factory() as db:
                lead_stmt = select(Lead).where(Lead.id == lead_id)
                lead_result = await db.execute(lead_stmt)
                lead = lead_result.scalar_one_or_none()
                if not lead:
                    continue
                
                if not lead.email:
                    lead.email_sent_status = "failed"
                    lead.email_sent_error = "Lead has no email address"
                    lead.email_sent_at = datetime.now(timezone.utc).isoformat()
                    await db.commit()
                    continue
                
                # Resolves the lead's pitch
                pitch_data = None
                if lead.sales_pitch:
                    try:
                        pitch_data = json.loads(lead.sales_pitch)
                    except Exception:
                        pass
                
                if not pitch_data:
                    # Fetch session safely
                    session_stmt = select(SearchSession).where(SearchSession.id == lead.session_id)
                    session_result = await db.execute(session_stmt)
                    session = session_result.scalar_one_or_none()
                    
                    # Generate pitch safely using build_pitch_for_lead
                    pitch_data = await build_pitch_for_lead(lead, session, product_desc)
                    lead.sales_pitch = json.dumps(pitch_data)
                    await db.commit()
                
                subject = pitch_data.get("subject")
                body = pitch_data.get("body")
                
                # Dispatch via SMTP helper
                await asyncio.to_thread(send_smtp_email, settings, lead.email, subject, body)
                
                # Saves result in database
                lead.email_sent_status = "sent"
                lead.email_sent_at = datetime.now(timezone.utc).isoformat()
                lead.email_sent_error = None
                await db.commit()
        except Exception as e:
            logger.error(f"Failed to send campaign email to lead {lead_id}: {e}", exc_info=True)
            async with db_session_factory() as db:
                lead_stmt = select(Lead).where(Lead.id == lead_id)
                lead_result = await db.execute(lead_stmt)
                lead = lead_result.scalar_one_or_none()
                if lead:
                    lead.email_sent_status = "failed"
                    lead.email_sent_at = datetime.now(timezone.utc).isoformat()
                    lead.email_sent_error = str(e)
                    await db.commit()
        
        # Introduce a random delay of 3 to 7 seconds between sends
        delay = random.randint(3, 7)
        await asyncio.sleep(delay)

@router.get("/settings/smtp", response_model=Optional[SMTPSettingsResponse])
async def get_smtp_settings(db: AsyncSession = Depends(get_db)):
    stmt = select(SMTPSettings)
    result = await db.execute(stmt)
    settings = result.scalars().first()
    if settings:
        return {
            "id": settings.id,
            "host": settings.host,
            "port": settings.port,
            "username": settings.username,
            "password": "********" if settings.password else "",
            "sender_email": settings.sender_email,
            "sender_name": settings.sender_name,
            "use_tls": settings.use_tls
        }
    return None

@router.post("/settings/smtp", response_model=SMTPSettingsResponse)
async def save_smtp_settings(payload: SMTPSettingsCreate, db: AsyncSession = Depends(get_db)):
    stmt = select(SMTPSettings)
    result = await db.execute(stmt)
    settings = result.scalars().first()
    
    if settings:
        settings.host = payload.host
        settings.port = payload.port
        settings.username = payload.username
        if payload.password != "********":
            settings.password = payload.password
        settings.sender_email = payload.sender_email
        settings.sender_name = payload.sender_name
        settings.use_tls = payload.use_tls
    else:
        settings = SMTPSettings(
            host=payload.host,
            port=payload.port,
            username=payload.username,
            password=payload.password,
            sender_email=payload.sender_email,
            sender_name=payload.sender_name,
            use_tls=payload.use_tls
        )
        db.add(settings)
    await db.commit()
    await db.refresh(settings)
    
    return {
        "id": settings.id,
        "host": settings.host,
        "port": settings.port,
        "username": settings.username,
        "password": "********" if settings.password else "",
        "sender_email": settings.sender_email,
        "sender_name": settings.sender_name,
        "use_tls": settings.use_tls
    }

@router.post("/settings/smtp/test")
async def test_smtp_settings(payload: SMTPSettingsCreate, db: AsyncSession = Depends(get_db)):
    password_to_test = payload.password
    if password_to_test == "********":
        stmt = select(SMTPSettings)
        result = await db.execute(stmt)
        saved = result.scalars().first()
        if saved:
            password_to_test = saved.password
            
    result = await asyncio.to_thread(
        test_smtp_connection,
        payload.host,
        payload.port,
        payload.username,
        password_to_test,
        payload.use_tls
    )
    return result

@router.post("/leads/{lead_id}/send-email")
async def send_lead_email(
    lead_id: int,
    payload: SendEmailRequest,
    db: AsyncSession = Depends(get_db)
):
    # Fetch lead
    lead_stmt = select(Lead).where(Lead.id == lead_id)
    lead_result = await db.execute(lead_stmt)
    lead = lead_result.scalar_one_or_none()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    if not lead.email:
        raise HTTPException(status_code=400, detail="Lead has no email address")

    # Fetch SMTP settings
    smtp_stmt = select(SMTPSettings)
    smtp_result = await db.execute(smtp_stmt)
    settings = smtp_result.scalars().first()
    if not settings:
        raise HTTPException(status_code=400, detail="SMTP settings not configured")

    # Get or generate pitch
    pitch_data = None
    if lead.sales_pitch:
        try:
            pitch_data = json.loads(lead.sales_pitch)
        except Exception:
            pass
    
    if not pitch_data:
        session_stmt = select(SearchSession).where(SearchSession.id == lead.session_id)
        session_result = await db.execute(session_stmt)
        session = session_result.scalar_one_or_none()
        
        pitch_data = await build_pitch_for_lead(lead, session, payload.product_desc)
        lead.sales_pitch = json.dumps(pitch_data)
        await db.commit()
    
    subject = pitch_data.get("subject")
    body = pitch_data.get("body")

    try:
        await asyncio.to_thread(send_smtp_email, settings, lead.email, subject, body)
        lead.email_sent_status = "sent"
        lead.email_sent_at = datetime.now(timezone.utc).isoformat()
        lead.email_sent_error = None
        await db.commit()
        return {
            "status": "success",
            "email_sent_status": lead.email_sent_status,
            "email_sent_at": lead.email_sent_at,
            "email_sent_error": lead.email_sent_error
        }
    except Exception as e:
        lead.email_sent_status = "failed"
        lead.email_sent_at = datetime.now(timezone.utc).isoformat()
        lead.email_sent_error = str(e)
        await db.commit()
        raise HTTPException(status_code=500, detail=f"Failed to send email: {str(e)}")

@router.post("/campaign/send")
async def start_campaign(
    payload: CampaignRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    from app.database import async_session
    background_tasks.add_task(
        run_campaign_task,
        payload.lead_ids,
        payload.product_desc,
        async_session
    )
    return {"status": "campaign_started", "message": "Campaign is executing in the background"}

@router.get("/schedules", response_model=List[ScrapeScheduleResponse])
async def get_schedules(db: AsyncSession = Depends(get_db)):
    """Retrieves all scraper schedules."""
    stmt = select(ScrapeSchedule).order_by(ScrapeSchedule.created_at.desc())
    result = await db.execute(stmt)
    schedules = result.scalars().all()
    return schedules

@router.post("/schedules", response_model=ScrapeScheduleResponse, status_code=201)
async def create_schedule(
    payload: ScrapeScheduleCreate,
    db: AsyncSession = Depends(get_db)
):
    """Creates a new scheduled / recurring scraper. Run immediately by default."""
    now = datetime.now(timezone.utc).isoformat()
    new_schedule = ScrapeSchedule(
        keyword=payload.keyword,
        location=payload.location,
        limit=payload.limit if payload.limit is not None else 50,
        interval_type=payload.interval_type,
        is_active=1,
        last_run=None,
        next_run=now
    )
    db.add(new_schedule)
    await db.commit()
    await db.refresh(new_schedule)
    return new_schedule

@router.put("/schedules/{schedule_id}", response_model=ScrapeScheduleResponse)
async def update_schedule(
    schedule_id: int,
    payload: ScrapeScheduleUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Updates configuration or status for a scraper schedule."""
    stmt = select(ScrapeSchedule).where(ScrapeSchedule.id == schedule_id)
    result = await db.execute(stmt)
    schedule = result.scalar_one_or_none()
    
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")
        
    if payload.keyword is not None:
        schedule.keyword = payload.keyword
    if payload.location is not None:
        schedule.location = payload.location
    if payload.limit is not None:
        schedule.limit = payload.limit
    if payload.interval_type is not None:
        schedule.interval_type = payload.interval_type
    if payload.is_active is not None:
        schedule.is_active = payload.is_active
        
    await db.commit()
    await db.refresh(schedule)
    return schedule

@router.delete("/schedules/{schedule_id}")
async def delete_schedule(
    schedule_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Deletes a scraper schedule."""
    stmt = select(ScrapeSchedule).where(ScrapeSchedule.id == schedule_id)
    result = await db.execute(stmt)
    schedule = result.scalar_one_or_none()
    
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")
        
    await db.delete(schedule)
    await db.commit()
    return {"message": "Schedule deleted successfully"}

@router.post("/schedules/{schedule_id}/run", response_model=ScrapeScheduleResponse)
async def run_schedule_now(
    schedule_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Manually triggers a scraper schedule to run immediately (within 10s)."""
    stmt = select(ScrapeSchedule).where(ScrapeSchedule.id == schedule_id)
    result = await db.execute(stmt)
    schedule = result.scalar_one_or_none()
    
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")
        
    now = datetime.now(timezone.utc).isoformat()
    schedule.next_run = now
    schedule.is_active = 1  # Re-enable if it was paused
    
    await db.commit()
    await db.refresh(schedule)
    return schedule


# --- Google Credentials settings, OAuth helper & Workspace integration endpoints ---

async def get_valid_google_credentials(db: AsyncSession) -> Optional[GoogleCredentials]:
    stmt = select(GoogleCredentials).limit(1)
    res = await db.execute(stmt)
    creds = res.scalar_one_or_none()
    if not creds:
        return None

    # If access_token is missing or expired, refresh it
    now = int(time.time())
    if not creds.access_token or (creds.expires_at and creds.expires_at - now < 300):
        if creds.refresh_token:
            # Refresh token call
            try:
                payload_data = {
                    "client_id": creds.client_id,
                    "client_secret": creds.client_secret,
                    "refresh_token": creds.refresh_token,
                    "grant_type": "refresh_token"
                }
                data = urlencode(payload_data)
                req = urllib.request.Request(
                    "https://oauth2.googleapis.com/token",
                    data=data.encode("utf-8"),
                    headers={"Content-Type": "application/x-www-form-urlencoded"},
                    method="POST"
                )
                def perform_refresh():
                    with urllib.request.urlopen(req, timeout=10) as response:
                        return response.read().decode("utf-8")

                res_body = await asyncio.to_thread(perform_refresh)
                res_data = json.loads(res_body)
                creds.access_token = res_data.get("access_token")
                if "expires_in" in res_data:
                    creds.expires_at = now + int(res_data["expires_in"])
                await db.commit()
            except Exception as e:
                logger.error(f"Error refreshing Google OAuth token: {e}")
                
    return creds

@router.get("/settings/google-oauth", response_model=Optional[GoogleCredentialsResponse])
async def get_google_oauth_settings(db: AsyncSession = Depends(get_db)):
    """Retrieves the single Google OAuth credentials settings row."""
    stmt = select(GoogleCredentials).limit(1)
    result = await db.execute(stmt)
    settings = result.scalar_one_or_none()
    if settings:
        return {
            "id": settings.id,
            "client_id": settings.client_id,
            "client_secret": "********" if settings.client_secret else "",
            "access_token": settings.access_token,
            "refresh_token": settings.refresh_token,
            "expires_at": settings.expires_at
        }
    return None

@router.post("/settings/google-oauth", response_model=GoogleCredentialsResponse)
async def save_google_oauth_settings(
    payload: GoogleCredentialsCreate,
    db: AsyncSession = Depends(get_db)
):
    """Saves or updates the single Google OAuth credentials settings row."""
    stmt = select(GoogleCredentials).limit(1)
    result = await db.execute(stmt)
    settings = result.scalar_one_or_none()
    
    if settings:
        settings.client_id = payload.client_id
        if payload.client_secret != "********":
            settings.client_secret = payload.client_secret
        if payload.access_token is not None:
            settings.access_token = payload.access_token
        if payload.refresh_token is not None:
            settings.refresh_token = payload.refresh_token
        if payload.expires_at is not None:
            settings.expires_at = payload.expires_at
    else:
        settings = GoogleCredentials(
            client_id=payload.client_id,
            client_secret=payload.client_secret,
            access_token=payload.access_token,
            refresh_token=payload.refresh_token,
            expires_at=payload.expires_at
        )
        db.add(settings)
        
    await db.commit()
    await db.refresh(settings)
    
    return {
        "id": settings.id,
        "client_id": settings.client_id,
        "client_secret": "********" if settings.client_secret else "",
        "access_token": settings.access_token,
        "refresh_token": settings.refresh_token,
        "expires_at": settings.expires_at
    }

from pydantic import BaseModel

class GoogleOAuthCallbackPayload(BaseModel):
    code: str
    redirect_uri: str

@router.post("/settings/google-oauth/callback")
async def google_oauth_callback(
    payload: GoogleOAuthCallbackPayload,
    db: AsyncSession = Depends(get_db)
):
    """Exchanges an authorization code for Google access and refresh tokens."""
    stmt = select(GoogleCredentials).limit(1)
    result = await db.execute(stmt)
    creds = result.scalar_one_or_none()
    if not creds:
        raise HTTPException(
            status_code=400,
            detail="Google OAuth settings are not configured. Please save Client ID and Client Secret in Outreach Settings first."
        )
    
    try:
        payload_data = {
            "code": payload.code,
            "client_id": creds.client_id,
            "client_secret": creds.client_secret,
            "redirect_uri": payload.redirect_uri,
            "grant_type": "authorization_code"
        }
        data = urlencode(payload_data)
        req = urllib.request.Request(
            "https://oauth2.googleapis.com/token",
            data=data.encode("utf-8"),
            headers={"Content-Type": "application/x-www-form-urlencoded"},
            method="POST"
        )
        def perform_exchange():
            with urllib.request.urlopen(req, timeout=15) as response:
                return response.read().decode("utf-8")
        
        res_body = await asyncio.to_thread(perform_exchange)
        res_data = json.loads(res_body)
        
        creds.access_token = res_data.get("access_token")
        if "refresh_token" in res_data:
            creds.refresh_token = res_data["refresh_token"]
        if "expires_in" in res_data:
            creds.expires_at = int(time.time()) + int(res_data["expires_in"])
            
        await db.commit()
        return {"status": "success", "message": "Google account connected successfully"}
    except Exception as e:
        logger.error(f"Google OAuth exchange failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"OAuth exchange failed: {str(e)}")


def optimize_search_keyword(keyword: str) -> str:
    """Normalizes search keywords to prevent Google Maps from returning web agencies when looking for retail/e-commerce shops."""
    kw_lower = keyword.lower().strip()
    if kw_lower in ["top ecommerce site", "ecommerce site", "ecommerce sites", "ecommerce website", "top ecommerce sites"]:
        return "online shopping store"
    elif "ecommerce" in kw_lower and not any(x in kw_lower for x in ["developer", "agency", "development", "company", "software", "service"]):
        return kw_lower.replace("ecommerce site", "online store").replace("ecommerce", "online shopping store")
    return keyword

@router.post("/ai/parse-command", response_model=AICommandResponse)
async def ai_parse_command(payload: AICommandRequest):
    """Parses natural language search instructions using Gemini or regex fallback."""
    api_key = get_env_variable("GEMINI_API_KEY")
    
    if api_key:
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={api_key}"
            req_data = {
                "contents": [{
                    "parts": [{
                        "text": f"Command: {payload.command}"
                    }]
                }],
                "systemInstruction": {
                    "parts": [{
                        "text": "You are an assistant that parses search instructions for a business leads scraper. If the user asks for e-commerce sites or online shops, parse the intent to target actual retail online shopping stores rather than IT agencies. Parse the query and return ONLY a JSON object with keys: 'keyword', 'location', 'limit'. Choose standard defaults (limit: 50) if not specified."
                    }]
                },
                "generationConfig": {
                    "responseMimeType": "application/json",
                    "responseSchema": {
                        "type": "OBJECT",
                        "properties": {
                            "keyword": {"type": "STRING"},
                            "location": {"type": "STRING"},
                            "limit": {"type": "INTEGER"}
                        },
                        "required": ["keyword", "location", "limit"]
                    }
                }
            }
            
            req = urllib.request.Request(
                url,
                data=json.dumps(req_data).encode("utf-8"),
                headers={"Content-Type": "application/json"},
                method="POST"
            )
            
            def perform_request():
                with urllib.request.urlopen(req, timeout=10) as response:
                    return response.read().decode("utf-8")

            res_body = await asyncio.to_thread(perform_request)
            res_json = json.loads(res_body)
            text_content = res_json["candidates"][0]["content"]["parts"][0]["text"]
            
            # Clean up response text if wrapped in markdown code blocks
            cleaned_text = text_content.strip()
            if cleaned_text.startswith("```"):
                lines = cleaned_text.splitlines()
                if lines[0].startswith("```"):
                    lines = lines[1:]
                if lines[-1].startswith("```"):
                    lines = lines[:-1]
                cleaned_text = "\n".join(lines).strip()
            
            parsed = json.loads(cleaned_text)
            if "keyword" in parsed and "location" in parsed and "limit" in parsed:
                return AICommandResponse(
                    keyword=optimize_search_keyword(str(parsed["keyword"])),
                    location=str(parsed["location"]),
                    limit=int(parsed["limit"])
                )
        except Exception as e:
            logger.error(f"Gemini AI parsing failed, falling back to heuristics: {e}", exc_info=True)
            
    # Fallback to Python regex heuristic extraction
    command = payload.command
    
    # 1. Match limit: limit: (\d+) or (\d+) leads or (\d+)
    limit = 50
    limit_match = re.search(r'limit:\s*(\d+)', command, re.IGNORECASE)
    if not limit_match:
        limit_match = re.search(r'(\d+)\s*leads', command, re.IGNORECASE)
    if not limit_match:
        limit_match = re.search(r'\b(\d+)\b', command)
    
    if limit_match:
        limit = int(limit_match.group(1))
        command_clean = command.replace(limit_match.group(0), "")
    else:
        command_clean = command
        
    # 2. Match location: in ([a-zA-Z\s,]+) or near ([a-zA-Z\s,]+)
    location = "New York" # Default location if not specified
    location_match = re.search(r'\bin\s+([a-zA-Z\s,]+)', command_clean, re.IGNORECASE)
    if not location_match:
        location_match = re.search(r'\bnear\s+([a-zA-Z\s,]+)', command_clean, re.IGNORECASE)
        
    if location_match:
        location = location_match.group(1).strip()
        command_clean = command_clean.replace(location_match.group(0), "")
        
    # 3. Match keyword: remaining words
    keyword_clean = re.sub(r'\b(find|search|get|scrape|extract|for)\b', '', command_clean, flags=re.IGNORECASE)
    keyword_clean = re.sub(r'[^\w\s]', '', keyword_clean)
    keyword = " ".join(keyword_clean.split()).strip()
    
    if not keyword:
        keyword = "restaurants"  # standard fallback keyword
        
    return AICommandResponse(keyword=optimize_search_keyword(keyword), location=location, limit=limit)

@router.post("/export/google-sheets")
async def export_to_google_sheets(
    payload: GoogleSheetsExportRequest,
    db: AsyncSession = Depends(get_db)
):
    """Exports specified leads to a Google Sheet (creating one or appending to existing)."""
    creds = await get_valid_google_credentials(db)
    if not creds or not creds.access_token:
        raise HTTPException(status_code=400, detail="Google Account not connected")

    # Fetch leads
    stmt = select(Lead).where(Lead.id.in_(payload.lead_ids))
    result = await db.execute(stmt)
    leads = result.scalars().all()
    if not leads:
        raise HTTPException(status_code=404, detail="No leads found for the provided IDs")

    # Format rows
    rows = []
    for lead in leads:
        rows.append([
            lead.name or "",
            lead.phone or "",
            lead.email or "",
            lead.website or "",
            lead.rating if lead.rating is not None else "",
            lead.address or "",
            lead.website_tech or ""
        ])

    spreadsheet_id = payload.spreadsheet_id
    values_to_append = rows

    try:
        # If spreadsheet_id is not provided, create a new one
        if not spreadsheet_id:
            create_url = "https://sheets.googleapis.com/v4/spreadsheets"
            create_payload = {
                "properties": {
                    "title": payload.spreadsheet_title or "Lid Gen Export"
                }
            }
            req = urllib.request.Request(
                create_url,
                data=json.dumps(create_payload).encode("utf-8"),
                headers={
                    "Authorization": f"Bearer {creds.access_token}",
                    "Content-Type": "application/json"
                },
                method="POST"
            )
            def create_sheet():
                with urllib.request.urlopen(req, timeout=15) as response:
                    return response.read().decode("utf-8")

            res_body = await asyncio.to_thread(create_sheet)
            res_data = json.loads(res_body)
            spreadsheet_id = res_data["spreadsheetId"]

            # Prep header row for new sheet
            header_row = ["Name", "Phone", "Email", "Website", "Rating", "Address", "Tech Stack"]
            values_to_append = [header_row] + rows

        # Append values to spreadsheet
        append_url = f"https://sheets.googleapis.com/v4/spreadsheets/{spreadsheet_id}/values/A1:append?valueInputOption=RAW"
        append_payload = {
            "values": values_to_append
        }
        req_append = urllib.request.Request(
            append_url,
            data=json.dumps(append_payload).encode("utf-8"),
            headers={
                "Authorization": f"Bearer {creds.access_token}",
                "Content-Type": "application/json"
            },
            method="POST"
        )
        def append_values():
            with urllib.request.urlopen(req_append, timeout=15) as response:
                return response.read().decode("utf-8")

        await asyncio.to_thread(append_values)

        return {
            "status": "success",
            "spreadsheet_id": spreadsheet_id,
            "url": f"https://docs.google.com/spreadsheets/d/{spreadsheet_id}"
        }
    except Exception as e:
        logger.error(f"Error exporting to Google Sheets: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Google Sheets export failed: {str(e)}")

@router.post("/leads/{lead_id}/send-gmail")
async def send_lead_gmail(
    lead_id: int,
    payload: SendEmailRequest,
    db: AsyncSession = Depends(get_db)
):
    """Sends a single outreach email to a lead using Google credentials via the Gmail API."""
    creds = await get_valid_google_credentials(db)
    if not creds or not creds.access_token:
        raise HTTPException(status_code=400, detail="Google Account not connected")

    # Fetch lead
    lead_stmt = select(Lead).where(Lead.id == lead_id)
    lead_result = await db.execute(lead_stmt)
    lead = lead_result.scalar_one_or_none()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    if not lead.email:
        raise HTTPException(status_code=400, detail="Lead has no email address")

    # Get or generate pitch
    pitch_data = None
    if lead.sales_pitch:
        try:
            pitch_data = json.loads(lead.sales_pitch)
        except Exception:
            pass
            
    if not pitch_data:
        session_stmt = select(SearchSession).where(SearchSession.id == lead.session_id)
        session_result = await db.execute(session_stmt)
        session = session_result.scalar_one_or_none()
        
        pitch_data = await build_pitch_for_lead(lead, session, payload.product_desc)
        lead.sales_pitch = json.dumps(pitch_data)
        await db.commit()

    subject = pitch_data.get("subject")
    body = pitch_data.get("body")

    try:
        # Build MIMEMessage
        mime_message = MIMEText(body, "plain", "utf-8")
        mime_message["To"] = lead.email
        mime_message["Subject"] = subject
        
        # Encode to URL-safe Base64
        raw_message = base64.urlsafe_b64encode(mime_message.as_bytes()).decode("utf-8")
        
        # Send via Gmail API
        gmail_url = "https://gmail.googleapis.com/v1/users/me/messages/send"
        send_payload = {
            "raw": raw_message
        }
        
        req = urllib.request.Request(
            gmail_url,
            data=json.dumps(send_payload).encode("utf-8"),
            headers={
                "Authorization": f"Bearer {creds.access_token}",
                "Content-Type": "application/json"
            },
            method="POST"
        )
        
        def perform_send():
            with urllib.request.urlopen(req, timeout=15) as response:
                return response.read().decode("utf-8")

        await asyncio.to_thread(perform_send)

        # Update database delivery status
        lead.email_sent_status = "sent"
        lead.email_sent_at = datetime.now(timezone.utc).isoformat()
        lead.email_sent_error = None
        await db.commit()
        
        return {"status": "success"}
    except Exception as e:
        logger.error(f"Gmail send failed for lead {lead_id}: {e}", exc_info=True)
        lead.email_sent_status = "failed"
        lead.email_sent_at = datetime.now(timezone.utc).isoformat()
        lead.email_sent_error = str(e)
        await db.commit()
        raise HTTPException(status_code=500, detail=f"Failed to send email via Gmail: {str(e)}")

async def run_gmail_campaign_task(lead_ids: List[int], product_desc: str, db_session_factory):
    """Background task to send outreach campaigns via the Gmail API with delay loops."""
    # 1. Retrieve and verify Google Credentials first
    async with db_session_factory() as db:
        creds = await get_valid_google_credentials(db)
        if not creds or not creds.access_token:
            logger.error("Gmail Campaign failed: Google Credentials not connected")
            for lead_id in lead_ids:
                lead_stmt = select(Lead).where(Lead.id == lead_id)
                lead_result = await db.execute(lead_stmt)
                lead = lead_result.scalar_one_or_none()
                if lead:
                    lead.email_sent_status = "failed"
                    lead.email_sent_error = "Google Credentials not connected"
                    lead.email_sent_at = datetime.now(timezone.utc).isoformat()
            await db.commit()
            return
            
        access_token = creds.access_token

    # 2. Loop through lead_ids
    for lead_id in lead_ids:
        # Check token and potentially refresh it per iteration to avoid expiration during a long run
        async with db_session_factory() as db:
            creds = await get_valid_google_credentials(db)
            if creds and creds.access_token:
                access_token = creds.access_token
            
            # Fetch lead
            lead_stmt = select(Lead).where(Lead.id == lead_id)
            lead_result = await db.execute(lead_stmt)
            lead = lead_result.scalar_one_or_none()
            if not lead:
                continue
            
            # Update status to pending
            lead.email_sent_status = "pending"
            await db.commit()

        # Fetch lead again/resolve pitch/dispatch in a try/except
        try:
            async with db_session_factory() as db:
                lead_stmt = select(Lead).where(Lead.id == lead_id)
                lead_result = await db.execute(lead_stmt)
                lead = lead_result.scalar_one_or_none()
                if not lead:
                    continue
                
                if not lead.email:
                    lead.email_sent_status = "failed"
                    lead.email_sent_error = "Lead has no email address"
                    lead.email_sent_at = datetime.now(timezone.utc).isoformat()
                    await db.commit()
                    continue

                # Resolves the lead's pitch
                pitch_data = None
                if lead.sales_pitch:
                    try:
                        pitch_data = json.loads(lead.sales_pitch)
                    except Exception:
                        pass
                
                if not pitch_data:
                    # Fetch session safely
                    session_stmt = select(SearchSession).where(SearchSession.id == lead.session_id)
                    session_result = await db.execute(session_stmt)
                    session = session_result.scalar_one_or_none()
                    
                    # Generate pitch safely using build_pitch_for_lead
                    pitch_data = await build_pitch_for_lead(lead, session, product_desc)
                    lead.sales_pitch = json.dumps(pitch_data)
                    await db.commit()
                
                subject = pitch_data.get("subject")
                body = pitch_data.get("body")
                
                # Build MIMEMessage
                mime_message = MIMEText(body, "plain", "utf-8")
                mime_message["To"] = lead.email
                mime_message["Subject"] = subject
                
                # Encode to URL-safe Base64
                raw_message = base64.urlsafe_b64encode(mime_message.as_bytes()).decode("utf-8")
                
                # Send via Gmail API
                gmail_url = "https://gmail.googleapis.com/v1/users/me/messages/send"
                send_payload = {
                    "raw": raw_message
                }
                
                req = urllib.request.Request(
                    gmail_url,
                    data=json.dumps(send_payload).encode("utf-8"),
                    headers={
                        "Authorization": f"Bearer {access_token}",
                        "Content-Type": "application/json"
                    },
                    method="POST"
                )
                
                def perform_send():
                    with urllib.request.urlopen(req, timeout=15) as response:
                        return response.read().decode("utf-8")

                await asyncio.to_thread(perform_send)
                
                # Saves result in database
                lead.email_sent_status = "sent"
                lead.email_sent_at = datetime.now(timezone.utc).isoformat()
                lead.email_sent_error = None
                await db.commit()
        except Exception as e:
            logger.error(f"Failed to send Gmail campaign email to lead {lead_id}: {e}", exc_info=True)
            async with db_session_factory() as db:
                lead_stmt = select(Lead).where(Lead.id == lead_id)
                lead_result = await db.execute(lead_stmt)
                lead = lead_result.scalar_one_or_none()
                if lead:
                    lead.email_sent_status = "failed"
                    lead.email_sent_at = datetime.now(timezone.utc).isoformat()
                    lead.email_sent_error = str(e)
                    await db.commit()
        
        # Introduce a random delay of 3 to 7 seconds between sends
        delay = random.randint(3, 7)
        await asyncio.sleep(delay)

@router.post("/campaign/send-gmail")
async def start_gmail_campaign(
    payload: GmailCampaignRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    """Triggers background outreach via Gmail API for multiple leads."""
    from app.database import async_session
    background_tasks.add_task(
        run_gmail_campaign_task,
        payload.lead_ids,
        payload.product_desc,
        async_session
    )
    return {"status": "campaign_started", "message": "Gmail Campaign is executing in the background"}

