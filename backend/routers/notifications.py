from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
import httpx
import io
import base64
import qrcode
import asyncio

from database import get_db
from models import Settings, AdminNotificationRecipient

router = APIRouter(prefix="/api/notifications", tags=["notifications"])


def get_setting(db: Session, key: str, default: str = "") -> str:
    setting = db.query(Settings).filter(Settings.key == key).first()
    return setting.value if setting else default


def generate_qr_image(data: str) -> bytes:
    """Generate QR code image as PNG bytes"""
    qr = qrcode.QRCode(version=1, box_size=10, border=4)
    qr.add_data(data)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    buffer = io.BytesIO()
    img.save(buffer, format='PNG')
    buffer.seek(0)
    return buffer.getvalue()


async def send_email_internal(
    db: Session,
    to: str,
    subject: str,
    html_body: str,
    attachments: List[tuple] = None  # List of (filename, content_bytes, mime_type)
) -> bool:
    """Internal helper to send email with optional attachments"""
    smtp_email = get_setting(db, "smtp_email")
    smtp_password = get_setting(db, "smtp_password")
    sender_name = get_setting(db, "smtp_sender_name", "Ghana Competition Law Seminar")
    
    if not smtp_email or not smtp_password:
        return False
    
    try:
        import aiosmtplib
        from email.mime.text import MIMEText
        from email.mime.multipart import MIMEMultipart
        from email.mime.base import MIMEBase
        from email.mime.image import MIMEImage
        from email.utils import formataddr
        from email import encoders
        
        message = MIMEMultipart("mixed")
        message["From"] = formataddr((sender_name, smtp_email))
        message["To"] = to
        message["Subject"] = subject
        
        # Add HTML body
        html_part = MIMEText(html_body, "html")
        message.attach(html_part)
        
        # Add attachments
        if attachments:
            for filename, content, mime_type in attachments:
                if mime_type.startswith("image/"):
                    part = MIMEImage(content, name=filename)
                else:
                    part = MIMEBase("application", "octet-stream")
                    part.set_payload(content)
                    encoders.encode_base64(part)
                part.add_header("Content-Disposition", f"attachment; filename={filename}")
                message.attach(part)
        
        # Try port 465 first, then 587
        try:
            await asyncio.wait_for(
                aiosmtplib.send(
                    message,
                    hostname="smtp.gmail.com",
                    port=465,
                    use_tls=True,
                    username=smtp_email,
                    password=smtp_password
                ),
                timeout=15
            )
            return True
        except:
            await asyncio.wait_for(
                aiosmtplib.send(
                    message,
                    hostname="smtp.gmail.com",
                    port=587,
                    start_tls=True,
                    username=smtp_email,
                    password=smtp_password
                ),
                timeout=15
            )
            return True
    except Exception as e:
        print(f"Email send error: {e}")
        return False


async def send_sms_internal(db: Session, to: str, message: str) -> bool:
    """Internal helper to send SMS"""
    api_key = get_setting(db, "arkesel_api_key")
    sender_id = get_setting(db, "arkesel_sender_id", "Conference")
    
    if not api_key:
        return False
    
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            response = await client.post(
                "https://sms.arkesel.com/api/v2/sms/send",
                headers={
                    "api-key": api_key,
                    "Content-Type": "application/json"
                },
                json={
                    "sender": sender_id,
                    "message": message,
                    "recipients": [to]
                }
            )
            return response.status_code == 200
    except Exception as e:
        print(f"SMS send error: {e}")
        return False


