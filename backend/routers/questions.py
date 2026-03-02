from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from database import get_db
from models import Question, Registration
from schemas import QuestionCreate, QuestionResponse
from datetime import datetime

router = APIRouter(prefix="/api/questions", tags=["questions"])

@router.post("/", response_model=QuestionResponse)
def create_question(question: QuestionCreate, db: Session = Depends(get_db)):
    """Submit a new question (for both registered and unregistered users)"""
    db_question = Question(
        ticket_code=question.ticket_code,
        name=question.name,
        email=question.email,
        question_text=question.question_text,
        session_number=question.session_number
    )
    db.add(db_question)
    db.commit()
    db.refresh(db_question)
    
    # If ticket code provided, try to get registration info
    registration_info = None
    if question.ticket_code:
        registration = db.query(Registration).filter(
            Registration.ticket_code == question.ticket_code
        ).first()
        if registration:
            registration_info = {
                "id": registration.id,
                "full_name": registration.full_name,
                "email": registration.email,
                "company": registration.company,
                "firm_name": registration.firm.name if registration.firm else None,
                "status": registration.status,
                "ticket_type": registration.ticket_type
            }
    
    response = QuestionResponse.from_orm(db_question)
    response.registration_info = registration_info
    return response

@router.get("/", response_model=List[QuestionResponse])
def get_questions(
    session_number: Optional[int] = None,
    answered: Optional[bool] = None,
    db: Session = Depends(get_db)
):
    """Get all questions with optional filters"""
    query = db.query(Question)
    
    if session_number is not None:
        query = query.filter(Question.session_number == session_number)
    
    if answered is not None:
        query = query.filter(Question.is_answered == (1 if answered else 0))
    
    questions = query.order_by(Question.created_at.desc()).all()
    
    # Add registration info for questions with ticket codes
    results = []
    for question in questions:
        response = QuestionResponse.from_orm(question)
        if question.ticket_code:
            registration = db.query(Registration).filter(
                Registration.ticket_code == question.ticket_code
            ).first()
            if registration:
                response.registration_info = {
                    "id": registration.id,
                    "full_name": registration.full_name,
                    "email": registration.email,
                    "company": registration.company,
                    "firm_name": registration.firm.name if registration.firm else None,
                    "status": registration.status,
                    "ticket_type": registration.ticket_type
                }
        results.append(response)
    
    return results

@router.put("/{question_id}/answer")
def mark_question_answered(question_id: int, db: Session = Depends(get_db)):
    """Mark a question as answered"""
    question = db.query(Question).filter(Question.id == question_id).first()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    
    question.is_answered = 1
    question.answered_at = datetime.utcnow()
    db.commit()
    
    return {"message": "Question marked as answered"}

@router.delete("/{question_id}")
def delete_question(question_id: int, db: Session = Depends(get_db)):
    """Delete a question"""
    question = db.query(Question).filter(Question.id == question_id).first()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    
    db.delete(question)
    db.commit()
    
    return {"message": "Question deleted"}

@router.get("/stats")
def get_question_stats(db: Session = Depends(get_db)):
    """Get question statistics"""
    total_questions = db.query(Question).count()
    answered_questions = db.query(Question).filter(Question.is_answered == 1).count()
    unanswered_questions = total_questions - answered_questions
    
    # Questions by session
    session_stats = []
    for session_num in range(1, 5):  # Sessions 1-4
        count = db.query(Question).filter(Question.session_number == session_num).count()
        session_stats.append({
            "session_number": session_num,
            "question_count": count
        })
    
    # Questions with/without ticket codes
    with_ticket_code = db.query(Question).filter(Question.ticket_code.isnot(None)).count()
    without_ticket_code = total_questions - with_ticket_code
    
    return {
        "total_questions": total_questions,
        "answered_questions": answered_questions,
        "unanswered_questions": unanswered_questions,
        "with_ticket_code": with_ticket_code,
        "without_ticket_code": without_ticket_code,
        "by_session": session_stats
    }
