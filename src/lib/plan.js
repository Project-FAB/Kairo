// Tokyo Marathon 2027 — integrated 21-week training plan template.
// generateSessions(startMonday) turns it into rows for the `sessions` table.
import { addDays, toISO } from './dates.js';

export const DEFAULT_PLAN = {
  race_name: 'Tokyo Marathon',
  race_date: '2027-03-07',
  start_date: '2026-10-05', // Monday of week 0 (baseline week); week 1 starts Mon 12 Oct 2026
  target_label: 'Sub 4:30',
  target_seconds: 16200,
  target_pace: '6:24',
};

export const RACE_GOALS = [
    { tier: 'Conservative', time: 'Sub 4:50', pace: '6:52/km', proof: '3+ long runs of 28–32 km without a major slowdown; fueling tolerated at 50+ g/h.' },
    { tier: 'Realistic', time: '4:30–4:40', pace: '6:24–6:38/km', proof: '16 km MP block in week 18 at 6:25–6:35 with HR ≤ ~90% LTHR; 10 km test around 58–60 min.' },
    { tier: 'Stretch', time: 'Sub 4:20', pace: '6:10/km', proof: 'Threshold retest ≤ 5:40/km; 10 km test ≤ 55 min; recovered from 32 km in < 48 h.' }
];

export const PACES = {
  recovery: { pace: '7:45–8:15', zone: 'Z1 · Recovery', rpe: '2–3' },
  easy: { pace: '7:10–7:50', zone: 'Z2 · Aerobic endurance', rpe: '3–4' },
  long: { pace: '7:20–7:50', zone: 'Z2 · Aerobic endurance', rpe: '4' },
  mp: { pace: '6:25–6:35', zone: 'Z3 · 88–92% LTHR', rpe: '5–6' },
  threshold: { pace: '5:50–6:00', zone: 'Z4 · 95–100% LTHR', rpe: '7' },
  interval: { pace: '5:25–5:35', zone: 'Z5 · Threshold+', rpe: '8–9' },
};

export const PHASES = [
  { id: 'baseline', name: 'Baseline', short: 'Base 0', weeks: [0, 0], dates: '5 – 11 Oct', km: '~30', long: '10 km easy',
    goal: 'Easy running only, plus the 30-minute threshold test that sets every pace and zone.', strength: '3 upper · learn the lifts', plyo: 'None yet' },
  { id: 'base', name: 'Base & durability', short: 'Base', weeks: [1, 6], dates: '12 Oct – 22 Nov', km: '26–38', long: '14 → 19 km easy',
    goal: 'Build tissue tolerance — shins, tendons and bone adapt slower than lungs.', strength: '2 lower · main + calf/tib, plus 3 upper', plyo: '2×/wk · 60 → 100 contacts' },
  { id: 'threshold', name: 'Threshold & strength', short: 'Build', weeks: [7, 11], dates: '23 Nov – 27 Dec', km: '32–47', long: '20 → 24 km',
    goal: 'Raise the pace you can hold aerobically; heavy strength improves economy.', strength: '1 heavy lower · 4–6 reps, plus 3 upper', plyo: '2×/wk · up to 120 contacts' },
  { id: 'specific', name: 'Marathon-specific', short: 'Specific', weeks: [12, 18], dates: '28 Dec – 14 Feb', km: '40–57', long: '26 → 32 km with MP',
    goal: 'Run 42 km at goal pace while fueling. Peak week 18.', strength: '1 lower · 2-set maintenance, plus 3 shorter upper', plyo: '1–2×/wk · 60–80 contacts' },
  { id: 'taper', name: 'Taper', short: 'Taper', weeks: [19, 21], dates: '15 Feb – 7 Mar', km: '46 → 36 → ~20', long: '24 → 13 km',
    goal: 'Shed fatigue, keep sharpness. Cut volume, keep intensity.', strength: 'Light · last heavy ~12 days out', plyo: '1×/wk · 30–40, stop 5 days out' },
];