async def send_ticket_notification(
    db: Session,
    email: str,
    phone: str,
    full_name: str,
    ticket_code: str,
    qr_data: str,
    org_name: str = None
):
    """Send ticket email and SMS to user after successful registration/payment"""
    email_enabled = get_setting(db, "notifications_email_enabled", "true") == "true"
    sms_enabled = get_setting(db, "notifications_sms_enabled", "true") == "true"
    
    # Generate QR code image
    qr_bytes = generate_qr_image(qr_data)
    qr_base64 = base64.b64encode(qr_bytes).decode()
    
    # Email with QR attachment
    if email_enabled and email:
        html_body = f"""
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #5b3426; text-align: center;">Ghana Competition Law Seminar</h2>
            <p style="text-align: center; color: #666;">Your Conference Ticket</p>
            
            <div style="background: #f8f2e8; border-radius: 12px; padding: 20px; margin: 20px 0; text-align: center;">
                <p style="font-size: 12px; color: #7b6a5e; margin: 0 0 8px;">Ticket Code</p>
                <p style="font-size: 32px; font-family: monospace; font-weight: bold; color: #5b3426; letter-spacing: 4px; margin: 0;">{ticket_code}</p>
            </div>
            
            <div style="text-align: center; margin: 20px 0;">
                <img src="cid:qrcode" alt="QR Code" style="width: 180px; height: 180px;" />
            </div>
            
            <p style="text-align: center; color: #666; font-size: 14px;">
                Dear {full_name},<br><br>
                Your registration is confirmed. Present this ticket at check-in.<br>
                {f'Organization: {org_name}' if org_name else ''}
            </p>
            
            <p style="text-align: center; color: #999; font-size: 12px; margin-top: 30px;">
                Mövenpick Ambassador Hotel, Accra
            </p>
        </div>
        """
        
        # Create inline image for email body
        try:
            import aiosmtplib
            from email.mime.text import MIMEText
            from email.mime.multipart import MIMEMultipart
            from email.mime.image import MIMEImage
            from email.utils import formataddr
            
            smtp_email = get_setting(db, "smtp_email")
            smtp_password = get_setting(db, "smtp_password")
            sender_name = get_setting(db, "smtp_sender_name", "Ghana Competition Law Seminar")
            
            if smtp_email and smtp_password:
                message = MIMEMultipart("related")
                message["From"] = formataddr((sender_name, smtp_email))
                message["To"] = email
                message["Subject"] = f"Your Conference Ticket - {ticket_code}"
                
                # HTML part
                html_part = MIMEText(html_body, "html")
                message.attach(html_part)
                
                # Inline QR image
                qr_image = MIMEImage(qr_bytes)
                qr_image.add_header("Content-ID", "<qrcode>")
                qr_image.add_header("Content-Disposition", "inline", filename=f"ticket-{ticket_code}.png")
                message.attach(qr_image)
                
                # Also attach as downloadable
                qr_attachment = MIMEImage(qr_bytes)
                qr_attachment.add_header("Content-Disposition", "attachment", filename=f"ticket-{ticket_code}.png")
                message.attach(qr_attachment)
                
                try:
                    await asyncio.wait_for(
                        aiosmtplib.send(
                            message,
                            hostname="smtp.gmail.com",
                            port=465,
                            use_tls=True,
                            username=smtp_email,
                            password=smtp_password
                        ),
                        timeout=15
                    )
                except:
                    await asyncio.wait_for(
                        aiosmtplib.send(
                            message,
                            hostname="smtp.gmail.com",
                            port=587,
                            start_tls=True,
                            username=smtp_email,
                            password=smtp_password
                        ),
                        timeout=15
                    )
        except Exception as e:
            print(f"Ticket email error: {e}")
    
    # SMS
    if sms_enabled and phone:
        sms_message = f"Registration Successful! Ghana Competition Law Seminar - Your ticket code: {ticket_code}. Venue: Movenpick Ambassador Hotel, Accra. Present this code at check-in. See you there!"
        await send_sms_internal(db, phone, sms_message)


