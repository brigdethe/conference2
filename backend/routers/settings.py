from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

from database import get_db
from models import Settings
from schemas import SettingUpdate, SettingResponse

router = APIRouter(prefix="/api/settings", tags=["settings"])

DEFAULT_SETTINGS = {
    "ticket_price": "150",
    "merchant_code": "",
    "merchant_name": "",
    "smtp_email": "",
    "smtp_password": "",
    "arkesel_api_key": "",
    "arkesel_sender_id": ""
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
