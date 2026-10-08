import React, { useState, useEffect, useRef } from 'react';
import { Icon, WorkoutIcon, TYPE_TONE } from './icons.jsx';
import { DAY_NAMES, MONTHS, MONTHS_LONG, sameDay, daysBetween, fmtDate, fmtMin } from '../lib/dates.js';
import { typeMeta, PHASES, LAST_WEEK } from '../lib/plan.js';
import { weekTotals, sessionState } from '../lib/model.js';
import { useKairo } from '../state/AppState.jsx';
const cx = (...a) => a.filter(Boolean).join(' ');

export function Button({ variant = 'secondary', size = 'md', icon, iconRight, children, className, ...rest }) {
  return (
    <button type="button" {...rest} className={cx('k-btn', `k-btn-${variant}`, `k-btn-${size}`, className)}>
      {icon ? <Icon name={icon} size={size === 'lg' ? 20 : 18} /> : null}
      {children ? <span>{children}</span> : null}
      {iconRight ? <Icon name={iconRight} size={18} /> : null}
    </button>
  );
}

export function TypeTag({ type, children }) {
  return <span className={cx('k-tag', `k-tone-${TYPE_TONE[type] || 'easy'}`)}><Icon name={type} size={14} stroke={2} />{children || typeMeta(type).label}</span>;
}

// 0–5 effort as five ticks — shape not colour
export function IntensityMeter({ level = 1, label = true }) {
  const names = ['Rest', 'Easy', 'Steady', 'Moderate', 'Hard', 'Very hard'];
  return (
    <span className="k-intensity" title={`Intensity: ${names[level]}`}>
      <span className="k-intensity-ticks" aria-hidden="true">{[1, 2, 3, 4, 5].map((i) => <i key={i} className={i <= level ? 'on' : ''} style={{ height: 4 + i * 2 }} />)}</span>
      {label ? <span className="k-intensity-label">{names[level]}</span> : null}
    </span>
  );
}

export function StatusMark({ status, size = 18 }) {
  if (status === 'done') return <span className="k-status k-status-done" style={{ width: size, height: size }} title="Completed"><Icon name="check" size={size - 6} stroke={2.6} /></span>;
  if (status === 'missed' || status === 'skipped') return <span className="k-status k-status-missed" style={{ width: size, height: size }} title="Missed" />;
  if (status === 'today') return <span className="k-status k-status-today" style={{ width: size, height: size }} title="Today" />;
  return <span className="k-status k-status-planned" style={{ width: size, height: size }} title="Planned" />;
}

export function Card({ title, action, children, className, pad = true, eyebrow }) {
  return (
    <section className={cx('k-card', !pad && 'k-card-flush', className)}>
      {title || action || eyebrow ? (
        <header className="k-card-head">
          <div>{eyebrow ? <div className="label k-eyebrow">{eyebrow}</div> : null}{title ? <h3 className="title-m">{title}</h3> : null}</div>
          {action}
        </header>
      ) : null}
      {children}
    </section>
  );
}

export function Segmented({ options, value, onChange, size = 'md' }) {
  return (
    <div className={cx('k-seg', size === 'sm' && 'k-seg-sm')} role="tablist">
      {options.map((o) => {
        const v = typeof o === 'string' ? o : o.value; const l = typeof o === 'string' ? o : o.label;
        return <button key={v} role="tab" aria-selected={value === v} className={value === v ? 'on' : ''} onClick={() => onChange && onChange(v)}>{l}</button>;
      })}
    </div>
  );
}

export function StatTile({ label, value, unit, delta, deltaDir, sub }) {
  return (
    <div className="k-stat">
      <div className="label k-muted">{label}</div>
      <div className="k-stat-value"><span className="metric-m">{value}</span>{unit ? <span className="k-unit">{unit}</span> : null}</div>
      {delta ? <div className={cx('k-delta', deltaDir && `is-${deltaDir}`)}>{deltaDir === 'up' ? '▲ ' : deltaDir === 'down' ? '▼ ' : ''}{delta}</div> : null}
      {sub ? <div className="body-s k-muted">{sub}</div> : null}
    </div>
  );
}

export function Meter({ value, max = 100, label, right, tone = 'ink', thin }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className="k-meter-row">
      {label || right ? <div className="k-meter-labels"><span>{label}</span><span className="k-num">{right}</span></div> : null}
      <div className={cx('k-meter', thin && 'is-thin')} role="meter" aria-valuenow={value} aria-valuemin={0} aria-valuemax={max} aria-label={typeof label === 'string' ? label : undefined}>
        <span className={`k-meter-fill k-fill-${tone}`} style={{ width: pct + '%' }} />
      </div>
    </div>
  );
}