async def send_admin_payment_notification(
    db: Session,
    full_name: str,
    email: str,
    phone: str,
    org_name: str,
    amount: int
):
    """Notify admins when payment is submitted and awaiting verification"""
    email_enabled = get_setting(db, "notifications_email_enabled", "true") == "true"
    sms_enabled = get_setting(db, "notifications_sms_enabled", "true") == "true"
    
    # Get admin recipients
    recipients = db.query(AdminNotificationRecipient).filter(
        AdminNotificationRecipient.enabled == 1
    ).all()
    
    admin_emails = [r.value for r in recipients if r.recipient_type == "email"]
    admin_phones = [r.value for r in recipients if r.recipient_type == "phone"]
    
    # Email to admins
    if email_enabled and admin_emails:
        html_body = f"""
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #5b3426;">Payment Verification Required</h2>
            <p>A new payment has been submitted and requires verification.</p>
            
            <div style="background: #f5f5f5; border-radius: 8px; padding: 15px; margin: 15px 0;">
                <p><strong>Name:</strong> {full_name}</p>
                <p><strong>Email:</strong> {email}</p>
                <p><strong>Phone:</strong> {phone or 'N/A'}</p>
                <p><strong>Organization:</strong> {org_name or 'N/A'}</p>
                <p><strong>Amount:</strong> GHS {amount}</p>
            </div>
            
            <p>Please log in to the admin panel to verify this payment.</p>
        </div>
        """
        
        for admin_email in admin_emails:
            await send_email_internal(
                db, admin_email,
                f"Payment Verification Required - {full_name}",
                html_body
            )
    
    # SMS to admins
    if sms_enabled and admin_phones:
        sms_message = f"Payment verification needed: {full_name} ({org_name or 'Public'}) - GHS {amount}. Check admin panel."
        for admin_phone in admin_phones:
            await send_sms_internal(db, admin_phone, sms_message)


async def send_pending_approval_notification(
    db: Session,
    email: str,
    full_name: str
):
    """Send email to user that their registration is pending approval"""
    email_enabled = get_setting(db, "notifications_email_enabled", "true") == "true"
    
    if email_enabled and email:
        html_body = f"""
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #5b3426; text-align: center;">Ghana Competition Law Seminar</h2>
            <p style="text-align: center; color: #666;">Registration Received</p>
            
            <div style="background: #fff8e1; border-radius: 12px; padding: 20px; margin: 20px 0; text-align: center; border: 1px solid #ffcc80;">
                <p style="font-size: 18px; font-weight: bold; color: #e65100; margin: 0 0 8px;">Pending Approval</p>
                <p style="color: #666; margin: 0;">Your registration is being reviewed by our team.</p>
            </div>
            
            <p style="text-align: center; color: #666; font-size: 14px;">
                Dear {full_name},<br><br>
                Thank you for your interest in the Ghana Competition Law Seminar.<br><br>
                Your registration has been received and is currently pending approval. 
                Once approved, you will receive an email with a payment link to complete your registration.<br><br>
                <strong>Event Details:</strong><br>
                📅 March 25, 2026 | 9:00 AM - 3:00 PM<br>
                📍 Mövenpick Ambassador Hotel, Accra
            </p>
            
            <p style="text-align: center; color: #999; font-size: 12px; margin-top: 30px;">
                We will notify you once your registration has been reviewed.
            </p>
        </div>
        """
        
        await send_email_internal(
            db, email,
            "Registration Received - Pending Approval",
            html_body
        )


async def send_admin_approval_needed_notification(
    db: Session,
    full_name: str,
    email: str,
    phone: str,
    org_name: str,
    reason: str
):
    """Notify admins when a new registration needs approval"""
    email_enabled = get_setting(db, "notifications_email_enabled", "true") == "true"
    sms_enabled = get_setting(db, "notifications_sms_enabled", "true") == "true"
    
    # Get admin recipients
    recipients = db.query(AdminNotificationRecipient).filter(
        AdminNotificationRecipient.enabled == 1
    ).all()
    
    admin_emails = [r.value for r in recipients if r.recipient_type == "email"]
    admin_phones = [r.value for r in recipients if r.recipient_type == "phone"]
    
    # Email to admins
    if email_enabled and admin_emails:
        html_body = f"""
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #5b3426;">New Registration Needs Approval</h2>
            <p>A new registration has been submitted and requires your approval.</p>
            
            <div style="background: #f5f5f5; border-radius: 8px; padding: 15px; margin: 15px 0;">
                <p><strong>Name:</strong> {full_name}</p>
                <p><strong>Email:</strong> {email}</p>
                <p><strong>Phone:</strong> {phone or 'N/A'}</p>
                <p><strong>Organization:</strong> {org_name or 'N/A'}</p>
                <p><strong>Reason for Attending:</strong></p>
                <p style="background: #fff; padding: 10px; border-radius: 4px; font-style: italic;">{reason or 'Not provided'}</p>
            </div>
            
            <p>Please log in to the admin panel to approve or reject this registration.</p>
        </div>
        """
        
        for admin_email in admin_emails:
            await send_email_internal(
                db, admin_email,
                f"Approval Needed - {full_name}",
                html_body
            )
    
    # SMS to admins
    if sms_enabled and admin_phones:
        sms_message = f"New registration needs approval: {full_name} ({org_name or 'Public'}). Check admin panel."
        for admin_phone in admin_phones:
            await send_sms_internal(db, admin_phone, sms_message)


