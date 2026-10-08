// Turns database rows into the shapes the UI draws, and derives every number the dashboard shows.
import { parseISO, addDays, toISO, daysBetween, sameDay, fmtMin, paceToSec, secToPace } from './dates.js';
import { weekMeta, LAST_WEEK } from './plan.js';

export function toSession(r) {
  const minutes = r.minutes != null ? Number(r.minutes) : null;
  return {
    id: r.id, row: r, type: r.type, kind: r.kind, title: r.title, detail: r.detail || '',
    km: r.km != null ? Number(r.km) : null, min: minutes, dur: minutes ? fmtMin(minutes) : '',
    pace: r.pace || '', zone: r.zone || '', rpe: r.rpe || '', intensity: r.intensity || 0, purpose: r.purpose || '',
    key: !!r.is_key, steps: r.steps || [], fuel: r.fuel || null, session: r.strength_ref, contacts: r.contacts,
    notes: r.notes || '', moved: !!r.moved, status: r.status || 'planned',
    actualKm: r.actual_km != null ? Number(r.actual_km) : null, actualMin: r.actual_minutes != null ? Number(r.actual_minutes) : null, avgHr: r.avg_hr,
    date: parseISO(r.date), week: r.week, sort: r.sort || 0,
  };
}

const syntheticRest = (date) => ({ id: `rest-${toISO(date)}`, synthetic: true, type: 'rest', kind: 'rest', title: 'Rest', detail: 'Nothing planned', key: false, steps: [], intensity: 0, purpose: 'Your body adapts while you recover.', date, status: 'planned' });

export function buildWeeks(sessions, planStartISO) {
  const start = parseISO(planStartISO);
  const byDay = {};
  sessions.forEach((s) => { (byDay[toISO(s.date)] ||= []).push(s); });
  const weeks = [];
  for (let wk = 0; wk <= LAST_WEEK; wk++) {
    const ws = addDays(start, wk * 7);
    const days = [0, 1, 2, 3, 4, 5, 6].map((i) => {
      const date = addDays(ws, i);
      const list = (byDay[toISO(date)] || []).slice().sort((a, b) => (a.kind === 'rest') - (b.kind === 'rest') || a.sort - b.sort);
      const real = list.filter((s) => s.kind !== 'rest');
      return { date, sessions: list.length ? (real.length ? real : list) : [syntheticRest(date)] };
    });
    const meta = weekMeta(wk);
    const plannedKm = days.reduce((a, d) => a + d.sessions.filter((s) => s.kind === 'run').reduce((b, s) => b + (s.km || 0), 0), 0);
    weeks.push({ ...meta, km: Math.round(plannedKm * 10) / 10, start: ws, days });
  }
  return weeks;
}

export function findSession(weeks, id) {
  for (const w of weeks) for (let i = 0; i < 7; i++) { const s = w.days[i].sessions.find((x) => x.id === id); if (s) return { s, week: w, dayIdx: i }; }
  return null;
}

export const statusMap =(sessions) => Object.fromEntries(sessions.filter((s) => s.status !== 'planned').map((s) => [s.id, s.status]));

export const currentWeekOf = (today, planStartISO) => Math.max(0, Math.min(LAST_WEEK, Math.floor(daysBetween(parseISO(planStartISO), today) / 7)));

export const doneKm = (s) => (s.status === 'done' ? (s.actualKm ?? s.km ?? 0) : 0);

export function weekTotals(week, status) {
  let planned = 0, done = 0, sessions = 0, doneSessions = 0;
  week.days.forEach((d) => d.sessions.forEach((s) => {
    if (s.kind === 'run') { planned += s.km || 0; if (status[s.id] === 'done') done += s.actualKm ?? s.km ?? 0; }
    if (s.kind !== 'rest') { sessions++; if (status[s.id] === 'done') doneSessions++; }
  }));
  return { planned: Math.round(planned * 10) / 10, done: Math.round(done * 10) / 10, sessions, doneSessions };
}

/** planned | done | skipped | missed | today — "missed" is any past session left undone. */
export const sessionState = (s, today, status) => {
  const st = status[s.id];
  if (st) return st;
  if (sameDay(s.date, today)) return 'today';
  return daysBetween(s.date, today) > 0 && s.kind !== 'rest' ? 'missed' : 'planned';
};

// ---------------------------------------------------------------- recovery
const avg = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);

