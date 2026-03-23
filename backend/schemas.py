from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class LawFirmCreate(BaseModel):
    name: str
    email: Optional[str] = None
    required_registrations: int = 1
    is_law_firm: bool = False
    logo_url: Optional[str] = None


class LawFirmResponse(BaseModel):
    id: int
    name: str
    code: str
    email: Optional[str] = None
    created_at: datetime
    registration_count: int = 0
    confirmed_count: int = 0
    free_slots_remaining: int = 1
    required_registrations: int = 1
    is_law_firm: bool = False
    logo_url: Optional[str] = None
    is_active: bool = True

    class Config:
        from_attributes = True


class RegistrationCreate(BaseModel):
    full_name: str
    email: str
    phone: Optional[str] = None
    job_title: Optional[str] = None
    company: Optional[str] = None
    access_code: Optional[str] = None
    law_firm: Optional[str] = None
    reason_for_attending: Optional[str] = None


class RegistrationResponse(BaseModel):
    id: int
    full_name: str
    email: str
    phone: Optional[str]
    job_title: Optional[str]
    company: Optional[str]
    status: str
    ticket_type: str
    ticket_code: Optional[str]
    qr_data: Optional[str]
    reason_for_attending: Optional[str] = None
    approved_at: Optional[datetime] = None
    created_at: datetime
    firm_name: Optional[str] = None

    class Config:
        from_attributes = True


class PaymentCreate(BaseModel):
    registration_id: int
    amount: int
    reference: Optional[str] = None


class PaymentResponse(BaseModel):
    id: int
    registration_id: int
    amount: int
    merchant_code: Optional[str]
    reference: Optional[str]
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


class SettingUpdate(BaseModel):
    value: str


class SettingResponse(BaseModel):
    key: str
    value: Optional[str]

    class Config:
        from_attributes = True


class CheckInCreate(BaseModel):
    ticket_code: Optional[str] = None
    qr_data: Optional[str] = None


class CheckInResponse(BaseModel):
    id: int
    registration_id: int
    checked_in_at: datetime
    method: str
    registration: Optional[RegistrationResponse] = None

    class Config:
        from_attributes = True


class FirmActivityResponse(BaseModel):
    name: str
    code: str
    email: Optional[str] = None
    total_registrations: int
    confirmed_access_code: int
    confirmed_paid: int
    pending_payment: int
    free_slots_remaining: int
    last_registration_at: Optional[datetime]
    registrations: list[RegistrationResponse]
    is_active: bool = True

    class Config:
        from_attributes = True


class LawFirmUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    required_registrations: Optional[int] = None
    is_law_firm: Optional[bool] = None
    logo_url: Optional[str] = None


class DashboardStats(BaseModel):
    total_firms: int
    total_registrations: int
    confirmed_registrations: int
    pending_registrations: int
    total_revenue: int
    checked_in_count: int


class InquiryCreate(BaseModel):
    name: str
    email: str
    organization: Optional[str] = None
    inquiry_type: str
    message: str


class QuestionCreate(BaseModel):
    ticket_code: Optional[str] = None
    name: str
    email: Optional[str] = None
    question_text: str
    session_number: Optional[int] = None


class QuestionResponse(BaseModel):
    id: int
    ticket_code: Optional[str]
    name: str
    email: Optional[str]
    question_text: str
    session_number: Optional[int]
    is_answered: bool
    created_at: datetime
    answered_at: Optional[datetime] = None
    registration_info: Optional[dict] = None  # To store linked registration info if available

    class Config:
        from_attributes = True


class InquiryResponse(BaseModel):
    id: int
    name: str
    email: str
    organization: Optional[str]
    inquiry_type: str
    message: str
    status: str
    created_at: datetime

    class Config:
        from_attributes = True
