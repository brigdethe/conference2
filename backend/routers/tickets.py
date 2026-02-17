from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
import json

from database import get_db
from models import Registration, CheckIn
from schemas import CheckInCreate, CheckInResponse, RegistrationResponse
from utils import generate_qr_image_base64

router = APIRouter(prefix="/api/tickets", tags=["tickets"])


@router.get("")
def get_active_tickets(db: Session = Depends(get_db)):
    registrations = db.query(Registration).filter(
        Registration.status == "confirmed",
        Registration.ticket_code.isnot(None)
    ).order_by(Registration.created_at.desc()).all()
    
    tickets = []
    for r in registrations:
        checked_in = db.query(CheckIn).filter(
            CheckIn.registration_id == r.id
        ).first()
        
        tickets.append({
            "id": r.id,
            "ticket_code": r.ticket_code,
            "full_name": r.full_name,
            "email": r.email,
            "firm_name": r.firm.name if r.firm else None,
            "ticket_type": r.ticket_type,
            "checked_in": checked_in is not None,
            "checked_in_at": checked_in.checked_in_at.isoformat() if checked_in else None,
            "created_at": r.created_at.isoformat()
        })
    
    return {"tickets": tickets, "total": len(tickets)}


@router.get("/{ticket_code}")
def get_ticket(ticket_code: str, db: Session = Depends(get_db)):
    registration = db.query(Registration).filter(
        Registration.ticket_code == ticket_code.upper().strip()
    ).first()
    
    if not registration:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    checked_in = db.query(CheckIn).filter(
        CheckIn.registration_id == registration.id
    ).first()
    
    return {
        "id": registration.id,
        "ticket_code": registration.ticket_code,
        "full_name": registration.full_name,
        "email": registration.email,
        "phone": registration.phone,
        "firm_name": registration.firm.name if registration.firm else None,
        "ticket_type": registration.ticket_type,
        "status": registration.status,
        "checked_in": checked_in is not None,
        "checked_in_at": checked_in.checked_in_at.isoformat() if checked_in else None,
        "qr_data": registration.qr_data
    }


@router.get("/{ticket_code}/qr")
def get_ticket_qr(ticket_code: str, db: Session = Depends(get_db)):
    registration = db.query(Registration).filter(
        Registration.ticket_code == ticket_code.upper().strip()
    ).first()
    
    if not registration:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    if not registration.qr_data:
        raise HTTPException(status_code=400, detail="No QR data available")
    
    qr_image = generate_qr_image_base64(registration.qr_data)
    
    return {
        "ticket_code": registration.ticket_code,
        "qr_image": qr_image,
        "qr_data": registration.qr_data
    }


@router.post("/verify")
def verify_ticket(data: CheckInCreate, db: Session = Depends(get_db)):
    registration = None
    method = "code"
    
    if data.ticket_code:
        registration = db.query(Registration).filter(
            Registration.ticket_code == data.ticket_code.upper().strip()
        ).first()
        method = "code"
    elif data.qr_data:
        try:
            qr_content = json.loads(data.qr_data)
            ticket_code = qr_content.get("ticketCode")
            if ticket_code:
                registration = db.query(Registration).filter(
                    Registration.ticket_code == ticket_code.upper().strip()
                ).first()
                method = "qr"
        except json.JSONDecodeError:
            raise HTTPException(status_code=400, detail="Invalid QR data")
    
    if not registration:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    if registration.status != "confirmed":
        raise HTTPException(status_code=400, detail="Ticket not confirmed")
    
    existing_checkin = db.query(CheckIn).filter(
        CheckIn.registration_id == registration.id
    ).first()
    
    return {
        "valid": True,
        "already_checked_in": existing_checkin is not None,
        "checked_in_at": existing_checkin.checked_in_at.isoformat() if existing_checkin else None,
        "registration": {
            "id": registration.id,
            "full_name": registration.full_name,
            "email": registration.email,
            "firm_name": registration.firm.name if registration.firm else None,
            "ticket_type": registration.ticket_type
        }
    }


@router.post("/checkin")
def check_in_ticket(data: CheckInCreate, db: Session = Depends(get_db)):
    registration = None
    method = "code"
    
    if data.ticket_code:
        registration = db.query(Registration).filter(
            Registration.ticket_code == data.ticket_code.upper().strip()
        ).first()
        method = "code"
    elif data.qr_data:
        try:
            qr_content = json.loads(data.qr_data)
            ticket_code = qr_content.get("ticketCode")
            if ticket_code:
                registration = db.query(Registration).filter(
                    Registration.ticket_code == ticket_code.upper().strip()
                ).first()
                method = "qr"
        except json.JSONDecodeError:
            raise HTTPException(status_code=400, detail="Invalid QR data")
    
    if not registration:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    if registration.status != "confirmed":
        raise HTTPException(status_code=400, detail="Ticket not confirmed")
    
    existing_checkin = db.query(CheckIn).filter(
        CheckIn.registration_id == registration.id
    ).first()
    
    if existing_checkin:
        return {
            "success": False,
            "message": "Already checked in",
            "checked_in_at": existing_checkin.checked_in_at.isoformat()
        }
    
    checkin = CheckIn(
        registration_id=registration.id,
        method=method
    )
    db.add(checkin)
    db.commit()
    db.refresh(checkin)
    
    return {
        "success": True,
        "message": "Check-in successful",
        "check_in": CheckInResponse(
            id=checkin.id,
            registration_id=checkin.registration_id,
            checked_in_at=checkin.checked_in_at,
            method=checkin.method
        )
    }


@router.get("/checkins/stats")
def get_checkin_stats(db: Session = Depends(get_db)):
    total_tickets = db.query(Registration).filter(
        Registration.status == "confirmed",
        Registration.ticket_code.isnot(None)
    ).count()
    
    checked_in = db.query(CheckIn).count()
    
    return {
        "total_tickets": total_tickets,
        "checked_in": checked_in,
        "remaining": total_tickets - checked_in
    }
