import React, { useState } from 'react';
import { Icon, WorkoutIcon, TYPE_TONE } from './icons.jsx';
import { Button, Sheet, cx } from './ui.jsx';
import { useKairo } from '../state/AppState.jsx';
import { useShell } from './Shell.jsx';
import { DAY_NAMES, daysBetween, dow } from '../lib/dates.js';
import { findSession, sessionState } from '../lib/model.js';

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

/** Done toggle + Reschedule + Skip for any real session, with the "move to another day" sheet. */
export function SessionActions({ s, toggle, hint = 'Keep 48 h between hard leg days and the long run.' }) {
  const { weeks, status, today, actions } = useKairo();
  const { share } = useShell();
  const [sheet, setSheet] = useState(false);
  const found = s && !s.synthetic ? findSession(weeks, s.id) : null;
  if (!found) return toggle || null;
  const { week, dayIdx } = found;
  const st = sessionState(s, today, status);
  const isRest = s.kind === 'rest';
  return (
    <>
      <div className="k-actions">
        {toggle}
        {st === 'done' ? <Button variant="primary" icon="share" onClick={() => share(s)}>Share</Button> : null}
        <Button variant="secondary" icon="move" onClick={() => setSheet(true)}>Reschedule</Button>
        {!isRest ? <Button variant="ghost" icon="skip" onClick={() => actions.skip(s, st !== 'skipped')}>{st === 'skipped' ? 'Restore' : 'Skip workout'}</Button> : null}
      </div>
      {sheet ? (
        <Sheet title="Move to another day" onClose={() => setSheet(false)}>
          <p className="body-s k-muted">{hint} Tip: you can also drag sessions between days in the calendar.</p>
          <div className="k-movelist">
            {week.days.map((d, i) => (
              <button key={i} className={cx('k-moverow', i === dayIdx && 'is-current')} disabled={i === dayIdx} onClick={() => { actions.move(s, d.date); setSheet(false); }}>
                <span className="k-keyrow-date"><span className="label">{DAY_NAMES[i]}</span><b className="k-num">{d.date.getDate()}</b></span>
                <span className="k-move-icons">{d.sessions.map((x) => <span key={x.id} className={`k-tone-${TYPE_TONE[x.type]}`}><Icon name={x.type} size={16} stroke={2} /></span>)}</span>
                <span className="body-s k-muted">{d.sessions.map((x) => x.title).join(' + ')}</span>
                {(i === 5 || i === 4) && s.intensity >= 4 ? <span className="k-warn body-s"><Icon name="info" size={14} />Close to long run</span> : null}
              </button>
            ))}
          </div>
        </Sheet>
      ) : null}
    </>
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
