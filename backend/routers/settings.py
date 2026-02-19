from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel

from database import get_db
from models import Settings, AdminNotificationRecipient
from schemas import SettingUpdate, SettingResponse

router = APIRouter(prefix="/api/settings", tags=["settings"])

DEFAULT_SETTINGS = {
    "ticket_price": "150",
    "merchant_code": "",
    "merchant_name": "",
    "smtp_email": "",
    "smtp_password": "",
    "smtp_sender_name": "Ghana Competition Law Seminar",
    "arkesel_api_key": "",
    "arkesel_sender_id": "",
    "test_sms_phone": "0241293754",
    "notifications_email_enabled": "true",
    "notifications_sms_enabled": "true",
    "max_capacity": "500"
}


@router.get("", response_model=List[SettingResponse])
def get_settings(db: Session = Depends(get_db)):
    settings = db.query(Settings).all()
    settings_dict = {s.key: s.value for s in settings}
    
    result = []
    for key, default in DEFAULT_SETTINGS.items():
        result.append(SettingResponse(
            key=key,
            value=settings_dict.get(key, default)
        ))
    
    return result


@router.post("/bulk")
def update_settings_bulk(
    settings: dict,
    db: Session = Depends(get_db)
):
    for key, value in settings.items():
        existing = db.query(Settings).filter(Settings.key == key).first()
        if existing:
            existing.value = str(value)
        else:
            db.add(Settings(key=key, value=str(value)))
    
    db.commit()
    return {"success": True}


class AdminRecipientCreate(BaseModel):
    recipient_type: str  # 'email' or 'phone'
    value: str


class AdminRecipientResponse(BaseModel):
    id: int
    recipient_type: str
    value: str
    enabled: bool

    class Config:
        from_attributes = True


@router.get("/admin-recipients")
def get_admin_recipients(db: Session = Depends(get_db)):
    recipients = db.query(AdminNotificationRecipient).all()
    return {
        "recipients": [
            {
                "id": r.id,
                "recipient_type": r.recipient_type,
                "value": r.value,
                "enabled": bool(r.enabled)
            }
            for r in recipients
        ]
    }


@router.post("/admin-recipients")
def add_admin_recipient(data: AdminRecipientCreate, db: Session = Depends(get_db)):
    if data.recipient_type not in ["email", "phone"]:
        raise HTTPException(status_code=400, detail="recipient_type must be 'email' or 'phone'")
    
    existing = db.query(AdminNotificationRecipient).filter(
        AdminNotificationRecipient.recipient_type == data.recipient_type,
        AdminNotificationRecipient.value == data.value
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Recipient already exists")
    
    recipient = AdminNotificationRecipient(
        recipient_type=data.recipient_type,
        value=data.value,
        enabled=1
    )
    db.add(recipient)
    db.commit()
    db.refresh(recipient)
    
    return {"success": True, "id": recipient.id}


@router.patch("/admin-recipients/{recipient_id}/toggle")
def toggle_admin_recipient(recipient_id: int, db: Session = Depends(get_db)):
    recipient = db.query(AdminNotificationRecipient).filter(
        AdminNotificationRecipient.id == recipient_id
    ).first()
    
    if not recipient:
        raise HTTPException(status_code=404, detail="Recipient not found")
    
    recipient.enabled = 0 if recipient.enabled else 1
    db.commit()
    
    return {"success": True, "enabled": bool(recipient.enabled)}


@router.delete("/admin-recipients/{recipient_id}")
def delete_admin_recipient(recipient_id: int, db: Session = Depends(get_db)):
    recipient = db.query(AdminNotificationRecipient).filter(
        AdminNotificationRecipient.id == recipient_id
    ).first()
    
    if not recipient:
        raise HTTPException(status_code=404, detail="Recipient not found")
    
    db.delete(recipient)
    db.commit()
    
    return {"success": True}


@router.get("/{key}", response_model=SettingResponse)
def get_setting(key: str, db: Session = Depends(get_db)):
    setting = db.query(Settings).filter(Settings.key == key).first()
    default = DEFAULT_SETTINGS.get(key, "")
    
    return SettingResponse(
        key=key,
        value=setting.value if setting else default
    )


@router.put("/{key}", response_model=SettingResponse)
def update_setting(key: str, data: SettingUpdate, db: Session = Depends(get_db)):
    setting = db.query(Settings).filter(Settings.key == key).first()
    
    if setting:
        setting.value = data.value
    else:
        setting = Settings(key=key, value=data.value)
        db.add(setting)
    
    db.commit()
    db.refresh(setting)
    
    return SettingResponse(key=setting.key, value=setting.value)
