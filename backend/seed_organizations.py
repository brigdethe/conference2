"""
Seed script for organizations and their required registrations
Run with: python seed_organizations.py
"""
from database import SessionLocal, engine, Base
from models import LawFirm
import random
import string

# Create tables if they don't exist
Base.metadata.create_all(bind=engine)

def generate_code():
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))

# Organizations data from the screenshot
ORGANIZATIONS = [
    # Companies/Organizations (is_law_firm=0)
    ("Hellios Towers", 1, 0),
    ("American Towers", 1, 0),
    ("MTN", 1, 0),
    ("Airtel/TiGO", 1, 0),
    ("Telecel", 1, 0),
    ("Ministry of Communications and Digitalisation (MoCD)", 2, 0),
    ("National Communications Authority (NCA)", 2, 0),
    ("IMANI", 1, 0),
    ("Institute of Economic Affairs (IEA)", 1, 0),
    ("Bank of Ghana (BoG)", 2, 0),
    ("Ghana Interbank Payment and Settlement Systems Limited (GhIPSS)", 2, 0),
    ("CUTS", 2, 0),
    ("Ghana Investment Promotion Center (GIPC)", 2, 0),
    ("Center for Democratic Development (CDD)", 2, 0),
    ("Ministry of Trade, Agribusiness and Industry (MoTI)", 2, 0),
    ("Presidency", 1, 0),
    ("Huawei", 1, 0),
    ("Public Utilities Regulatory Commission (PURC)", 2, 0),
    ("Economics Department University of Ghana", 1, 0),
    ("IPSA Law Faculty", 2, 0),
    ("University of Ghana Law Faculty", 2, 0),
    ("CITI FM", 1, 0),
    ("Joy FM", 1, 0),
    ("Parliament", 5, 0),
    ("Attorney General", 1, 0),
    ("Judiciary", 5, 0),
    ("Tullow Oil", 2, 0),
    ("British Petroleum", 1, 0),
    ("KPMG", 1, 0),
    ("Deloitte", 1, 0),
    ("United Kingdom-Ghana Chamber of Commerce (UKGCC)", 2, 0),
    ("America Chamber of Commerce", 2, 0),
    ("African Continental Free Trade Area", 2, 0),
    ("American Embassy", 2, 0),
    ("Chamber of Oil Marketing Companies", 1, 0),
    
    # Law Firms (is_law_firm=1)
    ("Kuenyehia & Nutsupkui", 1, 1),
    ("BELA", 1, 1),
    ("Dr. Bamba & Associates", 2, 1),
    ("Nana Ama Dowuona", 2, 1),
    ("Law Trust", 2, 1),
    ("Tony Forson (former Bar President)", 1, 1),
    ("Agbesi Dzakpasu (former Greater Accra Bar President)", 1, 1),
    ("Prof. Raymond Atuguba", 1, 1),
]

def seed_organizations():
    db = SessionLocal()
    try:
        added = 0
        updated = 0
        
        for name, required_regs, is_law_firm in ORGANIZATIONS:
            existing = db.query(LawFirm).filter(LawFirm.name == name).first()
            
            if existing:
                # Update existing
                existing.required_registrations = required_regs
                existing.is_law_firm = is_law_firm
                updated += 1
            else:
                # Create new
                code = generate_code()
                # Ensure unique code
                while db.query(LawFirm).filter(LawFirm.code == code).first():
                    code = generate_code()
                
                org = LawFirm(
                    name=name,
                    code=code,
                    required_registrations=required_regs,
                    is_law_firm=is_law_firm
                )
                db.add(org)
                added += 1
        
        db.commit()
        print(f"✓ Seeded organizations: {added} added, {updated} updated")
        print(f"  Total organizations: {len(ORGANIZATIONS)}")
        
    except Exception as e:
        db.rollback()
        print(f"✗ Error seeding organizations: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_organizations()