// wk, km, long, longNote, key session, flags
export const WEEK_META = [
  [0, 30, 10, 'All easy', '30-min threshold test', 'test'],
  [1, 28, 14, 'All easy', 'Easy + strides'],
  [2, 31, 16, 'All easy', 'Hill strides'],
  [3, 33, 16, 'All easy', 'Tempo 2×8 min'],
  [4, 26, 12, 'All easy', '5 km time trial', 'cutback test'],
  [5, 36, 18, 'All easy', 'Tempo 3×8 min'],
  [6, 38, 19, 'Gel practice', 'Tempo 3×10 min'],
  [7, 41, 20, 'Fuel 45–50 g/h', 'Cruise 4×1.6 km'],
  [8, 32, 14, 'All easy', '30-min threshold retest', 'cutback test'],
  [9, 44, 22, 'Fuel ~50 g/h', '3×2 km threshold'],
  [10, 47, 24, 'Last 3 km steady', '5×1 km VO2'],
  [11, 36, 16, 'Christmas cutback', '20 min tempo', 'cutback'],
  [12, 49, 26, 'Race fueling', '2×3 km threshold'],
  [13, 52, 27, '2×5 km at MP', '6×800 m'],
  [14, 40, 18, 'All easy', '10 km time trial', 'cutback test'],
  [15, 54, 29, 'Last 5 km at MP', '3×2.5 km threshold'],
  [16, 56, 32, 'Race rehearsal · 3:30 cap', '10 km at MP'],
  [17, 45, 22, '14 km at MP', 'Easy + strides', 'cutback'],
  [18, 57, 30, '8 easy + 16 MP + 6 easy', '4×1.6 km threshold', 'peak'],
  [19, 46, 24, '10 km at MP', '5×1 km threshold'],
  [20, 36, 13, '5 km at MP', '6×400 m at 10K pace'],
  [21, 62, 42.2, 'Race day', 'Race week'],
];


export const phaseOf = (wk) => PHASES.find((p) => wk >= p.weeks[0] && wk <= p.weeks[1]) || PHASES[PHASES.length - 1];

function classify(key) {
  const k = key.toLowerCase();
  if (k.includes('race')) return 'race';
  if (k.includes('trial') || k.includes('retest')) return 'test';
  if (/\bMP\b/.test(key)) return 'mp';
  if (k.includes('800') || k.includes('vo2') || k.includes('400')) return 'interval';
  if (k.includes('tempo') || k.includes('threshold') || k.includes('cruise')) return 'threshold';
  return 'easy';
}

const TYPE_META = {
  easy: { label: 'Easy Run', intensity: 1, purpose: 'Aerobic base — capillaries, mitochondria and tissue tolerance at low injury cost.' },
  recovery: { label: 'Recovery Run', intensity: 1, purpose: 'Blood flow only. Skip it if shins or Achilles are not 0/10.' },
  long: { label: 'Long Run', intensity: 2, purpose: 'Aerobic endurance, durability and gut training for race day.' },
  threshold: { label: 'Threshold', intensity: 4, purpose: 'Raise the pace you can hold aerobically — the engine for a 4:30 marathon.' },
  interval: { label: 'Intervals', intensity: 5, purpose: 'Small dose of VO2 work to lift the ceiling. Equal-time jog recoveries.' },
  mp: { label: 'Marathon Pace', intensity: 3, purpose: 'Teach the body to hold goal pace while fueling. Best predictor of race pace.' },
  test: { label: 'Test', intensity: 5, purpose: 'Checkpoint — recalculates your paces and zones and confirms the race goal.' },
  race: { label: 'Race', intensity: 5, purpose: 'Tokyo Marathon. Start 5–10 s/km slower than goal, eat every 4 km.' },
  strength: { label: 'Strength', intensity: 3, purpose: 'Heavy, low-volume leg work for running economy and shin durability — not leg size.' },
  upper: { label: 'Strength', intensity: 2, purpose: 'Upper-body hypertrophy. Barely interferes with running, so it keeps volume all block.' },
  plyo: { label: 'Plyometrics', intensity: 3, purpose: 'Stiffer, springier ankles and Achilles — better running economy late in the race.' },
  cross: { label: 'Taekwondo', intensity: 3, purpose: 'Skill, mobility, enjoyment. Counts as a moderate leg day before the long run.' },
  rest: { label: 'Rest', intensity: 0, purpose: 'Your body adapts while you recover.' },
  mobility: { label: 'Mobility', intensity: 0, purpose: 'Calves, hip flexors, glutes, T-spine. 10–15 minutes.' },
};
export const typeMeta = (t) => TYPE_META[t] || TYPE_META.easy;
export const isRun = (t) => ['easy', 'recovery', 'long', 'threshold', 'interval', 'mp', 'test', 'race'].includes(t);