export function recoverySummary(logs, today) {
  const todayISO = toISO(today);
  const latest = logs.find((l) => l.date === todayISO) || null;
  const prev = logs.filter((l) => l.date !== todayISO).slice(0, 7);
  const base = { rhr: avg(prev.map((l) => l.resting_hr).filter(Boolean)), hrv: avg(prev.map((l) => l.hrv).filter(Boolean)) };
  if (!latest) return { latest: null, base, status: null, score: null, reasons: ['No check-in yet today'] };
  let score = 100; const reasons = [];
  const sleepH = latest.sleep_minutes != null ? latest.sleep_minutes / 60 : null;
  if (sleepH != null) { if (sleepH < 6) { score -= 25; reasons.push('Under 6 h sleep'); } else if (sleepH < 7.5) { score -= 10; reasons.push('Under 7.5 h sleep'); } }
  if (latest.resting_hr && base.rhr && latest.resting_hr - base.rhr >= 5) { score -= 20; reasons.push('Resting HR 5+ above baseline'); }
  if (latest.hrv && base.hrv && latest.hrv < base.hrv * 0.85) { score -= 15; reasons.push('HRV well below average'); }
  if (latest.soreness >= 4) { score -= 15; reasons.push('High soreness'); }
  if (latest.energy != null && latest.energy <= 4) { score -= 10; reasons.push('Low energy'); }
  if (latest.stress != null && latest.stress >= 8) { score -= 10; reasons.push('High stress'); }
  const shin = latest.shin_pain ?? 0;
  if (shin >= 3) { score -= 40; reasons.push(`Shin/Achilles ${shin}/10`); }
  score = Math.max(0, Math.min(100, score));
  const status = shin >= 5 || score < 45 ? 'rest' : shin >= 3 || score < 70 ? 'hold' : 'ready';
  return { latest, base, status, score, reasons };
}

// ---------------------------------------------------------------- readiness & analytics
export function readiness(sessions, recovery, today) {
  const past = sessions.filter((s) => s.kind !== 'rest' && daysBetween(s.date, today) > 0);
  const last28 = past.filter((s) => daysBetween(s.date, today) <= 28);
  const consistency = last28.length ? Math.round((last28.filter((s) => s.status === 'done').length / last28.length) * 100) : null;
  const runs28 = last28.filter((s) => s.kind === 'run');
  const planned28 = runs28.reduce((a, s) => a + (s.km || 0), 0);
  const aerobic = planned28 ? Math.min(100, Math.round((runs28.reduce((a, s) => a + doneKm(s), 0) / planned28) * 100)) : null;
  const longest = Math.max(0, ...past.filter((s) => s.kind === 'run' && s.status === 'done' && daysBetween(s.date, today) <= 42).map((s) => s.actualKm ?? s.km ?? 0));
  const endurance = past.length ? Math.min(100, Math.round((longest / 32) * 100)) : null;
  const q = last28.filter((s) => ['threshold', 'interval', 'mp', 'test'].includes(s.type));
  const speed = q.length ? Math.round((q.filter((s) => s.status === 'done').length / q.length) * 100) : null;
  const rec = recovery.score;
  const parts = [['Aerobic fitness', aerobic], ['Endurance', endurance], ['Speed', speed], ['Recovery', rec], ['Consistency', consistency]];
  const vals = parts.map((p) => p[1]).filter((v) => v != null);
  return { score: vals.length ? Math.round(avg(vals)) : null, parts };
}

export function estimateFinish(profile, plan) {
  if (profile?.est_finish) return profile.est_finish;
  const t = paceToSec(profile?.threshold_pace);
  if (!t) return null;
  const total = t * 1.09 * 42.195; // marathon ≈ 9% slower than threshold pace for this athlete profile
  return `${Math.floor(total / 3600)}:${String(Math.round((total % 3600) / 60)).padStart(2, '0')}`;
}
export const clockToSec = (c) => { const m = String(c || '').match(/(\d+):(\d{2})/); return m ? +m[1] * 3600 + +m[2] * 60 : null; };

export function analytics(sessions, today) {
  const done = sessions.filter((s) => s.kind === 'run' && s.status === 'done');
  const withPace = done.filter((s) => s.actualKm && s.actualMin);
  const easy = withPace.filter((s) => ['easy', 'long', 'recovery'].includes(s.type));
  const avgEasy = easy.length ? avg(easy.map((s) => (s.actualMin * 60) / s.actualKm)) : null;
  const hrs = done.map((s) => s.avgHr).filter(Boolean);
  const longest = done.reduce((m, s) => ((s.actualKm ?? s.km ?? 0) > (m?.v || 0) ? { v: s.actualKm ?? s.km, s } : m), null);
  const month = done.filter((s) => s.date.getMonth() === today.getMonth() && s.date.getFullYear() === today.getFullYear()).reduce((a, s) => a + doneKm(s), 0);
  const total = done.reduce((a, s) => a + doneKm(s), 0);
  return { avgEasyPace: avgEasy ? secToPace(avgEasy) : null, avgHr: hrs.length ? Math.round(avg(hrs)) : null, longest, monthKm: Math.round(month * 10) / 10, totalKm: Math.round(total), runsDone: done.length };
}

/** Avg easy pace (s/km) per plan week, only for weeks with logged time + distance. */
export function easyPaceByWeek(sessions) {
  const m = {};
  sessions.filter((s) => s.status === 'done' && ['easy', 'long', 'recovery'].includes(s.type) && s.actualKm && s.actualMin)
    .forEach((s) => { (m[s.week] ||= []).push((s.actualMin * 60) / s.actualKm); });
  return Object.entries(m).map(([wk, a]) => ({ wk: +wk, sec: avg(a) })).sort((a, b) => a.wk - b.wk);
}
