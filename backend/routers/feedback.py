from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime
import csv
import io
import httpx
import logging

from database import get_db
from models import FeedbackResponse, Settings

router = APIRouter(prefix="/feedback", tags=["feedback"])
logger = logging.getLogger(__name__)


def get_setting(db: Session, key: str, default: str = None) -> str:
    setting = db.query(Settings).filter(Settings.key == key).first()
    return setting.value if setting and setting.value else default


class FeedbackSubmission(BaseModel):
    device_fingerprint: str
    email: Optional[str] = None
    q1_expectations: str  # "Yes" or "No"
    q2_had_unclear: str  # "Yes" or "No"
    q2_unclear_section: Optional[str] = None
    q3_pace: str  # "Too Slow", "Just Right", "Too Fast"
    q4_speaker_improvements: Optional[str] = None
    q5_future_topics: Optional[str] = None
    q6_attend_again: str  # "Terrible", "Poor", "Okay", "Good", "Amazing"


class FeedbackStats(BaseModel):
    total_responses: int
    q1_yes_count: int
    q1_no_count: int
    q2_had_unclear_count: int
    q3_pace_distribution: dict
    q6_rating_distribution: dict


async def send_thank_you_email(db: Session, email: str):
    """Send thank you email with digital souvenir attachment placeholder"""
    smtp_email = get_setting(db, "smtp_email")
    smtp_password = get_setting(db, "smtp_password")
    sender_name = get_setting(db, "smtp_sender_name", "Ghana Competition Law Seminar")
    
    if not smtp_email or not smtp_password:
        logger.warning("SMTP not configured, skipping thank you email")
        return
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f4f4f4; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); margin-top: 20px; margin-bottom: 20px;">
            <div style="background-color: #1a365d; padding: 30px 20px; text-align: center;">
                <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">Thank You for Your Feedback!</h1>
            </div>
            
            <div style="padding: 40px 30px;">
                <p style="font-size: 16px; line-height: 1.6; color: #444;">Dear Attendee,</p>
                
                <p style="font-size: 16px; line-height: 1.6; color: #444;">Thank you for taking the time to share your feedback on the Ghana Competition Law & Policy Seminar. Your insights are invaluable in helping us improve future events.</p>
                
                <p style="font-size: 16px; line-height: 1.6; color: #444;">As a token of our appreciation, please find attached your <strong>Digital Souvenir</strong> from the seminar.</p>
                
                <div style="background-color: #f8f9fa; border-radius: 8px; padding: 20px; margin: 25px 0; border-left: 4px solid #1a365d;">
                    <p style="margin: 0; font-size: 14px; color: #666;">
                        <strong>📎 Attachment:</strong> Digital Souvenir - Ghana Competition Law Seminar 2026
                    </p>
                </div>
                
                <p style="font-size: 16px; line-height: 1.6; color: #444;">We hope to see you at our future events!</p>
                
                <p style="font-size: 16px; line-height: 1.6; color: #444;">
                    Warm regards,<br>
                    <strong>The Competition & Markets Center Team</strong>
                </p>
            </div>
            
            <div style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #eee;">
                <p style="margin: 0; font-size: 12px; color: #888;">
                    © 2026 Competition & Marketing Center Ltd.<br>
                    Ghana Competition Law & Policy Seminar
                </p>
            </div>
        </div>
    </body>
    </html>
    """
    
    try:
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


@router.post("")
async def submit_feedback(
    data: FeedbackSubmission,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """Submit feedback response - one per device"""
    # Check if device already submitted
    existing = db.query(FeedbackResponse).filter(
        FeedbackResponse.device_fingerprint == data.device_fingerprint
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Feedback already submitted from this device")
    
    # Validate inputs
    if data.q1_expectations not in ["Yes", "No"]:
        raise HTTPException(status_code=400, detail="Invalid value for q1_expectations")
    if data.q2_had_unclear not in ["Yes", "No"]:
        raise HTTPException(status_code=400, detail="Invalid value for q2_had_unclear")
    if data.q3_pace not in ["Too Slow", "Just Right", "Too Fast"]:
        raise HTTPException(status_code=400, detail="Invalid value for q3_pace")
    if data.q6_attend_again not in ["Terrible", "Poor", "Okay", "Good", "Amazing"]:
        raise HTTPException(status_code=400, detail="Invalid value for q6_attend_again")
    
    # Create feedback response
    feedback = FeedbackResponse(
        device_fingerprint=data.device_fingerprint,
        email=data.email,
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
    
    # Send thank you email if email provided
    if data.email:
        background_tasks.add_task(send_thank_you_email, db, data.email)
    
    return {"success": True, "message": "Thank you for your feedback!"}


@router.get("")
async def get_all_feedback(db: Session = Depends(get_db)):
    """Get all feedback responses (admin)"""
    responses = db.query(FeedbackResponse).order_by(FeedbackResponse.created_at.desc()).all()
    return [
        {
            "id": r.id,
            "email": r.email,
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
    
    q1_yes = db.query(func.count(FeedbackResponse.id)).filter(
        FeedbackResponse.q1_expectations == "Yes"
    ).scalar() or 0
    
    q2_unclear = db.query(func.count(FeedbackResponse.id)).filter(
        FeedbackResponse.q2_had_unclear == "Yes"
    ).scalar() or 0
    
    # Q3 pace distribution
    pace_dist = {}
    for pace in ["Too Slow", "Just Right", "Too Fast"]:
        count = db.query(func.count(FeedbackResponse.id)).filter(
            FeedbackResponse.q3_pace == pace
        ).scalar() or 0
        pace_dist[pace] = count
    
    # Q6 rating distribution
    rating_dist = {}
    for rating in ["Terrible", "Poor", "Okay", "Good", "Amazing"]:
        count = db.query(func.count(FeedbackResponse.id)).filter(
            FeedbackResponse.q6_attend_again == rating
        ).scalar() or 0
        rating_dist[rating] = count
    
    return {
        "total_responses": total,
        "q1_yes_count": q1_yes,
        "q1_no_count": total - q1_yes,
        "q2_had_unclear_count": q2_unclear,
        "q3_pace_distribution": pace_dist,
        "q6_rating_distribution": rating_dist
    }


@router.get("/export")
async def export_feedback_csv(db: Session = Depends(get_db)):
    """Export feedback as CSV"""
    from fastapi.responses import StreamingResponse
    
    responses = db.query(FeedbackResponse).order_by(FeedbackResponse.created_at.desc()).all()
    
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Header
    writer.writerow([
        "ID", "Email", "Submitted At",
        "Q1: Met Expectations", 
        "Q2: Had Unclear Section", "Q2: Unclear Section Details",
        "Q3: Presentation Pace",
        "Q4: Speaker Improvements",
        "Q5: Future Topics",
        "Q6: Likely to Attend Again"
    ])
    
    # Data rows
    for r in responses:
        writer.writerow([
            r.id,
            r.email or "",
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


@router.get("/check/{fingerprint}")
async def check_feedback_exists(fingerprint: str, db: Session = Depends(get_db)):
    """Check if feedback already submitted for this device"""
    existing = db.query(FeedbackResponse).filter(
        FeedbackResponse.device_fingerprint == fingerprint
    ).first()
    return {"exists": existing is not None}


class AnalyzeRequest(BaseModel):
    pass


@router.post("/analyze")
async def analyze_feedback(db: Session = Depends(get_db)):
    """Use Groq AI to analyze feedback responses"""
    groq_api_key = get_setting(db, "groq_api_key")
    
    if not groq_api_key:
        raise HTTPException(status_code=400, detail="Groq API key not configured")
    
    # Get all feedback
    responses = db.query(FeedbackResponse).all()
    
    if not responses:
        raise HTTPException(status_code=400, detail="No feedback responses to analyze")
    
    # Prepare data for analysis
    feedback_summary = []
    unclear_sections = []
    speaker_improvements = []
    future_topics = []
    
    for r in responses:
        feedback_summary.append({
            "met_expectations": r.q1_expectations,
            "pace": r.q3_pace,
            "attend_again": r.q6_attend_again
        })
        if r.q2_unclear_section:
            unclear_sections.append(r.q2_unclear_section)
        if r.q4_speaker_improvements:
            speaker_improvements.append(r.q4_speaker_improvements)
        if r.q5_future_topics:
            future_topics.append(r.q5_future_topics)
    
    # Build prompt
    prompt = f"""Analyze the following feedback from a Ghana Competition Law & Policy Seminar. Provide:
1. Overall sentiment summary
2. Key themes from the feedback
3. Specific improvement suggestions for future events

FEEDBACK DATA:
- Total responses: {len(responses)}
- Met expectations: {sum(1 for r in responses if r.q1_expectations == 'Yes')} Yes, {sum(1 for r in responses if r.q1_expectations == 'No')} No
- Pace feedback: Too Slow: {sum(1 for r in responses if r.q3_pace == 'Too Slow')}, Just Right: {sum(1 for r in responses if r.q3_pace == 'Just Right')}, Too Fast: {sum(1 for r in responses if r.q3_pace == 'Too Fast')}
- Likelihood to attend again: Terrible: {sum(1 for r in responses if r.q6_attend_again == 'Terrible')}, Poor: {sum(1 for r in responses if r.q6_attend_again == 'Poor')}, Okay: {sum(1 for r in responses if r.q6_attend_again == 'Okay')}, Good: {sum(1 for r in responses if r.q6_attend_again == 'Good')}, Amazing: {sum(1 for r in responses if r.q6_attend_again == 'Amazing')}

UNCLEAR SECTIONS MENTIONED:
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
                    "model": "llama-3.1-70b-versatile",
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
