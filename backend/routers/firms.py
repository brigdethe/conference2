from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from database import get_db
from models import LawFirm, Registration
from schemas import LawFirmCreate, LawFirmResponse, FirmActivityResponse, RegistrationResponse, LawFirmUpdate
from utils import generate_firm_code

router = APIRouter(prefix="/api/firms", tags=["firms"])


@router.get("", response_model=List[LawFirmResponse])
def get_firms(db: Session = Depends(get_db)):
    firms = db.query(LawFirm).order_by(LawFirm.name).all()
    result = []
    for firm in firms:
        confirmed_count = db.query(Registration).filter(
            Registration.firm_id == firm.id,
            Registration.status == "confirmed",
            Registration.ticket_type == "Access Code"
        ).count()
        total_count = db.query(Registration).filter(
            Registration.firm_id == firm.id
        ).count()
        result.append(LawFirmResponse(
            id=firm.id,
            name=firm.name,
            code=firm.code,
            email=firm.email,
            created_at=firm.created_at,
            registration_count=total_count,
            confirmed_count=confirmed_count,
            free_slots_remaining=max(0, (firm.required_registrations or 1) - confirmed_count),
            required_registrations=firm.required_registrations or 1,
            is_law_firm=bool(firm.is_law_firm),
            logo_url=firm.logo_url
        ))
    return result


@router.post("", response_model=LawFirmResponse)
def create_firm(firm_data: LawFirmCreate, db: Session = Depends(get_db)):
    existing = db.query(LawFirm).filter(
        LawFirm.name.ilike(firm_data.name)
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Firm already exists")
    
    code = generate_firm_code(firm_data.name)
    while db.query(LawFirm).filter(LawFirm.code == code).first():
        code = generate_firm_code(firm_data.name)
    
    firm = LawFirm(
        name=firm_data.name, 
        code=code, 
        email=firm_data.email,
        required_registrations=firm_data.required_registrations,
        is_law_firm=1 if firm_data.is_law_firm else 0,
        logo_url=firm_data.logo_url
    )
    db.add(firm)
    db.commit()
    db.refresh(firm)
    
    return LawFirmResponse(
        id=firm.id,
        name=firm.name,
        code=firm.code,
        email=firm.email,
        created_at=firm.created_at,
        registration_count=0,
        confirmed_count=0,
        free_slots_remaining=firm.required_registrations or 1,
        required_registrations=firm.required_registrations or 1,
        is_law_firm=bool(firm.is_law_firm),
        logo_url=firm.logo_url
    )


@router.get("/activity", response_model=dict)
def get_firms_activity(db: Session = Depends(get_db)):
    firms = db.query(LawFirm).order_by(LawFirm.name).all()
    firm_activities = []
    
    for firm in firms:
        registrations = db.query(Registration).filter(
            Registration.firm_id == firm.id
        ).order_by(Registration.created_at.desc()).all()
        
        confirmed_access = sum(
            1 for r in registrations 
            if r.status == "confirmed" and r.ticket_type == "Access Code"
        )
        confirmed_paid = sum(
            1 for r in registrations 
            if r.status == "confirmed" and r.ticket_type == "Paid"
        )
        pending = sum(1 for r in registrations if r.status == "pending_payment")
        
        reg_responses = [
            RegistrationResponse(
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
                firm_name=firm.name
            )
            for r in registrations
        ]
        
        firm_activities.append(FirmActivityResponse(
            name=firm.name,
            code=firm.code,
            email=firm.email,
            total_registrations=len(registrations),
            confirmed_access_code=confirmed_access,
            confirmed_paid=confirmed_paid,
            pending_payment=pending,
            free_slots_remaining=max(0, (firm.required_registrations or 1) - confirmed_access),
            last_registration_at=registrations[0].created_at if registrations else None,
            registrations=reg_responses
        ))
    
    return {"firms": firm_activities, "total": len(firm_activities)}


@router.get("/by-code/{code}")
def get_firm_by_code(code: str, db: Session = Depends(get_db)):
    firm = db.query(LawFirm).filter(
        LawFirm.code == code.upper().strip()
    ).first()
    if not firm:
        raise HTTPException(status_code=404, detail="Firm not found")
    
    confirmed_count = db.query(Registration).filter(
        Registration.firm_id == firm.id,
        Registration.status == "confirmed",
        Registration.ticket_type == "Access Code"
    ).count()
    
    return LawFirmResponse(
        id=firm.id,
        name=firm.name,
        code=firm.code,
        created_at=firm.created_at,
        registration_count=db.query(Registration).filter(
            Registration.firm_id == firm.id
        ).count(),
        confirmed_count=confirmed_count,
        free_slots_remaining=max(0, (firm.required_registrations or 1) - confirmed_count),
        required_registrations=firm.required_registrations or 1,
        is_law_firm=bool(firm.is_law_firm),
        logo_url=firm.logo_url
    )


@router.patch("/{firm_id}", response_model=LawFirmResponse)
def update_firm(firm_id: int, firm_data: LawFirmUpdate, db: Session = Depends(get_db)):
    firm = db.query(LawFirm).filter(LawFirm.id == firm_id).first()
    if not firm:
        raise HTTPException(status_code=404, detail="Firm not found")
    
    if firm_data.name is not None:
        firm.name = firm_data.name
    if firm_data.email is not None:
        firm.email = firm_data.email
    if firm_data.required_registrations is not None:
        firm.required_registrations = firm_data.required_registrations
    if firm_data.is_law_firm is not None:
        firm.is_law_firm = 1 if firm_data.is_law_firm else 0
    if firm_data.logo_url is not None:
        firm.logo_url = firm_data.logo_url
    
    db.commit()
    db.refresh(firm)
    
    confirmed_count = db.query(Registration).filter(
        Registration.firm_id == firm.id,
        Registration.status == "confirmed",
        Registration.ticket_type == "Access Code"
    ).count()
    total_count = db.query(Registration).filter(
        Registration.firm_id == firm.id
    ).count()
    
    return LawFirmResponse(
        id=firm.id,
        name=firm.name,
        code=firm.code,
        email=firm.email,
        created_at=firm.created_at,
        registration_count=total_count,
        confirmed_count=confirmed_count,
        free_slots_remaining=max(0, (firm.required_registrations or 1) - confirmed_count),
        required_registrations=firm.required_registrations or 1,
        is_law_firm=bool(firm.is_law_firm),
        logo_url=firm.logo_url
    )


@router.delete("/{firm_id}")
def delete_firm(firm_id: int, db: Session = Depends(get_db)):
    firm = db.query(LawFirm).filter(LawFirm.id == firm_id).first()
    if not firm:
        raise HTTPException(status_code=404, detail="Firm not found")
    
    reg_count = db.query(Registration).filter(
        Registration.firm_id == firm_id
    ).count()
    if reg_count > 0:
        raise HTTPException(
            status_code=400, 
            detail="Cannot delete firm with existing registrations"
        )
    
    db.delete(firm)
    db.commit()
    return {"success": True}
