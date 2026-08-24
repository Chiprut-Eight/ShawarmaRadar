import json
import sqlite3
import os
import requests

def check_db():
    conn = sqlite3.connect('shawarma_radar.db')
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    cur.execute("SELECT * FROM restaurants WHERE name LIKE '%אבו גוש%' OR city LIKE '%אבו גוש%'")
    res = [dict(r) for r in cur.fetchall()]
    
    # Also find any restaurants where name is just "שווארמה"
    cur.execute("SELECT * FROM restaurants WHERE name = 'שווארמה'")
    res2 = [dict(r) for r in cur.fetchall()]
    
    with open('abugosh_debug.json', 'w', encoding='utf-8') as f:
        json.dump({"abu_gosh": res, "just_shawarma": res2}, f, ensure_ascii=False, indent=2)

def check_telegram():
    from dotenv import load_dotenv
    load_dotenv()
    
    bot_token = os.getenv("TELEGRAM_BOT_TOKEN")
    chat_id = os.getenv("TELEGRAM_CHAT_ID")
    
    status = {
        "bot_token": bool(bot_token),
        "chat_id": bool(chat_id),
        "error": None
    }
    
    if bot_token and chat_id:
        try:
            url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
            r = requests.post(
                url,
                json={"chat_id": chat_id, "text": "Test from backend debugger", "parse_mode": "Markdown"},
                timeout=8.0
            )
            status["response"] = r.json()
        except Exception as e:
            status["error"] = str(e)
            
    with open('telegram_debug.json', 'w', encoding='utf-8') as f:
        json.dump(status, f, ensure_ascii=False, indent=2)

if __name__ == '__main__':
    check_db()
    check_telegram()
