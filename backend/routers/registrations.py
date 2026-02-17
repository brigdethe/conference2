from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional

from database import get_db
from models import LawFirm, Registration, Settings
from schemas import RegistrationCreate, RegistrationResponse
from utils import generate_ticket_code, generate_qr_data

router = APIRouter(prefix="/api/registrations", tags=["registrations"])


def get_setting(db: Session, key: str, default: str = "") -> str:
    setting = db.query(Settings).filter(Settings.key == key).first()
    return setting.value if setting else default


@router.get("", response_model=dict)
def get_registrations(
    status: Optional[str] = None,
    firm_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Registration)
    
    if status and status != "all":
        query = query.filter(Registration.status == status)
    if firm_id:
        query = query.filter(Registration.firm_id == firm_id)
    
    registrations = query.order_by(Registration.created_at.desc()).all()
    
    result = []
    for r in registrations:
        firm_name = r.firm.name if r.firm else None
        result.append(RegistrationResponse(
            id=r.id,
            full_name=r.full_name,
            email=r.email,
            phone=r.phone,
            job_title=r.job_title,
            company=r.company,
            status=r.status,
            ticket_type=r.ticket_type,
            ticket_code=r.ticket_code,
            qr_data=r.qr_data,
            created_at=r.created_at,
            firm_name=firm_name
        ))
    
    return {"registrations": result, "total": len(result)}


@router.get("/users", response_model=dict)
def get_users(
    status: str = "confirmed",
    db: Session = Depends(get_db)
):
    query = db.query(Registration)
    
    if status != "all":
        query = query.filter(Registration.status == "confirmed")
    
    registrations = query.order_by(Registration.created_at.desc()).all()
    
    users = []
    for r in registrations:
        firm_name = r.firm.name if r.firm else None
        users.append({
            "id": r.id,
            "fullName": r.full_name,
            "jobTitle": r.job_title,
            "lawFirm": firm_name,
            "email": r.email,
            "phone": r.phone,
            "attendanceType": "In-Person",
            "ticketType": r.ticket_type,
            "registeredAt": r.created_at.isoformat() if r.created_at else None,
            "status": r.status
        })
    
    return {"users": users, "total": len(users)}


@router.post("", response_model=dict)
def create_registration(
    data: RegistrationCreate,
    db: Session = Depends(get_db)
):
    firm = None
    status = "pending_payment"
    ticket_type = "Paid"
    
    if data.access_code:
        firm = db.query(LawFirm).filter(
            LawFirm.code == data.access_code.upper().strip()
        ).first()
        if not firm:
            raise HTTPException(status_code=400, detail="Invalid Access Code")
        
        confirmed_count = db.query(Registration).filter(
            Registration.firm_id == firm.id,
            Registration.status == "confirmed",
            Registration.ticket_type == "Access Code"
        ).count()
        
        if confirmed_count < 2:
            status = "confirmed"
            ticket_type = "Access Code"
    
    registration = Registration(
        firm_id=firm.id if firm else None,
        full_name=data.full_name,
        email=data.email,
        phone=data.phone,
        job_title=data.job_title,
        company=data.company,
        status=status,
        ticket_type=ticket_type
    )
    
    db.add(registration)
    db.commit()
    db.refresh(registration)
    
    if status == "confirmed":
        ticket_code = generate_ticket_code()
        while db.query(Registration).filter(
            Registration.ticket_code == ticket_code
        ).first():
            ticket_code = generate_ticket_code()
        
        qr_data = generate_qr_data(
            ticket_code=ticket_code,
            registration_id=registration.id,
            full_name=registration.full_name,
            firm_name=firm.name if firm else None
        )
        
        registration.ticket_code = ticket_code
        registration.qr_data = qr_data
        db.commit()
        db.refresh(registration)
    
    message = "Registration successful"
    if status == "pending_payment":
        if firm:
            message = "Free registration limit reached. Payment required."
        else:
            message = "Payment required for public registration."
    
    return {
        "success": True,
        "status": status,
        "message": message,
        "registration": RegistrationResponse(
            id=registration.id,
            full_name=registration.full_name,
            email=registration.email,
            phone=registration.phone,
            job_title=registration.job_title,
            company=registration.company,
            status=registration.status,
            ticket_type=registration.ticket_type,
            ticket_code=registration.ticket_code,
            qr_data=registration.qr_data,
            created_at=registration.created_at,
            firm_name=firm.name if firm else None
        )
    }