// ---------- Race countdown ----------
export function RaceCountdown({ variant = 'card', onOpen }) {
  const { today, race: RACE, currentWeek } = useKairo();
  const days = Math.max(0, daysBetween(today, RACE.date));
  const gap = RACE.estimateSec != null ? RACE.estimateSec - RACE.targetSec : null; // seconds slower than target
  const pct = gap == null ? 0 : Math.max(0, Math.min(100, 100 - (gap / (25 * 60)) * 100));
  if (variant === 'strip') {
    return (
      <button className="k-race-strip" onClick={onOpen}>
        <Icon name="flag" size={16} /><span className="k-race-strip-name">{RACE.name}</span>
        <span className="k-race-strip-days"><b className="k-num">{days}</b> days</span>
        <span className="k-muted">· Target {RACE.target}</span>
      </button>
    );
  }
  return (
    <section className={cx('k-race', variant === 'hero' && 'is-hero')} onClick={onOpen} role={onOpen ? 'button' : undefined} tabIndex={onOpen ? 0 : undefined}>
      <div className="k-race-top">
        <div><div className="label k-race-eyebrow">Race day</div><div className="title-m">{RACE.name}</div><div className="body-s k-race-muted">{RACE.dateLabel}</div></div>
        <Icon name="flag" size={22} />
      </div>
      <div className="k-race-count"><span className="display-xl k-num">{days}</span><span className="k-race-unit">days<br />to go</span></div>
      <div className="k-race-goal">
        <div><div className="label k-race-eyebrow">Target</div><div className="metric-m">{RACE.target}</div></div>
        <div><div className="label k-race-eyebrow">Estimated</div><div className="metric-m">{RACE.estimate || '—'}</div></div>
        <div><div className="label k-race-eyebrow">Goal pace</div><div className="metric-m">{RACE.targetPace}<span className="k-unit">/km</span></div></div>
      </div>
      <div className="k-race-track" aria-label={gap == null ? 'No estimate yet' : `Estimate is ${Math.round(gap / 60)} minutes off target`}>
        <span style={{ width: pct + '%' }} />
      </div>
      <div className="body-s k-race-muted">{gap == null ? 'Add your threshold pace in Profile for an estimate' : gap > 0 ? `${Math.round(gap / 60)} min to find` : 'On target'} · week {currentWeek} of {LAST_WEEK}</div>
    </section>
  );
}

// ---------- Completion ----------
// The one way to log a session: a switch between "not done" and "done". No live recording.
export function DoneToggle({ done, onChange, size = 'lg', label }) {
  return (
    <button type="button" role="switch" aria-checked={!!done} className={cx('k-done', `k-done-${size}`, done && 'on')} onClick={() => onChange && onChange(!done)}>
      <span className="k-done-track" aria-hidden="true"><span className="k-done-knob">{done ? <Icon name="check" size={size === 'sm' ? 11 : 14} stroke={3} /> : null}</span></span>
      <span className="k-done-label">{done ? (label ? label[1] : 'Done') : (label ? label[0] : 'Mark as done')}</span>
    </button>
  );
}

// A status mark you can tap to flip done / not done (calendar blocks, session lines)
export function MarkToggle({ s, status, onToggle, size = 18 }) {
  const done = status === 'done';
  if (!onToggle || s.kind === 'rest') return <StatusMark status={status === 'today' ? 'planned' : status || 'planned'} size={size} />;
  return (
    <span role="checkbox" aria-checked={done} aria-label={`${s.title}: ${done ? 'done' : 'not done'}`} tabIndex={0} className="k-marktoggle"
      onClick={(e) => { e.stopPropagation(); onToggle(s, !done); }}
      onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); onToggle(s, !done); } }}>
      <StatusMark status={status === 'today' ? 'planned' : status || 'planned'} size={size} />
    </span>
  );
}

// ---------- Today's workout ----------
export function SessionLine({ s, status, onClick, onToggle, className, ...rest }) {
  return (
    <div {...rest} role="button" tabIndex={0} className={cx('k-sline', status && `is-${status}`, className)} onClick={onClick} onKeyDown={(e) => { if (e.key === 'Enter') onClick && onClick(); }}>
      <WorkoutIcon type={s.type} size={32} />
      <span className="k-sline-main"><span className="k-sline-title">{s.title}</span><span className="body-s k-muted">{s.detail}{s.dur ? ` · ${s.dur}` : ''}</span></span>
      {s.kind === 'rest' ? null : <MarkToggle s={s} status={status} onToggle={onToggle} size={22} />}
    </div>
  );
}

export function TodayCard({ day, status = {}, onToggle, onOpen, onShare, compact }) {
  const runs = day.sessions.filter((s) => s.kind === 'run');
  const main = runs[0] || day.sessions.find((s) => s.kind !== 'rest') || day.sessions[0];
  const others = day.sessions.filter((s) => s !== main);
  const share = (s) => (onShare ? <Button variant="icon" icon="share" onClick={() => onShare(s)} aria-label="Share today" title="Share today" /> : null);
  if (!main || main.kind === 'rest') {
    return (
      <section className="k-today is-rest">
        <div className="k-today-head"><span className="label k-eyebrow">Today · {fmtDate(day.date)}</span><span className="k-today-tags"><TypeTag type="rest">Rest day</TypeTag>{share(null)}</span></div>
        <h2 className="display-l">Rest day</h2>
        <p className="body k-muted">Your body adapts while you recover.</p>
        <div className="k-today-recs">
          {[['mobility', 'Mobility flow', '10 min · calves, hips, T-spine'], ['rest', 'Prehab', '15 min · calf, soleus, tib raises'], ['easy', 'Easy walk', '20–30 min · outside if cool']].map(([t, a, b]) => (
            <div key={a} className="k-rec"><WorkoutIcon type={t} size={32} /><div><div className="k-sline-title">{a}</div><div className="body-s k-muted">{b}</div></div></div>
          ))}
        </div>
      </section>
    );
  }
  const done = status[main.id] === 'done';
  return (
    <section className={cx('k-today', done && 'is-done')}>
      <div className="k-today-head">
        <span className="label k-eyebrow">Today · {fmtDate(day.date)}</span>
        <span className="k-today-tags"><TypeTag type={main.type} />{share(main)}</span>
      </div>
      <div className="k-today-title">
        <div>
          <h2 className="display-l">{main.title}</h2>
          <div className="k-today-dist"><span className="metric-xl k-num">{main.km || main.dur}</span>{main.km ? <span className="k-unit-l">km</span> : null}</div>
        </div>
        {!compact ? <WorkoutIcon type={main.type} size={64} /> : null}
      </div>
      {main.kind === 'run' ? (
        <dl className="k-today-grid">
          <div><dt className="label">Target pace</dt><dd className="k-num">{main.pace}<small>/km</small></dd></div>
          <div><dt className="label">Heart rate</dt><dd>{main.zone.split(' · ')[0]}<small> {main.zone.split(' · ')[1] || ''}</small></dd></div>
          <div><dt className="label">Duration</dt><dd className="k-num">~{main.dur}</dd></div>
          <div><dt className="label">Intensity</dt><dd><IntensityMeter level={main.intensity} /></dd></div>
        </dl>
      ) : null}
      <p className="k-today-purpose"><span className="label">Why</span> {main.purpose}</p>
      <div className="k-today-actions">
        <DoneToggle done={done} onChange={(v) => onToggle && onToggle(main, v)} label={['Mark as done', 'Done · tap to undo']} />
        <Button variant="ghost" size="lg" iconRight="chevR" onClick={() => onOpen && onOpen(main)}>Details</Button>
      </div>
      {others.length ? (
        <div className="k-today-also">
          <div className="label k-muted">Also today</div>
          {others.map((s) => <SessionLine key={s.id} s={s} status={status[s.id]} onClick={() => onOpen && onOpen(s)} onToggle={onToggle} />)}
        </div>
      ) : null}
    </section>
  );
}

