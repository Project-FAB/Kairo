import React from 'react';
import { Icon, WorkoutIcon } from './icons.jsx';
import { useKairo } from '../state/AppState.jsx';
import { useShell } from './Shell.jsx';
import { DAY_NAMES, daysBetween, dow } from '../lib/dates.js';

export function ScreenHead({ eyebrow, title, sub, actions, back, onBack }) {
  return (
    <header className="k-shead">
      {back ? <button className="k-back" onClick={onBack}><Icon name="chevL" size={18} />{back}</button> : null}
      <div className="k-shead-row">
        <div>{eyebrow ? <div className="label k-eyebrow">{eyebrow}</div> : null}<h1 className="title-l">{title}</h1>{sub ? <p className="body k-muted">{sub}</p> : null}</div>
        {actions ? <div className="k-shead-actions">{actions}</div> : null}
      </div>
    </header>
  );
}

export function Empty({ icon = 'info', title, children, action }) {
  return (
    <div className="k-empty">
      <span className="k-empty-ic"><Icon name={icon} size={22} /></span>
      <div><div className="k-sline-title">{title}</div>{children ? <p className="body-s k-muted">{children}</p> : null}</div>
      {action}
    </div>
  );
}

export function upcomingKey(weeks, today, n = 4) {
  const out = [];
  weeks.forEach((w) => w.days.forEach((d) => d.sessions.forEach((s) => { if (s.key && daysBetween(today, d.date) > 0 && s.status !== 'done') out.push({ s, date: d.date, wk: w.wk, note: w.longNote }); })));
  return out.slice(0, n);
}

export function KeyWorkouts({ n = 4 }) {
  const { weeks, today } = useKairo();
  const { openSession } = useShell();
  const list = upcomingKey(weeks, today, n);
  if (!list.length) return <p className="body-s k-muted">No key workouts left — race day is close.</p>;
  return (
    <div className="k-keylist">
      {list.map(({ s, date, note }) => (
        <button key={s.id} className="k-keyrow" onClick={() => openSession(s)}>
          <div className="k-keyrow-date"><span className="label">{DAY_NAMES[dow(date)]}</span><b className="k-num">{date.getDate()}</b></div>
          <WorkoutIcon type={s.type} size={32} />
          <div className="k-keyrow-main"><div className="k-sline-title">{s.title}</div><div className="body-s k-muted">{s.detail}{s.type === 'long' && note && note !== 'All easy' ? ` · ${note}` : ''}</div></div>
          <Icon name="chevR" size={16} className="k-muted" />
        </button>
      ))}
    </div>
  );
}

export function Field({ label, children, hint }) {
  return (
    <label className="k-field">
      <span className="label k-muted">{label}</span>
      {children}
      {hint ? <span className="body-s k-muted">{hint}</span> : null}
    </label>
  );
}
