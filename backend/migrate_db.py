"""
Database migration script
Run with: python migrate_db.py
"""
import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "conference.db")

def migrate():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    migrations_run = 0
    
    # Check law_firms columns
    cursor.execute("PRAGMA table_info(law_firms)")
    columns = [col[1] for col in cursor.fetchall()]
    
    if "required_registrations" not in columns:
        print("Adding 'required_registrations' column...")
        cursor.execute("ALTER TABLE law_firms ADD COLUMN required_registrations INTEGER DEFAULT 1")
        migrations_run += 1
    
    if "is_law_firm" not in columns:
        print("Adding 'is_law_firm' column...")
        cursor.execute("ALTER TABLE law_firms ADD COLUMN is_law_firm INTEGER DEFAULT 0")
        migrations_run += 1
    
    if "logo_url" not in columns:
        print("Adding 'logo_url' column...")
        cursor.execute("ALTER TABLE law_firms ADD COLUMN logo_url TEXT")
        migrations_run += 1
    
    # Create admin_notification_recipients table if not exists
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS admin_notification_recipients (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            recipient_type TEXT NOT NULL,
            value TEXT NOT NULL,
            enabled INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    conn.commit()
    conn.close()
    
    if migrations_run > 0:
        print(f"✓ Migration complete: {migrations_run} column(s) added")
    else:
        print("✓ Database is already up to date")

if __name__ == "__main__":
    migrate()
