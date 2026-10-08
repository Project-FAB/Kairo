// "Share today" — turns logged sessions into the numbers the share cards draw, and the cards into PNGs.
import { toBlob, getFontEmbedCSS } from 'html-to-image';
import { addDays, daysBetween, dow, sameDay, toISO, fmtDate, fmtClock, secToPace, MONTHS, MONTHS_LONG, DAY_NAMES } from './dates.js';
import { typeMeta, PHASES, LAST_WEEK } from './plan.js';
import { weekTotals, doneKm, sessionState } from './model.js';

// Fill colours per workout type (fixed: cards never follow the app's light/dark theme).
export const TYPE_HEX = {
  easy: '#38bdf8', recovery: '#22c55e', long: '#8b5cf6', threshold: '#f59e0b', interval: '#ef4444', test: '#ef4444', mp: '#14b8a6',
  race: '#b8f23a', strength: '#eab308', upper: '#eab308', plyo: '#ec4899', cross: '#64748b', rest: '#cbd5e1', mobility: '#22c55e',
};
export const hexFor = (t) => TYPE_HEX[t] || TYPE_HEX.easy;

export const CARDS = [
  { group: "Today's session", list: [['session', 'Session'], ['grid', 'Stats grid'], ['poster', 'Poster'], ['intervals', 'Intervals']] },
  { group: 'Photo & sticker', list: [['photo', 'Photo'], ['clear', 'Clear sticker']] },
  { group: 'Race', list: [['count', 'Countdown'], ['bib', 'Race bib']] },
  { group: 'Progress', list: [['week', 'Week'], ['block', 'Block'], ['streak', 'Consistency'], ['month', 'Monthly recap'], ['milestone', 'Milestone']] },
];
export const CARD_LIST = CARDS.flatMap((g) => g.list);

/** Authored at 270 px wide; exported ×4 → 1080 px. */
export const FORMATS = { story: { w: 270, h: 480, label: 'Story' }, post: { w: 270, h: 338, label: 'Post' }, square: { w: 270, h: 270, label: 'Square' } };
export const STYLES = [['black', 'Black'], ['lime', 'Lime'], ['light', 'Light'], ['photo', 'Photo']];
export const SHOW = [['distance', 'Distance'], ['time', 'Time'], ['pace', 'Pace'], ['hr', 'Heart rate'], ['countdown', 'Race countdown'], ['week', 'Week progress'], ['notes', 'Notes'], ['name', 'Name'], ['mark', 'Kairo mark']];
export const DEFAULT_PREFS = { format: 'story', style: 'black', show: { distance: true, time: true, pace: true, hr: false, countdown: true, week: true, notes: false, name: false, mark: true } };
export const prefsFrom = (p) => ({ ...DEFAULT_PREFS, ...(p || {}), show: { ...DEFAULT_PREFS.show, ...(p?.show || {}) } });

const r1 = (n) => Math.round(n * 10) / 10;
const QUALITY = ['threshold', 'interval', 'mp', 'test'];

/** Which card to open with for this session. */
export function suggestCard(s, d) {
  if (!s || s.kind === 'rest' || s.synthetic) return 'count';
  if (s.kind !== 'run') return 'count';
  if (d.milestone.isNew) return 'milestone';
  if (QUALITY.includes(s.type)) return 'intervals';
  return 'session';
}

/** Parse "3×2 km threshold …" into reps for the Intervals card. */
function repsOf(s) {
  const main = (s.steps || []).find((p) => /main|set/i.test(p.label)) || null;
  const txt = `${main?.text || ''} ${s.detail || ''}`;
  const m = txt.match(/(\d+)\s*×\s*([\d.]+\s*(?:km|m|min))/);
  return m ? { n: Math.min(+m[1], 6), each: m[2].replace(/\s+/, ' '), total: +m[1] } : null;
}