async def send_approval_with_payment_link(
    db: Session,
    email: str,
    phone: str,
    full_name: str,
    registration_id: int
):
    """Send approval notification with payment link to user"""
    email_enabled = get_setting(db, "notifications_email_enabled", "true") == "true"
    sms_enabled = get_setting(db, "notifications_sms_enabled", "true") == "true"
    
    base_url = get_setting(db, "base_url", "https://seminar.cmc-ghana.com")
    payment_link = f"{base_url}/payment?id={registration_id}"
    
    if email_enabled and email:
        html_body = f"""
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #5b3426; text-align: center;">Ghana Competition Law Seminar</h2>
            <p style="text-align: center; color: #666;">Registration Approved!</p>
            
            <div style="background: #e8f5e9; border-radius: 12px; padding: 20px; margin: 20px 0; text-align: center; border: 1px solid #a5d6a7;">
                <p style="font-size: 18px; font-weight: bold; color: #2e7d32; margin: 0 0 8px;">✓ Approved</p>
                <p style="color: #666; margin: 0;">Your registration has been approved!</p>
            </div>
            
            <p style="text-align: center; color: #666; font-size: 14px;">
                Dear {full_name},<br><br>
                Great news! Your registration for the Ghana Competition Law Seminar has been approved.<br><br>
                Please complete your payment within <strong>3 days</strong> to secure your spot.
            </p>
            
            <div style="text-align: center; margin: 25px 0;">
                <a href="{payment_link}" style="display: inline-block; background: #e78745; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                    Complete Payment
                </a>
            </div>
            
            <p style="text-align: center; color: #999; font-size: 12px;">
                <strong>Event Details:</strong><br>
                📅 March 25, 2026 | 9:00 AM - 3:00 PM<br>
                📍 Mövenpick Ambassador Hotel, Accra<br><br>
                ⚠️ This payment link expires in 3 days.
            </p>
        </div>
        """
        
        await send_email_internal(
            db, email,
            "Registration Approved - Complete Your Payment",
            html_body
        )
    
    if sms_enabled and phone:
        sms_message = f"Good news {full_name}! Your registration for Ghana Competition Law Seminar is approved. Pay within 3 days: {payment_link}"
        await send_sms_internal(db, phone, sms_message)


async def send_rejection_notification(
    db: Session,
    email: str,
    full_name: str,
    reason: str = None
):
    """Send rejection notification to user"""
    email_enabled = get_setting(db, "notifications_email_enabled", "true") == "true"
    
    if email_enabled and email:
        reason_text = f"<p style='background: #fff; padding: 10px; border-radius: 4px;'><strong>Reason:</strong> {reason}</p>" if reason else ""
        
        html_body = f"""
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #5b3426; text-align: center;">Ghana Competition Law Seminar</h2>
            <p style="text-align: center; color: #666;">Registration Update</p>
            
            <div style="background: #ffebee; border-radius: 12px; padding: 20px; margin: 20px 0; text-align: center; border: 1px solid #ef9a9a;">
                <p style="font-size: 18px; font-weight: bold; color: #c62828; margin: 0 0 8px;">Registration Not Approved</p>
            </div>
            
            <p style="text-align: center; color: #666; font-size: 14px;">
                Dear {full_name},<br><br>
                Thank you for your interest in the Ghana Competition Law Seminar.<br><br>
                Unfortunately, we are unable to approve your registration at this time.
            </p>
            
            {reason_text}
            
            <p style="text-align: center; color: #999; font-size: 12px; margin-top: 30px;">
                If you have any questions, please contact us.
            </p>
        </div>
        """
        
        await send_email_internal(
            db, email,
            "Registration Update - Ghana Competition Law Seminar",
            html_body
        )


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
    sender_name = get_setting(db, "smtp_sender_name", "Ghana Competition Law Seminar")
    
    if not smtp_email or not smtp_password:
        raise HTTPException(
            status_code=400, 
            detail="SMTP credentials not configured"
        )
    
    try:
        import aiosmtplib
        from email.mime.text import MIMEText
        from email.mime.multipart import MIMEMultipart
        from email.utils import formataddr
        
        message = MIMEMultipart()
        message["From"] = formataddr((sender_name, smtp_email))
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


