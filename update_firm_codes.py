"""
Update firm codes and slots in the database to match Firms_Codes_And_Slots.csv.
Matches by firm name (case-insensitive), updates code and required_registrations.
Run on the server: python update_firm_codes.py
"""

import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

from database import SessionLocal
from models import LawFirm

updates = [
    ("African Continental Free Trade Area", "572BI8", 2),
    ("Agbesi Dzakpasu (former Greater Accra Bar President)", "L7PUJ3", 1),
    ("Airtel/TiGO", "AAYN9X", 1),
    ("America Chamber of Commerce", "8OJL8Z", 2),
    ("American Embassy", "EQR009", 2),
    ("American Towers", "GNIA9A", 1),
    ("Attorney General", "19HIOH", 1),
    ("BELA", "S9NQNH", 1),
    ("Bank of Ghana (BoG)", "4W5JIZ", 2),
    ("British Petroleum", "CRYYT7", 1),
    ("CITI FM", "1YS67X", 1),
    ("CUTS", "7LOSV9", 2),
    ("Center for Democratic Development (CDD)", "VEX9CV", 2),
    ("Chamber of Oil Marketing Companies", "V8QR7G", 1),
    ("Deloitte", "Z3U2V8", 1),
    ("Dr. Bamba & Associates", "AU8B83", 2),
    ("Economics Department University of Ghana", "WWTG45", 1),
    ("Ghana Interbank Payment and Settlement Systems Limited (GhIPSS)", "518V8J", 2),
    ("Ghana Investment Promotion Center (GIPC)", "Q3RB8Z", 2),
    ("Hellios Towers", "EMIC0N", 1),
    ("Huawei", "T9HE5C", 1),
    ("IMANI", "TT9AV3", 1),
    ("IPSA Law Faculty", "8LKP9U", 2),
    ("Institute of Economic Affairs (IEA)", "M6A3UV", 1),
    ("Joy FM", "99YE9S", 1),
    ("Judiciary", "LOHA1W", 5),
    ("KPMG", "7WVOPD", 1),
    ("Kuenyehia & Nutsupkui", "QJ5Q4G", 1),
    ("Law Trust", "ZA1XFP", 2),
    ("MTN", "N3I4QI", 1),
    ("Ministry of Communications and Digitalisation (MoCD)", "PNZKAD", 2),
    ("Nana Ama Dowuona", "REM6A4", 2),
    ("National Communications Authority (NCA)", "9ZKEIO", 2),
    ("Parliament", "ABSNXO", 5),
    ("Freddie Tests", "FRED00", 10),
    ("Presidency", "67A88P", 1),
    ("Prof. Raymond Atuguba", "RYHKTF", 1),
    ("Public Utilities Regulatory Commission (PURC)", "MCA685", 2),
    ("Telecel", "BS0VEB", 1),
    ("Tony Forson (former Bar President)", "S4XZCA", 1),
    ("Tullow Oil", "16J2D9", 2),
    ("United Kingdom-Ghana Chamber of Commerce (UKGCC)", "K26LDM", 2),
    ("University of Ghana Law Faculty", "ECWYLU", 2),
]

db = SessionLocal()

matched = []
not_found = []

for name, code, slots in updates:
    firm = db.query(LawFirm).filter(LawFirm.name.ilike(name.strip())).first()
    if firm:
        old_code = firm.code
        old_slots = firm.required_registrations
        firm.code = code.strip()
        firm.required_registrations = slots
        matched.append((firm.name, old_code, code, old_slots, slots))
    else:
        not_found.append(name)

db.commit()
db.close()

print(f"\n{'='*60}")
print(f"UPDATED: {len(matched)} firms")
print(f"{'='*60}")
for name, old_code, new_code, old_slots, new_slots in matched:
    code_change = f"{old_code} → {new_code}" if old_code != new_code else f"{new_code} (unchanged)"
    slots_change = f"{old_slots} → {new_slots}" if old_slots != new_slots else f"{new_slots} (unchanged)"
    print(f"  ✓ {name}")
    print(f"      Code:  {code_change}")
    print(f"      Slots: {slots_change}")

if not_found:
    print(f"\n{'='*60}")
    print(f"NOT FOUND in DB ({len(not_found)} firms) — no changes made for these:")
    print(f"{'='*60}")
    for name in not_found:
        print(f"  ✗ {name}")

print(f"\nDone.\n")
