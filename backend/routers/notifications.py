from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
import html
import httpx
import io
import base64
import qrcode
import asyncio
import logging

from database import get_db, SessionLocal
from models import Settings, AdminNotificationRecipient

logger = logging.getLogger(__name__)

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
        logger.error("Email send error: %s", e)
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
        logger.error("SMS send error: %s", e)
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
                    
                    <p style="font-size: 16px; line-height: 1.6; color: #444;">Dear {html.escape(full_name)},</p>
                    <p style="font-size: 16px; line-height: 1.6; color: #444;">Your registration for the Ghana Competition Law Seminar has been successfully confirmed. Below is your official ticket.</p>
                    
                    <!-- Ticket Card -->
                    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 25px; margin: 30px 0; text-align: center;">
                        <p style="color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 5px;">Ticket Code</p>
                        <p style="color: #1a365d; font-size: 32px; font-weight: 700; letter-spacing: 2px; margin: 0 0 20px; font-family: monospace;">{html.escape(ticket_code)}</p>
                        
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
                    
                    {f'<div style="margin-top: 25px; padding-top: 25px; border-top: 1px solid #edf2f7; font-size: 14px; color: #666;"><strong>Organization:</strong> {html.escape(org_name)}</div>' if org_name else ''}
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
            logger.error("Ticket email error: %s", e)
    
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
                                <td style="padding: 8px 0; color: #1e293b; font-weight: 500;">{html.escape(full_name)}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Email</td>
                                <td style="padding: 8px 0; color: #1e293b; font-weight: 500;">{html.escape(email)}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Phone</td>
                                <td style="padding: 8px 0; color: #1e293b; font-weight: 500;">{html.escape(phone) if phone else 'N/A'}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Organization</td>
                                <td style="padding: 8px 0; color: #1e293b; font-weight: 500;">{html.escape(org_name) if org_name else 'N/A'}</td>
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
                    
                    <p style="font-size: 16px; line-height: 1.6; color: #444;">Dear {html.escape(full_name)},</p>
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
                                <td style="padding: 8px 0; color: #1e293b; font-weight: 500;">{html.escape(full_name)}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Email</td>
                                <td style="padding: 8px 0; color: #1e293b; font-weight: 500;">{html.escape(email)}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Phone</td>
                                <td style="padding: 8px 0; color: #1e293b; font-weight: 500;">{html.escape(phone) if phone else 'N/A'}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Organization</td>
                                <td style="padding: 8px 0; color: #1e293b; font-weight: 500;">{html.escape(org_name) if org_name else 'N/A'}</td>
                            </tr>
                        </table>
                        
                        <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #e2e8f0;">
                            <p style="color: #64748b; font-size: 14px; margin: 0 0 5px;">Reason for Attending:</p>
                            <div style="background-color: #ffffff; padding: 10px; border-radius: 4px; border: 1px solid #e2e8f0; font-style: italic; color: #475569; font-size: 14px;">
                                {html.escape(reason) if reason else 'Not provided'}
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
                    
                    <p style="font-size: 16px; line-height: 1.6; color: #444;">Dear {html.escape(full_name)},</p>
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
                    <p style="font-size: 16px; line-height: 1.6; color: #444;">Dear {html.escape(full_name.split()[0])},</p>
                    
                    <p style="font-size: 16px; line-height: 1.6; color: #444;">Thank you for your interest in our seminar on Ghana's new era of competition law.</p>
                    
                    <p style="font-size: 16px; line-height: 1.6; color: #444;">We truly appreciate the overwhelming response to this event. Unfortunately, we have now reached full capacity and are unable to accommodate additional registrations.</p>
                    
                    <p style="font-size: 16px; line-height: 1.6; color: #444;">Thank you once again for your interest and understanding.</p>
                    
                    <p style="font-size: 16px; line-height: 1.6; color: #444; margin-top: 30px;">Best regards,</p>
                    <p style="font-size: 16px; line-height: 1.6; color: #444; font-weight: 600;">Event Organizers</p>
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
            "Ghana Competition Law Seminar",
            html_body
        )