export function buildShareData({ s, sessions, weeks, status, today, race, profile, currentWeek }) {
  const date = s?.date || today;
  const wkIdx = Math.max(0, Math.min(LAST_WEEK, s?.week ?? currentWeek));
  const week = weeks[wkIdx];
  const byDay = {};
  weeks.forEach((w) => w.days.forEach((d) => { byDay[toISO(d.date)] = d; }));
  const st = (x) => sessionState(x, today, status);
  const isDone = s ? st(s) === 'done' : false;
  const isRunS = s?.kind === 'run';

  // ---- the session itself (pace is never invented: only from logged km + time)
  const km = isRunS ? (s.actualKm ?? s.km) : null;
  const sec = s?.actualMin ? s.actualMin * 60 : null;
  const pace = isRunS && s.actualKm && s.actualMin ? secToPace(sec / s.actualKm) : null;
  const typeLabel = s ? (s.kind === 'rest' ? 'Rest day' : typeMeta(s.type).label) : 'Rest day';
  const hero = isRunS ? { v: String(r1(km || 0)), u: 'km' } : s && s.kind !== 'rest' && s.min ? { v: String(Math.round(s.actualMin || s.min)), u: 'min' } : { v: 'Rest', u: '' };

  // ---- week
  const tot = weekTotals(week, status);
  const all = week.days.flatMap((d) => d.sessions);
  const gym = all.filter((x) => x.type === 'upper' || x.type === 'strength');
  const days = week.days.map((d) => {
    const main = d.sessions.find((x) => x.kind === 'run') || d.sessions.find((x) => x.kind !== 'rest') || d.sessions[0];
    const real = d.sessions.filter((x) => x.kind !== 'rest');
    const runKm = d.sessions.filter((x) => x.kind === 'run').reduce((a, x) => a + (status[x.id] === 'done' ? (x.actualKm ?? x.km ?? 0) : (x.km || 0)), 0);
    return { date: d.date, letter: DAY_NAMES[dow(d.date)][0], type: main.type, km: r1(runKm), rest: !real.length, done: real.length > 0 && real.every((x) => status[x.id] === 'done'), today: sameDay(d.date, today) };
  });
  const nextKey = weeks.flatMap((w) => w.days).flatMap((d) => d.sessions).find((x) => x.kind !== 'rest' && x.key && daysBetween(today, x.date) > 0);

  // ---- block
  const vols = weeks.map((w) => w.km);
  const peakIdx = vols.slice(0, LAST_WEEK).reduce((b, v, i, a) => (v > a[b] ? i : b), 0);
  const blockDone = Math.round(sessions.reduce((a, x) => a + (x.kind === 'run' ? doneKm(x) : 0), 0));
  const blockPlanned = Math.round(vols.reduce((a, v) => a + v, 0));

  // ---- last four calendar weeks, Monday-aligned
  const gridStart = addDays(date, -dow(date) - 21);
  const streak = Array.from({ length: 28 }, (_, i) => {
    const d = addDays(gridStart, i); const day = byDay[toISO(d)];
    if (daysBetween(today, d) > 0) return 'f';
    const real = day ? day.sessions.filter((x) => x.kind !== 'rest') : [];
    if (!real.length) return 'r';
    if (real.some((x) => status[x.id] === 'done')) return 'd';
    return sameDay(d, today) ? 't' : 'm';
  });
  const win = sessions.filter((x) => x.kind !== 'rest' && daysBetween(gridStart, x.date) >= 0 && daysBetween(x.date, today) >= 0 && daysBetween(x.date, date) >= 0);
  const winRuns = win.filter((x) => x.kind === 'run' && x.status === 'done');
  let inARow = 0;
  for (let d = today, first = true; ; d = addDays(d, -1), first = false) {
    const day = byDay[toISO(d)]; if (!day) break;
    const real = day.sessions.filter((x) => x.kind !== 'rest');
    const ok = !real.length || real.some((x) => status[x.id] === 'done');
    if (!ok) { if (first) continue; break; }
    inARow++;
  }

  // ---- month of the session date
  const mY = date.getFullYear(), mM = date.getMonth();
  const inMonth = (x, y, m) => x.date.getFullYear() === y && x.date.getMonth() === m;
  const monthDays = new Date(mY, mM + 1, 0).getDate();
  const first = new Date(mY, mM, 1);
  const cal = Array.from({ length: 42 }, (_, i) => {
    const n = i - dow(first) + 1;
    if (n < 1 || n > monthDays) return null;
    const d = new Date(mY, mM, n); const day = byDay[toISO(d)];
    const real = day ? day.sessions.filter((x) => x.kind !== 'rest') : [];
    const main = real.find((x) => x.kind === 'run') || real[0];
    const done = real.find((x) => status[x.id] === 'done');
    return { n, color: main ? hexFor((done || main).type) : null, done: !!done, future: daysBetween(today, d) > 0 };
  });
  const rows = Math.ceil((dow(first) + monthDays) / 7);
  const prevY = mM === 0 ? mY - 1 : mY, prevM = mM === 0 ? 11 : mM - 1;
  const monthKm = r1(sessions.filter((x) => x.kind === 'run' && inMonth(x, mY, mM)).reduce((a, x) => a + doneKm(x), 0));
  // like-for-like: last month up to the same day of the month
  const prevKm = sessions.filter((x) => x.kind === 'run' && inMonth(x, prevY, prevM) && x.date.getDate() <= date.getDate()).reduce((a, x) => a + doneKm(x), 0);

  // ---- milestone: how this run ranks against every earlier finished run
  const doneRuns = sessions.filter((x) => x.kind === 'run' && x.status === 'done');
  const earlier = doneRuns.filter((x) => x.id !== s?.id && daysBetween(x.date, date) >= 0);
  const prevBest = Math.max(0, ...earlier.map((x) => x.actualKm ?? x.km ?? 0));
  const isNew = !!(isRunS && isDone && km && km > prevBest && earlier.length);
  const subject = isNew ? s : doneRuns.filter((x) => daysBetween(x.date, date) >= 0).reduce((b, x) => ((x.actualKm ?? x.km ?? 0) > (b ? (b.actualKm ?? b.km ?? 0) : -1) ? x : b), null);
  const subjKm = subject ? (subject.actualKm ?? subject.km ?? 0) : 0;
  const rivals = earlier.filter((x) => x !== subject).sort((a, b) => (b.actualKm ?? b.km) - (a.actualKm ?? a.km)).slice(0, 3);
  const maxBar = Math.max(subjKm, ...rivals.map((x) => x.actualKm ?? x.km ?? 0), 1);

  return {
    s, date, isToday: sameDay(date, today), dateLabel: fmtDate(date), dateShort: `${String(date.getDate()).padStart(2, '0')}.${String(mM + 1).padStart(2, '0')}.${String(mY).slice(2)}`,
    name: profile?.display_name || '', type: s?.type || 'rest', color: hexFor(s?.type || 'rest'), title: s?.title || 'Rest day', typeLabel,
    detail: s?.detail || '', zone: s?.zone ? s.zone.split(' · ')[0] : '', notes: s?.notes || '', isRun: isRunS, isDone, hero,
    km: km != null ? r1(km) : null, plannedKm: s?.km ?? null, time: sec ? fmtClock(sec) : null, pace, hr: s?.avgHr || null, targetPace: s?.pace || '',
    steps: s?.steps || [], reps: s ? repsOf(s) : null,
    race: { name: race.name, short: race.name.replace(/ Marathon$/, ''), days: Math.max(0, daysBetween(today, race.date)), dateLabel: `${race.date.getDate()} ${MONTHS[race.date.getMonth()]} ${race.date.getFullYear()}`, longDate: race.dateLabel, target: race.target, pace: race.targetPace },
    week: { wk: week.wk, label: week.wk === 0 ? 'Baseline week' : `Week ${week.wk}`, range: `${week.start.getDate()} – ${addDays(week.start, 6).getDate()} ${MONTHS[addDays(week.start, 6).getMonth()]}`, phase: week.phase, note: week.phase.goal, days, doneKm: tot.done, plannedKm: tot.planned, sessions: tot.sessions, doneSessions: tot.doneSessions, gymDone: gym.filter((x) => status[x.id] === 'done').length, gymTotal: gym.length },
    next: nextKey ? { title: nextKey.title, day: DAY_NAMES[dow(nextKey.date)] } : null,
    block: { vols, wk: week.wk, last: LAST_WEEK, peakKm: vols[peakIdx], peakWk: peakIdx, doneKm: blockDone, plannedKm: blockPlanned, phases: PHASES.map((p) => ({ short: p.short, span: p.weeks[1] - p.weeks[0] + 1, now: p.id === week.phase.id })) },
    streak: { cells: streak, done: win.filter((x) => x.status === 'done').length, total: win.length, runKm: Math.round(winRuns.reduce((a, x) => a + doneKm(x), 0)), longest: r1(Math.max(0, ...winRuns.map((x) => x.actualKm ?? x.km ?? 0))), inARow },
    month: { name: MONTHS_LONG[mM], cells: cal.slice(0, rows * 7), km: monthKm, runs: sessions.filter((x) => x.kind === 'run' && x.status === 'done' && inMonth(x, mY, mM)).length, gym: sessions.filter((x) => (x.type === 'upper' || x.type === 'strength') && x.status === 'done' && inMonth(x, mY, mM)).length, vsPrev: prevKm ? Math.round(((monthKm - prevKm) / prevKm) * 100) : null, prevName: MONTHS[prevM] },
    milestone: { isNew, subject: subject ? { km: r1(subjKm), date: fmtDate(subject.date), time: subject.actualMin ? fmtClock(subject.actualMin * 60) : null, pace: subject.actualKm && subject.actualMin ? secToPace((subject.actualMin * 60) / subject.actualKm) : null, title: subject.title, wk: subject.week } : null,
      bars: subject ? [{ label: isNew ? 'Today' : `Week ${subject.week}`, km: r1(subjKm), now: true }, ...rivals.map((x) => ({ label: `Week ${x.week}`, km: r1(x.actualKm ?? x.km), now: false }))].map((b) => ({ ...b, pct: (b.km / maxBar) * 100 })) : [] },
  };
}