const paceFor = (t) => (t === 'test' ? { pace: 'Max sustainable', zone: 'Even effort', rpe: '9' } : t === 'race' ? { pace: '6:24 goal', zone: 'Z3', rpe: '6 → 9' } : PACES[t] || PACES.easy);
const minPerKm = { easy: 7.5, recovery: 8, long: 7.6, threshold: 6.8, interval: 6.9, mp: 6.9, test: 6.4, race: 6.4 };
export const fmtMinutes = (m) => (m >= 60 ? `${Math.floor(m / 60)}h ${String(Math.round(m % 60)).padStart(2, '0')}m` : `${Math.round(m)} min`);


function runSession(id, type, km, opts = {}) {
  const meta = typeMeta(type);
  const min = opts.min || km * (minPerKm[type] || 7.5);
  const p = paceFor(type);
  return {
    id, type, kind: 'run', title: opts.title || meta.label, km, min, dur: fmtMinutes(min), detail: opts.detail || `${km} km`,
    pace: p.pace, zone: p.zone, rpe: p.rpe, intensity: meta.intensity, purpose: opts.purpose || meta.purpose,
    key: !!opts.key, steps: opts.steps || [], notes: opts.notes || '', fuel: opts.fuel,
  };
}
function other(id, type, title, detail, min, opts = {}) {
  const meta = typeMeta(type);
  return { id, type, kind: type === 'rest' ? 'rest' : 'other', title, detail, min, dur: min ? fmtMinutes(min) : '', intensity: meta.intensity, purpose: opts.purpose || meta.purpose, key: false, steps: opts.steps || [], notes: opts.notes || '', session: opts.session, contacts: opts.contacts };
}

function qualitySteps(key, type) {
  const p = paceFor(type);
  return [
    { label: 'Warm-up', text: '15 min easy · hop test · plyos · 3 strides', zone: 'Z1–2' },
    { label: 'Main set', text: `${key}${type === 'test' ? '' : ` @ ${p.pace}/km`}${/×/.test(key) ? ' · 90 s jog between reps' : ''}`, zone: p.zone.split(' · ')[0] },
    { label: 'Cool-down', text: '10 min easy', zone: 'Z1' },
  ];
}
function longSteps(km, note) {
  if (/MP/.test(note) && /\d+ easy \+ \d+ MP/.test(note)) {
    const [a, b, c] = note.match(/\d+/g).map(Number);
    return [{ label: 'Warm-up', text: `${a} km easy`, zone: 'Z2' }, { label: 'Marathon pace', text: `${b} km @ 6:25–6:35/km`, zone: 'Z3' }, { label: 'Finish', text: `${c} km easy`, zone: 'Z2' }];
  }
  if (/MP/.test(note)) return [{ label: 'Warm-up', text: '3 km easy', zone: 'Z2' }, { label: 'Main', text: `${note} within ${km} km`, zone: 'Z2–3' }, { label: 'Finish', text: '2 km easy', zone: 'Z2' }];
  if (/steady/.test(note)) return [{ label: 'Warm-up', text: '2 km easy', zone: 'Z2' }, { label: 'Main run', text: `${km - 5} km Zone 2`, zone: 'Z2' }, { label: 'Finish', text: '3 km steady', zone: 'Z3' }];
  return [{ label: 'Warm-up', text: '2 km easy', zone: 'Z1–2' }, { label: 'Main run', text: `${km - 4} km Zone 2`, zone: 'Z2' }, { label: 'Finish', text: '2 km easy', zone: 'Z2' }];
}
export function fuelPlan(km) {
  const min = km * 7.6;
  if (min < 75) return null;
  const every = km >= 26 ? 25 : km >= 20 ? 25 : 40;
  const gels = [];
  for (let t = 20; t < min - 10; t += every) gels.push(t);
  return { gels, carbs: km >= 26 ? '60 g/h' : km >= 20 ? '~50 g/h' : '30–40 g/h', fluid: '500–750 ml/h with electrolytes', before: 'Oats + banana + honey, 90 min before (1–1.5 g/kg carbs)', after: 'Protein + carbs within 60 min — chicken adobo + rice, or chocolate milk + 2 pandesal' };
}

