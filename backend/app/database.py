from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, Float, DateTime, ForeignKey, Index, text
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import declarative_base, relationship

from app.config import settings

DATABASE_URL = settings.DATABASE_URL

engine = create_async_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False}, # Required for SQLite
    echo=False
)

async_session = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False
)

Base = declarative_base()

class SearchSession(Base):
    __tablename__ = "search_sessions"

    id = Column(String, primary_key=True)
    keyword = Column(String, nullable=False)
    location = Column(String, nullable=False)
    status = Column(String, default="pending")  # pending, running, completed, failed
    total_leads = Column(Integer, default=0)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    leads = relationship("Lead", back_populates="session", cascade="all, delete-orphan")

class SMTPSettings(Base):
    __tablename__ = "smtp_settings"

    id = Column(Integer, primary_key=True, autoincrement=True)
    host = Column(String, nullable=False)
    port = Column(Integer, nullable=False)
    username = Column(String, nullable=False)
    password = Column(String, nullable=False)
    sender_email = Column(String, nullable=False)
    sender_name = Column(String, nullable=True, default="")
    use_tls = Column(Integer, default=1)

class ScrapeSchedule(Base):
    __tablename__ = "scrape_schedules"

    id = Column(Integer, primary_key=True, autoincrement=True)
    keyword = Column(String, nullable=False)
    location = Column(String, nullable=False)
    limit = Column(Integer, default=50)
    interval_type = Column(String, nullable=False)
    is_active = Column(Integer, default=1)
    last_run = Column(String, nullable=True, default=None)
    next_run = Column(String, nullable=True, default=None)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class GoogleCredentials(Base):
    __tablename__ = "google_credentials"

    id = Column(Integer, primary_key=True, autoincrement=True)
    client_id = Column(String, nullable=False)
    client_secret = Column(String, nullable=False)
    access_token = Column(String, nullable=True)
    refresh_token = Column(String, nullable=True)
    expires_at = Column(Integer, nullable=True) # epoch timestamp

class Lead(Base):
    __tablename__ = "leads"

    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(String, ForeignKey("search_sessions.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False)
    phone = Column(String, nullable=True)
    address = Column(String, nullable=True)
    rating = Column(Float, nullable=True)
    website = Column(String, nullable=True)
    website_tech = Column(String, nullable=True, default="")
    email = Column(String, nullable=True)
    email_status = Column(String, nullable=True, default="unchecked")
    facebook = Column(String, nullable=True)
    instagram = Column(String, nullable=True)
    linkedin = Column(String, nullable=True)
    youtube = Column(String, nullable=True)
    whatsapp = Column(String, nullable=True)
    image_url = Column(String, nullable=True)
    sales_pitch = Column(String, nullable=True)
    email_sent_status = Column(String, nullable=True, default=None)
    email_sent_at = Column(String, nullable=True, default=None)
    email_sent_error = Column(String, nullable=True, default=None)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    session = relationship("SearchSession", back_populates="leads")

    # Dynamic deduplication at database level using index
    __table_args__ = (
        Index("ix_lead_session_name_phone", "session_id", "name", "phone", unique=True),
    )

async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        # Resilient SQLite table migrations: check if columns exist, add if missing
        try:
            await conn.execute(text("ALTER TABLE leads ADD COLUMN email_status VARCHAR DEFAULT 'unchecked'"))
        except Exception:
            pass
        try:
            await conn.execute(text("ALTER TABLE leads ADD COLUMN website_tech VARCHAR DEFAULT ''"))
        except Exception:
            pass
        try:
            await conn.execute(text("ALTER TABLE leads ADD COLUMN facebook VARCHAR DEFAULT NULL"))
        except Exception:
            pass
        try:
            await conn.execute(text("ALTER TABLE leads ADD COLUMN image_url VARCHAR DEFAULT NULL"))
        except Exception:
            pass
        try:
            await conn.execute(text("ALTER TABLE leads ADD COLUMN instagram VARCHAR DEFAULT NULL"))
        except Exception:
            pass
        try:
            await conn.execute(text("ALTER TABLE leads ADD COLUMN linkedin VARCHAR DEFAULT NULL"))
        except Exception:
            pass
        try:
            await conn.execute(text("ALTER TABLE leads ADD COLUMN youtube VARCHAR DEFAULT NULL"))
        except Exception:
            pass
        try:
            await conn.execute(text("ALTER TABLE leads ADD COLUMN sales_pitch VARCHAR DEFAULT NULL"))
        except Exception:
            pass
        try:
            await conn.execute(text("ALTER TABLE leads ADD COLUMN email_sent_status VARCHAR DEFAULT NULL"))
        except Exception:
            pass
        try:
            await conn.execute(text("ALTER TABLE leads ADD COLUMN email_sent_at VARCHAR DEFAULT NULL"))
        except Exception:
            pass
        try:
            await conn.execute(text("ALTER TABLE leads ADD COLUMN email_sent_error VARCHAR DEFAULT NULL"))
        except Exception:
            pass
        try:
            await conn.execute(text("ALTER TABLE leads ADD COLUMN whatsapp VARCHAR DEFAULT NULL"))
        except Exception:
            pass

async def get_db():
    async with async_session() as session:
        yield session
