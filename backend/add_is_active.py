import sqlite3

conn = sqlite3.connect('conference.db')
try:
    conn.execute('ALTER TABLE law_firms ADD COLUMN is_active INTEGER DEFAULT 1')
    conn.commit()
    print('Column added successfully')
except Exception as e:
    print(f'Error or column already exists: {e}')
conn.close()