export const weekMeta = (wk) => {
  const r = WEEK_META.find((x) => x[0] === wk) || WEEK_META[WEEK_META.length - 1];
  return { wk, km: r[1], longKm: r[2], longNote: r[3], key: r[4], flags: r[5] || '', phase: phaseOf(wk) };
};

/** One template week as 7 days of sessions. `planStart` is the Monday of week 0. */
export function buildWeek(wk, planStart) {
  const { km, longKm, longNote, key, flags } = weekMeta(wk);
  const start = addDays(planStart, wk * 7);
  const phase = phaseOf(wk);
  const qType = classify(key);
  const days = [0, 1, 2, 3, 4, 5, 6].map((i) => ({ date: addDays(start, i), sessions: [] }));
  const S = (i, s) => days[i].sessions.push(s);
  const id = (i, k) => `w${wk}d${i}${k}`;
  const rest = (i, note) => S(i, other(id(i, 'r'), 'rest', 'Rest', note || 'Walk · mobility · prehab', 0, { purpose: 'Your body adapts while you recover.' }));
  const longRun = () => runSession(id(6, 'l'), longNote.includes('MP') ? 'long' : 'long', longKm, { title: 'Long Run', key: true, detail: `${longKm} km`, steps: longSteps(longKm, longNote), notes: longNote === 'All easy' ? 'Keep the effort conversational. Run by HR, not pace, in the heat.' : `${longNote}. Practise fueling exactly as on race day.`, fuel: fuelPlan(longKm), sub: longNote });

  if (wk === 0) {
    S(0, other(id(0, 'u'), 'upper', 'Upper A', 'Shoulders · chest · triceps', 55, { session: 'A' }));
    S(1, runSession(id(1, 'e'), 'easy', 5, { detail: '5 km easy', notes: 'Baseline week: easy running only. Note your heart rate at an easy pace.' }));
    S(2, runSession(id(2, 'e'), 'easy', 6, { detail: '6 km + 4 strides' }));
    S(2, other(id(2, 'u'), 'upper', 'Upper B', 'Back · biceps · rear delts', 55, { session: 'B' }));
    S(3, other(id(3, 'u'), 'upper', 'Upper C', 'Delts · arms + calf/tib', 45, { session: 'C' }));
    rest(4, 'Fresh legs for the threshold test');
    S(5, runSession(id(5, 'q'), 'test', 7, { title: '30-min threshold test', detail: '15 min warm-up + 30 min hard, even', key: true, min: 55,
      steps: [{ label: 'Warm-up', text: '15 min easy + 3 strides', zone: 'Z1–2' }, { label: 'Test', text: '30 min as hard as you can evenly sustain', zone: 'Even effort' }, { label: 'Result', text: 'Avg pace of the last 20 min = threshold pace; avg HR = LTHR', zone: '—' }],
      notes: 'Flat route or treadmill at 1% if the heat is extreme. Enter the result in Profile so paces and zones follow it.' }));
    S(6, runSession(id(6, 'l'), 'long', 10, { title: 'Easy long run', detail: '10 km easy', steps: longSteps(10, 'All easy') }));
    return { wk, km: 28, longKm: 10, longNote, key, phase, start, days, flags, qType };
  }

  if (wk === 21) {
    S(0, other(id(0, 'u'), 'upper', 'Upper — light', 'Last session · prehab', 30, { session: 'A' }));
    S(1, runSession(id(1, 'q'), 'mp', 8, { title: 'Race-week MP', detail: '8 km · 2×1.5 km MP', key: true, steps: [{ label: 'Warm-up', text: '3 km easy', zone: 'Z2' }, { label: 'MP', text: '2×1.5 km @ 6:25–6:35, 2 min jog', zone: 'Z3' }, { label: 'Finish', text: 'Easy to 8 km', zone: 'Z2' }] }));
    S(2, runSession(id(2, 'e'), 'easy', 6, { detail: '6 km + 4 strides' }));
    rest(3, 'Travel to Tokyo · walk, hydrate');
    S(4, runSession(id(4, 'e'), 'easy', 5, { detail: '25–30 min incl. 1 km MP', notes: 'Carb-load starts: 8–10 g/kg, low fat and fiber.' }));
    S(5, runSession(id(5, 's'), 'recovery', 3, { title: 'Shakeout', detail: '15–20 min + 3 strides' }));
    S(6, runSession(id(6, 'race'), 'race', 42.2, { title: 'Tokyo Marathon', detail: '42.2 km', key: true, steps: [{ label: 'km 0–5', text: '5–10 s/km slower than goal despite the crowd', zone: 'Z2–3' }, { label: 'km 5–30', text: 'Goal pace 6:24/km, steady effort', zone: 'Z3' }, { label: 'km 30–35', text: 'Hold pace; keep eating', zone: 'Z3–4' }, { label: 'km 35–42.2', text: 'If you feel good, gradually speed up', zone: 'Z4' }], fuel: { gels: [4, 8, 12, 16, 20, 24, 28, 32, 36, 39].map((k) => k), gelUnit: 'km', carbs: '55–75 g/h', fluid: '400–600 ml/h · drink to thirst', before: 'Breakfast 3 h before: rice + egg or onigiri, 2–3 g/kg carbs', after: 'Celebrate. Then protein + carbs.' } }));
    return { wk, km: 62.2, longKm, longNote, key, phase, start, days, flags: 'race', qType: 'race' };
  }

  const rem = km - longKm;
  if (wk <= 11) {
    const tue = Math.round(rem * 0.45), wed = Math.round(rem * 0.32), thu = rem - tue - wed;
    S(0, other(id(0, 'u'), 'upper', 'Upper A', 'Shoulders · chest · triceps', 58, { session: 'A' }));
    S(1, qType === 'easy'
      ? runSession(id(1, 'q'), 'easy', tue, { title: 'Easy + strides', detail: `${tue} km · ${key.toLowerCase().includes('hill') ? 'hill strides' : '6 strides'}` })
      : runSession(id(1, 'q'), qType, tue, { title: qType === 'test' ? key.replace(/^\w/, (c) => c.toUpperCase()) : typeMeta(qType).label, detail: key, key: true, steps: qualitySteps(key, qType) }));
    S(1, other(id(1, 'p'), 'plyo', 'Plyos', wk <= 3 ? '~70 contacts' : wk <= 6 ? '~95 contacts' : '~115 contacts', 12, { contacts: wk <= 3 ? 70 : wk <= 6 ? 95 : 115 }));
    S(1, other(id(1, 'g'), 'strength', 'Lower', wk <= 6 ? '3 × 6–8 · RPE 7' : '3 × 4–5 · RPE 8', 45, { session: 'L' }));
    S(2, runSession(id(2, 'e'), 'easy', wed));
    S(2, other(id(2, 'u'), 'upper', 'Upper B', 'Back · biceps · rear delts', 55, { session: 'B' }));
    S(3, runSession(id(3, 'e'), 'easy', thu, { detail: `${thu} km + 4 strides` }));
    S(3, other(id(3, 'p'), 'plyo', 'Short plyos', '~40 contacts', 6, { contacts: 40 }));
    S(3, other(id(3, 'u'), 'upper', 'Upper C', 'Delts · arms + calf/tib', 45, { session: 'C' }));
    rest(4, 'Fresh legs for Saturday & Sunday');
    S(5, other(id(5, 't'), 'cross', 'Taekwondo', longKm >= 20 ? 'Lighter jumping before 20+ km' : 'Full class', 90, { purpose: 'Counts as a moderate leg day. Carbs up at dinner, in bed by ~20:30.' }));
    S(6, longRun());
  } else {
    const tue = Math.round(rem * 0.36), wed = Math.round(rem * 0.4), fri = rem - tue - wed;
    const taper = wk >= 19;
    S(0, other(id(0, 'u'), 'upper', taper ? 'Upper — 50%' : 'Upper A', taper ? 'Nothing to failure' : 'Shoulders · chest · triceps · ~45 min', taper ? 35 : 45, { session: 'A' }));
    S(1, qType === 'easy'
      ? runSession(id(1, 'q'), 'easy', tue, { title: 'Easy + strides', detail: `${tue} km · 6 strides` })
      : runSession(id(1, 'q'), qType, tue, { title: qType === 'test' ? key.replace(/^\w/, (c) => c.toUpperCase()) : typeMeta(qType).label, detail: key, key: true, steps: qualitySteps(key, qType) }));
    S(1, other(id(1, 'p'), 'plyo', 'Plyos', taper ? '~35 contacts' : '~70 contacts', 8, { contacts: taper ? 35 : 70 }));
    if (!taper || wk === 19) S(1, other(id(1, 'g'), 'strength', 'Lower — maint.', '2 × 4–5 · RPE 8', 30, { session: 'L' }));
    S(2, runSession(id(2, 'e'), 'easy', wed, { title: wed >= 10 ? 'Medium-long' : 'Easy Run' }));
    if (!taper) S(2, other(id(2, 'u'), 'upper', 'Upper B', 'Back · biceps · ~45 min', 45, { session: 'B' }));
    rest(3, 'Prehab 15 min');
    S(4, runSession(id(4, 'e'), 'easy', fri, { detail: `${fri} km + strides` }));
    S(4, other(id(4, 'u'), 'upper', 'Upper C', taper ? 'Light' : 'Delts · arms + calves', 35, { session: 'C' }));
    rest(5, 'Optional 20–30 min shakeout if shins are 0/10');
    S(6, longRun());
  }
  return { wk, km, longKm, longNote, key, phase, start, days, flags, qType };
}

