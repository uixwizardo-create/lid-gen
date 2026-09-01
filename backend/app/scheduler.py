import asyncio
import logging
import uuid
from datetime import datetime, timezone, timedelta
from sqlalchemy.future import select

from app.database import async_session, ScrapeSchedule, SearchSession
from app.router import run_scraper_task, progress_queues

from app.config import settings

logger = logging.getLogger("Scheduler")

async def scheduler_loop():
    logger.info("Scheduler loop started.")
    while True:
        try:
            now_dt = datetime.now(timezone.utc)
            now_str = now_dt.isoformat()
            
            async with async_session() as db:
                stmt = select(ScrapeSchedule).where(
                    ScrapeSchedule.is_active == 1
                )
                result = await db.execute(stmt)
                all_active = result.scalars().all()
                
                schedules = []
                for s in all_active:
                    if s.next_run:
                        try:
                            next_run_str = s.next_run
                            if next_run_str.endswith('Z'):
                                next_run_str = next_run_str[:-1] + '+00:00'
                            next_run_dt = datetime.fromisoformat(next_run_str)
                            
                            # Ensure both datetimes are timezone-aware or unaware
                            if next_run_dt.tzinfo is None:
                                next_run_dt = next_run_dt.replace(tzinfo=timezone.utc)
                                
                            if next_run_dt <= now_dt:
                                schedules.append(s)
                        except Exception as e:
                            logger.error(f"Error parsing next_run '{s.next_run}' for schedule {s.id}: {e}")
                            # Fallback to run it in case of corruption
                            schedules.append(s)
                
                for schedule in schedules:
                    logger.info(f"Triggering scheduled scraper for keyword: '{schedule.keyword}', location: '{schedule.location}' (Schedule ID: {schedule.id})")
                    
                    # Generate a fresh uuid session ID
                    session_id = str(uuid.uuid4())
                    
                    # Create a new SearchSession in SQLite
                    new_session = SearchSession(
                        id=session_id,
                        keyword=schedule.keyword,
                        location=schedule.location,
                        status="running",
                        total_leads=0
                    )
                    db.add(new_session)
                    
                    # Update last_run and calculate next_run
                    schedule.last_run = now_str
                    
                    # Calculate next_run based on interval_type
                    if schedule.interval_type == "daily":
                        next_dt = now_dt + timedelta(days=1)
                    elif schedule.interval_type == "weekly":
                        next_dt = now_dt + timedelta(days=7)
                    elif schedule.interval_type == "monthly":
                        next_dt = now_dt + timedelta(days=30)
                    elif schedule.interval_type == "minute":
                        next_dt = now_dt + timedelta(minutes=2)
                    else:
                        next_dt = now_dt + timedelta(days=1)  # fallback
                        
                    schedule.next_run = next_dt.isoformat()
                    
                    # Initialize progress queues for real-time SSE streaming support
                    progress_queues[session_id] = []
                    
                    # Spawn the background worker task run_scraper_task
                    asyncio.create_task(
                        run_scraper_task(
                            session_id=session_id,
                            keyword=schedule.keyword,
                            location=schedule.location,
                            limit=schedule.limit,
                            db_session_factory=async_session
                        )
                    )
                
                # Commit updates to schedules and the new sessions
                if schedules:
                    await db.commit()
                    
        except Exception as e:
            logger.error(f"Error in scheduler loop: {e}", exc_info=True)
            
        await asyncio.sleep(settings.SCHEDULER_POLL_INTERVAL_SEC)
