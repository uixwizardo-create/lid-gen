import asyncio
import re
import random
import logging
from typing import Optional, List, Dict, Any, Callable, Awaitable
from urllib.parse import quote_plus, urlparse
from playwright.async_api import async_playwright, Page, BrowserContext, Route
from app.verifier import verify_email_deliverability
from app.tech_detector import detect_website_tech
from app.config import settings

# Configure Logging
logger = logging.getLogger("ScraperEngine")

USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36 Edg/119.0.0.0"
]

VIEWPORTS = [
    {"width": 1366, "height": 768},
    {"width": 1920, "height": 1080},
    {"width": 1440, "height": 900},
    {"width": 1280, "height": 800}
]

EMAIL_REGEX = re.compile(r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}')

# Domains to ignore for B2B lead emails
IGNORED_EMAIL_DOMAINS = {
    "sentry.io", "wix.com", "wordpress.org", "google.com", "gmail.com",
    "outlook.com", "yahoo.com", "hotmail.com", "example.com", "png", "jpg"
}

async def block_resources(route: Route) -> None:
    """Interceptors to block media, image, and stylesheet downloads for speed."""
    if route.request.resource_type in ["image", "media", "font", "stylesheet"]:
        await route.abort()
    else:
        await route.continue_()

def get_random_stealth_config() -> Dict[str, Any]:
    """Generates random User-Agent and viewport dimensions for cloaking."""
    return {
        "user_agent": random.choice(USER_AGENTS),
        "viewport": random.choice(VIEWPORTS)
    }

async def add_human_jitter(min_sec: float = 0.5, max_sec: float = 1.5) -> None:
    """Injects a randomized delay to simulate human typing or reading speed."""
    await asyncio.sleep(random.uniform(min_sec, max_sec))