// ---------- Weekly calendar (the core) ----------

// Drag a session onto another day of the week. Pointer events so mouse and touch share one path:
// a mouse drag starts after a few px of movement, touch after a long-press (so plain swipes still scroll).
const LONG_PRESS = 350, SLOP = 6;
const dropDayAt = (x, y) => { const el = document.elementFromPoint(x, y)?.closest('[data-drop-day]'); return el ? +el.dataset.dropDay : null; };
const swallowNextClick = () => {
  const stop = (e) => { e.stopPropagation(); e.preventDefault(); };
  window.addEventListener('click', stop, { capture: true, once: true });
  setTimeout(() => window.removeEventListener('click', stop, true), 0);
};

function useDayDrag(days, onMove) {
  const [drag, setDrag] = useState(null); // { s, from, x, y, over }
  const live = useRef(null);
  useEffect(() => () => live.current?.end(), []);
  const bind = (s, from) => (!onMove || s.synthetic ? {} : {
    'data-draggable': '',
    onPointerDown: (e) => {
      if (e.button !== 0 || live.current) return;
      const id = e.pointerId, touch = e.pointerType !== 'mouse';
      let active = false;
      const activate = (x, y) => { active = true; navigator.vibrate?.(10); setDrag({ s, from, x, y, over: from }); };
      const move = (ev) => {
        if (ev.pointerId !== id) return;
        if (!active) {
          if (Math.hypot(ev.clientX - e.clientX, ev.clientY - e.clientY) < SLOP) return;
          if (touch) return end(); // moved before the long-press: it's a scroll
          activate(ev.clientX, ev.clientY);
        }
        setDrag((d) => d && { ...d, x: ev.clientX, y: ev.clientY, over: dropDayAt(ev.clientX, ev.clientY) });
      };
      const up = (ev) => {
        if (ev.pointerId !== id) return;
        if (active) {
          const to = dropDayAt(ev.clientX, ev.clientY);
          if (to != null && to !== from) onMove(s, days[to].date);
          swallowNextClick();
        }
        end();
      };
      const cancel = (ev) => { if (ev.pointerId === id) end(); };
      const key = (ev) => { if (ev.key === 'Escape') { if (active) swallowNextClick(); end(); } };
      const noScroll = (ev) => { if (active) ev.preventDefault(); };
      const noMenu = (ev) => ev.preventDefault();
      const timer = touch ? setTimeout(() => activate(e.clientX, e.clientY), LONG_PRESS) : null;
      const end = () => {
        clearTimeout(timer);
        window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', cancel);
        window.removeEventListener('keydown', key); window.removeEventListener('touchmove', noScroll); window.removeEventListener('contextmenu', noMenu);
        live.current = null; setDrag(null);
      };
      window.addEventListener('pointermove', move); window.addEventListener('pointerup', up); window.addEventListener('pointercancel', cancel);
      window.addEventListener('keydown', key); window.addEventListener('touchmove', noScroll, { passive: false }); window.addEventListener('contextmenu', noMenu);
      live.current = { end };
    },
  });
  return { drag, bind };
}

function DragGhost({ drag, days }) {
  if (!drag) return null;
  const { s, from, over, x, y } = drag;
  const target = over != null && over !== from ? days[over] : null;
  const nearLong = target && (over === 4 || over === 5) && s.intensity >= 4;
  return (
    <div className={cx('k-drag-ghost', `k-tone-${TYPE_TONE[s.type]}`)} style={{ left: x, top: y }} aria-hidden="true">
      <span className="k-drag-ghost-title"><Icon name={s.type} size={16} stroke={2} />{s.title}</span>
      <span className="body-s k-muted">{target ? `Move to ${DAY_NAMES[over]} ${target.date.getDate()}` : 'Drop on another day'}</span>
      {nearLong ? <span className="k-warn body-s"><Icon name="info" size={14} />Close to long run</span> : null}
    </div>
  );
}

