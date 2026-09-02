import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # Database Settings
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./leads.db")
    
    # Scraper Engine Settings
    SCRAPER_MAPS_TIMEOUT_MS: int = int(os.getenv("SCRAPER_MAPS_TIMEOUT_MS", "30000"))
    SCRAPER_CARD_TIMEOUT_MS: int = int(os.getenv("SCRAPER_CARD_TIMEOUT_MS", "20000"))
    SCRAPER_WEBSITE_TIMEOUT_MS: int = int(os.getenv("SCRAPER_WEBSITE_TIMEOUT_MS", "15000"))
    SCRAPER_CONTACT_PAGES_LIMIT: int = int(os.getenv("SCRAPER_CONTACT_PAGES_LIMIT", "3"))
    SCRAPER_CONCURRENCY_LIMIT: int = int(os.getenv("SCRAPER_CONCURRENCY_LIMIT", "2"))
    
    # Email Verifier Settings
    VERIFIER_SMTP_TIMEOUT: float = float(os.getenv("VERIFIER_SMTP_TIMEOUT", "10.0"))
    VERIFIER_FALLBACK_SENDER: str = os.getenv("VERIFIER_FALLBACK_SENDER", "verify@lidgen.app")
    
    # Scheduler Settings
    SCHEDULER_POLL_INTERVAL_SEC: int = int(os.getenv("SCHEDULER_POLL_INTERVAL_SEC", "15"))
    
    # AI / LLM Integration Settings
    LLM_MODEL_NAME: str = os.getenv("LLM_MODEL_NAME", "gemini-2.5-flash")
    LLM_API_BASE_URL: str = os.getenv("LLM_API_BASE_URL", "https://generativelanguage.googleapis.com/v1beta/models")
    
    # Pagination & API Limits
    DEFAULT_PAGE_SIZE: int = int(os.getenv("DEFAULT_PAGE_SIZE", "25"))
    MAX_PAGE_SIZE: int = int(os.getenv("MAX_PAGE_SIZE", "200"))
    
    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
