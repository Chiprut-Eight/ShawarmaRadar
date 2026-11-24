import json
import os
import sqlite3
from datetime import datetime, timezone

def format_hebrew_duration(total_seconds: float) -> str:
    days = max(1, int(total_seconds // 86400) + (1 if total_seconds % 86400 >= 3600 else 0))
    if total_seconds < 86400:
        hours = max(1, int(total_seconds // 3600))
        return f"יום 1 ({hours} שעות)"
    if days == 1:
        return "יום אחד"
    if days == 2:
        return "יומיים"
    if days < 7:
        return f"{days} ימים"
    if days < 30:
        weeks = days // 7
        rem_days = days % 7
        w_str = "שבוע אחד" if weeks == 1 else ("שבועיים" if weeks == 2 else f"{weeks} שבועות")
        if rem_days == 0:
            return f"{days} ימים ({w_str})"
        return f"{days} ימים ({w_str} ו-{rem_days} ימים)"
    months = days // 30
    rem_days = days % 30
    weeks = round(days / 7)
    m_str = "חודש" if months == 1 else ("חודשיים" if months == 2 else f"{months} חודשים")
    if rem_days == 0:
        return f"{days} ימים ({m_str} / כ-{weeks} שבועות)"
    return f"{days} ימים ({m_str} ו-{rem_days} ימים / כ-{weeks} שבועות)"

def update_king_history(top_king: dict, history_path: str) -> dict:
    now = datetime.now(timezone.utc)
    now_iso = now.isoformat()

    history = {"last_updated": now_iso, "reigns": []}
    if os.path.exists(history_path):
        try:
            with open(history_path, "r", encoding="utf-8") as f:
                history = json.load(f)
        except Exception as e:
            print(f"Warning loading king_history.json: {e}")

    reigns = history.get("reigns", [])
    if not top_king:
        return history

    active_reign = reigns[-1] if (reigns and reigns[-1].get("ended_at") is None) else None

    if active_reign and (
        active_reign.get("platform_id") == top_king["platform_id"]
        or (active_reign.get("name") == top_king["name"] and active_reign.get("city") == top_king["city"])
    ):
        # Same King continues reign
        active_reign["name"] = top_king["name"]
        active_reign["city"] = top_king["city"]
        active_reign["address"] = top_king.get("address", "")
        active_reign["current_score"] = top_king["bayesian_average"]
        active_reign["peak_score"] = max(
            float(active_reign.get("peak_score", top_king["bayesian_average"])),
            float(top_king["bayesian_average"])
        )
        try:
            started_dt = datetime.fromisoformat(active_reign["started_at"])
            active_reign["duration_seconds"] = int(max(0, (now - started_dt).total_seconds()))
        except Exception:
            pass
    else:
        # Close previous reign if one was open
        if active_reign:
            active_reign["ended_at"] = now_iso
            try:
                started_dt = datetime.fromisoformat(active_reign["started_at"])
                active_reign["duration_seconds"] = int(max(0, (now - started_dt).total_seconds()))
            except Exception:
                pass

        # Start new reign for the new #1 King
        reigns.append({
            "platform_id": top_king["platform_id"],
            "name": top_king["name"],
            "city": top_king["city"],
            "address": top_king.get("address", ""),
            "started_at": now_iso,
            "ended_at": None,
            "score_at_start": top_king["bayesian_average"],
            "current_score": top_king["bayesian_average"],
            "peak_score": top_king["bayesian_average"],
            "duration_seconds": 0
        })

    history["last_updated"] = now_iso
    history["reigns"] = reigns

    with open(history_path, "w", encoding="utf-8") as f:
        json.dump(history, f, ensure_ascii=False, indent=2)

    return history

def classify_for_audit(name: str) -> list[str]:
    reasons: list[str] = []
    grill_terms = ["גריל", "שיפודי", "שיפודים", "על האש", "בשרים", "בר בשר", "מנגל", "שף על האש", "המיצלה", "הרכבת", "בבאגריל", "עבדאללה", "אצל הטורקי", "יונס", "יוני 71"]
    sandwich_terms = ["סנדוויץ'", "סנדוויץ", "בגט", "באגט", "טאבון", "אשתנור", "אבולעפיה", "לחמג'ון", "בגטוס"]
    general_terms = ["בית הפול", "פול", "פלאפל", "שניצל", "אצל מלי", "פינתי", "חג' כחיל", "הקוסם", "מפגש", "פונדק", "מנה וחצי", "המשביע", "כיפה אדומה"]
    shawarma_terms = ["שווארמה", "שווארמ", "דונר", "Shawarma"]

    if any(t in name for t in grill_terms):
        reasons.append("מסעדת גריל / שיפודים / בשרים")
    if any(t in name for t in sandwich_terms):
        reasons.append("כריכייה / באגט / טאבון")
    if any(t in name for t in general_terms):
        reasons.append("תפריט מעורב (פלאפל / חומוס-פול / שניצל / מפגש)")
    if not any(t in name for t in shawarma_terms):
        reasons.append("ללא המילה 'שווארמה' או 'דונר' בשם")

    return reasons

def export_all():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    db_path = os.path.join(base_dir, 'shawarma_radar.db')
    json_out_path = os.path.join(base_dir, '..', 'frontend', 'src', 'data', 'restaurants_data.json')
    history_out_path = os.path.join(base_dir, '..', 'frontend', 'src', 'data', 'king_history.json')

    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    cur.execute('SELECT * FROM restaurants ORDER BY bayesian_average DESC')
    rows = cur.fetchall()

    result = []
    for idx, r in enumerate(rows, 1):
        d = dict(r)
        audit_reasons = classify_for_audit(d['name'] or '')
        out = {
            'id': d['id'],
            'name': d['name'],
            'city': d['city'],
            'region': d['region'],
            'platform_id': d['platform_id'],
            'address': d['address'] or '',
            'lat': d.get('lat'),
            'lng': d.get('lng'),
            'national_rank': idx,
            'bayesian_average': d['bayesian_average'],
            'last_score': d['last_score'],
            'total_reviews': d['total_reviews'],
            'google_rating': d['google_rating'],
            'google_ratings_total': d['google_ratings_total'],
            'audit_flag': len(audit_reasons) > 0,
            'audit_reasons': audit_reasons
        }
        result.append(out)

    with open(json_out_path, 'w', encoding='utf-8') as f:
        json.dump(result, f, ensure_ascii=False, indent=2)

    if result:
        update_king_history(result[0], history_out_path)

    conn.close()

if __name__ == '__main__':
    export_all()