const rowOf = (s, date, wk, sort) => ({
  date: toISO(date), week: wk, sort, type: s.type, kind: s.kind, title: s.title, detail: s.detail || null,
  km: s.km ?? null, minutes: s.min ? Math.round(s.min * 10) / 10 : null, pace: s.pace || null, zone: s.zone || null, rpe: s.rpe || null,
  intensity: s.intensity || 0, purpose: s.purpose || null, is_key: !!s.key, steps: s.steps || [], fuel: s.fuel || null,
  strength_ref: s.session || null, contacts: s.contacts ?? null, notes: s.notes || null,
});

/** Every session of the plan as insertable rows (weeks 0–21). */
export function generateSessions(startISO) {
  const [y, m, d] = startISO.split('-').map(Number);
  const start = new Date(y, m - 1, d);
  const rows = [];
  for (let wk = 0; wk <= 21; wk++) {
    const w = buildWeek(wk, start);
    w.days.forEach((day) => day.sessions.forEach((s, i) => rows.push(rowOf(s, day.date, wk, i))));
  }
  return rows;
}

export const LAST_WEEK = 21;

export const STRENGTH = {
  A: { name: 'Upper A', focus: 'Shoulders · chest · triceps', min: 58, why: 'Upper-body hypertrophy with zero leg cost — the physique engine that runs alongside the marathon.', ex: [
    ['Incline dumbbell press', 3, '6–10', 26, '2–3 min'], ['Seated DB shoulder press', 3, '8–10', 20, '2 min'], ['Cable lateral raise', 4, '12–20', 7.5, '60–90 s'],
    ['Weighted dips', 2, '8–12', 10, '2 min'], ['Overhead cable triceps ext.', 3, '10–15', 22.5, '90 s'], ['Reverse pec-deck', 2, '15–20', 30, '60 s']] },
  B: { name: 'Upper B', focus: 'Back · biceps · rear delts', min: 55, why: 'A strong upper back holds posture late in the race when form fades.', ex: [
    ['Pull-ups (weighted)', 3, '6–10', 5, '2–3 min'], ['Chest-supported row', 3, '8–12', 24, '2 min'], ['Single-arm cable row', 2, '10–15', 27.5, '90 s'],
    ['Face pull', 3, '15–20', 20, '60 s'], ['Incline dumbbell curl', 3, '8–12', 12, '90 s'], ['Hammer curl', 2, '10–15', 14, '60 s'], ['Lateral raise', 3, '15–20', 8, '60 s']] },
  C: { name: 'Upper C + calf/tib', focus: 'Delts · arms · lower-leg armour', min: 45, why: 'Third hit for delts and arms, then the calf/tib block — your main shin-injury defence.', ex: [
    ['Machine shoulder press', 2, '8–12', 40, '2 min'], ['Lateral raise (myo-reps)', 3, '12–20', 8, '60 s'], ['Cable fly', 2, '12–15', 15, '90 s'],
    ['Neutral-grip pulldown', 2, '10–12', 55, '90 s'], ['Cable curl + pushdown', 3, '10–15', 25, '60 s'],
    ['Single-leg calf raise', 3, '12–15', 0, '60 s'], ['Tibialis raise', 2, '15–20', 0, '45 s'], ['Copenhagen side plank', 2, '20 s', 0, '45 s']] },
  L: { name: 'Lower — heavy', focus: 'Strength for running economy', min: 45, why: 'Heavy, low-rep, low-volume: improves running economy and protects shins. Leg strength stays even if leg size drops.', ex: [
    ['Back squat', 3, '4–5 · RPE 8', 80, '2–3 min'], ['Romanian deadlift', 3, '5–6', 85, '2–3 min'], ['Bulgarian split squat', 3, '6 / leg', 18, '90 s'],
    ['Nordic curl (assisted)', 2, '6', 0, '90 s'], ['Standing calf raise · 3 s lower', 3, '8 heavy', 100, '90 s'], ['Seated soleus raise', 3, '10', 60, '60 s'], ['Side plank', 2, '30 s', 0, '45 s']] },
};

