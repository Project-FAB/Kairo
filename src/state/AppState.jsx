import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { db, isDemo } from '../lib/db.js';
import { DEFAULT_PLAN, generateSessions } from '../lib/plan.js';
import { getToday, parseISO, fmtLong, toISO } from '../lib/dates.js';
import { toSession, buildWeeks, statusMap, currentWeekOf, recoverySummary, readiness, estimateFinish, clockToSec } from '../lib/model.js';

const Ctx = createContext(null);
export const useKairo = () => useContext(Ctx);

export function AppStateProvider({ children }) {
  const [auth, setAuth] = useState({ ready: false, session: null });
  const [data, setData] = useState(null); // raw rows
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [toastMsg, setToastMsg] = useState(null);
  const today = useMemo(() => getToday(), []);
  const toast = useCallback((m) => setToastMsg(m), []);

  // ---------- auth ----------
  useEffect(() => {
    let alive = true;
    db.getSession().then((s) => alive && setAuth({ ready: true, session: s })).catch(() => alive && setAuth({ ready: true, session: null }));
    const off = db.onAuthChange((s) => setAuth({ ready: true, session: s }));
    return () => { alive = false; off(); };
  }, []);
  const userId = auth.session?.user?.id;

  // ---------- load ----------
  const reload = useCallback(async () => {
    if (!userId) { setData(null); return; }
    setLoading(true); setError(null);
    try { setData(await db.loadAll(userId)); } catch (e) { setError(e.message || String(e)); } finally { setLoading(false); }
  }, [userId]);
  useEffect(() => { reload(); }, [reload]);

  // ---------- theme ----------
  const theme = data?.profile?.theme || 'dark';
  useEffect(() => { document.documentElement.setAttribute('data-theme', theme); }, [theme]);

  // ---------- derived ----------
  const derived = useMemo(() => {
    if (!data?.plan) return null;
    const sessions = data.sessions.map(toSession);
    const weeks = buildWeeks(sessions, data.plan.start_date);
    const status = statusMap(sessions);
    const currentWeek = currentWeekOf(today, data.plan.start_date);
    const recovery = recoverySummary(data.recovery, today);
    const est = estimateFinish(data.profile, data.plan);
    const race = {
      name: data.plan.race_name, date: parseISO(data.plan.race_date), dateLabel: fmtLong(parseISO(data.plan.race_date)),
      target: data.plan.target_label, targetSec: data.plan.target_seconds, targetPace: data.plan.target_pace,
      estimate: est, estimateSec: clockToSec(est),
    };
    return { sessions, weeks, status, currentWeek, recovery, readiness: readiness(sessions, recovery, today), race };
  }, [data, today]);

  // ---------- mutations (optimistic) ----------
  const patchRows = (table, id, patch) => setData((d) => ({ ...d, [table]: d[table].map((r) => (r.id === id ? { ...r, ...patch } : r)) }));
  const guard = async (fn, undo, msg) => {
    try { await fn(); if (msg) toast(msg); } catch (e) { if (undo) undo(); toast(`Couldn't save — ${e.message || e}`); }
  };

  const updateSession = useCallback(async (s, patch, msg) => {
    const before = data.sessions.find((r) => r.id === s.id);
    patchRows('sessions', s.id, patch);
    await guard(() => db.updateSession(s.id, patch), () => patchRows('sessions', s.id, before), msg);
  }, [data]);

  const actions = {
    toast, reload,
    toggleDone: (s, v) => { if (s.synthetic) return; updateSession(s, { status: v ? 'done' : 'planned', completed_at: v ? new Date().toISOString() : null }, v ? { msg: `${s.title} marked done`, share: s.id } : `${s.title} set back to not done`); },
    skip: (s, v) => updateSession(s, { status: v ? 'skipped' : 'planned' }, v ? 'Skipped — no stress, the plan absorbs it' : 'Restored'),
    move: (s, date) => updateSession(s, { date: toISO(date), moved: true }, 'Workout moved — calendar updated'),
    saveSession: (s, patch, msg) => updateSession(s, patch, msg),
    updateProfile: async (patch, msg) => {
      const before = data.profile;
      setData((d) => ({ ...d, profile: { ...(d.profile || { id: userId }), ...patch } }));
      await guard(() => db.updateProfile(userId, patch), () => setData((d) => ({ ...d, profile: before })), msg);
    },
    // Last-used share card format / style / toggles. Best effort: a failed save never interrupts sharing.
    saveSharePrefs: async (prefs) => {
      if (JSON.stringify(data.profile?.share_prefs) === JSON.stringify(prefs)) return;
      setData((d) => ({ ...d, profile: { ...(d.profile || { id: userId }), share_prefs: prefs } }));
      try { await db.updateProfile(userId, { share_prefs: prefs }); } catch (e) { console.warn('Share preferences not saved', e); }
    },
    saveRecovery: async (row) => {
      try {
        const saved = await db.upsertRecovery({ ...row, user_id: userId });
        setData((d) => ({ ...d, recovery: [saved, ...d.recovery.filter((r) => r.date !== saved.date)].sort((a, b) => (a.date < b.date ? 1 : -1)) }));
        toast('Check-in saved');
      } catch (e) { toast(`Couldn't save — ${e.message || e}`); }
    },
    saveStrength: async (sessionId, exercise, patch) => {
      const existing = data.strength.find((r) => r.session_id === sessionId && r.exercise === exercise);
      const row = { session_id: sessionId, exercise, sets_done: existing?.sets_done || 0, weight_kg: existing?.weight_kg ?? null, ...patch };
      setData((d) => ({ ...d, strength: existing ? d.strength.map((r) => (r === existing ? { ...r, ...row } : r)) : [{ id: `tmp-${exercise}`, ...row }, ...d.strength] }));
      try {
        const saved = await db.upsertStrength({ ...row, user_id: userId });
        setData((d) => ({ ...d, strength: d.strength.map((r) => (r.session_id === sessionId && r.exercise === exercise ? saved : r)) }));
      } catch (e) { toast(`Couldn't save — ${e.message || e}`); }
    },
    add: async (table, key, row, msg) => {
      try { const v = await db.insert(table, { ...row, user_id: userId }); setData((d) => ({ ...d, [key]: [...d[key], v] })); if (msg) toast(msg); } catch (e) { toast(`Couldn't save — ${e.message || e}`); }
    },
    edit: async (table, key, id, patch) => {
      patchRows(key, id, patch);
      try { await db.update(table, id, patch); } catch (e) { toast(`Couldn't save — ${e.message || e}`); reload(); }
    },
    remove: async (table, key, id, msg) => {
      setData((d) => ({ ...d, [key]: d[key].filter((r) => r.id !== id) }));
      try { await db.remove(table, id); if (msg) toast(msg); } catch (e) { toast(`Couldn't delete — ${e.message || e}`); reload(); }
    },
    createPlan: async () => {
      setLoading(true);
      try {
        const { plan, sessions } = await db.createPlan({ ...DEFAULT_PLAN, user_id: userId }, generateSessions(DEFAULT_PLAN.start_date).map((r) => ({ ...r, user_id: userId })));
        setData((d) => ({ ...d, plan, sessions }));
        toast('Your 21-week Tokyo plan is ready');
      } catch (e) { setError(e.message || String(e)); } finally { setLoading(false); }
    },
    resetPlan: async () => {
      if (!data?.plan) return;
      setLoading(true);
      try { await db.deletePlan(data.plan.id); await reload(); } finally { setLoading(false); }
    },
    signOut: async () => { await db.signOut(); setData(null); },
  };

  const value = {
    isDemo, auth, userId, user: auth.session?.user, loading, error, today, theme,
    profile: data?.profile, plan: data?.plan, raw: data, recoveryLogs: data?.recovery || [], strengthLogs: data?.strength || [],
    shoes: data?.shoes || [], tests: data?.tests || [], ...(derived || {}), actions, toastMsg, clearToast: () => setToastMsg(null),
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
