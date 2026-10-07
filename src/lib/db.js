// Data access. Two interchangeable backends:
//  - Supabase (when VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY are set) — the real app.
//  - Demo (no env vars) — everything in localStorage, one fake user, so the UI runs anywhere.
import { createClient } from '@supabase/supabase-js';

const URL = import.meta.env.VITE_SUPABASE_URL;
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const isDemo = !URL || !KEY;
export const supabase = isDemo ? null : createClient(URL, KEY, { auth: { persistSession: true, autoRefreshToken: true } });

const must = ({ data, error }) => { if (error) throw error; return data; };

// ---------------------------------------------------------------- Supabase
const remote = {
  async getSession() { return must(await supabase.auth.getSession()).session; },
  onAuthChange(cb) { const { data } = supabase.auth.onAuthStateChange((_e, session) => cb(session)); return () => data.subscription.unsubscribe(); },
  async signIn(email, password) { return must(await supabase.auth.signInWithPassword({ email, password })); },
  async signUp(email, password, displayName) {
    return must(await supabase.auth.signUp({ email, password, options: { data: { display_name: displayName }, emailRedirectTo: window.location.origin } }));
  },
  async resetPassword(email) { return must(await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` })); },
  async updatePassword(password) { return must(await supabase.auth.updateUser({ password })); },
  async signOut() { await supabase.auth.signOut(); },

  async loadAll(userId) {
    const [profile, plan, sessions, recovery, strength, shoes, tests] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
      supabase.from('plans').select('*').eq('user_id', userId).maybeSingle(),
      supabase.from('sessions').select('*').eq('user_id', userId).order('date').order('sort').range(0, 999),
      supabase.from('recovery_logs').select('*').eq('user_id', userId).order('date', { ascending: false }).limit(60),
      supabase.from('strength_logs').select('*').eq('user_id', userId).order('updated_at', { ascending: false }).range(0, 1999),
      supabase.from('shoes').select('*').eq('user_id', userId).order('created_at'),
      supabase.from('test_results').select('*').eq('user_id', userId).order('date'),
    ]);
    return {
      profile: must(profile), plan: must(plan), sessions: must(sessions) || [], recovery: must(recovery) || [],
      strength: must(strength) || [], shoes: must(shoes) || [], tests: must(tests) || [],
    };
  },
  async createPlan(plan, rows) {
    const p = must(await supabase.from('plans').insert(plan).select().single());
    const withPlan = rows.map((r) => ({ ...r, plan_id: p.id, original_date: r.date }));
    const out = [];
    for (let i = 0; i < withPlan.length; i += 200) out.push(...must(await supabase.from('sessions').insert(withPlan.slice(i, i + 200)).select()));
    return { plan: p, sessions: out };
  },
  async deletePlan(planId) { must(await supabase.from('plans').delete().eq('id', planId)); },
  async updateSession(id, patch) { return must(await supabase.from('sessions').update(patch).eq('id', id).select().single()); },
  async updateProfile(id, patch) { return must(await supabase.from('profiles').upsert({ id, ...patch }).select().single()); },
  async upsertRecovery(row) { return must(await supabase.from('recovery_logs').upsert(row, { onConflict: 'user_id,date' }).select().single()); },
  async upsertStrength(row) { return must(await supabase.from('strength_logs').upsert(row, { onConflict: 'session_id,exercise' }).select().single()); },
  async insert(table, row) { return must(await supabase.from(table).insert(row).select().single()); },
  async update(table, id, patch) { return must(await supabase.from(table).update(patch).eq('id', id).select().single()); },
  async remove(table, id) { must(await supabase.from(table).delete().eq('id', id)); },
};

// ---------------------------------------------------------------- Demo (localStorage)
const LS = 'kairo-demo-v1';
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36));
const DEMO_USER = { id: '00000000-0000-4000-8000-000000000001', email: 'demo@kairo.app' };
const read = () => { try { return JSON.parse(localStorage.getItem(LS)) || {}; } catch (e) { return {}; } };
const write = (s) => { try { localStorage.setItem(LS, JSON.stringify(s)); } catch (e) { /* private mode: memory only */ } memo = s; };
let memo = null;
const state = () => memo || (memo = { signedIn: false, profile: null, plan: null, sessions: [], recovery_logs: [], strength_logs: [], shoes: [], test_results: [], ...read() });
let listeners = [];
const emit = () => listeners.forEach((l) => l(state().signedIn ? { user: DEMO_USER } : null));
const now = () => new Date().toISOString();

const local = {
  async getSession() { return state().signedIn ? { user: DEMO_USER } : null; },
  onAuthChange(cb) { listeners.push(cb); return () => { listeners = listeners.filter((l) => l !== cb); }; },
  async signIn() { const s = state(); s.signedIn = true; if (!s.profile) s.profile = { id: DEMO_USER.id, display_name: 'Fritz', theme: 'dark' }; write(s); emit(); return { user: DEMO_USER }; },
  async signUp(_e, _p, name) { const s = state(); s.signedIn = true; s.profile = { id: DEMO_USER.id, display_name: name || 'Fritz', theme: 'dark' }; write(s); emit(); return { user: DEMO_USER }; },
  async resetPassword() { return {}; },
  async updatePassword() { return {}; },
  async signOut() { const s = state(); s.signedIn = false; write(s); emit(); },
  async loadAll() {
    const s = state();
    return { profile: s.profile, plan: s.plan, sessions: [...s.sessions], recovery: [...s.recovery_logs].sort((a, b) => (a.date < b.date ? 1 : -1)), strength: [...s.strength_logs], shoes: [...s.shoes], tests: [...s.test_results] };
  },
  async createPlan(plan, rows) {
    const s = state();
    s.plan = { id: uid(), user_id: DEMO_USER.id, created_at: now(), ...plan };
    s.sessions = rows.map((r) => ({ id: uid(), user_id: DEMO_USER.id, plan_id: s.plan.id, status: 'planned', moved: false, original_date: r.date, ...r }));
    write(s); return { plan: s.plan, sessions: s.sessions };
  },
  async deletePlan() { const s = state(); s.plan = null; s.sessions = []; s.strength_logs = []; write(s); },
  async updateSession(id, patch) { const s = state(); const i = s.sessions.findIndex((x) => x.id === id); s.sessions[i] = { ...s.sessions[i], ...patch, updated_at: now() }; write(s); return s.sessions[i]; },
  async updateProfile(id, patch) { const s = state(); s.profile = { ...(s.profile || { id }), ...patch }; write(s); return s.profile; },
  async upsertRecovery(row) {
    const s = state(); const i = s.recovery_logs.findIndex((x) => x.date === row.date);
    const v = { id: i >= 0 ? s.recovery_logs[i].id : uid(), user_id: DEMO_USER.id, ...(i >= 0 ? s.recovery_logs[i] : {}), ...row, updated_at: now() };
    if (i >= 0) s.recovery_logs[i] = v; else s.recovery_logs.push(v); write(s); return v;
  },
  async upsertStrength(row) {
    const s = state(); const i = s.strength_logs.findIndex((x) => x.session_id === row.session_id && x.exercise === row.exercise);
    const v = { id: i >= 0 ? s.strength_logs[i].id : uid(), user_id: DEMO_USER.id, ...(i >= 0 ? s.strength_logs[i] : {}), ...row, updated_at: now() };
    if (i >= 0) s.strength_logs[i] = v; else s.strength_logs.push(v); write(s); return v;
  },
  async insert(table, row) { const s = state(); const v = { id: uid(), user_id: DEMO_USER.id, created_at: now(), ...row }; s[table].push(v); write(s); return v; },
  async update(table, id, patch) { const s = state(); const i = s[table].findIndex((x) => x.id === id); s[table][i] = { ...s[table][i], ...patch }; write(s); return s[table][i]; },
  async remove(table, id) { const s = state(); s[table] = s[table].filter((x) => x.id !== id); write(s); },
};

export const db = isDemo ? local : remote;
