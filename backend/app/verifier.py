import asyncio
import smtplib
import socket
import logging
import dns.resolver
from typing import List

from app.config import settings

logger = logging.getLogger("EmailVerifier")

def _resolve_mx_records(domain: str) -> List[str]:
    """Resolves DNS MX records for the given domain, sorted by preference."""
    try:
        answers = dns.resolver.resolve(domain, 'MX')
        # Sort by preference (priority) ASC
        records = sorted(answers, key=lambda r: r.preference)
        return [str(r.exchange).rstrip('.') for r in records]
    except Exception as e:
        logger.warning(f"Failed to resolve MX records for domain '{domain}': {e}")
        # Fallback: Try A record for the main domain directly
        try:
            answers = dns.resolver.resolve(domain, 'A')
            if answers:
                return [domain]
        except Exception:
            pass
        return []

def _smtp_handshake_check(mx_host: str, email: str) -> str:
    """Performs the SMTP handshake check synchronously on port 25."""
    try:
        # Connect with configured timeout
        server = smtplib.SMTP(host=mx_host, port=25, timeout=settings.VERIFIER_SMTP_TIMEOUT)
        server.ehlo_or_helo_if_needed()
        
        # Use configured fallback sender email
        sender = settings.VERIFIER_FALLBACK_SENDER
        server.mail(sender)
        
        # Test the recipient email
        code, message = server.rcpt(email)
        server.quit()
        
        logger.info(f"SMTP response for '{email}' on host '{mx_host}': {code} - {message.decode('utf-8', errors='ignore')}")
        
        # Standard SMTP Success Code is 250
        if code == 250:
            return "deliverable"
        # Standard Permanent Failures (e.g., User Unknown, Mailbox Unavailable)
        elif 500 <= code < 600:
            return "undeliverable"
        # Temporary issues (400-499) e.g., Greylisting
        elif 400 <= code < 500:
            return "risky"
            
    except (socket.timeout, socket.error) as se:
        logger.warning(f"Connection issue with MX host '{mx_host}' for '{email}': {se}")
    except Exception as e:
        logger.error(f"Unexpected error during SMTP check on host '{mx_host}' for '{email}': {e}")
        
    return "unchecked"

def verify_email_sync(email: str) -> str:
    """Synchronous entrypoint for email verification."""
    email = email.strip()
    if not email or "@" not in email:
        return "undeliverable"
        
    domain = email.split("@")[-1].lower()
    mx_hosts = _resolve_mx_records(domain)
    
    if not mx_hosts:
        return "undeliverable"
        
    # Attempt verification on each resolved mail server
    final_status = "risky"
    for host in mx_hosts:
        status = _smtp_handshake_check(host, email)
        if status == "deliverable":
            return "deliverable"
        elif status == "undeliverable":
            # If any MX server explicitly tells us the mailbox does not exist, it's undeliverable
            return "undeliverable"
        elif status == "risky":
            final_status = "risky"
            
    return final_status

async def verify_email_deliverability(email: str) -> str:
    """Asynchronous wrapper that runs the synchronous verifier in a thread pool."""
    try:
        return await asyncio.to_thread(verify_email_sync, email)
    except Exception as e:
        logger.error(f"Fail-safe error in email verification for '{email}': {e}")
        return "risky"
