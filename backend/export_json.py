import json
import sqlite3

conn = sqlite3.connect('shawarma_radar.db')
conn.row_factory = sqlite3.Row
cur = conn.cursor()
cur.execute('SELECT * FROM restaurants ORDER BY bayesian_average DESC')
rows = cur.fetchall()

result = []
for r in rows:
    d = dict(r)
    out = {
        'id': d['id'],
        'name': d['name'],
        'city': d['city'],
        'region': d['region'],
        'platform_id': d['platform_id'],
        'address': d['address'] or '',
        'bayesian_average': d['bayesian_average'],
        'last_score': d['last_score'],
        'total_reviews': d['total_reviews'],
        'google_rating': d['google_rating'],
        'google_ratings_total': d['google_ratings_total']
    }
    result.append(out)

with open('../frontend/src/data/restaurants_data.json', 'w', encoding='utf-8') as f:
    json.dump(result, f, ensure_ascii=False, indent=2)