function DayColumn({ day, idx, status, onOpen, onToggle, selected, onSelect, bind, drag }) {
  const { today } = useKairo();
  const isToday = sameDay(day.date, today);
  const past = daysBetween(day.date, today) > 0;
  const restOnly = day.sessions.every((s) => s.kind === 'rest');
  const runKm = day.sessions.filter((s) => s.kind === 'run').reduce((a, s) => a + s.km, 0);
  const hasKey = day.sessions.some((s) => s.key);
  return (
    <div className={cx('k-day', isToday && 'is-today', past && 'is-past', restOnly && 'is-rest', selected && 'is-selected', drag && drag.over === idx && drag.from !== idx && 'is-drop-over')} data-drop-day={idx} onClick={onSelect}>
      <div className="k-day-head">
        <span className="label">{DAY_NAMES[(day.date.getDay() + 6) % 7]}</span>
        <span className={cx('k-day-date', isToday && 'is-today')}>{day.date.getDate()}</span>
        {hasKey ? <span className="k-day-key" title="Key workout"><Icon name="star" size={12} stroke={2.2} /></span> : null}
      </div>
      <div className="k-day-body">
        {day.sessions.map((s) => {
          const st = sessionState(s, today, status);
          if (s.kind === 'rest') return (
            <button key={s.id} {...bind(s, idx)} className={cx('k-block is-rest', drag?.s.id === s.id && 'is-drag-src')} onClick={(e) => { e.stopPropagation(); onOpen && onOpen(s, day.date); }}>
              <Icon name="rest" size={18} /><span className="k-block-title">Rest</span><span className="k-block-meta">{s.detail}</span>
            </button>
          );
          return (
            <div key={s.id} {...bind(s, idx)} role="button" tabIndex={0} className={cx('k-block', `k-tone-${TYPE_TONE[s.type]}`, `is-${st}`, s.kind === 'run' && 'is-run', s.key && 'is-key', drag?.s.id === s.id && 'is-drag-src')}
              onClick={(e) => { e.stopPropagation(); onOpen && onOpen(s, day.date); }} onKeyDown={(e) => { if (e.key === 'Enter') onOpen && onOpen(s, day.date); }} aria-label={`${s.title}, ${s.detail}, ${st}`}>
              <span className="k-block-top"><Icon name={s.type} size={16} stroke={2} /><MarkToggle s={s} status={st} onToggle={onToggle} size={18} /></span>
              <span className="k-block-title">{s.title}</span>
              <span className="k-block-meta">{s.kind === 'run' ? s.detail : s.dur}</span>
              {s.kind === 'run' ? <IntensityMeter level={s.intensity} label={false} /> : null}
              {st === 'missed' || st === 'skipped' ? <span className="k-block-flag">{st === 'skipped' ? 'Skipped' : 'Missed'}</span> : s.moved ? <span className="k-block-flag">Moved</span> : null}
            </div>
          );
        })}
      </div>
      <div className="k-day-foot">{runKm ? <><b className="k-num">{runKm}</b> km</> : restOnly ? 'Recover' : 'No run'}</div>
    </div>
  );
}

function CompactWeek({ week, status, selected, onSelect, drag }) {
  const { today } = useKairo();
  return (
    <div className="k-cweek">
      {week.days.map((d, i) => {
        const isToday = sameDay(d.date, today);
        const main = d.sessions.find((s) => s.kind === 'run') || d.sessions[0];
        const real = d.sessions.filter((s) => s.kind !== 'rest');
        const allDone = real.length && real.every((s) => status[s.id] === 'done');
        const anyMissed = real.some((s) => ['missed', 'skipped'].includes(sessionState(s, today, status)));
        const km = d.sessions.filter((s) => s.kind === 'run').reduce((a, s) => a + s.km, 0);
        return (
          <button key={i} className={cx('k-cday', isToday && 'is-today', selected === i && 'is-selected', main.kind === 'rest' && 'is-rest', drag && drag.over === i && drag.from !== i && 'is-drop-over')} data-drop-day={i} onClick={() => onSelect(i)}>
            <span className="label">{DAY_NAMES[i].slice(0, 1)}</span>
            <span className="k-cday-date">{d.date.getDate()}</span>
            <span className={cx('k-cday-icon', `k-tone-${TYPE_TONE[main.type]}`)}><Icon name={main.type} size={18} stroke={2} /></span>
            <span className="k-cday-km k-num">{km ? km : main.kind === 'rest' ? '—' : ''}</span>
            <span className="k-cday-st">{allDone ? <StatusMark status="done" size={14} /> : anyMissed ? <StatusMark status="missed" size={14} /> : <span className="k-dot-sp" />}</span>
          </button>
        );
      })}
    </div>
  );
}

