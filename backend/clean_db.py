import sqlite3

def clean_database():
    conn = sqlite3.connect('shawarma_radar.db')
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    
    cur.execute("SELECT id, platform_id, city, address, name FROM restaurants")
    rows = cur.fetchall()
    
    updated_count = 0
    for row in rows:
        r_id = row['id']
        platform_id = row['platform_id']
        current_city = row['city']
        current_address = row['address'] or ""
        name = row['name']
        
        # Extract the true city from platform_id
        # platform_id is f"{display_name}_{default_city}".replace(" ", "_")
        # However, to perfectly extract it, we know the city must be one of the known cities in regions.py.
        # But we can just use the city from auto_seeds.json!
        # Let's do a simpler heuristic: if 'רמת גן' is in current_city but the name/platform_id implies another city, it's corrupted.
        pass

    # A better approach: we just read auto_seeds.json and enforce city for each match
    import json
    with open('auto_seeds.json', 'r', encoding='utf-8') as f:
        seeds = json.load(f)
        
    for seed in seeds:
        query = seed['query']
        true_city = seed['city']
        display_name = query.replace(f" {true_city}", "").strip()
        platform_key = f"{display_name}_{true_city}".replace(" ", "_")
        
        # Update the city strictly to true_city, based on platform_key OR name
        cur.execute('''
            UPDATE restaurants
            SET city = ?
            WHERE platform_id = ? OR name = ?
        ''', (true_city, platform_key, display_name))
        if cur.rowcount > 0:
            updated_count += cur.rowcount
            
        # Clear address if the city in DB was wrong and address is the Ramat Gan one (Jabotinsky 85)
        # Actually, let's just clear ANY address that contains 'רמת גן' if the true_city is NOT 'רמת גן'.
        cur.execute('''
            UPDATE restaurants
            SET address = ""
            WHERE (platform_id = ? OR name = ?) AND city != 'רמת גן' AND address LIKE '%רמת גן%'
        ''', (platform_key, display_name))
        
        # To be even safer and completely remove Wolt cross-contamination, 
        # let's clear ANY address that doesn't contain the true_city (or where true_city doesn't match the address loosely)
        # We will just clear all addresses and let the next scan re-fetch them.
        cur.execute('''
            UPDATE restaurants
            SET address = ""
            WHERE (platform_id = ? OR name = ?) AND address LIKE ? AND ? != 'רמת גן'
        ''', (platform_key, display_name, "%ז'בוטינסקי 85%", true_city))

    conn.commit()
    print(f"Updated {updated_count} restaurant cities based on seeds.")
    
    # Also explicitly fix Shemesh Ness Ziona and Petah Tikva
    cur.execute("UPDATE restaurants SET city='נס ציונה', address='' WHERE name LIKE '%נס ציונה%'")
    cur.execute("UPDATE restaurants SET city='פתח תקווה', address='' WHERE name LIKE '%פתח תקווה%'")
    conn.commit()
    conn.close()

if __name__ == '__main__':
    clean_database()