async def send_manual_confirmation_notification(
    db: Session,
    email: str,
    phone: str,
    full_name: str,
    ticket_code: str,
    qr_data: str,
    org_name: str = None
):
    """Send confirmation email when admin manually confirms a registration (complimentary)"""
    email_enabled = get_setting(db, "notifications_email_enabled", "true") == "true"
    sms_enabled = get_setting(db, "notifications_sms_enabled", "true") == "true"
    
    # Generate QR code image
    qr_bytes = generate_qr_image(qr_data)
    
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
                        <h2 style="color: #059669; margin: 0 0 10px; font-size: 20px;">Registration Confirmed</h2>
                        <p style="color: #666; font-size: 16px; margin: 0;">Your attendance has been confirmed!</p>
                    </div>
                    
                    <p style="font-size: 16px; line-height: 1.6; color: #444;">Dear {html.escape(full_name)},</p>
                    <p style="font-size: 16px; line-height: 1.6; color: #444;">We are pleased to confirm your registration for the Ghana Competition Law Seminar. Your attendance has been approved as a <strong>complimentary guest</strong>.</p>
                    
                    <!-- Ticket Card -->
                    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 25px; margin: 30px 0; text-align: center;">
                        <p style="color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 5px;">Ticket Code</p>
                        <p style="color: #1a365d; font-size: 32px; font-weight: 700; letter-spacing: 2px; margin: 0 0 20px; font-family: monospace;">{html.escape(ticket_code)}</p>
                        
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
                                    9:00 AM - 3:15 PM
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
                    
                    {f'<div style="margin-top: 25px; padding-top: 25px; border-top: 1px solid #edf2f7; font-size: 14px; color: #666;"><strong>Organization:</strong> {html.escape(org_name)}</div>' if org_name else ''}
                </div>
                
                <!-- Footer -->
                <div style="background-color: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
                    <p style="margin: 0;">&copy; 2026 Ghana Competition Law Seminar. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
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
                
                html_part = MIMEText(html_body, "html")
                message.attach(html_part)
                
                qr_image = MIMEImage(qr_bytes)
                qr_image.add_header("Content-ID", "<qrcode>")
                qr_image.add_header("Content-Disposition", "inline", filename=f"ticket-{ticket_code}.png")
                message.attach(qr_image)
                
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
            logger.error("Manual confirmation email error: %s", e)
    
    if sms_enabled and phone:
        sms_message = f"GCLS 2026: Confirmed! Ticket: {ticket_code}. Venue: Movenpick Hotel, Accra. Mar 25, 9am. Present code at check-in."
        await send_sms_internal(db, phone, sms_message)


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
    email: str


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


# ============== REMINDER EMAIL TEMPLATES ==============

REMINDER_TEMPLATES = {
    "questions_reminder": {
        "subject": "Submit Your Questions Before the Seminar",
        "template": "questions"
    },
    "invite_others": {
        "subject": "Invite Your Colleagues to the Ghana Competition Law Seminar",
        "template": "invite"
    },
    "event_reminder": {
        "subject": "Reminder: Ghana Competition Law Seminar - March 25, 2026",
        "template": "reminder"
    },
    "final_reminder": {
        "subject": "Tomorrow: Ghana Competition Law Seminar - Final Reminder",
        "template": "final"
    }
}