export function WeekCalendar({ week, status = {}, onOpen, onToggle, onMove, onPrev, onNext, compact, onJumpToday, showHeader = true }) {
  const { today, currentWeek } = useKairo();
  const { drag, bind } = useDayDrag(week.days, onMove);
  const todayIdx = week.days.findIndex((d) => sameDay(d.date, today));
  const [sel, setSel] = useState(todayIdx >= 0 ? todayIdx : 0);
  useEffect(() => { setSel(todayIdx >= 0 ? todayIdx : 0); }, [week.wk]);
  const t = weekTotals(week, status);
  const end = week.days[6].date;
  return (
    <section className={cx('k-week', compact && 'is-compact', drag && 'is-dragging')}>
      {showHeader ? (
        <header className="k-week-head">
          <div>
            <div className="label k-eyebrow">{week.wk === 0 ? 'Baseline week' : `Week ${week.wk} of ${LAST_WEEK}`} · {week.phase.name}{week.flags.includes('cutback') ? ' · Cutback' : ''}{week.flags.includes('peak') ? ' · Peak' : ''}</div>
            <h3 className="title-m">{week.days[0].date.getDate()} {MONTHS[week.days[0].date.getMonth()]} – {end.getDate()} {MONTHS[end.getMonth()]}</h3>
          </div>
          <div className="k-week-nav">
            {onJumpToday && week.wk !== currentWeek ? <Button variant="ghost" size="sm" onClick={onJumpToday}>This week</Button> : null}
            <Button variant="icon" icon="chevL" onClick={onPrev} disabled={week.wk <= 0} aria-label="Previous week" />
            <Button variant="icon" icon="chevR" onClick={onNext} disabled={week.wk >= LAST_WEEK} aria-label="Next week" />
          </div>
        </header>
      ) : null}
      {compact ? (
        <>
          <CompactWeek week={week} status={status} selected={sel} onSelect={setSel} drag={drag} />
          <div className="k-cweek-detail">
            <div className="label k-muted">{fmtDate(week.days[sel].date)}{sel === todayIdx ? ' · Today' : ''}{onMove && week.days[sel].sessions.some((s) => !s.synthetic) ? ' · Hold and drag to a day to move' : ''}</div>
            {week.days[sel].sessions.map((s) => <SessionLine key={s.id} {...bind(s, sel)} className={drag?.s.id === s.id && 'is-drag-src'} s={s} status={s.kind === 'rest' ? null : sessionState(s, today, status) === 'today' ? 'planned' : sessionState(s, today, status)} onClick={() => onOpen && onOpen(s, week.days[sel].date)} onToggle={onToggle} />)}
          </div>
        </>
      ) : (
        <div className="k-week-grid">
          {week.days.map((d, i) => <DayColumn key={i} idx={i} day={d} status={status} onOpen={onOpen} onToggle={onToggle} bind={bind} drag={drag} />)}
        </div>
      )}
      <DragGhost drag={drag} days={week.days} />
      <footer className="k-week-foot">
        <div className="k-week-total"><span className="metric-m k-num">{t.done}</span><span className="k-muted"> / {t.planned} km</span></div>
        <div className="k-week-bar" aria-hidden="true">
          {week.days.map((d, i) => {
            const km = d.sessions.filter((s) => s.kind === 'run').reduce((a, s) => a + (s.km || 0), 0);
            const isDone = d.sessions.filter((s) => s.kind === 'run').every((s) => status[s.id] === 'done');
            const rt = (d.sessions.find((s) => s.kind === 'run') || {}).type;
            return km ? <span key={i} className={cx(`k-tone-${TYPE_TONE[rt] || 'easy'}`, isDone ? 'is-done' : '', sameDay(d.date, today) && 'is-today')} style={{ flex: km }} title={`${DAY_NAMES[i]} ${km} km`} /> : null;
          })}
        </div>
        <div className="body-s k-muted k-week-sessions">{t.doneSessions}/{t.sessions} sessions · Long run {week.longKm} km · Key: {week.key}</div>
      </footer>
    </section>
  );
}

export function CalendarLegend() {
  const items = [['recovery', 'Recovery run'], ['easy', 'Easy'], ['long', 'Long run'], ['threshold', 'Threshold'], ['interval', 'Intervals / test'], ['mp', 'Marathon pace'], ['strength', 'Strength'], ['plyo', 'Plyos'], ['cross', 'Taekwondo'], ['rest', 'Rest']];
  return (
    <div className="k-legend">
      {items.map(([t, l]) => <span key={t} className={cx('k-legend-item', `k-tone-${TYPE_TONE[t]}`)}><span className="k-legend-sw" /><Icon name={t} size={14} stroke={2} />{l}</span>)}
      <span className="k-legend-item k-legend-st"><StatusMark status="done" size={14} />Done</span>
      <span className="k-legend-item k-legend-st"><StatusMark status="planned" size={14} />Planned</span>
      <span className="k-legend-item k-legend-st"><StatusMark status="missed" size={14} />Missed</span>
    </div>
  );
}