@router.get("/{registration_id}", response_model=RegistrationResponse)
def get_registration(registration_id: int, db: Session = Depends(get_db)):
    registration = db.query(Registration).filter(
        Registration.id == registration_id
    ).first()
    if not registration:
        raise HTTPException(status_code=404, detail="Registration not found")
    
    return RegistrationResponse(
        id=registration.id,
        full_name=registration.full_name,
        email=registration.email,
        phone=registration.phone,
        job_title=registration.job_title,
        company=registration.company,
        status=registration.status,
        ticket_type=registration.ticket_type,
        ticket_code=registration.ticket_code,
        qr_data=registration.qr_data,
        created_at=registration.created_at,
        firm_name=registration.firm.name if registration.firm else None
    )


@router.get("/{registration_id}/ticket")
def get_ticket(registration_id: int, db: Session = Depends(get_db)):
    import qrcode
    import io
    import base64
    
    registration = db.query(Registration).filter(
        Registration.id == registration_id
    ).first()
    if not registration:
        raise HTTPException(status_code=404, detail="Registration not found")
    
    if not registration.ticket_code:
        raise HTTPException(status_code=400, detail="No ticket generated for this registration")
    
    # Generate QR code image
    qr = qrcode.QRCode(version=1, box_size=10, border=4)
    qr_content = registration.qr_data or registration.ticket_code
    qr.add_data(qr_content)
    qr.make(fit=True)
    
    img = qr.make_image(fill_color="black", back_color="white")
    buffer = io.BytesIO()
    img.save(buffer, format='PNG')
    buffer.seek(0)
    qr_base64 = base64.b64encode(buffer.getvalue()).decode('utf-8')
    
    return {
        "ticket_code": registration.ticket_code,
        "qr_image": qr_base64,
        "full_name": registration.full_name,
        "firm_name": registration.firm.name if registration.firm else None,
        "status": registration.status
    }


@router.post("/{registration_id}/payment-submitted")
def mark_payment_submitted(registration_id: int, db: Session = Depends(get_db)):
    registration = db.query(Registration).filter(
        Registration.id == registration_id
    ).first()
    if not registration:
        raise HTTPException(status_code=404, detail="Registration not found")
    
    # Update status to awaiting_verification so admin can see it
    registration.status = "awaiting_verification"
    db.commit()
    
    return {"success": True, "message": "Payment submission recorded. Awaiting admin verification."}


@router.post("/{registration_id}/verify-payment")
def verify_payment(registration_id: int, db: Session = Depends(get_db)):
    import qrcode
    import io
    import base64
    
    registration = db.query(Registration).filter(
        Registration.id == registration_id
    ).first()
    if not registration:
        raise HTTPException(status_code=404, detail="Registration not found")
    
    if registration.status == "confirmed":
        return {"success": True, "message": "Already confirmed"}
    
    # Generate ticket code if not exists
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
    
    # Confirm the registration
    registration.status = "confirmed"
    db.commit()
    
    # Generate QR code for email
    qr = qrcode.QRCode(version=1, box_size=10, border=4)
    qr.add_data(registration.qr_data or registration.ticket_code)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    buffer = io.BytesIO()
    img.save(buffer, format='PNG')
    buffer.seek(0)
    qr_base64 = base64.b64encode(buffer.getvalue()).decode('utf-8')
    
    # Log email simulation (in production, send actual email)
    print(f"""
    ======================================================
    [CONFIRMATION EMAIL SIMULATION]
    To: {registration.email}
    Subject: Your Conference Ticket - Payment Confirmed
    ======================================================
    
    Dear {registration.full_name},
    
    Your payment has been verified and your registration is now confirmed!
    
    **YOUR TICKET CODE: {registration.ticket_code}**
    
    Please save this code and present it at check-in.
    
    Event Details:
    - Ghana Competition Law Seminar
    - Mövenpick Ambassador Hotel, Accra
    
    We look forward to seeing you!
    
    Best regards,
    Conference Team
    ======================================================
    """)
    
    return {
        "success": True, 
        "message": "Payment verified and confirmation email sent",
        "ticket_code": registration.ticket_code
    }


@router.patch("/{registration_id}/confirm")
def confirm_registration(registration_id: int, db: Session = Depends(get_db)):
    registration = db.query(Registration).filter(
        Registration.id == registration_id
    ).first()
    if not registration:
        raise HTTPException(status_code=404, detail="Registration not found")
    
    if registration.status == "confirmed":
        return {"success": True, "message": "Already confirmed"}
    
    registration.status = "confirmed"
    
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
    
    return {"success": True}
