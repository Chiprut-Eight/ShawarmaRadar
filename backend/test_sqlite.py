import sqlite3
import json

conn = sqlite3.connect('shawarma_radar.db')
conn.row_factory = sqlite3.Row
cur = conn.cursor()
cur.execute("SELECT * FROM restaurants")
rows = cur.fetchall()

res = []
for row in rows:
    d = dict(row)
    if 'שמש' in d['name']:
        res.append(d)

with open('debug2.json', 'w', encoding='utf-8') as f:
    json.dump(res, f, ensure_ascii=False, indent=2)
