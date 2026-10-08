import React, { useEffect, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { Icon, WorkoutIcon, TYPE_TONE } from '../components/icons.jsx';
import { TypeTag, IntensityMeter, Card, FuelingCard, DoneToggle, cx } from '../components/ui.jsx';
import { ScreenHead, Field, Empty, SessionActions } from '../components/common.jsx';
import { useKairo } from '../state/AppState.jsx';
import { useShell } from '../components/Shell.jsx';
import { fmtDate, sameDay, daysBetween, secToPace } from '../lib/dates.js';
import { sessionState, findSession } from '../lib/model.js';

/** /workouts → today's main session (or the next one) */
export function TodayWorkout() {
  const { weeks, today } = useKairo();
  const days = weeks.flatMap((w) => w.days);
  const d = days.find((x) => sameDay(x.date, today)) || days.find((x) => daysBetween(today, x.date) > 0 && x.sessions.some((s) => s.kind !== 'rest'));
  if (!d) return <div className="k-screen"><ScreenHead title="Workouts" /><Empty title="No sessions left in the plan" /></div>;
  const main = d.sessions.find((s) => s.kind === 'run') || d.sessions[0];
  return <WorkoutDetail id={main.id} todayTabs />;
}

export default function WorkoutRoute() {
  const { id } = useParams();
  return <WorkoutDetail id={id} />;
}

function LogCard({ s }) {
  const { actions } = useKairo();
  const [km, setKm] = useState(s.actualKm ?? '');
  const [min, setMin] = useState(s.actualMin ?? '');
  const [hr, setHr] = useState(s.avgHr ?? '');
  useEffect(() => { setKm(s.actualKm ?? ''); setMin(s.actualMin ?? ''); setHr(s.avgHr ?? ''); }, [s.id]);
  const save = () => actions.saveSession(s, { actual_km: km === '' ? null : +km, actual_minutes: min === '' ? null : +min, avg_hr: hr === '' ? null : Math.round(+hr) }, 'Run details saved');
  const pace = km && min ? secToPace((min * 60) / km) : null;
  return (
    <Card title="Log details" eyebrow="Optional · from your watch">
      <div className="k-form-row">
        <Field label="Distance (km)"><input className="k-input" type="number" inputMode="decimal" step="0.01" value={km} placeholder={s.km ?? ''} onChange={(e) => setKm(e.target.value)} onBlur={save} /></Field>
        <Field label="Time (min)"><input className="k-input" type="number" inputMode="decimal" step="0.1" value={min} placeholder={s.min ? Math.round(s.min) : ''} onChange={(e) => setMin(e.target.value)} onBlur={save} /></Field>
        <Field label="Avg HR"><input className="k-input" type="number" inputMode="numeric" value={hr} placeholder="bpm" onChange={(e) => setHr(e.target.value)} onBlur={save} /></Field>
      </div>
      <p className="body-s k-muted">{pace ? `Average pace ${pace}/km.` : 'Distance and time feed your easy-pace trend and analytics.'} Marking done is enough on its own.</p>
    </Card>
  );
}

function WorkoutDetail({ id, todayTabs }) {
  const { weeks, status, today, actions } = useKairo();
  const { layout, back, openSession } = useShell();
  const found = findSession(weeks, id);
  const [note, setNote] = useState(found?.s.notes || '');
  useEffect(() => setNote(found?.s.notes || ''), [id, found?.s.notes]);
  if (!found) return <div className="k-screen"><ScreenHead back="Back" onBack={back} title="Workout not found" /><Empty title="This session isn't in your plan anymore." /></div>;
  const { s, week, dayIdx } = found;
  if (s.type === 'upper' || s.type === 'strength') return <Navigate to={`/strength?session=${s.id}`} replace />;
  if (s.type === 'plyo') return <Navigate to={`/plyo?session=${s.id}`} replace />;

  const st = sessionState(s, today, status);
  const isRest = s.kind === 'rest';
  const steps = s.steps.length ? s.steps : s.kind === 'run' ? [{ label: 'Warm-up', text: '1 km relaxed', zone: 'Z1' }, { label: 'Main run', text: `${Math.max(1, (s.km || 2) - 1)} km easy`, zone: 'Z2' }, { label: 'Finish', text: s.detail.includes('strides') ? '4–6 × 20 s strides' : 'Relaxed final km', zone: 'Z2' }] : [];
  const daySessions = week.days[dayIdx].sessions;
  const done = st === 'done';
  const toggle = <DoneToggle done={done} onChange={(v) => actions.toggleDone(s, v)} label={['Mark as done', 'Done · tap to undo']} />;

  return (
    <div className="k-screen k-detail">
      <ScreenHead back={todayTabs ? null : 'Back'} onBack={back} eyebrow={`${fmtDate(s.date)} · ${week.wk === 0 ? 'Baseline week' : `Week ${week.wk}`}`} title={s.title} />
      {todayTabs && daySessions.length > 1 ? (
        <div className="k-today-tabs">{daySessions.map((x) => <button key={x.id} className={cx('k-chiptab', x.id === s.id && 'on')} onClick={() => openSession(x)}><Icon name={x.type} size={15} stroke={2} />{x.title}</button>)}</div>
      ) : null}
      <div className="k-detail-grid">
        <div className="k-detail-main">
          <section className={cx('k-detail-hero', `k-tone-${TYPE_TONE[s.type]}`)}>
            <div className="k-detail-hero-row">
              <WorkoutIcon type={s.type} size={56} solid />
              <div>
                <TypeTag type={s.type} />
                <div className="k-detail-big"><span className="display-l k-num">{s.kind === 'run' ? s.km : isRest ? 'Rest' : s.dur}</span>{s.kind === 'run' ? <span className="k-unit-l">km</span> : null}</div>
              </div>
              {['done', 'skipped', 'missed'].includes(st) ? <span className={cx('k-pill', done && 'is-done')}>{done ? <><Icon name="check" size={14} stroke={2.6} />Completed</> : st === 'skipped' ? 'Skipped' : 'Missed'}</span> : null}
            </div>
            <div className="k-purpose"><span className="label">Purpose</span><p className="body">{s.purpose}</p></div>
            {layout === 'mobile' && !isRest ? toggle : null}
          </section>

          {steps.length ? (
            <Card title="Structure" eyebrow={`${steps.length} parts`}>
              <ol className="k-steps">
                {steps.map((p, i) => (
                  <li key={i} className="k-step">
                    <span className="k-step-dot">{i + 1}</span>
                    <div className="k-step-main"><div className="label k-muted">{p.label}</div><div className="k-step-text">{p.text}</div></div>
                    <span className="k-zone">{p.zone}</span>
                  </li>
                ))}
              </ol>
            </Card>
          ) : null}

          {isRest ? (
            <Card title="Optional recovery" eyebrow="Rest day">
              <div className="k-today-recs">
                {[['mobility', 'Mobility flow', '10 min · calves, hip flexors, glutes, T-spine'], ['rest', 'Prehab', '15 min · calf, soleus, tibialis, feet'], ['easy', 'Easy walk', '20–30 min']].map(([t, a, b]) => <div key={a} className="k-rec"><WorkoutIcon type={t} size={32} /><div><div className="k-sline-title">{a}</div><div className="body-s k-muted">{b}</div></div></div>)}
              </div>
            </Card>
          ) : null}

          {s.fuel ? <Card><FuelingCard session={s} /></Card> : null}
          {s.kind === 'run' && done ? <LogCard s={s} /> : null}

          {!s.synthetic ? (
            <Card title="Workout notes" eyebrow="Coach + you">
              <textarea className="k-input k-textarea" value={note} onChange={(e) => setNote(e.target.value)} onBlur={() => note !== (s.notes || '') && actions.saveSession(s, { notes: note }, 'Notes saved')} placeholder="How did it feel? Shin 0–10, sleep, heat…" rows={3} />
            </Card>
          ) : null}
        </div>

        <aside className="k-detail-side">
          {s.kind === 'run' ? (
            <Card title="Targets" eyebrow="Run by effort in the heat">
              <div className="k-targets">
                <div><span className="label k-muted">Pace</span><b className="metric-m k-num">{s.pace}</b><span className="body-s k-muted">/km</span></div>
                <div><span className="label k-muted">Heart rate</span><b className="metric-m">{s.zone.split(' · ')[0]}</b><span className="body-s k-muted">{s.zone.split(' · ')[1]}</span></div>
                <div><span className="label k-muted">Duration</span><b className="metric-m k-num">~{s.dur}</b></div>
                <div><span className="label k-muted">Effort</span><IntensityMeter level={s.intensity} /><span className="body-s k-muted">RPE {s.rpe}</span></div>
              </div>
              <p className="body-s k-muted k-heat"><Icon name="sun" size={14} /> Manila heat: expect 15–45 s/km slower at the same effort.</p>
            </Card>
          ) : null}
          {!s.synthetic ? <SessionActions s={s} toggle={!isRest && layout !== 'mobile' ? toggle : null} /> : null}
          <Card eyebrow="If something's off" title="Adjust, don't force">
            <ul className="k-list body-s">
              <li>Shin 3+/10 or rising → stop, cross-train next 1–2 runs.</li>
              <li>Sleep &lt; 6 h two nights → quality becomes easy.</li>
              <li>Missed a session → don't stack it; move on.</li>
            </ul>
          </Card>
        </aside>
      </div>
    </div>
  );
}
