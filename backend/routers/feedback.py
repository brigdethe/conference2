from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import csv
import io
import httpx
import logging
import secrets

from database import get_db, SessionLocal
from models import FeedbackResponse, Settings, Registration

router = APIRouter(prefix="/feedback", tags=["feedback"])
logger = logging.getLogger(__name__)

Q1_VALUES = ["Terrible", "Poor", "Okay", "Good", "Amazing"]
Q3_VALUES = ["Too Slow", "Just Right", "Too Fast"]
Q6_VALUES = ["Very Unlikely", "Unlikely", "Maybe", "Likely", "Very Likely"]


def get_setting(db: Session, key: str, default: str = None) -> str:
    setting = db.query(Settings).filter(Settings.key == key).first()
    return setting.value if setting and setting.value else default


def generate_survey_token() -> str:
    return secrets.token_urlsafe(32)


class FeedbackSubmission(BaseModel):
    survey_token: str
    q1_expectations: str  # emoji: "Terrible"..."Amazing"
    q2_had_unclear: str  # "Yes" or "No"
    q2_unclear_section: Optional[str] = None
    q3_pace: str  # "Too Slow", "Just Right", "Too Fast"
    q4_speaker_improvements: Optional[str] = None
    q5_future_topics: Optional[str] = None
    q6_attend_again: str  # "Very Unlikely"..."Very Likely"


async def send_thank_you_email(email: str, first_name: str):
    """Send thank you email with digital souvenir attachment placeholder"""
    db = SessionLocal()
    try:
        smtp_email = get_setting(db, "smtp_email")
        smtp_password = get_setting(db, "smtp_password")
        sender_name = get_setting(db, "smtp_sender_name", "Ghana Competition Law Seminar")
        
        if not smtp_email or not smtp_password:
            logger.warning("SMTP not configured, skipping thank you email")
            return
        
        import html as html_mod
        safe_name = html_mod.escape(first_name)
        
        html_content = f"""<!DOCTYPE html>
<html><head><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;background-color:#f4f4f4;color:#333;">
<div style="max-width:600px;margin:20px auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.1);">
<div style="background-color:#1a365d;padding:30px 20px;text-align:center;">
<h1 style="color:#fff;margin:0;font-size:24px;font-weight:600;">Thank You for Your Feedback!</h1></div>
<div style="padding:40px 30px;">
<p style="font-size:16px;line-height:1.6;color:#444;">Dear {safe_name},</p>
<p style="font-size:16px;line-height:1.6;color:#444;">Thank you for taking the time to share your feedback on the Ghana Competition Law & Policy Seminar. Your insights are invaluable in helping us improve future events.</p>
<p style="font-size:16px;line-height:1.6;color:#444;">As a token of our appreciation, please find attached your <strong>Digital Souvenir</strong> from the seminar.</p>
<div style="background-color:#f8f9fa;border-radius:8px;padding:20px;margin:25px 0;border-left:4px solid #1a365d;">
<p style="margin:0;font-size:14px;color:#666;"><strong>📎 Attachment:</strong> Digital Souvenir - Ghana Competition Law Seminar 2026</p></div>
<p style="font-size:16px;line-height:1.6;color:#444;">We hope to see you at our future events!</p>
<p style="font-size:16px;line-height:1.6;color:#444;">Warm regards,<br><strong>The Competition & Markets Center Team</strong></p></div>
<div style="background-color:#f8f9fa;padding:20px;text-align:center;border-top:1px solid #eee;">
<p style="margin:0;font-size:12px;color:#888;">© 2026 Competition & Marketing Center Ltd.</p></div></div>
</body></html>"""
        
        import smtplib
        from email.mime.multipart import MIMEMultipart
        from email.mime.text import MIMEText
        
        msg = MIMEMultipart('alternative')
        msg['Subject'] = "Thank You for Your Feedback - Digital Souvenir Attached"
        msg['From'] = f"{sender_name} <{smtp_email}>"
        msg['To'] = email
        msg.attach(MIMEText(html_content, 'html'))
        
        with smtplib.SMTP_SSL('smtp.gmail.com', 465) as server:
            server.login(smtp_email, smtp_password)
            server.sendmail(smtp_email, email, msg.as_string())
        
        logger.info(f"Thank you email sent to {email}")
    except Exception as e:
        logger.error(f"Failed to send thank you email to {email}: {e}")
    finally:
        db.close()