// ---------- Month calendar ----------
export function MonthCalendar({ weeks, year, month, status = {}, onOpenDay, onPrev, onNext, compact }) {
  const { today, race } = useKairo();
  const first = new Date(year, month, 1);
  const startOffset = (first.getDay() + 6) % 7;
  const gridStart = new Date(year, month, 1 - startOffset);
  const byDate = {};
  weeks.forEach((w) => w.days.forEach((d) => { byDate[d.date.toDateString()] = { ...d, wk: w.wk }; }));
  const rows = [];
  for (let r = 0; r < 6; r++) {
    const cells = [];
    for (let c = 0; c < 7; c++) cells.push(new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + r * 7 + c));
    if (r > 3 && cells[0].getMonth() !== month) break;
    rows.push(cells);
  }
  let monthKm = 0, monthLong = 0, monthRuns = 0, monthStrength = 0;
  rows.flat().forEach((d) => { const e = byDate[d.toDateString()]; if (!e || d.getMonth() !== month) return; e.sessions.forEach((s) => { if (s.kind === 'run') { monthKm += s.km || 0; monthRuns++; if (s.type === 'long') monthLong = Math.max(monthLong, s.km); } if (s.type === 'strength' || s.type === 'upper') monthStrength++; }); });
  const MAXKM = 32;
  return (
    <section className={cx('k-month', compact && 'is-compact')}>
      <header className="k-week-head">
        <div><div className="label k-eyebrow">Month</div><h3 className="title-m">{MONTHS_LONG[month]} {year}</h3></div>
        <div className="k-week-nav"><Button variant="icon" icon="chevL" onClick={onPrev} aria-label="Previous month" /><Button variant="icon" icon="chevR" onClick={onNext} aria-label="Next month" /></div>
      </header>
      <div className="k-month-sum">
        <StatTile label="Planned" value={Math.round(monthKm)} unit="km" />
        <StatTile label="Runs" value={monthRuns} />
        <StatTile label="Longest" value={monthLong || '—'} unit={monthLong ? 'km' : ''} />
        <StatTile label="Strength" value={monthStrength} unit="sessions" />
      </div>
      <div className="k-month-grid">
        {DAY_NAMES.map((d) => <div key={d} className="label k-month-dow">{compact ? d[0] : d}</div>)}
        <div className="label k-month-dow k-month-wk">Week</div>
        {rows.map((cells, r) => {
          const wkE = byDate[cells[0].toDateString()];
          const wkKm = cells.reduce((a, d) => a + ((byDate[d.toDateString()] || { sessions: [] }).sessions.filter((s) => s.kind === 'run').reduce((b, s) => b + (s.km || 0), 0)), 0);
          return (
            <React.Fragment key={r}>
              {cells.map((d, c) => {
                const e = byDate[d.toDateString()];
                const out = d.getMonth() !== month;
                const isToday = sameDay(d, today);
                const isRace = sameDay(d, race.date);
                const run = e && e.sessions.find((s) => s.kind === 'run');
                const icons = e ? e.sessions.filter((s) => s.kind !== 'run' && s.kind !== 'rest') : [];
                const restOnly = e && e.sessions.every((s) => s.kind === 'rest');
                const real = e ? e.sessions.filter((s) => s.kind !== 'rest') : [];
                const st = real.length && real.every((s) => status[s.id] === 'done') ? 'done' : real.some((s) => ['missed', 'skipped'].includes(sessionState(s, today, status))) ? 'missed' : null;
                return (
                  <button key={c} className={cx('k-mcell', out && 'is-out', isToday && 'is-today', restOnly && 'is-rest', run && run.type === 'long' && 'is-long', isRace && 'is-race', !e && 'is-empty')} onClick={() => e && onOpenDay && onOpenDay(d)} disabled={!e}>
                    <span className="k-mcell-top"><span className="k-mcell-date">{d.getDate()}</span>{st ? <StatusMark status={st} size={13} /> : null}</span>
                    {run ? (
                      <span className={cx('k-mcell-run', `k-tone-${TYPE_TONE[run.type]}`)}>
                        <Icon name={run.type} size={14} stroke={2.1} /><b className="k-num">{run.km}</b>
                      </span>
                    ) : restOnly ? <span className="k-mcell-rest">Rest</span> : null}
                    {run ? <span className="k-mcell-vol"><i className={`k-tone-${TYPE_TONE[run.type]}`} style={{ width: Math.min(100, (run.km / MAXKM) * 100) + '%' }} /></span> : null}
                    {!compact && icons.length ? <span className="k-mcell-icons">{icons.slice(0, 3).map((s) => <span key={s.id} className={`k-tone-${TYPE_TONE[s.type]}`}><Icon name={s.type} size={12} stroke={2.2} /></span>)}</span> : null}
                    {isRace ? <span className="k-mcell-race"><Icon name="flag" size={12} stroke={2.2} />Race</span> : null}
                  </button>
                );
              })}
              <div className="k-month-wkcell">{wkE ? <><span className="label k-muted">W{wkE.wk}</span><b className="k-num">{Math.round(wkKm)}</b><span className="k-muted">km</span></> : null}</div>
            </React.Fragment>
          );
        })}
      </div>
      <CalendarLegend />
    </section>
  );
}

// ---------- Training block timeline ----------
export function BlockTimeline({ weeks, status = {}, onPickWeek, current }) {
  const max = 62;
  return (
    <section className="k-block-tl">
      <div className="k-btl-bars" role="list">
        {weeks.map((w) => {
          const t = weekTotals(w, status);
          const isCur = w.wk === current;
          const past = w.wk <= current;
          return (
            <button key={w.wk} role="listitem" className={cx('k-btl-col', isCur && 'is-current', past && 'is-past', w.flags.includes('cutback') && 'is-cutback')} onClick={() => onPickWeek && onPickWeek(w.wk)} title={`Week ${w.wk}: ${w.km} km · long ${w.longKm} km · ${w.key}`}>
              <span className="k-btl-flag">{w.flags.includes('test') ? <Icon name="test" size={13} stroke={2.2} /> : w.flags.includes('peak') ? <Icon name="star" size={13} stroke={2.2} /> : w.wk === LAST_WEEK ? <Icon name="flag" size={13} stroke={2.2} /> : null}</span>
              <span className="k-btl-bar"><i style={{ height: (Math.min(w.km, max) / max) * 100 + '%' }} />{past ? <b style={{ height: (Math.min(t.done, max) / max) * 100 + '%' }} /> : null}</span>
              <span className="k-btl-km k-num">{w.wk === LAST_WEEK ? 'Race' : w.km}</span>
              <span className="label k-btl-wk">{w.wk}</span>
            </button>
          );
        })}
      </div>
      <div className="k-btl-phases">
        {PHASES.map((p) => <div key={p.id} className={cx('k-btl-phase', current >= p.weeks[0] && current <= p.weeks[1] && 'is-current')} style={{ flex: p.weeks[1] - p.weeks[0] + 1 }}><span className="label">{p.short}</span><span className="body-s k-muted">{p.weeks[0] === p.weeks[1] ? `wk ${p.weeks[0]}` : `wk ${p.weeks[0]}–${p.weeks[1]}`}</span></div>)}
      </div>
    </section>
  );
}