def get_reminder_email_html(template_type: str, full_name: str, ticket_code: str = None) -> str:
    """Generate HTML for reminder emails based on template type"""
    
    base_url = "https://seminar.cmc-ghana.com"
    logo_url = "https://ik.imagekit.io/dr5fryhth/conference/logo2.svg?updatedAt=1769833653837"
    
    # Correct speaker image URLs from the website
    peter_img = "https://ik.imagekit.io/dr5fryhth/conferencenew/f8aaed81-30d8-45c8-ad76-f4ca676449da.JPG?updatedAt=1770796073766"
    david_img = "https://ik.imagekit.io/dr5fryhth/conferencenew/d6633b22-b0b5-40c1-8a9b-3fa75074dc9c.JPG?updatedAt=1770796068105"
    
    # Speaker images
    speakers_html = f"""
    <div style="margin: 25px 0;">
        <p style="font-size: 14px; color: #64748b; margin-bottom: 15px; text-align: center;"><strong>Featured Speakers</strong></p>
        <table border="0" cellpadding="0" cellspacing="0" width="100%">
            <tr>
                <td align="center" width="50%" style="padding: 10px;">
                    <img src="{peter_img}" alt="Peter Alexiadis" style="width: 100px; height: 100px; border-radius: 50%; object-fit: cover;" />
                    <p style="font-size: 12px; color: #1a365d; margin: 8px 0 0 0; font-weight: 600;">Peter Alexiadis</p>
                    <p style="font-size: 10px; color: #64748b; margin: 2px 0 0 0;">Gibson Dunn, Brussels</p>
                </td>
                <td align="center" width="50%" style="padding: 10px;">
                    <img src="{david_img}" alt="Prof. David Bailey KC" style="width: 100px; height: 100px; border-radius: 50%; object-fit: cover;" />
                    <p style="font-size: 12px; color: #1a365d; margin: 8px 0 0 0; font-weight: 600;">Prof. David Bailey KC</p>
                    <p style="font-size: 10px; color: #64748b; margin: 2px 0 0 0;">King's College London</p>
                </td>
            </tr>
        </table>
    </div>
    """
    
    if template_type == "questions":
        content = f"""
        <p style="font-size: 16px; line-height: 1.6; color: #444;">Dear {html.escape(full_name)},</p>
        <p style="font-size: 16px; line-height: 1.6; color: #444;">We are excited to welcome you to the <strong>Ghana Competition Law Seminar</strong> on March 25, 2026.</p>
        
        <p style="font-size: 16px; line-height: 1.6; color: #444;">To make the most of this event, we encourage you to <strong>submit any questions</strong> you would like our expert speakers to address during the sessions.</p>
        
        <div style="background-color: #f0f9ff; border: 1px solid #0ea5e9; border-radius: 8px; padding: 25px; margin: 30px 0; text-align: center;">
            <p style="color: #0369a1; margin: 0 0 15px; font-weight: 500;">Have questions for our speakers?</p>
            <a href="{base_url}/questions" style="display: inline-block; background-color: #0284c7; color: white; padding: 14px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
                Submit Your Questions
            </a>
        </div>
        
        <p style="font-size: 14px; line-height: 1.6; color: #666;">Your questions will help shape the discussions and ensure the seminar addresses the topics most relevant to you.</p>
        
        {speakers_html}
        """
    elif template_type == "invite":
        content = f"""
        <p style="font-size: 16px; line-height: 1.6; color: #444;">Dear {html.escape(full_name)},</p>
        <p style="font-size: 16px; line-height: 1.6; color: #444;">We are thrilled that you will be joining us at the <strong>Ghana Competition Law Seminar</strong>!</p>
        
        <p style="font-size: 16px; line-height: 1.6; color: #444;">Do you have colleagues or contacts who would benefit from this seminar? We encourage you to <strong>invite them to register</strong> and join this important discussion on Ghana's competition law landscape.</p>
        
        <div style="background-color: #fdf4ff; border: 1px solid #d946ef; border-radius: 8px; padding: 25px; margin: 30px 0; text-align: center;">
            <p style="color: #a21caf; margin: 0 0 15px; font-weight: 500;">Share the opportunity!</p>
            <a href="{base_url}/contact/#registration" style="display: inline-block; background-color: #c026d3; color: white; padding: 14px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
                Registration Page
            </a>
        </div>
        
        <p style="font-size: 14px; line-height: 1.6; color: #666;">Simply share this link with your network: <a href="{base_url}" style="color: #0284c7;">{base_url}</a></p>
        """
    elif template_type == "final":
        content = f"""
        <p style="font-size: 16px; line-height: 1.6; color: #444;">Dear {html.escape(full_name)},</p>
        <p style="font-size: 16px; line-height: 1.6; color: #444;"><strong>The Ghana Competition Law Seminar is TOMORROW!</strong> We are excited to have you join us for this landmark event.</p>
        
        <div style="background-color: #fef3c7; border: 2px solid #f59e0b; border-radius: 8px; padding: 25px; margin: 30px 0;">
            <p style="color: #92400e; font-size: 18px; font-weight: bold; margin: 0 0 15px 0; text-align: center;">📢 FINAL REMINDER</p>
            <table style="width: 100%; border-collapse: collapse;">
                <tr>
                    <td style="padding: 10px 0; color: #92400e; font-weight: 500;">
                        <strong>📅 Date:</strong> Tomorrow - Wednesday, March 25, 2026
                    </td>
                </tr>
                <tr>
                    <td style="padding: 10px 0; color: #92400e; font-weight: 500;">
                        <strong>⏰ Time:</strong> 9:00 AM - 3:15 PM (Registration starts at 9:00 AM)
                    </td>
                </tr>
                <tr>
                    <td style="padding: 10px 0; color: #92400e; font-weight: 500;">
                        <strong>📍 Venue:</strong> Mövenpick Ambassador Hotel, Independence Avenue, Accra
                    </td>
                </tr>
            </table>
        </div>
        
        {f'''<div style="background-color: #1a365d; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
            <p style="color: #94a3b8; font-size: 12px; margin: 0 0 8px 0;">YOUR TICKET CODE</p>
            <p style="color: #ffffff; font-size: 28px; font-weight: bold; margin: 0; letter-spacing: 4px; font-family: monospace;">{html.escape(ticket_code)}</p>
        </div>''' if ticket_code else ''}
        
        <div style="background-color: #fef2f2; border: 2px solid #ef4444; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <p style="color: #dc2626; font-weight: 700; margin: 0 0 10px 0; font-size: 16px;">⚠️ IMPORTANT: Entry Requirements</p>
            <p style="color: #7f1d1d; margin: 0; line-height: 1.6;">
                You <strong>MUST</strong> present your <strong>QR code</strong> or <strong>ticket code</strong> at the gate to gain entry. 
                Please have it ready on your phone or printed. Without it, you may experience delays at check-in.
            </p>
        </div>
        
        <div style="background-color: #f0fdf4; border: 1px solid #22c55e; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <p style="color: #166534; font-weight: 600; margin: 0 0 10px 0;">✅ What to bring:</p>
            <ul style="color: #166534; margin: 0; padding-left: 20px;">
                <li style="margin-bottom: 5px;"><strong>Your ticket QR code or ticket code</strong> (required for entry)</li>
                <li style="margin-bottom: 5px;">Business cards for networking</li>
                <li>A notepad for the insightful discussions</li>
            </ul>
        </div>
        
        {speakers_html}
        
        <p style="font-size: 14px; line-height: 1.6; color: #666; margin-top: 20px;">We look forward to welcoming you tomorrow! If you have any last-minute questions, please contact us at <a href="mailto:info@cmc-ghana.com" style="color: #0284c7;">info@cmc-ghana.com</a></p>
        
        <p style="font-size: 12px; color: #94a3b8; margin-top: 15px; text-align: center;"><em>Please find the event program attached to this email.</em></p>
        """
    else:  # reminder
        content = f"""
        <p style="font-size: 16px; line-height: 1.6; color: #444;">Dear {html.escape(full_name)},</p>
        <p style="font-size: 16px; line-height: 1.6; color: #444;">This is a friendly reminder that the <strong>Ghana Competition Law Seminar</strong> is approaching!</p>
        
        <div style="background-color: #ecfdf5; border: 1px solid #6ee7b7; border-radius: 8px; padding: 25px; margin: 30px 0;">
            <table style="width: 100%; border-collapse: collapse;">
                <tr>
                    <td style="padding: 10px 0; color: #065f46; font-weight: 500;">
                        <strong>📅 Date:</strong> Wednesday, March 25, 2026
                    </td>
                </tr>
                <tr>
                    <td style="padding: 10px 0; color: #065f46; font-weight: 500;">
                        <strong>⏰ Time:</strong> 9:00 AM - 3:15 PM
                    </td>
                </tr>
                <tr>
                    <td style="padding: 10px 0; color: #065f46; font-weight: 500;">
                        <strong>📍 Venue:</strong> Mövenpick Ambassador Hotel, Independence Avenue, Accra
                    </td>
                </tr>
                {f'<tr><td style="padding: 10px 0; color: #065f46; font-weight: 500;"><strong>🎫 Your Ticket:</strong> {html.escape(ticket_code)}</td></tr>' if ticket_code else ''}
            </table>
        </div>
        
        <p style="font-size: 14px; line-height: 1.6; color: #666;">Please remember to bring your ticket QR code for check-in. We look forward to seeing you!</p>
        """
    
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <link href="https://fonts.googleapis.com/css?family=Roboto:300,400,700" rel="stylesheet">
        <meta content="width=device-width, initial-scale=1.0" name="viewport">
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Roboto', Arial, Helvetica, sans-serif; background-color: #f4f4f4; color: #0B141B;">
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #ffffff;">
            <tr>
                <td align="center">
                    <table border="0" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%;">
                        <!-- Header with Date -->
                        <tr>
                            <td align="center" style="padding: 20px 0 10px 0;">
                                <p style="font-size: 12px; color: #666; margin: 0;"><strong>25 March 2026</strong><br>
                                <span style="color: #1a365d;">Mövenpick Ambassador Hotel, Accra</span></p>
                            </td>
                        </tr>
                        
                        <!-- Logo Image -->
                        <tr>
                            <td align="center" style="padding: 10px 20px;">
                                <a href="{base_url}" style="text-decoration: none;">
                                    <img src="{logo_url}" alt="Ghana Competition Law Seminar" style="max-width: 280px; height: auto; display: block;" />
                                </a>
                            </td>
                        </tr>
                        
                        <!-- Header Banner -->
                        <tr>
                            <td align="center" style="padding: 10px 20px;">
                                <div style="background: linear-gradient(135deg, #1a365d 0%, #2d4a7c 100%); padding: 25px; border-radius: 8px; position: relative; overflow: hidden;">
                                    <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 600;">Ghana Competition Law Seminar</h1>
                                    <p style="color: #94a3b8; margin: 10px 0 0 0; font-size: 14px;">Laying a Sound Foundation for a New Era</p>
                                </div>
                            </td>
                        </tr>
                        
                        <!-- Buttons Row -->
                        <tr>
                            <td align="center" style="padding: 20px;">
                                <table border="0" cellpadding="0" cellspacing="0">
                                    <tr>
                                        <td style="padding: 0 10px;">
                                            <a href="{base_url}/#statement" style="display: inline-block; background-color: #1a365d; color: white; padding: 10px 25px; text-decoration: none; border-radius: 5px; font-size: 13px; font-weight: bold;">Agenda</a>
                                        </td>
                                        <td style="padding: 0 10px;">
                                            <a href="{base_url}/#team-section" style="display: inline-block; background-color: #7c3aed; color: white; padding: 10px 25px; text-decoration: none; border-radius: 5px; font-size: 13px; font-weight: bold;">Speakers</a>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                        
                        <!-- Main Content -->
                        <tr>
                            <td style="padding: 30px;">
                                {content}
                            </td>
                        </tr>
                        
                        <!-- Footer -->
                        <tr>
                            <td style="background-color: #1a365d; padding: 30px; text-align: center;">
                                <img src="{logo_url}" alt="CMC Ghana" style="max-width: 150px; height: auto; margin-bottom: 15px;" />
                                <p style="color: #ffffff; font-size: 14px; margin: 0 0 10px 0;"><strong>Competition & Markets Center Ghana</strong></p>
                                <p style="color: #94a3b8; font-size: 12px; margin: 0;">
                                    If you have any questions, please contact us at<br>
                                    <a href="mailto:info@cmc-ghana.com" style="color: #60a5fa;">info@cmc-ghana.com</a>
                                </p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    """


class ReminderEmailRequest(BaseModel):
    template: str  # "questions_reminder", "invite_others", "event_reminder"
    test_email: Optional[str] = None  # If provided, send only to this email for testing


class RegistrationReportRequest(BaseModel):
    test_only: Optional[bool] = False  # If true, only send to test email


async def send_bulk_reminder_emails_task(
    template_type: str,
    subject: str,
    registrations_data: List[dict],
    attachments: List[tuple],
    admin_recipients: List[str]
):
    """Background task to send bulk reminder emails"""
    db = SessionLocal()
    try:
        sent_count = 0
        failed_count = 0
        
        for reg_data in registrations_data:
            if reg_data.get("email"):
                html_body = get_reminder_email_html(template_type, reg_data["full_name"], reg_data.get("ticket_code"))
                success = await send_email_internal(db, reg_data["email"], subject, html_body, attachments)
                if success:
                    sent_count += 1
                else:
                    failed_count += 1
        
        # Also send to admin recipients
        for admin_email in admin_recipients:
            html_body = get_reminder_email_html(template_type, "Admin", None)
            await send_email_internal(db, admin_email, f"[Admin Copy] {subject}", html_body, attachments)
        
        logger.info(f"Bulk reminder emails completed: {sent_count} sent, {failed_count} failed")
    except Exception as e:
        logger.error(f"Error in bulk email task: {e}")
    finally:
        db.close()


@router.post("/send-reminder")
async def send_reminder_email(data: ReminderEmailRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """Send reminder emails to all confirmed attendees or test email"""
    from models import Registration
    import os
    
    # Admin recipients who also receive reminder emails
    ADMIN_REMINDER_RECIPIENTS = [
        "kofi.datsa@gmail.com"
    ]
    
    if data.template not in REMINDER_TEMPLATES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid template. Must be one of: {', '.join(REMINDER_TEMPLATES.keys())}"
        )
    
    template_info = REMINDER_TEMPLATES[data.template]
    subject = template_info["subject"]
    template_type = template_info["template"]
    
    # Prepare PDF attachment for final_reminder
    attachments = None
    if template_type == "final":
        pdf_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "..", "CMC Program Press.pdf")
        if os.path.exists(pdf_path):
            with open(pdf_path, "rb") as f:
                pdf_content = f.read()
            attachments = [("CMC_Program.pdf", pdf_content, "application/pdf")]
    
    # If test email provided, only send to that (synchronous for immediate feedback)
    if data.test_email:
        html_body = get_reminder_email_html(template_type, "Test User", "TEST")
        success = await send_email_internal(db, data.test_email, subject, html_body, attachments)
        return {
            "success": success,
            "message": f"Test email sent to {data.test_email}" if success else "Failed to send test email",
            "sent_count": 1 if success else 0
        }
    
    # Get all confirmed registrations (approved attendees only)
    registrations = db.query(Registration).filter(
        Registration.status == "confirmed"
    ).all()
    
    if not registrations:
        return {"success": True, "message": "No confirmed attendees to send to", "sent_count": 0}
    
    # Extract registration data for background task
    registrations_data = [
        {"email": reg.email, "full_name": reg.full_name, "ticket_code": reg.ticket_code}
        for reg in registrations if reg.email
    ]
    
    # Queue the bulk email sending as a background task
    background_tasks.add_task(
        send_bulk_reminder_emails_task,
        template_type,
        subject,
        registrations_data,
        attachments or [],
        ADMIN_REMINDER_RECIPIENTS
    )
    
    return {
        "success": True,
        "message": f"Sending {len(registrations_data)} reminder emails in background. Check logs for completion status.",
        "sent_count": len(registrations_data),
        "total_attendees": len(registrations),
        "background": True
    }


@router.get("/reminder-templates")
def get_reminder_templates():
    """Get available reminder email templates"""
    return {
        "templates": [
            {
                "id": "questions_reminder",
                "name": "Submit Questions Reminder",
                "description": "Remind attendees they can submit questions before the seminar"
            },
            {
                "id": "invite_others",
                "name": "Invite Others",
                "description": "Encourage attendees to invite colleagues to register"
            },
            {
                "id": "event_reminder",
                "name": "Event Reminder",
                "description": "General reminder about the upcoming event with details"
            },
            {
                "id": "final_reminder",
                "name": "Final Reminder (Event Tomorrow)",
                "description": "Final reminder with ticket code, QR instructions, and program PDF attachment"
            }
        ]
    }


@router.post("/send-registration-report")
async def send_registration_report(
    data: Optional[RegistrationReportRequest] = None,
    db: Session = Depends(get_db)
):
    """Send registration report with CSV to admin emails"""
    from models import Registration
    import csv
    import io
    from datetime import datetime
    
    # Admin recipients for the report
    REPORT_RECIPIENTS = [
        "kofi.datsa@gmail.com",
        "agyarefredrick22@gmail.com",
        "george.attopany@databankgroup.com"
    ]
    
    # If test_only, only send to test email
    if data and data.test_only:
        REPORT_RECIPIENTS = ["agyarefredrick22@gmail.com"]
    
    # Get all registrations
    registrations = db.query(Registration).order_by(Registration.created_at.desc()).all()
    
    # Count by status
    confirmed_count = sum(1 for r in registrations if r.status == "confirmed")
    pending_payment_count = sum(1 for r in registrations if r.status == "pending_payment")
    awaiting_verification_count = sum(1 for r in registrations if r.status == "awaiting_verification")
    pending_approval_count = sum(1 for r in registrations if r.status == "pending_approval")
    total_count = len(registrations)
    
    # Generate CSV
    csv_buffer = io.StringIO()
    csv_writer = csv.writer(csv_buffer)
    csv_writer.writerow([
        "ID", "Full Name", "Email", "Phone", "Job Title", "Company/Organization",
        "Status", "Ticket Type", "Ticket Code", "Registered At"
    ])
    
    for reg in registrations:
        org = reg.firm.name if reg.firm else reg.company
        csv_writer.writerow([
            reg.id,
            reg.full_name,
            reg.email,
            reg.phone or "",
            reg.job_title or "",
            org or "",
            reg.status,
            reg.ticket_type,
            reg.ticket_code or "",
            reg.created_at.strftime("%Y-%m-%d %H:%M") if reg.created_at else ""
        ])
    
    csv_content = csv_buffer.getvalue().encode('utf-8')
    csv_buffer.close()
    
    # Generate report date
    report_date = datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")
    
    # Email HTML
    html_body = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f4f4f4; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); margin-top: 20px; margin-bottom: 20px;">
            <div style="background-color: #1a365d; padding: 30px 20px; text-align: center;">
                <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">Registration Report</h1>
                <p style="color: #94a3b8; margin: 10px 0 0 0; font-size: 14px;">Ghana Competition Law Seminar</p>
            </div>
            
            <div style="padding: 40px 30px;">
                <p style="font-size: 14px; color: #666; margin-bottom: 25px;">Report generated: {report_date}</p>
                
                <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 25px; margin-bottom: 25px;">
                    <h3 style="color: #1a365d; margin: 0 0 20px 0; font-size: 18px;">Registration Summary</h3>
                    
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; color: #64748b;">Total Registrations</td>
                            <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; color: #1e293b; font-weight: 600; text-align: right; font-size: 20px;">{total_count}</td>
                        </tr>
                        <tr>
                            <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; color: #059669;">✓ Confirmed</td>
                            <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; color: #059669; font-weight: 600; text-align: right;">{confirmed_count}</td>
                        </tr>
                        <tr>
                            <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; color: #d97706;">⏳ Pending Payment</td>
                            <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; color: #d97706; font-weight: 600; text-align: right;">{pending_payment_count}</td>
                        </tr>
                        <tr>
                            <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; color: #0284c7;">🔍 Awaiting Verification</td>
                            <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; color: #0284c7; font-weight: 600; text-align: right;">{awaiting_verification_count}</td>
                        </tr>
                        <tr>
                            <td style="padding: 12px 0; color: #7c3aed;">📋 Pending Approval</td>
                            <td style="padding: 12px 0; color: #7c3aed; font-weight: 600; text-align: right;">{pending_approval_count}</td>
                        </tr>
                    </table>
                </div>
                
                <p style="font-size: 14px; color: #666;">
                    📎 The full attendee list is attached as a CSV file.
                </p>
            </div>
            
            <div style="background-color: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
                <p style="margin: 0;">&copy; 2026 Ghana Competition Law Seminar. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    # Send to all recipients
    sent_count = 0
    failed_recipients = []
    
    filename = f"registrations_{datetime.utcnow().strftime('%Y%m%d_%H%M')}.csv"
    
    for recipient in REPORT_RECIPIENTS:
        success = await send_email_internal(
            db,
            recipient,
            f"Registration Report - {confirmed_count} Confirmed Attendees",
            html_body,
            attachments=[(filename, csv_content, "text/csv")]
        )
        if success:
            sent_count += 1
        else:
            failed_recipients.append(recipient)
    
    return {
        "success": sent_count > 0,
        "message": f"Report sent to {sent_count}/{len(REPORT_RECIPIENTS)} recipients",
        "sent_count": sent_count,
        "failed_recipients": failed_recipients,
        "stats": {
            "total": total_count,
            "confirmed": confirmed_count,
            "pending_payment": pending_payment_count,
            "awaiting_verification": awaiting_verification_count,
            "pending_approval": pending_approval_count
        }
    }


class SMSTicketReminderRequest(BaseModel):
    test_phone: Optional[str] = None  # If provided, send only to this phone for testing


async def send_bulk_sms_tickets_task(registrations_data: List[dict]):
    """Background task to send bulk SMS ticket reminders"""
    db = SessionLocal()
    try:
        sent_count = 0
        failed_count = 0
        
        for reg_data in registrations_data:
            phone = reg_data.get("phone")
            if phone:
                first_name = reg_data["full_name"].split()[0] if reg_data.get("full_name") else "Attendee"
                ticket_code = reg_data.get("ticket_code", "N/A")
                message = f"Hi {first_name}! Your ticket code for GCLS 2026 is: {ticket_code}. Present this at check-in. Have a great time at the event!"
                success = await send_sms_internal(db, phone, message)
                if success:
                    sent_count += 1
                else:
                    failed_count += 1
        
        logger.info(f"Bulk SMS tickets completed: {sent_count} sent, {failed_count} failed")
    except Exception as e:
        logger.error(f"Error in bulk SMS task: {e}")
    finally:
        db.close()


@router.post("/send-sms-tickets")
async def send_sms_ticket_reminders(
    data: SMSTicketReminderRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """Send SMS with ticket code to all confirmed attendees"""
    from models import Registration
    
    # Check if SMS is enabled
    sms_enabled = get_setting(db, "notifications_sms_enabled", "true") == "true"
    if not sms_enabled:
        raise HTTPException(status_code=400, detail="SMS notifications are disabled")
    
    # If test phone provided, only send to that (synchronous for immediate feedback)
    if data.test_phone:
        message = f"Hi Test! Your ticket code for GCLS 2026 is: TEST123. Present this at check-in. Have a great time at the event!"
        success = await send_sms_internal(db, data.test_phone, message)
        return {
            "success": success,
            "message": f"Test SMS sent to {data.test_phone}" if success else "Failed to send test SMS",
            "sent_count": 1 if success else 0
        }
    
    # Get all confirmed registrations with phone numbers
    registrations = db.query(Registration).filter(
        Registration.status == "confirmed",
        Registration.phone.isnot(None),
        Registration.phone != ""
    ).all()
    
    if not registrations:
        return {"success": True, "message": "No confirmed attendees with phone numbers to send to", "sent_count": 0}
    
    # Extract registration data for background task
    registrations_data = [
        {"phone": reg.phone, "full_name": reg.full_name, "ticket_code": reg.ticket_code}
        for reg in registrations if reg.phone
    ]
    
    # Queue the bulk SMS sending as a background task
    background_tasks.add_task(
        send_bulk_sms_tickets_task,
        registrations_data
    )
    
    return {
        "success": True,
        "message": f"Sending {len(registrations_data)} SMS ticket reminders in background. Check logs for completion status.",
        "sent_count": len(registrations_data),
        "total_attendees": len(registrations),
        "background": True
    }


class SurveyInviteRequest(BaseModel):
    test_only: bool = False


async def send_bulk_survey_invites_task(registrations_data: List[dict], send_sms: bool = True):
    """Background task to send bulk survey invitations with unique links"""
    db = SessionLocal()
    try:
        email_sent = 0
        sms_sent = 0
        
        smtp_email = get_setting(db, "smtp_email")
        smtp_password = get_setting(db, "smtp_password")
        sender_name = get_setting(db, "smtp_sender_name", "Ghana Competition Law Seminar")
        
        import smtplib
        from email.mime.multipart import MIMEMultipart
        from email.mime.text import MIMEText
        
        for reg_data in registrations_data:
            email = reg_data.get("email")
            phone = reg_data.get("phone")
            token = reg_data.get("token")
            first_name = reg_data["full_name"].split()[0] if reg_data.get("full_name") else "Attendee"
            survey_url = f"https://seminar.cmc-ghana.com/feedback?token={token}"
            
            if email and smtp_email and smtp_password:
                try:
                    html_content = f"""<!DOCTYPE html>
