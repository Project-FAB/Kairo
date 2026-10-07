import React, { useEffect, useState } from 'react';
import { Icon } from '../components/icons.jsx';
import { Button, Card, StatTile, ReadinessIndicator, Segmented, cx } from '../components/ui.jsx';
import { ScreenHead, Field } from '../components/common.jsx';
import { useKairo } from '../state/AppState.jsx';
import { addDays, toISO, fmtDate, DAY_NAMES, dow } from '../lib/dates.js';

const CHECKLIST = ['7.5+ h sleep', 'Protein target hit', 'Carbs matched to the day', 'Urine pale yellow', 'Shin/Achilles hop test 0–2/10', '10 min mobility', 'Resting HR & morning feeling logged', 'Easy runs were actually easy'];
const SORE = ['None', 'Low', 'Moderate', 'High', 'Very high'];

function blank(latest) {
  return {
    sleep_h: latest?.sleep_minutes != null ? Math.floor(latest.sleep_minutes / 60) : '',
    sleep_m: latest?.sleep_minutes != null ? latest.sleep_minutes % 60 : '',
    sleep_quality: latest?.sleep_quality || 'Good', resting_hr: latest?.resting_hr ?? '', hrv: latest?.hrv ?? '',
    soreness: latest?.soreness ?? 2, energy: latest?.energy ?? 7, stress: latest?.stress ?? 4, shin_pain: latest?.shin_pain ?? 0,
    checklist: latest?.checklist || {},
  };
}

