import React, { useEffect, useState } from 'react';
import { Icon, TYPE_TONE } from '../components/icons.jsx';
import { Button, Card, Segmented, Meter } from '../components/ui.jsx';
import { ScreenHead, Field } from '../components/common.jsx';
import { useKairo } from '../state/AppState.jsx';
import { PACES } from '../lib/plan.js';

function Input({ value, onSave, ...rest }) {
  const [v, setV] = useState(value ?? '');
  useEffect(() => setV(value ?? ''), [value]);
  return <input className="k-input" value={v} onChange={(e) => setV(e.target.value)} onBlur={() => String(v) !== String(value ?? '') && onSave(v)} {...rest} />;
}

const HR_ZONES = [['Z1 Recovery', 0, 0.75], ['Z2 Aerobic', 0.75, 0.85], ['Z3 Marathon', 0.88, 0.92], ['Z4 Threshold', 0.95, 1.0], ['Z5 VO2', 1.0, null]];

function Shoes() {
  const { shoes, actions } = useKairo();
  const [form, setForm] = useState(null);
  return (
    <Card title="Equipment" eyebrow="Rotate 2 pairs · retire at 600–800 km" action={<Button variant="ghost" size="sm" icon="plus" onClick={() => setForm({ name: '', note: '', km: 0, max_km: 700 })}>Add shoe</Button>}>
      {form ? (
        <form className="k-form" onSubmit={(e) => { e.preventDefault(); if (!form.name) return; actions.add('shoes', 'shoes', { ...form, km: +form.km || 0, max_km: +form.max_km || 700 }, 'Shoe added'); setForm(null); }}>
          <div className="k-form-row">
            <Field label="Name"><input className="k-input" value={form.name} placeholder="Daily trainer" onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
            <Field label="Note"><input className="k-input" value={form.note} placeholder="Rotation pair A" onChange={(e) => setForm({ ...form, note: e.target.value })} /></Field>
            <Field label="Current km"><input className="k-input" type="number" value={form.km} onChange={(e) => setForm({ ...form, km: e.target.value })} /></Field>
            <Field label="Retire at"><input className="k-input" type="number" value={form.max_km} onChange={(e) => setForm({ ...form, max_km: e.target.value })} /></Field>
          </div>
          <div className="k-form-actions"><Button variant="ghost" onClick={() => setForm(null)}>Cancel</Button><Button variant="primary" type="submit">Save shoe</Button></div>
        </form>
      ) : null}
      {shoes.length ? (
        <div className="k-shoes">
          {shoes.filter((s) => !s.retired).map((s) => (
            <div key={s.id} className="k-shoe"><Icon name="shoe" size={22} />
              <div className="k-shoe-main"><b>{s.name}</b><span className="body-s k-muted">{s.note}</span>
                <Meter value={+s.km} max={+s.max_km} right={`${Math.round(s.km)} / ${Math.round(s.max_km)} km`} thin />
                <div className="k-shoe-actions">
                  {[5, 10, 21].map((n) => <Button key={n} variant="secondary" size="sm" onClick={() => actions.edit('shoes', 'shoes', s.id, { km: +s.km + n })}>+{n} km</Button>)}
                  <Button variant="ghost" size="sm" onClick={() => actions.edit('shoes', 'shoes', s.id, { retired: true })}>Retire</Button>
                  <Button variant="icon" icon="x" aria-label="Delete shoe" onClick={() => actions.remove('shoes', 'shoes', s.id, 'Shoe removed')} />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : <p className="body-s k-muted">Track mileage on each pair so you replace them before the last 3 weeks, not during.</p>}
    </Card>
  );
}

export default function Profile() {
  const { profile, user, isDemo, plan, actions, theme } = useKairo();
  const p = profile || {};
  const save = (k, num) => (v) => actions.updateProfile({ [k]: v === '' ? null : num ? +v : v }, 'Saved');
  const lthr = p.lthr;
  return (
    <div className="k-screen">
      <ScreenHead eyebrow="Profile & settings" title={p.display_name || 'Athlete'} sub={user?.email}
        actions={<Segmented size="sm" options={[{ value: 'dark', label: 'Dark' }, { value: 'light', label: 'Light' }]} value={theme} onChange={(v) => actions.updateProfile({ theme: v })} />} />
      <div className="k-grid-3">
        <Card title="Personal" eyebrow="About you">
          <Field label="Display name"><Input value={p.display_name} onSave={save('display_name')} /></Field>
          <Field label="Body weight (kg)" hint="Sets protein and carb targets: 1.6–2.0 g/kg protein."><Input type="number" inputMode="decimal" step="0.1" value={p.weight_kg} onSave={save('weight_kg', true)} placeholder="72" /></Field>
        </Card>
        <Card title="Fitness numbers" eyebrow="From your tests and watch">
          <Field label="Threshold pace (/km)" hint="Avg pace of the last 20 min of the 30-min test."><Input value={p.threshold_pace} onSave={save('threshold_pace')} placeholder="5:50" /></Field>
          <Field label="LTHR (bpm)"><Input type="number" inputMode="numeric" value={p.lthr} onSave={save('lthr', true)} placeholder="168" /></Field>
          <div className="k-form-row">
            <Field label="VO2 max"><Input type="number" inputMode="decimal" step="0.1" value={p.vo2max} onSave={save('vo2max', true)} placeholder="47" /></Field>
            <Field label="Est. finish" hint="Blank = from threshold."><Input value={p.est_finish} onSave={save('est_finish')} placeholder="4:42" /></Field>
          </div>
        </Card>
        <Card title="Race goal" eyebrow="Your plan">
          <div className="k-kv"><span>A race</span><b>{plan.race_name}</b></div>
          <div className="k-kv"><span>Date</span><b>{plan.race_date}</b></div>
          <div className="k-kv"><span>Target</span><b>{plan.target_label} · {plan.target_pace}/km</b></div>
          <div className="k-kv"><span>Plan start</span><b>{plan.start_date}</b></div>
        </Card>
      </div>
      <div className="k-two">
        <Card title="Running zones" eyebrow="Pace targets · re-test in weeks 8 and 14">
          <table className="k-table">
            <thead><tr><th>Zone</th><th>Pace /km</th><th>RPE</th></tr></thead>
            <tbody>{[['recovery', 'Recovery'], ['easy', 'Easy / long'], ['mp', 'Marathon pace'], ['threshold', 'Threshold'], ['interval', 'Interval']].map(([k, l]) => <tr key={k}><td><span className={`k-tdot k-tone-${TYPE_TONE[k]}`}><Icon name={k} size={14} stroke={2} /></span>{l}</td><td className="k-num">{PACES[k].pace}</td><td className="k-num">{PACES[k].rpe}</td></tr>)}</tbody>
          </table>
        </Card>
        <Card title="Heart-rate zones" eyebrow={lthr ? `From LTHR ${lthr} bpm` : 'Add your LTHR to calculate'}>
          <table className="k-table"><tbody>{HR_ZONES.map(([z, a, b]) => <tr key={z}><td>{z}</td><td className="k-num">{lthr ? (b == null ? `${Math.round(lthr * a) + 1}+ bpm` : a === 0 ? `< ${Math.round(lthr * b)} bpm` : `${Math.round(lthr * a)}–${Math.round(lthr * b)} bpm`) : '—'}</td></tr>)}</tbody></table>
        </Card>
      </div>
      <Shoes />
      <Card title="Account" eyebrow={isDemo ? 'Demo mode' : 'Signed in'}>
        <div className="k-form-actions k-left">
          <Button variant="secondary" icon="x" onClick={actions.signOut}>Sign out</Button>
          <Button variant="ghost" onClick={() => { if (window.confirm('Delete your plan and every logged session, then rebuild it from the template?')) actions.resetPlan(); }}>Reset plan</Button>
        </div>
      </Card>
    </div>
  );
}
