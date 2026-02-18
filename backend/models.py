from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base


class LawFirm(Base):
    __tablename__ = "law_firms"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), unique=True, nullable=False)
    code = Column(String(6), unique=True, nullable=False)
    email = Column(String(255), nullable=True)
    required_registrations = Column(Integer, default=1)
    is_law_firm = Column(Integer, default=0)  # 0 = organization, 1 = law firm
    logo_url = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    registrations = relationship("Registration", back_populates="firm")


class Registration(Base):
    __tablename__ = "registrations"

    id = Column(Integer, primary_key=True, index=True)
    firm_id = Column(Integer, ForeignKey("law_firms.id"), nullable=True)
    full_name = Column(String(255), nullable=False)
    email = Column(String(255), nullable=False)
    phone = Column(String(50), nullable=True)
    job_title = Column(String(255), nullable=True)
    company = Column(String(255), nullable=True)
    status = Column(String(50), default="pending_payment")
    ticket_type = Column(String(50), default="Paid")
    ticket_code = Column(String(4), nullable=True)
    qr_data = Column(Text, nullable=True)
    reason_for_attending = Column(Text, nullable=True)
    approved_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    firm = relationship("LawFirm", back_populates="registrations")
    payment = relationship("Payment", back_populates="registration", uselist=False)
    check_in = relationship("CheckIn", back_populates="registration", uselist=False)


class Payment(Base):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)
    registration_id = Column(Integer, ForeignKey("registrations.id"), nullable=False)
    amount = Column(Integer, nullable=False)
    merchant_code = Column(String(50), nullable=True)
    reference = Column(String(100), nullable=True)
    status = Column(String(50), default="pending")
    created_at = Column(DateTime, default=datetime.utcnow)

    registration = relationship("Registration", back_populates="payment")


class Settings(Base):
    __tablename__ = "settings"

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String(100), unique=True, nullable=False)
    value = Column(Text, nullable=True)


class CheckIn(Base):
    __tablename__ = "check_ins"

    id = Column(Integer, primary_key=True, index=True)
    registration_id = Column(Integer, ForeignKey("registrations.id"), nullable=False)
    checked_in_at = Column(DateTime, default=datetime.utcnow)
    method = Column(String(20), default="code")

    registration = relationship("Registration", back_populates="check_in")


class Inquiry(Base):
    __tablename__ = "inquiries"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), nullable=False)
    organization = Column(String(255), nullable=True)
    inquiry_type = Column(String(100), nullable=False)
    message = Column(Text, nullable=False)
    status = Column(String(50), default="pending")
    created_at = Column(DateTime, default=datetime.utcnow)


class AdminNotificationRecipient(Base):
    __tablename__ = "admin_notification_recipients"

    id = Column(Integer, primary_key=True, index=True)
    recipient_type = Column(String(20), nullable=False)  # 'email' or 'phone'
    value = Column(String(255), nullable=False)
    enabled = Column(Integer, default=1)
    created_at = Column(DateTime, default=datetime.utcnow)
