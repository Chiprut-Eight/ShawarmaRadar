import sqlite3

def wipe_addresses():
    conn = sqlite3.connect('shawarma_radar.db')
    cur = conn.cursor()
    cur.execute("UPDATE restaurants SET address = ''")
    conn.commit()
    conn.close()
    print("Addresses wiped.")

if __name__ == '__main__':
    wipe_addresses()
