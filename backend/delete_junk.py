import sqlite3
conn = sqlite3.connect('shawarma_radar.db')
cur = conn.cursor()
cur.execute("DELETE FROM restaurants WHERE name = 'שווארמה'")
conn.commit()
conn.close()