function Bars({ logs, today, field, max, unit, fmt }) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6));
  return (
    <div className="k-mini">
      {days.map((d, i) => {
        const l = logs.find((x) => x.date === toISO(d));
        const v = l ? l[field] : null;
        return (
          <div key={i} className={cx('k-mini-col', i === 6 && 'is-today', v == null && 'is-empty')} title={`${fmtDate(d)}: ${v == null ? 'no check-in' : (fmt ? fmt(v) : v) + unit}`}>
            <span style={{ height: v == null ? '3%' : Math.min(100, (v / max) * 100) + '%' }} /><span className="label">{DAY_NAMES[dow(d)][0]}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function Recovery() {
  const { recovery, recoveryLogs, today, actions } = useKairo();
  const [f, setF] = useState(() => blank(recovery.latest));
  useEffect(() => setF(blank(recovery.latest)), [recovery.latest?.id]);
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e?.target ? e.target.value : e }));
  const num = (v) => (v === '' || v == null ? null : +v);
  const save = (e) => {
    e.preventDefault();
    const sleep = f.sleep_h === '' && f.sleep_m === '' ? null : (+f.sleep_h || 0) * 60 + (+f.sleep_m || 0);
    actions.saveRecovery({ date: toISO(today), sleep_minutes: sleep, sleep_quality: f.sleep_quality, resting_hr: num(f.resting_hr), hrv: num(f.hrv), soreness: +f.soreness, energy: +f.energy, stress: +f.stress, shin_pain: +f.shin_pain, checklist: f.checklist });
  };
  const L = recovery.latest;
  const shin = +f.shin_pain;
  return (
    <div className="k-screen">
      <ScreenHead eyebrow={`This morning · ${fmtDate(today)}`} title="Recovery" sub="Trend matters more than one night." />
      <ReadinessIndicator status={recovery.status} score={recovery.score} reasons={recovery.reasons} />
      {L ? (
        <div className="k-tiles cols-3">
          <StatTile label="Sleep" value={L.sleep_minutes != null ? `${Math.floor(L.sleep_minutes / 60)}h ${String(L.sleep_minutes % 60).padStart(2, '0')}m` : '—'} sub={L.sleep_quality ? `Quality ${L.sleep_quality.toLowerCase()}` : ''} />
          <StatTile label="Resting HR" value={L.resting_hr ?? '—'} unit={L.resting_hr ? 'bpm' : ''} sub={recovery.base.rhr ? `Baseline ${Math.round(recovery.base.rhr)}` : 'Baseline builds over 7 days'} />
          <StatTile label="HRV" value={L.hrv ?? '—'} unit={L.hrv ? 'ms' : ''} sub={recovery.base.hrv ? `7-day avg ${Math.round(recovery.base.hrv)}` : ''} />
        </div>
      ) : null}
      <div className="k-two">
        <Card title="Morning check-in" eyebrow={L ? 'Saved — update any time today' : '30 seconds'}>
          <form className="k-form" onSubmit={save}>
            <div className="k-form-row">
              <Field label="Sleep (h)"><input className="k-input" type="number" inputMode="numeric" min="0" max="14" value={f.sleep_h} onChange={set('sleep_h')} placeholder="7" /></Field>
              <Field label="(min)"><input className="k-input" type="number" inputMode="numeric" min="0" max="59" value={f.sleep_m} onChange={set('sleep_m')} placeholder="30" /></Field>
              <Field label="Resting HR"><input className="k-input" type="number" inputMode="numeric" value={f.resting_hr} onChange={set('resting_hr')} placeholder="bpm" /></Field>
              <Field label="HRV"><input className="k-input" type="number" inputMode="numeric" value={f.hrv} onChange={set('hrv')} placeholder="ms" /></Field>
            </div>
            <Field label="Sleep quality"><Segmented size="sm" options={['Poor', 'Fair', 'Good', 'Great']} value={f.sleep_quality} onChange={set('sleep_quality')} /></Field>
            <Field label={`Muscle soreness · ${SORE[f.soreness - 1]}`}><input type="range" min="1" max="5" value={f.soreness} onChange={set('soreness')} /></Field>
            <div className="k-form-row">
              <Field label={`Energy · ${f.energy}/10`}><input type="range" min="1" max="10" value={f.energy} onChange={set('energy')} /></Field>
              <Field label={`Stress · ${f.stress}/10`}><input type="range" min="1" max="10" value={f.stress} onChange={set('stress')} /></Field>
            </div>
            <Field label="Shin & Achilles · 10 single-leg hops each side">
              <div className="k-shin">
                <input type="range" min="0" max="10" value={f.shin_pain} onChange={set('shin_pain')} aria-label="Shin pain 0 to 10" />
                <div className="k-shin-out"><b className="metric-m k-num">{shin}</b><span className="k-muted">/10</span></div>
              </div>
            </Field>
            <p className={cx('body-s', 'k-shin-advice', shin <= 2 ? 'is-good' : shin <= 4 ? 'is-caution' : 'is-alert')}>
              <Icon name={shin <= 2 ? 'check' : 'info'} size={14} stroke={2.4} />
              {shin <= 2 ? 'Go — train as planned and monitor.' : shin <= 4 ? 'Stop the run. Cross-train the next 1–2 runs, return at 50% when 0–2/10.' : 'No running. Get assessed by a sports physio before running again.'}
            </p>
            <div className="k-form-actions"><Button variant="primary" type="submit" icon="check">{L ? 'Update check-in' : 'Save check-in'}</Button></div>
          </form>
        </Card>
        <div className="k-detail-main">
          <Card title="Sleep · 7 days" eyebrow="Target 7.5–8 h"><Bars logs={recoveryLogs} today={today} field="sleep_minutes" max={600} unit="" fmt={(v) => `${(v / 60).toFixed(1)} h`} /></Card>
          <Card title="HRV · 7 days" eyebrow="Overnight average"><Bars logs={recoveryLogs} today={today} field="hrv" max={Math.max(80, ...recoveryLogs.map((l) => l.hrv || 0))} unit=" ms" /></Card>
          <Card title="Daily checklist" eyebrow={`${Object.values(f.checklist).filter(Boolean).length} of ${CHECKLIST.length} · saved with the check-in`}>
            <div className="k-checks">{CHECKLIST.map((l, i) => <label key={l} className="k-check"><input type="checkbox" checked={!!f.checklist[i]} onChange={() => setF((x) => ({ ...x, checklist: { ...x.checklist, [i]: !x.checklist[i] } }))} /><span>{l}</span></label>)}</div>
          </Card>
        </div>
      </div>
    </div>
  );
}
