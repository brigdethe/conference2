from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
import httpx

from database import get_db
from models import Settings

router = APIRouter(prefix="/api/notifications", tags=["notifications"])


def get_setting(db: Session, key: str, default: str = "") -> str:
    setting = db.query(Settings).filter(Settings.key == key).first()
    return setting.value if setting else default


class EmailRequest(BaseModel):
    to: str
    subject: str
    body: str


class SMSRequest(BaseModel):
    to: str
    message: str


@router.post("/email")
async def send_email(data: EmailRequest, db: Session = Depends(get_db)):
    smtp_email = get_setting(db, "smtp_email")
    smtp_password = get_setting(db, "smtp_password")
    
    if not smtp_email or not smtp_password:
        raise HTTPException(
            status_code=400, 
            detail="SMTP credentials not configured"
        )
    
    try:
        import aiosmtplib
        from email.mime.text import MIMEText
        from email.mime.multipart import MIMEMultipart
        
        message = MIMEMultipart()
        message["From"] = smtp_email
        message["To"] = data.to
        message["Subject"] = data.subject
        message.attach(MIMEText(data.body, "plain"))
        
        await aiosmtplib.send(
            message,
            hostname="smtp.gmail.com",
            port=587,
            start_tls=True,
            username=smtp_email,
            password=smtp_password
        )
        
        return {"success": True, "message": "Email sent successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send email: {str(e)}")


@router.post("/sms")
async def send_sms(data: SMSRequest, db: Session = Depends(get_db)):
    api_key = get_setting(db, "arkesel_api_key")
    sender_id = get_setting(db, "arkesel_sender_id", "Conference")
    
    if not api_key:
        raise HTTPException(
            status_code=400, 
            detail="Arkesel API key not configured"
        )
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://sms.arkesel.com/api/v2/sms/send",
                headers={
                    "api-key": api_key,
                    "Content-Type": "application/json"
                },
                json={
                    "sender": sender_id,
                    "message": data.message,
                    "recipients": [data.to]
                }
            )
            
            if response.status_code == 200:
                return {"success": True, "message": "SMS sent successfully"}
            else:
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"Arkesel error: {response.text}"
                )
    except httpx.RequestError as e:
        raise HTTPException(status_code=500, detail=f"Failed to send SMS: {str(e)}")


@router.post("/test-email")
async def test_email(db: Session = Depends(get_db)):
    smtp_email = get_setting(db, "smtp_email")
    smtp_password = get_setting(db, "smtp_password")
    
    if not smtp_email or not smtp_password:
        return {"success": False, "message": "SMTP credentials not configured"}
    
    try:
        import aiosmtplib
        
        await aiosmtplib.SMTP(
            hostname="smtp.gmail.com",
            port=587,
            start_tls=True,
            username=smtp_email,
            password=smtp_password
        ).connect()
        
        return {"success": True, "message": "SMTP connection successful"}
    except Exception as e:
        return {"success": False, "message": str(e)}


@router.post("/test-sms")
async def test_sms(db: Session = Depends(get_db)):
    api_key = get_setting(db, "arkesel_api_key")
    
    if not api_key:
        return {"success": False, "message": "Arkesel API key not configured"}
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://sms.arkesel.com/api/v2/sms/balance",
                headers={"api-key": api_key}
            )
            
            if response.status_code == 200:
                data = response.json()
                return {
                    "success": True, 
                    "message": "Arkesel connection successful",
                    "balance": data.get("balance")
                }
            else:
                return {"success": False, "message": f"API error: {response.text}"}
    except Exception as e:
        return {"success": False, "message": str(e)}