// ---------- Mileage chart (single-axis bars, planned vs actual) ----------
export function MileageChart({ weeks: all, status = {}, range = [0, 8], height = 160 }) {
  const { currentWeek } = useKairo();
  const [hover, setHover] = useState(null);
  const weeks = all.filter((w) => w.wk >= range[0] && w.wk <= range[1]);
  const max = 60, W = 100 / weeks.length;
  return (
    <figure className="k-chart" onMouseLeave={() => setHover(null)}>
      <div className="k-chart-legend body-s"><span><i className="k-sw k-sw-done" />Completed</span><span><i className="k-sw k-sw-plan" />Planned</span></div>
      <div className="k-chart-plot" style={{ height }}>
        {[20, 40, 60].map((g) => <div key={g} className="k-chart-grid" style={{ bottom: (g / max) * 100 + '%' }}><span>{g}</span></div>)}
        <div className="k-chart-bars">
          {weeks.map((w) => {
            const t = weekTotals(w, status);
            const cur = w.wk === currentWeek;
            const actual = t.done;
            return (
              <div key={w.wk} className={cx('k-chart-col', cur && 'is-current', hover === w.wk && 'is-hover')} onMouseEnter={() => setHover(w.wk)} onFocus={() => setHover(w.wk)} tabIndex={0}
                aria-label={`Week ${w.wk}: ${actual} of ${w.km} km`}>
                <span className="k-bar-plan" style={{ height: (w.km / max) * 100 + '%' }} />
                {actual ? <span className="k-bar-done" style={{ height: (actual / max) * 100 + '%' }} /> : null}
                {hover === w.wk ? <span className="k-tip"><b>Week {w.wk}</b><br />{actual} / {w.km} km<br /><span className="k-muted">Long {w.longKm} km</span></span> : null}
              </div>
            );
          })}
        </div>
      </div>
      <div className="k-chart-x">{weeks.map((w) => <span key={w.wk} className={w.wk === currentWeek ? 'is-current' : ''}>W{w.wk}</span>)}</div>
    </figure>
  );
}

// ---------- Readiness ----------
export function ReadinessScore({ score, parts = [], compact }) {
  return (
    <div className={cx('k-ready', compact && 'is-compact')}>
      <div className="k-ready-score"><span className="metric-xl k-num">{score ?? '—'}</span><span className="k-muted">/ 100</span></div>
      <div className="k-ready-parts">
        {parts.map(([l, v]) => <Meter key={l} label={l} right={v ?? '—'} value={v ?? 0} thin />)}
      </div>
    </div>
  );
}

// The running → strength → plyo → recovery → marathon chain
export function SystemsChain({ onGo, vertical, values = {} }) {
  const { race } = useKairo();
  const items = [
    ['easy', 'Running', values.running || '—', 'calendar'],
    ['strength', 'Strength', values.strength || '—', 'strength'],
    ['plyo', 'Plyos', values.plyo || '—', 'plyo'],
    ['heart', 'Recovery', values.recovery || 'Check in', 'recovery'],
  ];
  return (
    <div className={cx('k-chain', vertical && 'is-vertical')}>
      {items.map(([ic, l, v, go], i) => (
        <React.Fragment key={l}>
          <button className={cx('k-chain-node', `k-tone-${TYPE_TONE[ic] || 'rest'}`)} onClick={() => onGo && onGo(go)}>
            <span className="k-chain-ic"><Icon name={ic} size={18} stroke={2} /></span>
            <span className="k-chain-l">{l}</span><span className="body-s k-muted k-num">{v}</span>
          </button>
          <span className="k-chain-arrow" aria-hidden="true"><Icon name={vertical ? 'chevD' : 'chevR'} size={14} /></span>
        </React.Fragment>
      ))}
      <button className="k-chain-node is-goal" onClick={() => onGo && onGo('race')}>
        <span className="k-chain-ic"><Icon name="flag" size={18} stroke={2} /></span>
        <span className="k-chain-l">Marathon</span><span className="body-s k-num">{race.estimate ? `Est. ${race.estimate}` : race.target}</span>
      </button>
    </div>
  );
}

// ---------- Recovery ----------
export function ReadinessIndicator({ status, score, reasons = [] }) {
  const map = { ready: ['Ready to train', 'check', 'good', 'Train as planned.'], hold: ['Train easy', 'info', 'caution', 'Swap quality for easy today.'], rest: ['Back off', 'x', 'alert', 'Rest or cross-train.'] };
  if (!status) return (
    <div className="k-readyind is-empty">
      <span className="k-readyind-ic"><Icon name="heart" size={20} stroke={2} /></span>
      <div><div className="k-readyind-l">No check-in yet</div><div className="body-s k-muted">Log sleep, resting HR and the shin hop test to get today's verdict.</div></div>
    </div>
  );
  const [l, ic, tone, sub0] = map[status];
  const sub = reasons.length && status !== 'ready' ? reasons.join(' · ') : sub0;
  return (
    <div className={cx('k-readyind', `is-${tone}`)}>
      <span className="k-readyind-ic"><Icon name={ic} size={20} stroke={2.4} /></span>
      <div><div className="k-readyind-l">{l}</div><div className="body-s k-muted">{sub}</div></div>
      <div className="k-readyind-scale" aria-hidden="true">
        {['rest', 'hold', 'ready'].map((k) => <i key={k} className={k === status ? 'on' : ''} />)}
      </div>
      <span className="metric-m k-num">{score}</span>
    </div>
  );
}