// ---------------------------------------------------------------- PNG export
// html-to-image can't read the cross-origin Google Fonts sheet, so inline it ourselves: fetch the CSS the page
// already links, keep the latin faces, and turn each woff2 into a data URL. Cached for the session.
const asDataURL = (blob) => new Promise((ok, bad) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = bad; r.readAsDataURL(blob); });
let fontCSS = null;
async function embedGoogleFonts() {
  const href = document.querySelector('link[href*="fonts.googleapis.com/css"]')?.href;
  if (!href) return '';
  const css = await (await fetch(href)).text();
  const faces = css.split(/(?=\/\* )/).filter((b) => /^\/\* latin \*\//.test(b));
  const out = await Promise.all(faces.map(async (b) => {
    const url = b.match(/url\((https:[^)]+)\)/)?.[1];
    return url ? b.replace(url, await asDataURL(await (await fetch(url)).blob())) : b;
  }));
  return out.join('\n');
}
async function fonts(node) {
  if (fontCSS == null) {
    try { fontCSS = await embedGoogleFonts(); } catch (e) { fontCSS = ''; }
    if (!fontCSS) { try { fontCSS = await getFontEmbedCSS(node); } catch (e) { fontCSS = ''; } }
  }
  return fontCSS;
}

/** Render a card element to a PNG blob at 1080 px wide. */
export async function cardToBlob(node) {
  await document.fonts?.ready;
  const opts = { pixelRatio: 1080 / node.offsetWidth, cacheBust: false, fontEmbedCSS: await fonts(node) };
  await toBlob(node, opts); // first pass warms image decoding (Safari otherwise drops photos)
  return toBlob(node, opts);
}

export const fileName = (d, card) => `kairo-${card}-${toISO(d.date)}.png`;

/** Share sheet with the PNG where supported; otherwise download it. Returns 'shared' | 'saved' | 'cancelled'. */
export async function shareBlob(blob, name, title) {
  const file = new File([blob], name, { type: 'image/png' });
  if (navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file], title }); return 'shared'; } catch (e) { if (e?.name === 'AbortError') return 'cancelled'; }
  }
  saveBlob(blob, name);
  return 'saved';
}

export function saveBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function copyBlob(blob) {
  if (!navigator.clipboard?.write || typeof ClipboardItem === 'undefined') throw new Error('Copying images isn’t supported in this browser');
  await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
}

export const canCopyImage = () => !!navigator.clipboard?.write && typeof ClipboardItem !== 'undefined';