class TestEmailRequest(BaseModel):
    email: str = "agyarefredrick22@gmail.com"


@router.post("/test-email")
async def test_email(data: Optional[TestEmailRequest] = None, db: Session = Depends(get_db)):
    smtp_email = get_setting(db, "smtp_email")
    smtp_password = get_setting(db, "smtp_password")
    sender_name = get_setting(db, "smtp_sender_name", "Ghana Competition Law Seminar")
    
    if not smtp_email or not smtp_password:
        return {"success": False, "message": "SMTP credentials not configured. Please save settings first."}
    
    test_to = data.email if data else smtp_email
    
    try:
        import aiosmtplib
        import asyncio
        from email.mime.text import MIMEText
        from email.mime.multipart import MIMEMultipart
        from email.utils import formataddr
        
        message = MIMEMultipart()
        message["From"] = formataddr((sender_name, smtp_email))
        message["To"] = test_to
        message["Subject"] = "Test Email - Ghana Competition Law Seminar"
        message.attach(MIMEText(
            "This is a test email from the Ghana Competition Law Seminar registration system.\n\n"
            "Your email integration is working correctly!",
            "plain"
        ))
        
        # Try port 465 (SSL) first, then 587 (TLS)
        try:
            await asyncio.wait_for(
                aiosmtplib.send(
                    message,
                    hostname="smtp.gmail.com",
                    port=465,
                    use_tls=True,
                    username=smtp_email,
                    password=smtp_password
                ),
                timeout=15
            )
            return {"success": True, "message": f"Test email sent to {test_to} (port 465)"}
        except Exception as e1:
            # Fallback to port 587
            try:
                await asyncio.wait_for(
                    aiosmtplib.send(
                        message,
                        hostname="smtp.gmail.com",
                        port=587,
                        start_tls=True,
                        username=smtp_email,
                        password=smtp_password
                    ),
                    timeout=15
                )
                return {"success": True, "message": f"Test email sent to {test_to} (port 587)"}
            except Exception as e2:
                return {"success": False, "message": f"Port 465 failed: {str(e1)[:50]}. Port 587 failed: {str(e2)[:50]}"}
    except Exception as e:
        return {"success": False, "message": str(e)}


class TestSMSRequest(BaseModel):
    phone: Optional[str] = None


@router.post("/test-sms")
async def test_sms(data: Optional[TestSMSRequest] = None, db: Session = Depends(get_db)):
    api_key = get_setting(db, "arkesel_api_key")
    sender_id = get_setting(db, "arkesel_sender_id", "Conference")
    test_phone = get_setting(db, "test_sms_phone", "0241293754")
    
    if not api_key:
        return {"success": False, "message": "Arkesel API key not configured. Please save settings first."}
    
    # Use provided phone or configured test phone
    phone_to_use = (data.phone if data and data.phone else test_phone).strip()
    if not phone_to_use:
        return {"success": False, "message": "No test phone number configured. Please set it in settings."}
    
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            # Send actual test SMS
            sms_res = await client.post(
                "https://sms.arkesel.com/api/v2/sms/send",
                headers={
                    "api-key": api_key,
                    "Content-Type": "application/json"
                },
                json={
                    "sender": sender_id,
                    "message": "Test SMS from Ghana Competition Law Seminar. Your SMS integration is working!",
                    "recipients": [phone_to_use]
                }
            )
            
            sms_data = sms_res.json()
            
            if sms_res.status_code == 200 and sms_data.get("status") == "success":
                return {
                    "success": True, 
                    "message": f"Test SMS sent to {phone_to_use}",
                    "details": sms_data
                }
            else:
                return {"success": False, "message": f"SMS send failed: {sms_data.get('message', sms_res.text)}"}
    except Exception as e:
        return {"success": False, "message": str(e)}