<html><head><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;background-color:#f4f4f4;">
<div style="max-width:600px;margin:20px auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.1);">
<div style="background-color:#1a365d;padding:30px 20px;text-align:center;">
<h1 style="color:#fff;margin:0;font-size:24px;">Share Your Feedback</h1></div>
<div style="padding:40px 30px;">
<p style="font-size:16px;line-height:1.6;color:#444;">Dear {html.escape(first_name)},</p>
<p style="font-size:16px;line-height:1.6;color:#444;">Thank you for attending the Ghana Competition Law & Policy Seminar! We hope you found it valuable.</p>
<p style="font-size:16px;line-height:1.6;color:#444;">We would love to hear your feedback to help us improve future events. It only takes 2 minutes!</p>
<div style="text-align:center;margin:30px 0;">
<a href="{survey_url}" style="display:inline-block;background:linear-gradient(135deg,#1a365d 0%,#2d4a7c 100%);color:#fff;padding:14px 32px;text-decoration:none;border-radius:8px;font-weight:600;font-size:16px;">Share Your Feedback</a></div>
<p style="font-size:16px;line-height:1.6;color:#444;">As a thank you, you'll receive a <strong>Digital Souvenir</strong> from the seminar after completing the survey!</p>
<p style="font-size:14px;line-height:1.6;color:#999;">This is your personal survey link. Your feedback is anonymous — we do not collect your name.</p>
<p style="font-size:16px;line-height:1.6;color:#444;">Warm regards,<br><strong>The Competition & Markets Center Team</strong></p></div></div>
</body></html>"""
                    
                    msg = MIMEMultipart('alternative')
                    msg['Subject'] = "Share Your Feedback - Get Your Digital Souvenir!"
                    msg['From'] = f"{sender_name} <{smtp_email}>"
                    msg['To'] = email
                    msg.attach(MIMEText(html_content, 'html'))
                    
                    with smtplib.SMTP_SSL('smtp.gmail.com', 465) as server:
                        server.login(smtp_email, smtp_password)
                        server.sendmail(smtp_email, email, msg.as_string())
                    
                    email_sent += 1
                except Exception as e:
                    logger.error(f"Failed to send survey email to {email}: {e}")
            
            if send_sms and phone:
                message = f"Hi {first_name}! Thank you for attending GCLS 2026. Share your feedback & get your digital souvenir: {survey_url}"
                success = await send_sms_internal(db, phone, message)
                if success:
                    sms_sent += 1
        
        logger.info(f"Survey invites completed: {email_sent} emails, {sms_sent} SMS sent")
    except Exception as e:
        logger.error(f"Error in survey invite task: {e}")
    finally:
        db.close()


@router.post("/send-survey-invite")
async def send_survey_invitations(
    data: SurveyInviteRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """Send survey invitation with unique link to all confirmed attendees"""
    from models import Registration
    import secrets
    
    if data.test_only:
        test_email = get_setting(db, "smtp_email")
        test_phone = get_setting(db, "test_sms_phone")
        token = secrets.token_urlsafe(32)
        
        # Store token -> registration mapping (use 0 for test)
        token_setting = Settings(key=f"survey_token_{token}", value="0")
        db.add(token_setting)
        db.commit()
        
        registrations_data = [{
            "email": test_email,
            "phone": test_phone,
            "full_name": "Test User",
            "token": token
        }]
        
        background_tasks.add_task(send_bulk_survey_invites_task, registrations_data, True)
        
        return {
            "success": True,
            "message": f"Test survey invite sent to {test_email}",
            "sent_count": 1,
            "test": True
        }
    
    registrations = db.query(Registration).filter(
        Registration.status == "confirmed"
    ).all()
    
    if not registrations:
        return {"success": True, "message": "No confirmed attendees to send to", "sent_count": 0}
    
    registrations_data = []
    for reg in registrations:
        token = secrets.token_urlsafe(32)
        # Store token -> registration_id mapping
        token_setting = Settings(key=f"survey_token_{token}", value=str(reg.id))
        db.add(token_setting)
        registrations_data.append({
            "email": reg.email,
            "phone": reg.phone,
            "full_name": reg.full_name,
            "token": token
        })
    
    db.commit()
    
    background_tasks.add_task(send_bulk_survey_invites_task, registrations_data, True)
    
    return {
        "success": True,
        "message": f"Sending unique survey links to {len(registrations_data)} attendees in background.",
        "sent_count": len(registrations_data),
        "background": True
    }
