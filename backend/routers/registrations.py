from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel

from database import get_db
from models import LawFirm, Registration, Settings
from schemas import RegistrationCreate, RegistrationResponse
from utils import generate_ticket_code, generate_qr_data
from routers.notifications import send_ticket_notification, send_admin_payment_notification

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


@router.get("/pending-payments")
def get_pending_payments(db: Session = Depends(get_db)):
    registrations = db.query(Registration).filter(
        Registration.status == "awaiting_verification"
    ).order_by(Registration.created_at.desc()).all()
    
    result = []
    for r in registrations:
        result.append({
            "id": r.id,
            "fullName": r.full_name,
            "email": r.email,
            "firmName": r.firm.name if r.firm else None,
            "status": r.status,
            "registeredAt": r.created_at.isoformat() if r.created_at else None
        })
    
    return {"registrations": result}


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
        company = r.company if r.company and r.company.strip() else None
        # Show law firm if available, otherwise show company
        organization = firm_name or company or None
        users.append({
            "id": r.id,
            "fullName": r.full_name,
            "jobTitle": r.job_title,
            "lawFirm": firm_name,
            "company": company,
            "organization": organization,
            "email": r.email,
            "phone": r.phone,
            "attendanceType": "In-Person",
            "ticketType": r.ticket_type,
            "registeredAt": r.created_at.isoformat() if r.created_at else None,
            "status": r.status
        })
    
    return {"users": users, "total": len(users)}


@router.post("", response_model=dict)
async def create_registration(
    data: RegistrationCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    from routers.notifications import send_pending_approval_notification, send_admin_approval_needed_notification
    
    firm = None
    status = "pending_approval"  # Default to pending approval
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
        else:
            # Code limit reached - requires approval
            status = "pending_approval"
    
    registration = Registration(
        firm_id=firm.id if firm else None,
        full_name=data.full_name,
        email=data.email,
        phone=data.phone,
        job_title=data.job_title,
        company=data.company,
        status=status,
        ticket_type=ticket_type,
        reason_for_attending=data.reason_for_attending
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
        
        # Send ticket notification in background
        await send_ticket_notification(
            db=db,
            email=registration.email,
            phone=registration.phone,
            full_name=registration.full_name,
            ticket_code=ticket_code,
            qr_data=qr_data,
            org_name=firm.name if firm else None
        )
    
    message = "Registration successful"
    if status == "pending_approval":
        message = "Your registration is pending approval. You will receive an email once approved."
        # Send notifications for pending approval
        await send_pending_approval_notification(
            db=db,
            email=registration.email,
            full_name=registration.full_name
        )
        await send_admin_approval_needed_notification(
            db=db,
            full_name=registration.full_name,
            email=registration.email,
            phone=registration.phone,
            org_name=registration.company,
            reason=registration.reason_for_attending
        )
    
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
            reason_for_attending=registration.reason_for_attending,
            approved_at=registration.approved_at,
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
        "firm_logo": registration.firm.logo_url if registration.firm else None,
        "status": registration.status
    }


@router.get("/{registration_id}/status")
def get_registration_status(registration_id: int, db: Session = Depends(get_db)):
    registration = db.query(Registration).filter(
        Registration.id == registration_id
    ).first()
    if not registration:
        raise HTTPException(status_code=404, detail="Registration not found")
    
    return {
        "status": registration.status,
        "ticket_code": registration.ticket_code
    }


@router.post("/{registration_id}/payment-submitted")
async def mark_payment_submitted(registration_id: int, db: Session = Depends(get_db)):
    registration = db.query(Registration).filter(
        Registration.id == registration_id
    ).first()
    if not registration:
        raise HTTPException(status_code=404, detail="Registration not found")
    
    # Update status to awaiting_verification so admin can see it
    registration.status = "awaiting_verification"
    db.commit()
    
    # Get ticket price for notification
    ticket_price = int(get_setting(db, "ticket_price", "150"))
    
    # Notify admins
    await send_admin_payment_notification(
        db=db,
        full_name=registration.full_name,
        email=registration.email,
        phone=registration.phone,
        org_name=registration.firm.name if registration.firm else registration.company,
        amount=ticket_price
    )
    
    return {"success": True, "message": "Payment submission recorded. Awaiting admin verification."}


@router.post("/{registration_id}/verify-payment")
async def verify_payment(registration_id: int, db: Session = Depends(get_db)):
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
    
    return {
        "success": True, 
        "message": "Payment verified and confirmation sent",
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


@router.get("/pending-approvals", response_model=dict)
def get_pending_approvals(db: Session = Depends(get_db)):
    """Get all registrations pending approval"""
    registrations = db.query(Registration).filter(
        Registration.status == "pending_approval"
    ).order_by(Registration.created_at.desc()).all()
    
    result = []
    for r in registrations:
        result.append({
            "id": r.id,
            "fullName": r.full_name,
            "email": r.email,
            "phone": r.phone,
            "company": r.company,
            "jobTitle": r.job_title,
            "firmName": r.firm.name if r.firm else None,
            "reasonForAttending": r.reason_for_attending,
            "registeredAt": r.created_at.isoformat() if r.created_at else None
        })
    
    return {"registrations": result, "total": len(result)}


@router.post("/{registration_id}/approve")
async def approve_registration(registration_id: int, db: Session = Depends(get_db)):
    """Approve a pending registration and send payment link"""
    from routers.notifications import send_approval_with_payment_link
    from datetime import datetime
    
    registration = db.query(Registration).filter(
        Registration.id == registration_id
    ).first()
    if not registration:
        raise HTTPException(status_code=404, detail="Registration not found")
    
    if registration.status != "pending_approval":
        raise HTTPException(status_code=400, detail="Registration is not pending approval")
    
    # Update status and set approved_at timestamp
    registration.status = "pending_payment"
    registration.approved_at = datetime.utcnow()
    db.commit()
    
    # Send payment link notification
    await send_approval_with_payment_link(
        db=db,
        email=registration.email,
        phone=registration.phone,
        full_name=registration.full_name,
        registration_id=registration.id
    )
    
    return {
        "success": True,
        "message": "Registration approved. Payment link sent to user."
    }


class RejectRequest(BaseModel):
    reason: Optional[str] = None


@router.post("/{registration_id}/reject")
async def reject_registration(
    registration_id: int,
    data: RejectRequest = None,
    db: Session = Depends(get_db)
):
    """Reject a pending registration"""
    from routers.notifications import send_rejection_notification
    
    registration = db.query(Registration).filter(
        Registration.id == registration_id
    ).first()
    if not registration:
        raise HTTPException(status_code=404, detail="Registration not found")
    
    if registration.status != "pending_approval":
        raise HTTPException(status_code=400, detail="Registration is not pending approval")
    
    # Update status to rejected
    registration.status = "rejected"
    db.commit()
    
    # Send rejection notification
    rejection_reason = data.reason if data else None
    await send_rejection_notification(
        db=db,
        email=registration.email,
        full_name=registration.full_name,
        reason=rejection_reason
    )
    
    return {
        "success": True,
        "message": "Registration rejected. User has been notified."
    }