export const PLYO = {
  phaseLabel: 'Weeks 7–11 · single-leg added', cap: 120,
  sessions: {
    tue: { name: 'Tuesday — before quality run', contacts: 115, ex: [['A-skip', '2 × 30 m', 0], ['2-leg pogo', '2 × 20', 40], ['1-leg pogo', '3 × 10 / leg', 60], ['Split-squat jump', '2 × 5 / leg', 20], ['Bounds', '3 × 20 m', 0]] },
    thu: { name: 'Thursday — after easy run', contacts: 40, ex: [['A-skip', '2 × 20 m', 0], ['2-leg pogo', '2 × 15', 30], ['Ankling', '2 × 20 m', 10]] },
  },
  why: [
    ['Tendon stiffness', 'A stiffer Achilles returns more energy each step.'],
    ['Elastic return', 'Trains the stretch-shortening cycle you use ~40,000 times in a marathon.'],
    ['Coordination', 'Better pre-landing activation — less braking.'],
    ['Ground contact', 'Shorter contact at the same pace wastes less energy.'],
  ],
  rules: ['Never the day before a long run or within 24 h after one', 'Never on Taekwondo Saturdays — kicks already supply the contacts', 'Stop the set if contacts get loud or slow', 'Any next-morning shin or Achilles symptom: hold the dose'],
};


