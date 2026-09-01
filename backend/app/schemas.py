from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field

class LeadBase(BaseModel):
    name: str
    phone: Optional[str] = None
    address: Optional[str] = None
    rating: Optional[float] = None
    website: Optional[str] = None
    website_tech: Optional[str] = ""
    email: Optional[str] = None
    email_status: Optional[str] = "unchecked"
    facebook: Optional[str] = None
    instagram: Optional[str] = None
    linkedin: Optional[str] = None
    youtube: Optional[str] = None
    whatsapp: Optional[str] = None
    image_url: Optional[str] = None
    sales_pitch: Optional[str] = None
    email_sent_status: Optional[str] = None
    email_sent_at: Optional[str] = None
    email_sent_error: Optional[str] = None

class LeadCreate(LeadBase):
    pass

class PitchRequest(BaseModel):
    product_desc: str = "SEO & Web Development services"

class LeadResponse(LeadBase):
    id: int
    session_id: str
    created_at: datetime

    class Config:
        from_attributes = True

class SMTPSettingsCreate(BaseModel):
    host: str
    port: int
    username: str
    password: str
    sender_email: str
    sender_name: Optional[str] = ""
    use_tls: Optional[int] = 1

class SMTPSettingsResponse(BaseModel):
    id: int
    host: str
    port: int
    username: str
    password: str
    sender_email: str
    sender_name: Optional[str] = ""
    use_tls: int

    class Config:
        from_attributes = True

class SendEmailRequest(BaseModel):
    product_desc: str = "SEO & Web Development services"

class CampaignRequest(BaseModel):
    lead_ids: list[int]
    product_desc: str = "SEO & Web Development services"

class SearchSessionBase(BaseModel):
    id: str
    keyword: str
    location: str
    status: str
    total_leads: int
    created_at: datetime

class SearchSessionResponse(SearchSessionBase):
    class Config:
        from_attributes = True

class SearchSessionDetailResponse(SearchSessionResponse):
    leads: List[LeadResponse] = []

    class Config:
        from_attributes = True

class ScrapeRequest(BaseModel):
    keyword: str = Field(..., min_length=1, max_length=100)
    location: str = Field(..., min_length=1, max_length=100)
    limit: Optional[int] = Field(default=50, ge=1, le=200)
    skip_previous: Optional[bool] = Field(default=True)
    required_fields: Optional[List[str]] = Field(
        default_factory=list,
        description="List of contact fields that must be present. Valid values: email, phone, website, whatsapp, facebook, instagram, linkedin, youtube"
    )

class ScrapeScheduleCreate(BaseModel):
    keyword: str
    location: str
    limit: Optional[int] = 50
    interval_type: str  # "daily", "weekly", "monthly", "minute"

class ScrapeScheduleUpdate(BaseModel):
    keyword: Optional[str] = None
    location: Optional[str] = None
    limit: Optional[int] = None
    interval_type: Optional[str] = None
    is_active: Optional[int] = None  # 1=Active, 0=Paused

class ScrapeScheduleResponse(BaseModel):
    id: int
    keyword: str
    location: str
    limit: int
    interval_type: str
    is_active: int
    last_run: Optional[str] = None
    next_run: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class GoogleCredentialsCreate(BaseModel):
    client_id: str
    client_secret: str
    access_token: Optional[str] = None
    refresh_token: Optional[str] = None
    expires_at: Optional[int] = None

class GoogleCredentialsResponse(BaseModel):
    id: int
    client_id: str
    client_secret: str
    access_token: Optional[str] = None
    refresh_token: Optional[str] = None
    expires_at: Optional[int] = None

    class Config:
        from_attributes = True

class AICommandRequest(BaseModel):
    command: str

class AICommandResponse(BaseModel):
    keyword: str
    location: str
    limit: int

class GoogleSheetsExportRequest(BaseModel):
    lead_ids: list[int]
    spreadsheet_title: Optional[str] = "Lid Gen Export"
    spreadsheet_id: Optional[str] = None # if append to existing

class GmailCampaignRequest(BaseModel):
    lead_ids: list[int]
    product_desc: str = "SEO & Web Development services"