def clean_email(email: str) -> Optional[str]:
    """Cleans up email addresses, filtering out common false positives."""
    email = email.lower().strip()
    # Check simple regex match
    if not EMAIL_REGEX.match(email):
        return None
    # Filter by domain
    parts = email.split('@')
    if len(parts) != 2:
        return None
    domain = parts[1]
    if domain in IGNORED_EMAIL_DOMAINS or any(domain.endswith(d) for d in IGNORED_EMAIL_DOMAINS):
        return None
    # Filter common static extensions
    if any(email.endswith(ext) for ext in [".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".css", ".js"]):
        return None
    return email

def _extract_whatsapp_number(href: str) -> Optional[str]:
    """Extracts a clean WhatsApp phone number from known WhatsApp URL formats.

    Supported patterns:
      - https://wa.me/+971501234567
      - https://wa.me/971501234567
      - https://api.whatsapp.com/send?phone=971501234567
      - whatsapp:+971501234567
      - https://wa.link/<shortcode>  (shortcode only, no number to extract)
    """
    href_lower = href.lower()
    try:
        # wa.me/<number>
        if "wa.me/" in href_lower:
            path = href.split("wa.me/")[-1].split("?")[0].split("/")[0]
            digits = re.sub(r"[^\d+]", "", path)
            return digits if digits else None
        # api.whatsapp.com/send?phone=<number>
        if "api.whatsapp.com/send" in href_lower:
            from urllib.parse import urlparse, parse_qs
            qs = parse_qs(urlparse(href).query)
            phone = qs.get("phone", qs.get("Phone", [None]))[0]
            if phone:
                return re.sub(r"[^\d+]", "", phone)
        # whatsapp:<number>
        if href_lower.startswith("whatsapp:"):
            digits = re.sub(r"[^\d+]", "", href[9:])
            return digits if digits else None
    except Exception as e:
        logger.debug(f"WhatsApp number extraction failed for '{href}': {e}")
    return None

def _is_lead_qualified(lead: Dict[str, Any], required_fields: List[str]) -> bool:
    """Returns True if the lead has non-empty values for ALL required_fields."""
    field_map: Dict[str, Any] = {
        "email":     lead.get("email"),
        "phone":     lead.get("phone"),
        "website":   lead.get("website"),
        "whatsapp":  lead.get("whatsapp"),
        "facebook":  lead.get("facebook"),
        "instagram": lead.get("instagram"),
        "linkedin":  lead.get("linkedin"),
        "youtube":   lead.get("youtube"),
    }
    return all(bool(field_map.get(f)) for f in required_fields)

async def extract_emails_from_page(page: Page) -> List[str]:
    """Parses text content and HTML attributes to extract valid email addresses."""
    emails = set()
    try:
        content = await page.content()
        # Find raw emails in text
        matches = EMAIL_REGEX.findall(content)
        for match in matches:
            cleaned = clean_email(match)
            if cleaned:
                emails.add(cleaned)
        
        # Search mailto: links
        mailto_links = await page.locator('a[href^="mailto:"]').all()
        for link in mailto_links:
            href = await link.get_attribute("href")
            if href:
                raw_email = href.replace("mailto:", "").split('?')[0]
                cleaned = clean_email(raw_email)
                if cleaned:
                    emails.add(cleaned)
    except Exception as e:
        logger.error(f"Error extracting emails from page: {e}")
    return list(emails)

async def extract_social_links(page: Page) -> Dict[str, Optional[str]]:
    """Extracts official profile page links for facebook, instagram, linkedin, youtube,
    and WhatsApp numbers, avoiding share/intent links."""
    socials = {"facebook": None, "instagram": None, "linkedin": None, "youtube": None, "whatsapp": None}
    try:
        links = await page.locator("a").all()
        for link in links:
            href = await link.get_attribute("href")
            if not href:
                continue
            
            href_lower = href.lower()
            
            # Check Facebook
            if "facebook.com/" in href_lower:
                if not any(x in href_lower for x in ["share.php", "sharer.php", "intent", "plugins", "dialog"]):
                    socials["facebook"] = href
            # Check Instagram
            elif "instagram.com/" in href_lower:
                if not any(x in href_lower for x in ["/p/", "/reel/", "/stories/", "intent"]):
                    socials["instagram"] = href
            # Check LinkedIn
            elif "linkedin.com/" in href_lower:
                if not any(x in href_lower for x in ["sharearticle", "sharing"]):
                    socials["linkedin"] = href
            # Check YouTube
            elif "youtube.com/" in href_lower or "youtu.be/" in href_lower:
                if not any(x in href_lower for x in ["/watch", "/share", "intent"]):
                    socials["youtube"] = href
            # Check WhatsApp — extract raw number from wa.me / api.whatsapp.com
            elif not socials["whatsapp"] and (
                "wa.me/" in href_lower
                or "wa.link/" in href_lower
                or "api.whatsapp.com/send" in href_lower
                or href_lower.startswith("whatsapp:")
            ):
                number = _extract_whatsapp_number(href)
                if number:
                    socials["whatsapp"] = number
    except Exception as e:
        logger.error(f"Error extracting social links from page: {e}")
    return socials

async def crawl_website_for_emails_and_tech(context: BrowserContext, url: str) -> Dict[str, Any]:
    """
    Crawls a target website homepage and potentially about/contact pages
    to search for a valid business email, detect its technology stack,
    extract social media profiles, and extract WhatsApp contact number.
    """
    result = {
        "email": None,
        "tech_stack": "",
        "facebook": None,
        "instagram": None,
        "linkedin": None,
        "youtube": None,
        "whatsapp": None,
    }
    if not url or not (url.startswith("http://") or url.startswith("https://")):
        if url and not url.startswith("http"):
            url = "https://" + url
        else:
            return result

    page = await context.new_page()
    await page.route("**/*", block_resources)
    
    try:
        logger.info(f"Scanning website: {url}")
        # Fetch Homepage
        await page.goto(url, wait_until="domcontentloaded", timeout=settings.SCRAPER_WEBSITE_TIMEOUT_MS)
        await add_human_jitter(1.0, 2.0)
        
        # Detect Tech Stack from Homepage HTML
        html_content = ""
        try:
            html_content = await page.content()
        except Exception:
            pass
        result["tech_stack"] = detect_website_tech(html_content)

        # Extract socials from homepage
        socials = await extract_social_links(page)
        for k, v in socials.items():
            if v:
                result[k] = v
        
        emails = await extract_emails_from_page(page)
        if emails:
            result["email"] = emails[0]
            await page.close()
            return result
            
        # Homepage yielded nothing. Look for Contact/About page links
        contact_links = []
        links = await page.locator("a").all()
        for link in links:
            href = await link.get_attribute("href")
            text = await link.inner_text()
            if not href:
                continue
            
            href_lower = href.lower()
            text_lower = text.lower()
            
            # Identify contact/about page subpaths
            is_contact_pattern = any(kw in href_lower or kw in text_lower for kw in ["contact", "about", "info", "reach"])
            if is_contact_pattern:
                # Resolve relative URL
                full_url = href if href.startswith("http") else url.rstrip("/") + "/" + href.lstrip("/")
                # Ensure it's on the same domain
                if urlparse(full_url).netloc == urlparse(url).netloc:
                    contact_links.append(full_url)
        
        # Unique list of subpaths, scan maximum contact pages as configured
        contact_links = list(set(contact_links))[:settings.SCRAPER_CONTACT_PAGES_LIMIT]
        
        for contact_url in contact_links:
            try:
                logger.info(f"Scanning secondary contact URL: {contact_url}")
                await page.goto(contact_url, wait_until="domcontentloaded", timeout=settings.SCRAPER_WEBSITE_TIMEOUT_MS)
                await add_human_jitter(0.5, 1.5)
                
                # Check socials on secondary page
                sub_socials = await extract_social_links(page)
                for k, v in sub_socials.items():
                    if v and not result[k]:
                        result[k] = v

                sub_emails = await extract_emails_from_page(page)
                if sub_emails:
                    result["email"] = sub_emails[0]
                    # Optionally fallback to tech detection if homepage detection was empty
                    if not result["tech_stack"]:
                        try:
                            sub_html = await page.content()
                            result["tech_stack"] = detect_website_tech(sub_html)
                        except Exception:
                            pass
                    await page.close()
                    return result
            except Exception as se:
                logger.warning(f"Failed to crawl sub-page {contact_url}: {se}")
                
    except Exception as e:
        logger.error(f"Failed to scan website {url}: {e}")
    finally:
        await page.close()
    return result

async def scrape_google_maps(
    keyword: str,
    location: str,
    limit: int,
    progress_callback: Callable[[str], Awaitable[None]],
    exclude_names: Optional[set] = None,
    required_fields: Optional[List[str]] = None,
) -> List[Dict[str, Any]]:
    """
    Orchestrates the Dual-Phase extraction engine.
    - Phase A: Extract business listings from Google Maps.
    - Phase B: Crawl found websites for active contact email addresses.
    """
    await progress_callback(f"[PHASE:MAPS] Initializing scraping browser context for keyword '{keyword}' in '{location}'...")
    
    leads = []
    
    async with async_playwright() as p:
        # Configure launch options for stealth
        browser = await p.chromium.launch(
            headless=True,
            args=[
                "--disable-blink-features=AutomationControlled",
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-dev-shm-usage"
            ]
        )
        
        # Configure random viewport and user-agent with strict English language headers
        config = get_random_stealth_config()
        context = await browser.new_context(
            user_agent=config["user_agent"],
            viewport=config["viewport"],
            locale="en-US",
            extra_http_headers={
                "Accept-Language": "en-US,en;q=0.9"
            }
        )
        
        # Phase A: Google Maps Listing Search
        page = await context.new_page()
        # Intercept images/stylesheets to accelerate listings lookup
        await page.route("**/*", block_resources)
        
        search_query = quote_plus(f"{keyword} {location}")
        maps_url = f"https://www.google.com/maps/search/{search_query}?hl=en"
        
        await progress_callback("[PHASE:MAPS] Connecting to Google Maps search results...")
        await page.goto(maps_url, wait_until="networkidle", timeout=settings.SCRAPER_MAPS_TIMEOUT_MS)
        
        place_urls = set()
        scroll_attempts = 0
        # Scale candidate collection: more aggressively when required_fields filter is active
        filter_multiplier = 6 if required_fields else 3
        needed_links_count = limit * filter_multiplier if exclude_names else limit * (filter_multiplier // 2 if not required_fields else filter_multiplier)
        max_scroll_attempts = max(80, limit * filter_multiplier)
        
        # Try to locate the sidebar element
        sidebar_selector = 'div[role="feed"]'
        
        await progress_callback("[PHASE:MAPS] Locating listings list. Scrolling to populate results...")
        
        while len(place_urls) < needed_links_count and scroll_attempts < max_scroll_attempts:
            sidebar = await page.query_selector(sidebar_selector)
            if sidebar:
                # Scroll the sidebar down
                await sidebar.evaluate("el => el.scrollBy(0, 1800)")
            else:
                # Fallback to window scroll if sidebar selector not found
                await page.evaluate("window.scrollBy(0, 1800)")
                
            await asyncio.sleep(1.8)
            
            # Find place detail page links
            links = await page.locator('a[href*="/maps/place/"]').all()
            for link in links:
                href = await link.get_attribute("href")
                if href:
                    # Keep path only or clean URL
                    clean_url = href.split('?')[0]
                    place_urls.add(clean_url)
                    
            scroll_attempts += 1
            await progress_callback(f"[PHASE:MAPS] Scanned feed. Found {len(place_urls)} listing links so far...")
            
            # Check if reached the end of listings
            content = await page.content()
            if "You've reached the end of the list" in content or "reached the end" in content.lower():
                await progress_callback("[PHASE:MAPS] Reached the end of Google Maps listings.")
                break

        target_urls = list(place_urls)[:needed_links_count]
        await progress_callback(f"[PHASE:LISTINGS] Phase A Completed: Found {len(target_urls)} candidate listings. Starting detailed card extraction...")
        
        # Close search page to save memory
        await page.close()
        
        # Detailed extraction page
        detail_page = await context.new_page()
        await detail_page.route("**/*", block_resources)
        
        extracted_listings = []
        
        for idx, place_url in enumerate(target_urls):
            if len(extracted_listings) >= limit:
                break
                
            await progress_callback(f"[PHASE:LISTINGS] Scraping detailed card {idx + 1}...")
            try:
                target_url = place_url + ("&hl=en" if "?" in place_url else "?hl=en")
                await detail_page.goto(target_url, wait_until="domcontentloaded", timeout=settings.SCRAPER_CARD_TIMEOUT_MS)
                await add_human_jitter(1.0, 2.5)
                
                # Resilient Selectors
                name = "Unknown Name"
                h1_el = await detail_page.query_selector("h1")
                if h1_el:
                    name = await h1_el.inner_text()
                
                if exclude_names and name in exclude_names:
                    await progress_callback(f"[PHASE:EXCLUDE] Skipping previously extracted lead: '{name}'")
                    continue
                
                # Rating
                rating = None
                rating_el = await detail_page.query_selector("div.F7nice span")
                if rating_el:
                    rating_text = await rating_el.inner_text()
                    try:
                        # Extract float value
                        match = re.search(r'\d+(\.\d+)?', rating_text)
                        if match:
                            rating = float(match.group())
                    except ValueError:
                        pass
                
                # Address
                address = None
                address_el = await detail_page.query_selector('button[data-item-id="address"]')
                if address_el:
                    address = await address_el.inner_text()
                
                # Phone
                phone = None
                phone_el = await detail_page.query_selector('button[data-item-id^="phone:tel:"]')
                if phone_el:
                    phone_raw = await phone_el.get_attribute("data-item-id")
                    if phone_raw:
                        phone = phone_raw.replace("phone:tel:", "").strip()
                
                # Website
                website = None
                website_el = await detail_page.query_selector('a[data-item-id="authority"]')
                if website_el:
                    website = await website_el.get_attribute("href")
                
                # Image URL
                image_url = None
                img_el = await detail_page.query_selector('button[aria-label*="photo"] img, img[src*="googleusercontent.com"], img[src*="ggpht.com"]')
                if img_el:
                    image_url = await img_el.get_attribute("src")
                
                lead_data = {
                    "name": name.strip(),
                    "phone": phone,
                    "address": address,
                    "rating": rating,
                    "website": website,
                    "image_url": image_url,
                    "website_tech": "",
                    "email": None, # Scraped in Phase B
                    "email_status": "unchecked",
                    "facebook": None,
                    "instagram": None,
                    "linkedin": None,
                    "youtube": None
                }
                
                extracted_listings.append(lead_data)
                
            except Exception as de:
                logger.error(f"Error extracting listing card at {place_url}: {de}")
                
        await detail_page.close()
        
        # Phase B: Email Extraction from Websites
        await progress_callback("[PHASE:WEBSITES] Phase B Started: Running background website scans for email addresses...")
        
        semaphore = asyncio.Semaphore(settings.SCRAPER_CONCURRENCY_LIMIT)  # Limit concurrent website crawls using settings limit
        
        async def scan_single_lead(idx: int, lead: Dict[str, Any]) -> Dict[str, Any]:
            if lead["website"]:
                async with semaphore:
                    await progress_callback(f"[PHASE:WEBSITES] Crawling website for email & tech: {lead['name']} ({idx + 1}/{len(extracted_listings)})...")
                    try:
                        scan_res = await crawl_website_for_emails_and_tech(context, lead["website"])
                        lead["website_tech"] = scan_res.get("tech_stack", "")
                        email = scan_res.get("email")
                        lead["facebook"] = scan_res.get("facebook")
                        lead["instagram"] = scan_res.get("instagram")
                        lead["linkedin"] = scan_res.get("linkedin")
                        lead["youtube"] = scan_res.get("youtube")
                        lead["whatsapp"] = scan_res.get("whatsapp")

                        if lead["website_tech"]:
                            await progress_callback(f"[PHASE:WEBSITES] Detected technologies for {lead['name']}: {lead['website_tech']}")
                        
                        found_socials = [k for k, v in scan_res.items() if k in ["facebook", "instagram", "linkedin", "youtube", "whatsapp"] and v]
                        if found_socials:
                            await progress_callback(f"[PHASE:WEBSITES] Found social profiles for {lead['name']}: {', '.join(found_socials)}")

                        if email:
                            lead["email"] = email
                            await progress_callback(f"[PHASE:WEBSITES] Found email: {email} for {lead['name']}. Running deliverability check...")
                            status = await verify_email_deliverability(email)
                            lead["email_status"] = status
                            await progress_callback(f"[PHASE:WEBSITES] Verification status for {email}: {status}")
                        else:
                            await progress_callback(f"[PHASE:WEBSITES] No email found for {lead['name']}")
                            lead["email_status"] = "unchecked"
                    except Exception as e:
                        logger.error(f"Error crawling website for {lead['name']} ({lead['website']}): {e}", exc_info=True)
                        await progress_callback(f"[PHASE:WEBSITES] Failed to scan website for {lead['name']}")
                        lead["email_status"] = "unchecked"
            else:
                await progress_callback(f"[PHASE:WEBSITES] No website listed for {lead['name']} (skipped Phase B)")
                lead["facebook"] = None
                lead["instagram"] = None
                lead["linkedin"] = None
                lead["youtube"] = None
                lead["whatsapp"] = None
            return lead

        # Run Phase B crawls concurrently
        tasks = [scan_single_lead(idx, lead) for idx, lead in enumerate(extracted_listings)]
        raw_leads = await asyncio.gather(*tasks)

        # Qualification filter: keep only leads satisfying ALL required fields
        if required_fields:
            await progress_callback(f"[PHASE:FILTER] Applying required fields filter: {', '.join(required_fields)}...")
            qualified_leads = [l for l in raw_leads if _is_lead_qualified(l, required_fields)]
            discard_count = len(raw_leads) - len(qualified_leads)
            await progress_callback(
                f"[PHASE:FILTER] Qualified {len(qualified_leads)} / {len(raw_leads)} leads "
                f"({discard_count} discarded — missing required fields)."
            )
            # Trim to requested limit
            leads = qualified_leads[:limit]
        else:
            leads = list(raw_leads)
            
        await browser.close()
        
    await progress_callback(f"[PHASE:COMPLETE] Finished scraping process! Extracted total of {len(leads)} leads.")
    return leads