// Plyometric progression by week (section 8 of the plan). [exercise, dose, foot contacts]
export const PLYO_PROGRAM = [
  { weeks: [0, 3], label: 'Weeks 1–3 · low intensity', ex: [['Ankling', '2 × 20 m', 0], ['A-skip', '2 × 20 m', 0], ['2-leg pogo', '3 × 15', 45], ['Jump rope', '3 × 30 s', 30]] },
  { weeks: [4, 6], label: 'Weeks 4–6 · more contacts', ex: [['A-skip', '2 × 30 m', 0], ['2-leg pogo', '3 × 20', 60], ['Lateral pogo', '2 × 10', 20], ['Jump rope', '3 × 45 s', 20]] },
  { weeks: [7, 11], label: 'Weeks 7–11 · single-leg added', ex: [['A-skip', '2 × 30 m', 0], ['2-leg pogo', '2 × 20', 40], ['1-leg pogo', '3 × 10 / leg', 60], ['Split-squat jump', '2 × 5 / leg', 20], ['Bounds (from wk 9)', '3 × 20 m', 0]] },
  { weeks: [12, 18], label: 'Weeks 12–18 · keep intensity', ex: [['A-skip', '2 × 30 m', 0], ['1-leg pogo', '3 × 10 / leg', 60], ['Bounds', '2 × 20 m', 0]] },
  { weeks: [19, 21], label: 'Taper · drills only race week', ex: [['A-skip', '2 × 20 m', 0], ['2-leg pogo', '2 × 15', 30], ['1-leg pogo', '1 × 8 / leg', 16]] },
];
export const PLYO_SHORT = [['A-skip', '2 × 20 m', 0], ['2-leg pogo', '2 × 15', 30], ['Ankling', '2 × 20 m', 10]];
export const plyoFor = (wk, short) => (short ? { label: 'Short session · after the easy run', ex: PLYO_SHORT } : PLYO_PROGRAM.find((p) => wk >= p.weeks[0] && wk <= p.weeks[1]) || PLYO_PROGRAM[0]);