@router.post("")
async def submit_feedback(
    data: FeedbackSubmission,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """Submit feedback response - one per survey token"""
    # Check token already used
    existing = db.query(FeedbackResponse).filter(
        FeedbackResponse.survey_token == data.survey_token
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Feedback already submitted with this link")
    
    # Validate inputs
    if data.q1_expectations not in Q1_VALUES:
        raise HTTPException(status_code=400, detail="Invalid value for q1_expectations")
    if data.q2_had_unclear not in ["Yes", "No"]:
        raise HTTPException(status_code=400, detail="Invalid value for q2_had_unclear")
    if data.q3_pace not in Q3_VALUES:
        raise HTTPException(status_code=400, detail="Invalid value for q3_pace")
    if data.q6_attend_again not in Q6_VALUES:
        raise HTTPException(status_code=400, detail="Invalid value for q6_attend_again")
    
    # Find the registration linked to this token (stored in settings as token->reg_id mapping)
    token_setting = db.query(Settings).filter(Settings.key == f"survey_token_{data.survey_token}").first()
    reg_id = int(token_setting.value) if token_setting and token_setting.value else None
    
    feedback = FeedbackResponse(
        survey_token=data.survey_token,
        registration_id=reg_id,
        q1_expectations=data.q1_expectations,
        q2_had_unclear=data.q2_had_unclear,
        q2_unclear_section=data.q2_unclear_section if data.q2_had_unclear == "Yes" else None,
        q3_pace=data.q3_pace,
        q4_speaker_improvements=data.q4_speaker_improvements,
        q5_future_topics=data.q5_future_topics,
        q6_attend_again=data.q6_attend_again
    )
    
    db.add(feedback)
    db.commit()
    db.refresh(feedback)
    
    # Send thank you email to the attendee linked to this token
    if reg_id and reg_id != 0:
        reg = db.query(Registration).filter(Registration.id == reg_id).first()
        if reg and reg.email:
            first_name = reg.full_name.split()[0] if reg.full_name else "Attendee"
            background_tasks.add_task(send_thank_you_email, reg.email, first_name)
    elif reg_id == 0:
        # Test submission - send to admin/smtp email
        smtp_email = get_setting(db, "smtp_email")
        if smtp_email:
            background_tasks.add_task(send_thank_you_email, smtp_email, "Test Admin")
    
    return {"success": True, "message": "Thank you for your feedback!"}


@router.get("")
async def get_all_feedback(db: Session = Depends(get_db)):
    """Get all feedback responses (admin)"""
    responses = db.query(FeedbackResponse).order_by(FeedbackResponse.created_at.desc()).all()
    return [
        {
            "id": r.id,
            "q1_expectations": r.q1_expectations,
            "q2_had_unclear": r.q2_had_unclear,
            "q2_unclear_section": r.q2_unclear_section,
            "q3_pace": r.q3_pace,
            "q4_speaker_improvements": r.q4_speaker_improvements,
            "q5_future_topics": r.q5_future_topics,
            "q6_attend_again": r.q6_attend_again,
            "created_at": r.created_at.isoformat() if r.created_at else None
        }
        for r in responses
    ]


@router.get("/stats")
async def get_feedback_stats(db: Session = Depends(get_db)):
    """Get aggregated feedback statistics"""
    total = db.query(func.count(FeedbackResponse.id)).scalar() or 0
    
    q2_unclear = db.query(func.count(FeedbackResponse.id)).filter(
        FeedbackResponse.q2_had_unclear == "Yes"
    ).scalar() or 0
    
    # Q1 expectations (emoji) distribution
    q1_dist = {}
    for val in Q1_VALUES:
        count = db.query(func.count(FeedbackResponse.id)).filter(
            FeedbackResponse.q1_expectations == val
        ).scalar() or 0
        q1_dist[val] = count
    
    # Q3 pace distribution
    pace_dist = {}
    for pace in Q3_VALUES:
        count = db.query(func.count(FeedbackResponse.id)).filter(
            FeedbackResponse.q3_pace == pace
        ).scalar() or 0
        pace_dist[pace] = count
    
    # Q6 attend again (Likert) distribution
    q6_dist = {}
    for val in Q6_VALUES:
        count = db.query(func.count(FeedbackResponse.id)).filter(
            FeedbackResponse.q6_attend_again == val
        ).scalar() or 0
        q6_dist[val] = count
    
    return {
        "total_responses": total,
        "q1_distribution": q1_dist,
        "q2_had_unclear_count": q2_unclear,
        "q3_pace_distribution": pace_dist,
        "q6_distribution": q6_dist
    }


@router.get("/export")
async def export_feedback_csv(db: Session = Depends(get_db)):
    """Export feedback as CSV"""
    from fastapi.responses import StreamingResponse
    
    responses = db.query(FeedbackResponse).order_by(FeedbackResponse.created_at.desc()).all()
    
    output = io.StringIO()
    writer = csv.writer(output)
    
    writer.writerow([
        "ID", "Submitted At",
        "Q1: Met Expectations (Emoji)", 
        "Q2: Had Unclear Section", "Q2: Unclear Section Details",
        "Q3: Presentation Pace",
        "Q4: Speaker Improvements",
        "Q5: Future Topics",
        "Q6: Likely to Attend Again"
    ])
    
    for r in responses:
        writer.writerow([
            r.id,
            r.created_at.strftime("%Y-%m-%d %H:%M:%S") if r.created_at else "",
            r.q1_expectations,
            r.q2_had_unclear,
            r.q2_unclear_section or "",
            r.q3_pace,
            r.q4_speaker_improvements or "",
            r.q5_future_topics or "",
            r.q6_attend_again
        ])
    
    output.seek(0)
    
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=feedback_responses.csv"}
    )


@router.post("/opened/{token}")
async def record_survey_opened(token: str, db: Session = Depends(get_db)):
    """Record that someone opened the survey link"""
    import json as json_mod
    token_setting = db.query(Settings).filter(Settings.key == f"survey_token_{token}").first()
    if not token_setting:
        return {"ok": False}
    
    invite_setting = db.query(Settings).filter(Settings.key == f"survey_invite_{token}").first()
    if invite_setting:
        try:
            meta = json_mod.loads(invite_setting.value)
            if not meta.get("opened_at"):
                meta["opened_at"] = datetime.utcnow().isoformat()
                invite_setting.value = json_mod.dumps(meta)
                db.commit()
        except Exception:
            pass
    return {"ok": True}


@router.get("/check/{token}")
async def check_feedback_exists(token: str, db: Session = Depends(get_db)):
    """Check if survey token is valid and whether feedback was already submitted"""
    # Check token exists
    token_setting = db.query(Settings).filter(Settings.key == f"survey_token_{token}").first()
    if not token_setting:
        return {"valid": False, "submitted": False}
    
    existing = db.query(FeedbackResponse).filter(
        FeedbackResponse.survey_token == token
    ).first()
    return {"valid": True, "submitted": existing is not None}


class ResetRequest(BaseModel):
    pin: str


@router.post("/reset")
async def reset_feedback(data: ResetRequest, db: Session = Depends(get_db)):
    """Reset all feedback responses and invite tracking. Requires PIN."""
    if data.pin != "21savage":
        raise HTTPException(status_code=403, detail="Incorrect PIN")
    
    # Delete all feedback responses
    deleted_responses = db.query(FeedbackResponse).delete()
    
    # Delete all survey tokens and invite metadata
    deleted_tokens = db.query(Settings).filter(Settings.key.like("survey_token_%")).delete(synchronize_session=False)
    deleted_invites = db.query(Settings).filter(Settings.key.like("survey_invite_%")).delete(synchronize_session=False)
    
    db.commit()
    
    return {
        "success": True,
        "message": f"Reset complete. Deleted {deleted_responses} responses, {deleted_tokens} tokens, {deleted_invites} invite records."
    }


@router.get("/invites")
async def get_survey_invites(db: Session = Depends(get_db)):
    """Get all survey invites with completion status"""
    import json as json_mod
    
    # Get all invite metadata entries
    invite_settings = db.query(Settings).filter(Settings.key.like("survey_invite_%")).all()
    
    invites = []
    for inv in invite_settings:
        token = inv.key.replace("survey_invite_", "")
        try:
            meta = json_mod.loads(inv.value)
        except Exception:
            continue
        
        # Check if this token has a completed feedback
        feedback = db.query(FeedbackResponse).filter(
            FeedbackResponse.survey_token == token
        ).first()
        
        opened_at = meta.get("opened_at")
        is_completed = feedback is not None
        
        # Determine status: sent → opened → completed
        if is_completed:
            status = "completed"
        elif opened_at:
            status = "opened"
        else:
            status = "sent"
        
        invites.append({
            "token": token[:8] + "...",
            "name": meta.get("name", "Unknown"),
            "email": meta.get("email"),
            "phone": meta.get("phone"),
            "type": meta.get("type", "unknown"),
            "sent_at": meta.get("sent_at"),
            "opened_at": opened_at,
            "status": status,
            "completed": is_completed,
            "completed_at": feedback.created_at.isoformat() if feedback and feedback.created_at else None
        })
    
    # Sort: pending first, opened second, completed last; then by sent_at
    status_order = {"sent": 0, "opened": 1, "completed": 2}
    invites.sort(key=lambda x: (status_order.get(x["status"], 0), x.get("sent_at") or ""))
    
    total = len(invites)
    completed = sum(1 for i in invites if i["completed"])
    opened = sum(1 for i in invites if i["status"] == "opened")
    
    return {
        "invites": invites,
        "total": total,
        "completed": completed,
        "opened": opened,
        "pending": total - completed - opened
    }


@router.post("/analyze")
async def analyze_feedback(db: Session = Depends(get_db)):
    """Use Groq AI to analyze feedback responses"""
    groq_api_key = get_setting(db, "groq_api_key")
    
    if not groq_api_key:
        raise HTTPException(status_code=400, detail="Groq API key not configured. Add it in Settings.")
    
    responses = db.query(FeedbackResponse).all()
    
    if not responses:
        raise HTTPException(status_code=400, detail="No feedback responses to analyze")
    
    unclear_sections = [r.q2_unclear_section for r in responses if r.q2_unclear_section]
    speaker_improvements = [r.q4_speaker_improvements for r in responses if r.q4_speaker_improvements]
    future_topics = [r.q5_future_topics for r in responses if r.q5_future_topics]
    
    q1_summary = ", ".join(f"{v}: {sum(1 for r in responses if r.q1_expectations == v)}" for v in Q1_VALUES)
    q3_summary = ", ".join(f"{v}: {sum(1 for r in responses if r.q3_pace == v)}" for v in Q3_VALUES)
    q6_summary = ", ".join(f"{v}: {sum(1 for r in responses if r.q6_attend_again == v)}" for v in Q6_VALUES)
    
    prompt = f"""Analyze the following feedback from a Ghana Competition Law & Policy Seminar. Provide:
1. Overall sentiment summary
2. Key themes from the feedback
3. Specific improvement suggestions for future events

FEEDBACK DATA ({len(responses)} responses):
- Q1 "Did the seminar meet expectations?" (emoji scale): {q1_summary}
- Q3 "Presentation pace": {q3_summary}
- Q6 "Likelihood to attend again" (Likert): {q6_summary}
- {len(unclear_sections)} respondents found unclear sections

UNCLEAR SECTIONS:
{chr(10).join(f'- {s}' for s in unclear_sections) if unclear_sections else 'None reported'}

SPEAKER IMPROVEMENT SUGGESTIONS:
{chr(10).join(f'- {s}' for s in speaker_improvements) if speaker_improvements else 'None provided'}

FUTURE TOPICS REQUESTED:
{chr(10).join(f'- {s}' for s in future_topics) if future_topics else 'None provided'}

Please provide a comprehensive analysis with actionable insights."""

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {groq_api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": "llama-3.3-70b-versatile",
                    "messages": [
                        {"role": "system", "content": "You are an expert event feedback analyst. Provide clear, actionable insights."},
                        {"role": "user", "content": prompt}
                    ],
                    "temperature": 0.7,
                    "max_tokens": 2000
                },
                timeout=60.0
            )
            
            if response.status_code != 200:
                raise HTTPException(status_code=500, detail=f"Groq API error: {response.text}")
            
            result = response.json()
            analysis = result["choices"][0]["message"]["content"]
            
            return {"analysis": analysis}
    
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Analysis request timed out")
    except Exception as e:
        logger.error(f"Groq analysis error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
