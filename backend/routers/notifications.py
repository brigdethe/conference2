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
        <!DOCTYPE html>
        <html>
        <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f4f4f4; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); margin-top: 20px; margin-bottom: 20px;">
                <!-- Header -->
                <div style="background-color: #1a365d; padding: 30px 20px; text-align: center;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">Ghana Competition Law Seminar</h1>
                </div>
                
                <!-- Content -->
                <div style="padding: 40px 30px;">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <h2 style="color: #1a365d; margin: 0 0 10px; font-size: 20px;">Registration Confirmed</h2>
                        <p style="color: #666; font-size: 16px; margin: 0;">We look forward to hosting you.</p>
                    </div>
                    
                    <p style="font-size: 16px; line-height: 1.6; color: #444;">Dear {full_name},</p>
                    <p style="font-size: 16px; line-height: 1.6; color: #444;">Your registration for the Ghana Competition Law Seminar has been successfully confirmed. Below is your official ticket.</p>
                    
                    <!-- Ticket Card -->
                    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 25px; margin: 30px 0; text-align: center;">
                        <p style="color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 5px;">Ticket Code</p>
                        <p style="color: #1a365d; font-size: 32px; font-weight: 700; letter-spacing: 2px; margin: 0 0 20px; font-family: monospace;">{ticket_code}</p>
                        
                        <div style="background-color: #fff; padding: 15px; display: inline-block; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                            <img src="cid:qrcode" alt="QR Code" style="width: 180px; height: 180px; display: block;" />
                        </div>
                        <p style="color: #64748b; font-size: 13px; margin-top: 15px;">Please present this QR code at check-in.</p>
                    </div>
                    
                    <!-- Event Details -->
                    <div style="border-top: 1px solid #edf2f7; padding-top: 25px; margin-top: 25px;">
                        <table style="width: 100%; border-collapse: collapse;">
                            <tr>
                                <td style="padding-bottom: 15px; width: 24px; vertical-align: top;">📅</td>
                                <td style="padding-bottom: 15px; color: #444; font-weight: 500;">
                                    <div style="font-size: 14px; color: #64748b;">Date</div>
                                    Wednesday, March 25, 2026
                                </td>
                            </tr>
                            <tr>
                                <td style="padding-bottom: 15px; width: 24px; vertical-align: top;">⏰</td>
                                <td style="padding-bottom: 15px; color: #444; font-weight: 500;">
                                    <div style="font-size: 14px; color: #64748b;">Time</div>
                                    9:00 AM - 3:00 PM
                                </td>
                            </tr>
                            <tr>
                                <td style="padding-bottom: 0; width: 24px; vertical-align: top;">📍</td>
                                <td style="padding-bottom: 0; color: #444; font-weight: 500;">
                                    <div style="font-size: 14px; color: #64748b;">Venue</div>
                                    Mövenpick Ambassador Hotel, Accra
                                </td>
                            </tr>
                        </table>
                    </div>
                    
                    {f'<div style="margin-top: 25px; padding-top: 25px; border-top: 1px solid #edf2f7; font-size: 14px; color: #666;"><strong>Organization:</strong> {org_name}</div>' if org_name else ''}
                </div>
                
                <!-- Footer -->
                <div style="background-color: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
                    <p style="margin: 0;">&copy; 2026 Ghana Competition Law Seminar. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
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
        sms_message = f"GCLS 2026: Confirmed! Ticket: {ticket_code}. Venue: Movenpick Hotel, Accra. Mar 25, 9am. Present code at check-in."
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
        <!DOCTYPE html>
        <html>
        <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f4f4f4; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); margin-top: 20px; margin-bottom: 20px;">
                <div style="background-color: #1a365d; padding: 20px; text-align: center;">
                    <h2 style="color: #ffffff; margin: 0; font-size: 20px;">Admin Alert: Payment Received</h2>
                </div>
                <div style="padding: 30px;">
                    <p style="font-size: 16px; color: #444;">A new payment has been submitted and requires verification.</p>
                    
                    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0;">
                        <table style="width: 100%; border-collapse: collapse;">
                            <tr>
                                <td style="padding: 8px 0; color: #64748b; font-size: 14px; width: 100px;">Name</td>
                                <td style="padding: 8px 0; color: #1e293b; font-weight: 500;">{full_name}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Email</td>
                                <td style="padding: 8px 0; color: #1e293b; font-weight: 500;">{email}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Phone</td>
                                <td style="padding: 8px 0; color: #1e293b; font-weight: 500;">{phone or 'N/A'}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Organization</td>
                                <td style="padding: 8px 0; color: #1e293b; font-weight: 500;">{org_name or 'N/A'}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Amount</td>
                                <td style="padding: 8px 0; color: #059669; font-weight: 600;">GHS {amount}</td>
                            </tr>
                        </table>
                    </div>
                    
                    <p style="margin-top: 20px; font-size: 14px; color: #666;">Please log in to the admin panel to verify this payment.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        for admin_email in admin_emails:
            await send_email_internal(
                db, admin_email,
                f"Payment Verification Required - {full_name}",
                html_body
            )
    
    # SMS to admins
    if sms_enabled and admin_phones:
        sms_message = f"GCLS Admin: Verify payment. {full_name} ({org_name or 'Public'}) - GHS {amount}."
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
        <!DOCTYPE html>
        <html>
        <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f4f4f4; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); margin-top: 20px; margin-bottom: 20px;">
                <div style="background-color: #1a365d; padding: 30px 20px; text-align: center;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">Ghana Competition Law Seminar</h1>
                </div>
                
                <div style="padding: 40px 30px;">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <h2 style="color: #d97706; margin: 0 0 10px; font-size: 20px;">Registration Pending</h2>
                    </div>
                    
                    <p style="font-size: 16px; line-height: 1.6; color: #444;">Dear {full_name},</p>
                    <p style="font-size: 16px; line-height: 1.6; color: #444;">Thank you for registering. Your application has been received and is currently under review.</p>
                    
                    <div style="background-color: #fffbeb; border: 1px solid #fcd34d; border-radius: 8px; padding: 20px; margin: 25px 0; text-align: center;">
                        <p style="color: #92400e; margin: 0;">Once approved, you will receive an email with payment instructions to secure your spot.</p>
                    </div>
                    
                    <div style="border-top: 1px solid #edf2f7; padding-top: 25px; margin-top: 25px;">
                        <p style="font-size: 14px; color: #64748b; margin-bottom: 5px;">Event Details:</p>
                        <p style="font-weight: 500; color: #334155; margin: 0;">March 25, 2026 &bull; Mövenpick Ambassador Hotel, Accra</p>
                    </div>
                </div>
                
                <div style="background-color: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
                    <p style="margin: 0;">&copy; 2026 Ghana Competition Law Seminar. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
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
        <!DOCTYPE html>
        <html>
        <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f4f4f4; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); margin-top: 20px; margin-bottom: 20px;">
                <div style="background-color: #1a365d; padding: 20px; text-align: center;">
                    <h2 style="color: #ffffff; margin: 0; font-size: 20px;">Admin Alert: New Registration</h2>
                </div>
                
                <div style="padding: 30px;">
                    <p style="font-size: 16px; color: #444;">A new registration has been submitted and requires your approval.</p>
                    
                    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0;">
                        <table style="width: 100%; border-collapse: collapse;">
                            <tr>
                                <td style="padding: 8px 0; color: #64748b; font-size: 14px; width: 100px;">Name</td>
                                <td style="padding: 8px 0; color: #1e293b; font-weight: 500;">{full_name}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Email</td>
                                <td style="padding: 8px 0; color: #1e293b; font-weight: 500;">{email}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Phone</td>
                                <td style="padding: 8px 0; color: #1e293b; font-weight: 500;">{phone or 'N/A'}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Organization</td>
                                <td style="padding: 8px 0; color: #1e293b; font-weight: 500;">{org_name or 'N/A'}</td>
                            </tr>
                        </table>
                        
                        <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #e2e8f0;">
                            <p style="color: #64748b; font-size: 14px; margin: 0 0 5px;">Reason for Attending:</p>
                            <div style="background-color: #ffffff; padding: 10px; border-radius: 4px; border: 1px solid #e2e8f0; font-style: italic; color: #475569; font-size: 14px;">
                                {reason or 'Not provided'}
                            </div>
                        </div>
                    </div>
                    
                    <p style="margin-top: 20px; font-size: 14px; color: #666;">Please log in to the admin panel to approve or reject this registration.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        for admin_email in admin_emails:
            await send_email_internal(
                db, admin_email,
                f"Approval Needed - {full_name}",
                html_body
            )
    
    # SMS to admins
    if sms_enabled and admin_phones:
        sms_message = f"GCLS Admin: New registration. {full_name} ({org_name or 'Public'}). Review needed."
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
    payment_link = f"{base_url}/onboarding/?id={registration_id}"
    
    if email_enabled and email:
        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f4f4f4; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); margin-top: 20px; margin-bottom: 20px;">
                <div style="background-color: #1a365d; padding: 30px 20px; text-align: center;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">Ghana Competition Law Seminar</h1>
                </div>
                
                <div style="padding: 40px 30px;">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <h2 style="color: #059669; margin: 0 0 10px; font-size: 20px;">Registration Approved</h2>
                    </div>
                    
                    <p style="font-size: 16px; line-height: 1.6; color: #444;">Dear {full_name},</p>
                    <p style="font-size: 16px; line-height: 1.6; color: #444;">Great news! Your registration for the Ghana Competition Law Seminar has been approved.</p>
                    
                    <div style="background-color: #ecfdf5; border: 1px solid #6ee7b7; border-radius: 8px; padding: 25px; margin: 30px 0; text-align: center;">
                        <p style="color: #065f46; margin: 0 0 15px; font-weight: 500;">Please complete your payment within <strong style="color: #047857;">3 days</strong> to secure your spot.</p>
                        
                        <a href="{payment_link}" style="display: inline-block; background-color: #059669; color: white; padding: 14px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; margin-top: 5px;">
                            Complete Payment
                        </a>
                    </div>
                    
                    <div style="border-top: 1px solid #edf2f7; padding-top: 25px; margin-top: 25px;">
                        <p style="font-size: 14px; color: #64748b; margin-bottom: 5px;">Event Details:</p>
                        <p style="font-weight: 500; color: #334155; margin: 0;">March 25, 2026 &bull; Mövenpick Ambassador Hotel, Accra</p>
                    </div>
                </div>
                
                <div style="background-color: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
                    <p style="margin: 0;">&copy; 2026 Ghana Competition Law Seminar. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        await send_email_internal(
            db, email,
            "Registration Approved - Complete Your Payment",
            html_body
        )
    
    if sms_enabled and phone:
        sms_message = f"GCLS 2026: Good news {full_name}! Registration approved. Pay here to secure spot: {payment_link}"
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
        reason_html = ""
        if reason:
            reason_html = f"""
            <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #e2e8f0;">
                <p style="color: #64748b; font-size: 14px; margin: 0 0 5px;">Reason:</p>
                <div style="background-color: #fef2f2; padding: 10px; border-radius: 4px; border: 1px solid #fecaca; color: #b91c1c; font-size: 14px;">
                    {reason}
                </div>
            </div>
            """
            
        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f4f4f4; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); margin-top: 20px; margin-bottom: 20px;">
                <div style="background-color: #1a365d; padding: 30px 20px; text-align: center;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">Ghana Competition Law Seminar</h1>
                </div>
                
                <div style="padding: 40px 30px;">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <h2 style="color: #dc2626; margin: 0 0 10px; font-size: 20px;">Registration Update</h2>
                    </div>
                    
                    <p style="font-size: 16px; line-height: 1.6; color: #444;">Dear {full_name},</p>
                    <p style="font-size: 16px; line-height: 1.6; color: #444;">Thank you for your interest in the Ghana Competition Law Seminar.</p>
                    
                    <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 20px; margin: 25px 0; text-align: center;">
                        <p style="color: #991b1b; margin: 0;">We regret to inform you that we are unable to approve your registration at this time.</p>
                    </div>
                    
                    {reason_html}
                    
                    <p style="margin-top: 30px; font-size: 14px; color: #666; text-align: center;">
                        If you have any questions or believe this is an error, please contact us.
                    </p>
                </div>
                
                <div style="background-color: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
                    <p style="margin: 0;">&copy; 2026 Ghana Competition Law Seminar. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
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
        
        html_body = """
        <!DOCTYPE html>
        <html>
        <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f4f4f4; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); margin-top: 20px; margin-bottom: 20px;">
                <div style="background-color: #1a365d; padding: 30px 20px; text-align: center;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">Ghana Competition Law Seminar</h1>
                </div>
                
                <div style="padding: 40px 30px;">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <h2 style="color: #059669; margin: 0 0 10px; font-size: 20px;">Email System Operational</h2>
                    </div>
                    
                    <p style="font-size: 16px; line-height: 1.6; color: #444;">Hello,</p>
                    <p style="font-size: 16px; line-height: 1.6; color: #444;">This is a test email from the Ghana Competition Law Seminar registration system.</p>
                    
                    <div style="background-color: #ecfdf5; border: 1px solid #6ee7b7; border-radius: 8px; padding: 20px; margin: 25px 0; text-align: center;">
                        <p style="color: #065f46; margin: 0; font-weight: 500;">Your email integration is working correctly!</p>
                    </div>
                    
                    <p style="font-size: 14px; color: #666; text-align: center;">
                        You can now send notifications to attendees and admins.
                    </p>
                </div>
                
                <div style="background-color: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
                    <p style="margin: 0;">&copy; 2026 Ghana Competition Law Seminar. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        message.attach(MIMEText(html_body, "html"))
        
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
