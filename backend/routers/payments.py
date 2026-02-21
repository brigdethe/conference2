import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional

from database import get_db

logger = logging.getLogger(__name__)
from models import Payment, Registration, Settings
from schemas import PaymentCreate, PaymentResponse
from utils import generate_ticket_code, generate_qr_data
from routers.notifications import send_ticket_notification, send_admin_payment_notification

router = APIRouter(prefix="/api/payments", tags=["payments"])


def get_setting(db: Session, key: str, default: str = "") -> str:
    setting = db.query(Settings).filter(Settings.key == key).first()
    return setting.value if setting else default


@router.get("", response_model=dict)
def get_payments(
    status: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Payment)
    
    if status:
        query = query.filter(Payment.status == status)
    
    payments = query.order_by(Payment.created_at.desc()).all()
    
    result = []
    for p in payments:
        result.append(PaymentResponse(
            id=p.id,
            registration_id=p.registration_id,
            amount=p.amount,
            merchant_code=p.merchant_code,
            reference=p.reference,
            status=p.status,
            created_at=p.created_at
        ))
    
    return {"payments": result, "total": len(result)}


@router.post("", response_model=PaymentResponse)
def create_payment(data: PaymentCreate, db: Session = Depends(get_db)):
    registration = db.query(Registration).filter(
        Registration.id == data.registration_id
    ).first()
    if not registration:
        raise HTTPException(status_code=404, detail="Registration not found")
    
    existing = db.query(Payment).filter(
        Payment.registration_id == data.registration_id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Payment already exists")
    
    merchant_code = get_setting(db, "merchant_code", "")
    
    payment = Payment(
        registration_id=data.registration_id,
        amount=data.amount,
        merchant_code=merchant_code,
        reference=data.reference,
        status="pending"
    )
    
    db.add(payment)
    db.commit()
    db.refresh(payment)
    
    return PaymentResponse(
        id=payment.id,
        registration_id=payment.registration_id,
        amount=payment.amount,
        merchant_code=payment.merchant_code,
        reference=payment.reference,
        status=payment.status,
        created_at=payment.created_at
    )


@router.patch("/{payment_id}/confirm")
async def confirm_payment(payment_id: int, db: Session = Depends(get_db)):
    payment = db.query(Payment).filter(Payment.id == payment_id).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    
    payment.status = "confirmed"
    
    registration = db.query(Registration).filter(
        Registration.id == payment.registration_id
    ).first()
    
    if registration:
        from_status = registration.status
        registration.status = "confirmed"
        logger.info(
            "registration_status_change registration_id=%s from_status=%s to_status=confirmed email=%s",
            registration.id, from_status, registration.email or ""
        )
        if not registration.ticket_code:
            ticket_code = generate_ticket_code()
            while db.query(Registration).filter(
                Registration.ticket_code == ticket_code
            ).first():
                ticket_code = generate_ticket_code()
            
            qr_data = generate_qr_data(
                ticket_code=ticket_code,
                registration_id=registration.id,
                full_name=registration.full_name,
                firm_name=registration.firm.name if registration.firm else None
            )
            
            registration.ticket_code = ticket_code
            registration.qr_data = qr_data
        
        db.commit()
        
        # Send ticket notification to user
        await send_ticket_notification(
            db=db,
            email=registration.email,
            phone=registration.phone,
            full_name=registration.full_name,
            ticket_code=registration.ticket_code,
            qr_data=registration.qr_data,
            org_name=registration.firm.name if registration.firm else None
        )
    else:
        db.commit()
    
    return {"success": True}


@router.post("/pay")
def process_payment(registration_id: int, db: Session = Depends(get_db)):
    registration = db.query(Registration).filter(
        Registration.id == registration_id
    ).first()
    if not registration:
        raise HTTPException(status_code=404, detail="Registration not found")
    if registration.status == "confirmed":
        return {"success": True, "message": "Already confirmed"}
    ticket_price = int(get_setting(db, "ticket_price", "150"))
    merchant_code = get_setting(db, "merchant_code", "")
    existing_payment = db.query(Payment).filter(
        Payment.registration_id == registration_id
    ).first()
    if not existing_payment:
        payment = Payment(
            registration_id=registration_id,
            amount=ticket_price,
            merchant_code=merchant_code,
            status="pending"
        )
        db.add(payment)
    db.commit()
    return {"success": True}


@router.get("/stats")
def get_payment_stats(db: Session = Depends(get_db)):
    total_payments = db.query(Payment).filter(Payment.status == "confirmed").all()
    total_revenue = sum(p.amount for p in total_payments)
    pending_count = db.query(Payment).filter(Payment.status == "pending").count()
    
    return {
        "total_revenue": total_revenue,
        "confirmed_payments": len(total_payments),
        "pending_payments": pending_count
    }
