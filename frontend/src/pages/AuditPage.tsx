import React, { useState, useEffect, useMemo, useRef } from 'react';
import localRestaurants from '../data/restaurants_data.json';
import { db } from '../services/firebase';
import type { Restaurant } from '../services/firebase';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { AlertTriangle, CheckCircle2, Trash2, Copy, Check, ExternalLink, Search, Cloud } from 'lucide-react';

const STORAGE_KEY = 'shawarma_radar_audit_removed_ids_v1';

const AuditPage: React.FC = () => {
  const restaurants = localRestaurants as Restaurant[];

  const [removedIds, setRemovedIds] = useState<number[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [cloudSynced, setCloudSynced] = useState<boolean>(false);
  const initialMergeDone = useRef<boolean>(false);

  const [filterMode, setFilterMode] = useState<'all' | 'flagged' | 'pure' | 'removed'>('flagged');
  const [cityFilter, setCityFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  const saveToLocal = (ids: number[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
    } catch {
      // ignore storage errors
    }
  };

  // Real-time Firestore sync + automatic migration of existing PC localStorage markings
  useEffect(() => {
    const auditDocRef = doc(db, 'audit_state', 'current');

    const unsubscribe = onSnapshot(
      auditDocRef,
      (snapshot) => {
        const cloudData = snapshot.exists() ? snapshot.data() : null;
        const cloudIds: number[] = Array.isArray(cloudData?.removedIds)
          ? cloudData.removedIds.map((x: unknown) => Number(x))
          : [];

        if (!initialMergeDone.current) {
          initialMergeDone.current = true;
          let localIds: number[] = [];
          try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) localIds = JSON.parse(raw).map((x: unknown) => Number(x));
          } catch {
            localIds = [];
          }

          // Union local markings (from PC) with cloud markings so nothing already marked is lost!
          const merged = Array.from(new Set([...cloudIds, ...localIds]));
          setRemovedIds(merged);
          saveToLocal(merged);
          setCloudSynced(true);

          // If local had items not yet in cloud, push the merged union to cloud immediately
          if (merged.length > cloudIds.length || !snapshot.exists()) {
            setDoc(auditDocRef, { removedIds: merged, updatedAt: Date.now() }, { merge: true }).catch(
              () => {}
            );
          }
        } else {
          setRemovedIds(cloudIds);
          saveToLocal(cloudIds);
          setCloudSynced(true);
        }
      },
      () => {
        setCloudSynced(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const toggleRemove = (id: number) => {
    setRemovedIds((prev) => {
      const next = prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id];
      saveToLocal(next);
      const auditDocRef = doc(db, 'audit_state', 'current');
      setDoc(auditDocRef, { removedIds: next, updatedAt: Date.now() }, { merge: true }).catch(
        () => {}
      );
      return next;
    });
  };

  const cities = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const r of restaurants) {
      counts[r.city] = (counts[r.city] || 0) + 1;
    }
    return Object.entries(counts).sort((a, b) => a[0].localeCompare(b[0], 'he'));
  }, [restaurants]);

  const flaggedTotal = useMemo(
    () => restaurants.filter((r) => r.audit_flag).length,
    [restaurants]
  );

  const pureTotal = useMemo(
    () => restaurants.filter((r) => !r.audit_flag).length,
    [restaurants]
  );

  const filteredList = useMemo(() => {
    return restaurants.filter((r) => {
      const numId = Number(r.id);
      if (filterMode === 'flagged' && !r.audit_flag) return false;
      if (filterMode === 'pure' && r.audit_flag) return false;
      if (filterMode === 'removed' && !removedIds.includes(numId)) return false;
      if (cityFilter && r.city !== cityFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matchName = r.name.toLowerCase().includes(q);
        const matchCity = r.city.toLowerCase().includes(q);
        const matchAddr = (r.address || '').toLowerCase().includes(q);
        if (!matchName && !matchCity && !matchAddr) return false;
      }
      return true;
    });
  }, [restaurants, filterMode, cityFilter, searchQuery, removedIds]);

  const handleCopyRemoved = () => {
    const removedItems = restaurants.filter((r) => removedIds.includes(Number(r.id)));
    const payload = [
      `REMOVE_IDS: [${removedItems.map((r) => r.id).join(', ')}]`,
      `סה"כ להסרה: ${removedItems.length}`,
      ...removedItems.map(
        (r) => `- [${r.id}] ${r.name} (${r.city} • ${r.address || ''})`
      ),
    ].join('\n');

    navigator.clipboard.writeText(payload);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div style={{ maxWidth: '1150px', margin: '0 auto', padding: '16px', direction: 'rtl' }}>
      {/* Header Banner */}
      <div
        style={{
          background: 'rgba(18, 22, 28, 0.95)',
          border: '1px solid rgba(245, 158, 11, 0.45)',
          borderRadius: '14px',
          padding: '20px',
          marginBottom: '18px',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <h1 style={{ margin: 0, fontSize: '1.45rem', color: '#f59e0b' }}>
                🛡️ דף בקרה וסינון עסקים (נסתר וזמני)
              </h1>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  fontSize: '0.78rem',
                  padding: '3px 10px',
                  borderRadius: '999px',
                  background: cloudSynced ? 'rgba(16, 185, 129, 0.18)' : 'rgba(107, 114, 128, 0.25)',
                  border: cloudSynced ? '1px solid #10b981' : '1px solid #6b7280',
                  color: cloudSynced ? '#34d399' : '#d1d5db',
                  fontWeight: 600,
                }}
              >
                <Cloud size={13} />
                {cloudSynced ? 'מסונכרן בענן בזמן אמת (מחשב + נייד)' : 'מתחבר לסנכרון ענן...'}
              </span>
            </div>
            <p style={{ margin: '6px 0 0', color: '#9ca3af', fontSize: '0.92rem' }}>
              כל מה שסימנת במחשב נשמר ומסונכרן אוטומטית גם לנייד. בסיום לחץ &quot;העתק רשימה להסרה&quot; והדבק בצ&apos;אט.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={handleCopyRemoved}
              disabled={removedIds.length === 0}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: removedIds.length > 0 ? '#ef4444' : '#374151',
                color: '#fff',
                border: 'none',
                borderRadius: '10px',
                padding: '11px 18px',
                fontWeight: 700,
                fontSize: '0.95rem',
                cursor: removedIds.length > 0 ? 'pointer' : 'not-allowed',
              }}
            >
              {copied ? <Check size={18} /> : <Copy size={18} />}
              {copied
                ? 'הועתק! הדבק בצ׳אט'
                : `העתק רשימה להסרה (${removedIds.length})`}
            </button>
          </div>
        </div>

        {/* Filter Controls */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px',
            marginTop: '16px',
            alignItems: 'center',
          }}
        >
          <button
            onClick={() => setFilterMode('flagged')}
            style={{
              padding: '8px 14px',
              borderRadius: '8px',
              border: filterMode === 'flagged' ? '2px solid #f59e0b' : '1px solid #374151',
              background: filterMode === 'flagged' ? 'rgba(245, 158, 11, 0.18)' : '#1f2937',
              color: '#fbbf24',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            ⚠️ חשודים כמסעדה כללית ({flaggedTotal})
          </button>

          <button
            onClick={() => setFilterMode('all')}
            style={{
              padding: '8px 14px',
              borderRadius: '8px',
              border: filterMode === 'all' ? '2px solid #60a5fa' : '1px solid #374151',
              background: filterMode === 'all' ? 'rgba(96, 165, 250, 0.18)' : '#1f2937',
              color: '#e5e7eb',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            הכל ({restaurants.length})
          </button>

          <button
            onClick={() => setFilterMode('pure')}
            style={{
              padding: '8px 14px',
              borderRadius: '8px',
              border: filterMode === 'pure' ? '2px solid #10b981' : '1px solid #374151',
              background: filterMode === 'pure' ? 'rgba(16, 185, 129, 0.18)' : '#1f2937',
              color: '#34d399',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            ✅ שווארמיות ייעודיות ({pureTotal})
          </button>

          <button
            onClick={() => setFilterMode('removed')}
            style={{
              padding: '8px 14px',
              borderRadius: '8px',
              border: filterMode === 'removed' ? '2px solid #ef4444' : '1px solid #374151',
              background: filterMode === 'removed' ? 'rgba(239, 68, 68, 0.2)' : '#1f2937',
              color: '#f87171',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            🗑️ סימנתי להסרה ({removedIds.length})
          </button>

          {/* City Select */}
          <select
            value={cityFilter}
            onChange={(e) => setCityFilter(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid #374151',
              background: '#111827',
              color: '#f3f4f6',
              fontSize: '0.9rem',
            }}
          >
            <option value="">כל הערים ({cities.length})</option>
            {cities.map(([c, count]) => (
              <option key={c} value={c}>
                {c} ({count})
              </option>
            ))}
          </select>

          {/* Search Input */}
          <div style={{ position: 'relative', flex: '1 1 200px', minWidth: '180px' }}>
            <Search
              size={16}
              style={{
                position: 'absolute',
                right: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#9ca3af',
              }}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="חיפוש לפי שם עסק, עיר או רחוב..."
              style={{
                width: '100%',
                padding: '8px 34px 8px 10px',
                borderRadius: '8px',
                border: '1px solid #374151',
                background: '#111827',
                color: '#fff',
                fontSize: '0.9rem',
                boxSizing: 'border-box',
              }}
            />
          </div>
        </div>
      </div>

      {/* Results Count */}
      <div style={{ marginBottom: '10px', color: '#9ca3af', fontSize: '0.9rem' }}>
        מציג <strong>{filteredList.length}</strong> עסקים מתוך {restaurants.length}
      </div>

      {/* Cards List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {filteredList.map((r) => {
          const numId = Number(r.id);
          const isRemoved = removedIds.includes(numId);
          const isFlagged = Boolean(r.audit_flag);
          const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(
            `${r.name} ${r.city} שווארמה`
          )}`;

          return (
            <div
              key={r.id}
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '12px',
                padding: '14px 16px',
                borderRadius: '12px',
                background: isRemoved
                  ? 'rgba(127, 29, 29, 0.28)'
                  : isFlagged
                  ? 'rgba(245, 158, 11, 0.08)'
                  : 'rgba(17, 24, 39, 0.85)',
                border: isRemoved
                  ? '2px solid #ef4444'
                  : isFlagged
                  ? '1px solid rgba(245, 158, 11, 0.5)'
                  : '1px solid rgba(55, 65, 81, 0.7)',
                opacity: isRemoved ? 0.75 : 1,
              }}
            >
              {/* Right side: rank, name, address, audit reasons */}
              <div style={{ flex: '1 1 320px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <span
                    style={{
                      background: '#1f2937',
                      color: '#fbbf24',
                      padding: '3px 9px',
                      borderRadius: '6px',
                      fontWeight: 700,
                      fontSize: '0.88rem',
                    }}
                  >
                    #{r.national_rank}
                  </span>

                  <span
                    style={{
                      fontSize: '1.08rem',
                      fontWeight: 700,
                      color: isRemoved ? '#fca5a5' : '#f9fafb',
                      textDecoration: isRemoved ? 'line-through' : 'none',
                    }}
                  >
                    {r.name}
                  </span>

                  <span style={{ color: '#10b981', fontWeight: 700, fontSize: '0.92rem' }}>
                    {r.bayesian_average.toFixed(1)}%
                  </span>

                  {r.google_rating && (
                    <span style={{ color: '#9ca3af', fontSize: '0.82rem' }}>
                      (גוגל: {r.google_rating}★ • {r.google_ratings_total || 0} ביקורות)
                    </span>
                  )}
                </div>

                <div style={{ color: '#d1d5db', fontSize: '0.9rem', marginTop: '4px' }}>
                  📍 <strong>{r.city}</strong> • {r.address || 'ללא כתובת'}
                </div>

                {/* Flag Badges */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                  {isFlagged ? (
                    (r.audit_reasons || []).map((reason, idx) => (
                      <span
                        key={idx}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          background: 'rgba(245, 158, 11, 0.2)',
                          border: '1px solid rgba(245, 158, 11, 0.45)',
                          color: '#fcd34d',
                          fontSize: '0.78rem',
                          padding: '2px 8px',
                          borderRadius: '999px',
                          fontWeight: 600,
                        }}
                      >
                        <AlertTriangle size={12} />
                        {reason}
                      </span>
                    ))
                  ) : (
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        background: 'rgba(16, 185, 129, 0.15)',
                        border: '1px solid rgba(16, 185, 129, 0.35)',
                        color: '#6ee7b7',
                        fontSize: '0.78rem',
                        padding: '2px 8px',
                        borderRadius: '999px',
                      }}
                    >
                      <CheckCircle2 size={12} />
                      מזוהה כשווארמיה ייעודית
                    </span>
                  )}
                </div>
              </div>

              {/* Left side: Actions */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <a
                  href={googleUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    background: '#1f2937',
                    border: '1px solid #374151',
                    color: '#93c5fd',
                    textDecoration: 'none',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                  }}
                >
                  <ExternalLink size={14} />
                  בדוק בגוגל
                </a>

                <button
                  onClick={() => toggleRemove(numId)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '9px 15px',
                    borderRadius: '8px',
                    border: isRemoved ? '1px solid #f87171' : '1px solid #ef4444',
                    background: isRemoved ? '#ef4444' : 'rgba(239, 68, 68, 0.15)',
                    color: isRemoved ? '#fff' : '#fca5a5',
                    fontWeight: 700,
                    fontSize: '0.88rem',
                    cursor: 'pointer',
                  }}
                >
                  <Trash2 size={15} />
                  {isRemoved ? 'מסומן להסרה (לחץ לביטול)' : 'סמן להסרה'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AuditPage;
