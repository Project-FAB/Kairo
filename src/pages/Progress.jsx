import React, { useState } from 'react';
import { Icon, WorkoutIcon } from '../components/icons.jsx';
import { Button, Card, StatTile, MileageChart, ReadinessScore, cx } from '../components/ui.jsx';
import { ScreenHead, Empty, Field } from '../components/common.jsx';
import { useKairo } from '../state/AppState.jsx';
import { useShell } from '../components/Shell.jsx';
import { MONTHS_LONG, fmtDate, parseISO, toISO, secToPace, daysBetween } from '../lib/dates.js';
import { analytics, easyPaceByWeek, weekTotals } from '../lib/model.js';

function PaceTrend({ data }) {
  if (data.length < 2) return <Empty icon="progress" title="Not enough data yet">Log distance and time on two or more easy runs (on the workout page after marking it done) to see your aerobic trend.</Empty>;
  const vals = data.map((d) => d.sec);
  const mn = Math.min(...vals) - 5, mx = Math.max(...vals) + 5;
  const pts = data.map((d, i) => [(i / (data.length - 1)) * 100, ((d.sec - mn) / (mx - mn)) * 100]);
  return (
    <>
      <div className="k-line">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-label={`Easy pace went from ${secToPace(vals[0])} to ${secToPace(vals[vals.length - 1])} per km`}>
          <polyline points={pts.map(([x, y]) => `${x},${y}`).join(' ')} vectorEffect="non-scaling-stroke" />
        </svg>
        {pts.map(([x, y], i) => <span key={i} className={cx('k-line-dot', i === pts.length - 1 && 'is-last')} style={{ left: x + '%', top: y + '%' }} title={`Week ${data[i].wk}: ${secToPace(vals[i])}/km`} />)}
        <span className="k-line-lab is-first body-s">{secToPace(vals[0])}</span><span className="k-line-lab is-last body-s">{secToPace(vals[vals.length - 1])}/km</span>
      </div>
      <div className="k-chart-x">{data.map((d) => <span key={d.wk}>W{d.wk}</span>)}</div>
    </>
  );
}

function Tests() {
  const { tests, today, actions } = useKairo();
  const [form, setForm] = useState(null);
  return (
    <Card title="Tests & results" eyebrow="Checkpoints" action={<Button variant="ghost" size="sm" icon="plus" onClick={() => setForm({ date: toISO(today), name: '', value: '', note: '' })}>Add</Button>}>
      {form ? (
        <form className="k-form" onSubmit={(e) => { e.preventDefault(); if (!form.name || !form.value) return; actions.add('test_results', 'tests', form, 'Result saved'); setForm(null); }}>
          <div className="k-form-row">
            <Field label="Date"><input className="k-input" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></Field>
            <Field label="Test"><input className="k-input" value={form.name} placeholder="10 km time trial" onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
            <Field label="Result"><input className="k-input" value={form.value} placeholder="57:40" onChange={(e) => setForm({ ...form, value: e.target.value })} /></Field>
          </div>
          <Field label="Note"><input className="k-input" value={form.note} placeholder="LTHR 168 · humid" onChange={(e) => setForm({ ...form, note: e.target.value })} /></Field>
          <div className="k-form-actions"><Button variant="ghost" onClick={() => setForm(null)}>Cancel</Button><Button variant="primary" type="submit">Save result</Button></div>
        </form>
      ) : null}
      <div className="k-results">
        {tests.length ? tests.map((r) => (
          <div key={r.id} className="k-result"><WorkoutIcon type="test" size={32} /><div><div className="k-sline-title">{r.name}</div><div className="body-s k-muted">{fmtDate(parseISO(r.date))}{r.note ? ` · ${r.note}` : ''}</div></div><b className="metric-m k-num">{r.value}</b>
            <Button variant="icon" icon="x" aria-label="Delete result" onClick={() => actions.remove('test_results', 'tests', r.id, 'Result deleted')} /></div>
        )) : <p className="body-s k-muted">Add your threshold test, time trials and races as you do them.</p>}
      </div>
    </Card>
  );
}

export default function Progress() {
  const { weeks, status, sessions, today, currentWeek, profile, race, readiness } = useKairo();
  const { layout, go } = useShell();
  const a = analytics(sessions, today);
  const t = weekTotals(weeks[currentWeek], status);
  const hub = [['/plan', 'Training plan'], ['/recovery', 'Recovery'], ['/race', 'Race countdown'], ['/strength', 'Strength'], ['/plyo', 'Plyometrics']];
  const weakest = readiness.parts.filter((p) => p[1] != null).sort((x, y) => x[1] - y[1])[0];
  return (
    <div className="k-screen">
      <ScreenHead eyebrow="Running performance" title="Progress" actions={layout === 'mobile' ? null : <Button variant="ghost" size="sm" iconRight="chevR" onClick={() => go('/profile')}>Edit fitness numbers</Button>} />
      {layout === 'mobile' ? <div className="k-hub">{hub.map(([k, l]) => <button key={k} className="k-chiptab" onClick={() => go(k)}>{l}<Icon name="chevR" size={14} /></button>)}</div> : null}
      <div className="k-tiles cols-4">
        <StatTile label="Est. marathon" value={race.estimate || '—'} sub={`Target ${race.target.toLowerCase()}`} />
        <StatTile label="Threshold pace" value={profile?.threshold_pace || '—'} unit={profile?.threshold_pace ? '/km' : ''} sub={profile?.threshold_pace ? 'From your last test' : 'Add in Profile'} />
        <StatTile label="VO2 max" value={profile?.vo2max ?? '—'} sub="Watch estimate" />
        <StatTile label="Longest run" value={a.longest ? a.longest.v : '—'} unit={a.longest ? 'km' : ''} sub={a.longest ? fmtDate(a.longest.s.date) : 'None logged yet'} />
        <StatTile label="This week" value={t.done} unit={`/ ${t.planned} km`} sub={currentWeek === 0 ? 'Baseline week' : `Week ${currentWeek}`} />
        <StatTile label={MONTHS_LONG[today.getMonth()]} value={a.monthKm} unit="km" sub={`${a.totalKm} km total`} />
        <StatTile label="Avg easy pace" value={a.avgEasyPace || '—'} unit={a.avgEasyPace ? '/km' : ''} sub={a.avgEasyPace ? 'Logged easy & long runs' : 'Log time + distance'} />
        <StatTile label="Avg heart rate" value={a.avgHr ?? '—'} unit={a.avgHr ? 'bpm' : ''} sub={`${a.runsDone} runs done`} />
      </div>
      <div className="k-two k-two-wide">
        <Card title="Weekly distance" eyebrow="Planned vs completed · whole block"><MileageChart weeks={weeks} status={status} range={[0, 21]} height={180} /></Card>
        <Card title="Marathon readiness" eyebrow={readiness.score != null ? `${readiness.score} / 100` : 'Builds as you train'}>
          <ReadinessScore score={readiness.score} parts={readiness.parts} />
          <p className="body-s k-muted">{weakest ? `${weakest[0]} is the limiter right now.` : 'Complete a few sessions and a recovery check-in to start the score.'}</p>
        </Card>
      </div>
      <div className="k-two">
        <Card title="Easy pace trend" eyebrow="Aerobic fitness · up = faster"><PaceTrend data={easyPaceByWeek(sessions)} /></Card>
        <Tests />
      </div>
    </div>
  );
}