const SORE = ['', 'None', 'Low', 'Moderate', 'High', 'Very high'];
export function RecoveryPanel({ compact }) {
  const { recovery } = useKairo();
  const L = recovery.latest || {};
  const b = recovery.base || {};
  const sleep = L.sleep_minutes != null ? `${Math.floor(L.sleep_minutes / 60)}h ${String(L.sleep_minutes % 60).padStart(2, '0')}m` : '—';
  const tiles = [['Sleep', sleep, '', L.sleep_quality || ''], [compact ? 'Rest HR' : 'Resting HR', L.resting_hr ?? '—', L.resting_hr ? 'bpm' : '', b.rhr ? `Baseline ${Math.round(b.rhr)}` : ''], ['HRV', L.hrv ?? '—', L.hrv ? 'ms' : '', b.hrv ? `7-day avg ${Math.round(b.hrv)}` : ''], ['Soreness', SORE[L.soreness] || '—', '', L.shin_pain != null ? `Shin ${L.shin_pain}/10` : ''], ['Energy', L.energy ?? '—', L.energy ? '/10' : '', ''], ['Stress', L.stress ?? '—', L.stress ? '/10' : '', '']];
  return (
    <div className="k-recov">
      {!compact ? <ReadinessIndicator status={recovery.status} score={recovery.score} reasons={recovery.reasons} /> : null}
      <div className={cx('k-tiles', 'cols-3', compact && 'is-compact')}>
        {(compact ? tiles.slice(0, 3) : tiles).map(([l, v, u, s]) => <StatTile key={l} label={l} value={v} unit={u} sub={s} />)}
      </div>
    </div>
  );
}

// ---------- Fueling (long runs & race) ----------
export function FuelingCard({ session }) {
  const f = session.fuel;
  if (!f) return null;
  return (
    <div className="k-fuel">
      <div className="k-fuel-head"><WorkoutIcon type={session.type} size={36} /><div><div className="label k-eyebrow">Fuel plan</div><div className="title-m">{session.title} — {session.km} km</div></div></div>
      <div className="k-fuel-grid">
        <div><div className="label">Before</div><p className="body-s">{f.before}</p></div>
        <div><div className="label">During</div><p className="body-s">{f.carbs} carbs · {f.gels.length} gels</p></div>
        <div><div className="label">Hydration</div><p className="body-s">{f.fluid}</p></div>
        <div><div className="label">After</div><p className="body-s">{f.after}</p></div>
      </div>
      <div className="k-fuel-line" aria-label="Gel timing">
        <span className="k-fuel-axis" />
        {f.gels.map((g, i) => <span key={i} className="k-fuel-gel" style={{ left: `${(g / (f.gelUnit === 'km' ? 42.2 : session.min)) * 100}%` }}><i /><b className="k-num">{g}{f.gelUnit === 'km' ? '' : '′'}</b></span>)}
        <span className="k-fuel-end body-s k-muted">{f.gelUnit === 'km' ? 'km' : 'min'}</span>
      </div>
    </div>
  );
}

// ---------- Strength / plyo rows ----------
export function ExerciseRow({ name, sets, reps, weight, rest, done = 0, onSet, onWeight, index }) {
  const [w, setW] = useState(weight ?? '');
  useEffect(() => setW(weight ?? ''), [weight]);
  return (
    <div className={cx('k-ex', done >= sets && 'is-done')}>
      <span className="k-ex-n k-num">{index}</span>
      <div className="k-ex-main">
        <div className="k-ex-name">{name}</div>
        <div className="body-s k-muted"><span className="k-num">{sets} × {reps}</span> · rest {rest}</div>
      </div>
      <label className="k-ex-wt">
        <input type="number" inputMode="decimal" step="0.5" value={w} placeholder="BW" onChange={(e) => setW(e.target.value)} onBlur={() => String(w) !== String(weight ?? '') && onWeight && onWeight(w)} aria-label={`${name} weight`} />
        <span>kg</span>
      </label>
      <div className="k-ex-sets" role="group" aria-label="Sets">
        {Array.from({ length: sets }, (_, i) => <button key={i} className={i < done ? 'on' : ''} onClick={() => onSet && onSet(i < done ? i : i + 1)} aria-label={`Set ${i + 1}`}>{i < done ? <Icon name="check" size={13} stroke={2.6} /> : i + 1}</button>)}
      </div>
    </div>
  );
}

export function Toast({ children, action, onDone }) {
  useEffect(() => { const t = setTimeout(() => onDone && onDone(), action ? 5000 : 2600); return () => clearTimeout(t); }, [children]);
  return (
    <div className="k-toast" role="status"><Icon name="check" size={16} stroke={2.4} />{children}
      {action ? <button type="button" className="k-toast-act" onClick={() => { action.onClick(); onDone && onDone(); }}>{action.icon ? <Icon name={action.icon} size={15} stroke={2.2} /> : null}{action.label}</button> : null}
    </div>
  );
}

export function Sheet({ title, children, onClose, className }) {
  return (
    <div className="k-sheet-wrap" onClick={onClose}>
      <div className={cx('k-sheet', className)} onClick={(e) => e.stopPropagation()} role="dialog" aria-label={title}>
        <header className="k-sheet-head"><h3 className="title-m">{title}</h3><Button variant="icon" icon="x" onClick={onClose} aria-label="Close" /></header>
        {children}
      </div>
    </div>
  );
}

export { cx };
