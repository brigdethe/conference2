from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from database import get_db
from models import Inquiry
from schemas import InquiryCreate, InquiryResponse

router = APIRouter(prefix="/api/inquiries", tags=["inquiries"])


@router.get("", response_model=List[InquiryResponse])
def get_inquiries(db: Session = Depends(get_db)):
    inquiries = db.query(Inquiry).order_by(Inquiry.created_at.desc()).all()
    return inquiries


@router.post("", response_model=InquiryResponse)
def create_inquiry(inquiry_data: InquiryCreate, db: Session = Depends(get_db)):
    inquiry = Inquiry(
        name=inquiry_data.name,
        email=inquiry_data.email,
        organization=inquiry_data.organization,
        inquiry_type=inquiry_data.inquiry_type,
        message=inquiry_data.message
    )
    db.add(inquiry)
    db.commit()
    db.refresh(inquiry)
    return inquiry


@router.patch("/{inquiry_id}/resolve")
def resolve_inquiry(inquiry_id: int, db: Session = Depends(get_db)):
    inquiry = db.query(Inquiry).filter(Inquiry.id == inquiry_id).first()
    if not inquiry:
        raise HTTPException(status_code=404, detail="Inquiry not found")
    
    inquiry.status = "resolved"
    db.commit()
    
    return {"success": True, "message": "Inquiry marked as resolved"}


@router.delete("/{inquiry_id}")
def delete_inquiry(inquiry_id: int, db: Session = Depends(get_db)):
    inquiry = db.query(Inquiry).filter(Inquiry.id == inquiry_id).first()
    if not inquiry:
        raise HTTPException(status_code=404, detail="Inquiry not found")
    
    db.delete(inquiry)
    db.commit()
    
    return {"success": True, "message": "Inquiry deleted"}
