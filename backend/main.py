from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import engine, Base
from routers import firms, registrations, payments, settings, tickets, notifications, inquiries

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Conference Registration API",
    description="Backend API for Ghana Competition Law Seminar registration system",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3001",
        "http://localhost:5000",
        "http://127.0.0.1:3001",
        "http://127.0.0.1:5000",
        "http://167.71.143.67",
        "https://cmcghana.duckdns.org",
        "http://cmcghana.duckdns.org",
        "https://seminar.cmc-ghana.com",
        "http://seminar.cmc-ghana.com",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(firms.router)
app.include_router(registrations.router)
app.include_router(payments.router)
app.include_router(settings.router)
app.include_router(tickets.router)
app.include_router(notifications.router)
app.include_router(inquiries.router)


@app.get("/")
def root():
    return {"message": "Conference Registration API", "version": "1.0.0"}


@app.get("/api/health")
def health_check():
    return {"status": "healthy"}


@app.get("/api/users")
def get_users_alias(status: str = "confirmed"):
    from database import SessionLocal
    from models import Registration
    
    db = SessionLocal()
    try:
        query = db.query(Registration)
        if status != "all":
            query = query.filter(Registration.status == "confirmed")
        
        registrations = query.order_by(Registration.created_at.desc()).all()
        
        users = []
        for r in registrations:
            firm_name = r.firm.name if r.firm else None
            users.append({
                "id": r.id,
                "fullName": r.full_name,
                "jobTitle": r.job_title,
                "lawFirm": firm_name,
                "email": r.email,
                "phone": r.phone,
                "attendanceType": "In-Person",
                "ticketType": r.ticket_type,
                "registeredAt": r.created_at.isoformat() if r.created_at else None,
                "status": r.status
            })
        
        return {"users": users, "total": len(users)}
    finally:
        db.close()


@app.get("/api/dashboard/stats")
def get_dashboard_stats():
    from database import SessionLocal
    from models import LawFirm, Registration, Payment, CheckIn
    
    db = SessionLocal()
    try:
        total_firms = db.query(LawFirm).count()
        total_registrations = db.query(Registration).count()
        confirmed_registrations = db.query(Registration).filter(
            Registration.status == "confirmed"
        ).count()
        pending_registrations = db.query(Registration).filter(
            Registration.status == "pending_payment"
        ).count()
        
        payments = db.query(Payment).filter(Payment.status == "confirmed").all()
        total_revenue = sum(p.amount for p in payments)
        
        checked_in_count = db.query(CheckIn).count()
        
        return {
            "total_firms": total_firms,
            "total_registrations": total_registrations,
            "confirmed_registrations": confirmed_registrations,
            "pending_registrations": pending_registrations,
            "total_revenue": total_revenue,
            "checked_in_count": checked_in_count
        }
    finally:
        db.close()


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
