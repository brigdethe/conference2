from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class LawFirmCreate(BaseModel):
    name: str
    email: Optional[str] = None


class LawFirmResponse(BaseModel):
    id: int
    name: str
    code: str
    email: Optional[str] = None
    created_at: datetime
    registration_count: int = 0
    confirmed_count: int = 0
    free_slots_remaining: int = 2

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

    class Config:
        from_attributes = True


class LawFirmUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None


class DashboardStats(BaseModel):
    total_firms: int
    total_registrations: int
    confirmed_registrations: int
    pending_registrations: int
    total_revenue: int
    checked_in_count: int
