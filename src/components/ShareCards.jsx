// The 13 "Share today" cards. Authored at 270 px wide (×4 on export = 1080 px); styles in styles/share.css.
import React, { forwardRef } from 'react';
import { Icon } from './icons.jsx';
import { cx } from './ui.jsx';
import { FORMATS, hexFor } from '../lib/share.js';

const tint = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };

function Brand() {
  return <span className="ks-brand"><span className="ks-mark"><i /><i /><i /></span>Kairo</span>;
}
function Head({ d, show, right }) {
  return (
    <div className="ks-head">
      {show.mark ? <Brand /> : null}
      {show.name && d.name ? <span className="ks-name">{d.name}</span> : null}
      {right ? <span className="ks-label">{right}</span> : null}
    </div>
  );
}
const Foot = ({ children, right }) => <div className="ks-foot"><span>{children}</span>{right ? <span>{right}</span> : null}</div>;
const Check = () => <i className="ks-ck"><Icon name="check" size={9} stroke={3.4} /></i>;

function Stats({ items, className }) {
  if (!items.length) return null;
  return (
    <div className={cx('ks-stats', className)} style={{ gridTemplateColumns: `repeat(${items.length}, 1fr)` }}>
      {items.map(([l, v, u]) => <div key={l}><div className="ks-l">{l}</div><div className="ks-v">{v}{u ? <small>{u}</small> : null}</div></div>)}
    </div>
  );
}

/** Big number for the session: distance, else time, else duration / "Rest". */
function heroOf(d, show) {
  if (d.isRun && (show.distance || !(show.time && d.time))) return { v: d.km ?? 0, u: 'km', isKm: true };
  if (show.time && d.time) return { v: d.time, u: '' };
  return d.hero;
}
/** Logged numbers only — pace is never invented. Falls back to plan facts when nothing is logged. */
function metrics(d, show, hero) {
  const out = [];
  if (d.isRun && show.distance && !hero.isKm) out.push(['Distance', d.km, 'km']);
  if (show.time && d.time && hero.v !== d.time) out.push(['Time', d.time]);
  if (show.pace && d.pace) out.push(['Pace', d.pace, '/km']);
  if (show.hr && d.hr) out.push(['Avg HR', d.hr, 'bpm']);
  if (!out.length) {
    if (d.zone) out.push(['Zone', d.zone]);
    out.push(['Week', d.week.wk, `/${d.block.last}`]);
    if (show.countdown) out.push(['Race', d.race.days, 'd']);
  }
  return out.slice(0, 3);
}

// ---------------------------------------------------------------- cards
function Session({ d, show }) {
  const hero = heroOf(d, show);
  return (
    <>
      <Head d={d} show={show} right={d.dateLabel} />
      <h3 className="ks-h3">{d.title}</h3>
      <span className="ks-tag" style={{ background: tint(d.color, 0.16), color: d.color }}>{d.typeLabel}{d.zone ? ` · ${d.zone}` : ''}</span>
      <div className="ks-hero ks-session-km">{hero.v}{hero.u ? <small>{hero.u}</small> : null}</div>
      {d.isDone ? <span className="ks-done"><Check />Done{d.isRun && d.plannedKm ? ` · planned ${d.plannedKm} km` : ''}</span> : null}
      <Stats items={metrics(d, show, hero)} className="ks-gap-l" />
      {show.notes && d.notes ? <p className="ks-notes ks-tall">“{d.notes}”</p> : null}
      {show.week ? <div className="ks-strip ks-tall">{d.week.days.map((x, i) => <span key={i} style={{ background: x.done ? hexFor(x.type) : undefined }} />)}</div> : null}
      <div className="ks-countline ks-tall2">
        {show.week ? <>{d.week.label} · {d.week.doneKm} / {d.week.plannedKm} km<br /></> : null}
        {show.countdown ? <><b>{d.race.days}</b> days to {d.race.name}</> : null}
      </div>
      <Foot>Train for the day. Build for race day.</Foot>
    </>
  );
}

function Grid({ d, show }) {
  const hero = heroOf(d, show);
  const tiles = metrics(d, show, hero).filter(([l]) => !(l === 'Race'));
  if (show.countdown) tiles.push([`${d.race.short} in`, d.race.days, ' d', true]);
  return (
    <>
      <Head d={d} show={show} right={d.dateLabel} />
      <div className="ks-h3">{d.title}</div>
      <div className="ks-tiles">
        <div className="ks-t is-hero" style={{ background: d.color }}><span className="ks-l">{hero.isKm ? 'Distance' : hero.u === 'min' ? 'Duration' : d.typeLabel}</span><span className="ks-v">{hero.v}{hero.u ? <small> {hero.u}</small> : null}</span></div>
        {tiles.slice(0, 4).map(([l, v, u, acc], i) => <div key={l} className={cx('ks-t', i >= 2 && 'ks-tall')}><span className="ks-l">{l}</span><span className="ks-v" style={acc ? { color: 'var(--c-accent)' } : undefined}>{v}{u ? <small>{u}</small> : null}</span></div>)}
      </div>
      {show.notes && d.notes ? <p className="ks-notes ks-tall">“{d.notes}”</p> : null}
      <Foot>{show.week ? d.week.label : d.typeLabel}{d.zone ? ` · ${d.zone}` : ''}</Foot>
    </>
  );
}

// Condensed caps run ~0.5em per glyph; shrink a poster line so it fits the 238 px column.
const fit = (t, px) => Math.min(px, Math.floor(238 / (String(t).length * 0.5)));

function Poster({ d, show }) {
  const hero = heroOf(d, show);
  const meta = [show.time && d.time, show.pace && d.pace && `${d.pace} /km`, show.hr && d.hr && `${d.hr} bpm`].filter(Boolean);
  return (
    <>
      <Head d={d} show={show} right={d.dateShort} />
      <div className="ks-stack">
        {[[hero.v, 96], [hero.u || d.typeLabel, 96, 'is-outline'], [d.typeLabel.split(' ')[0], 58, null, d.color], [d.isDone ? 'Done.' : 'Next.', 58, 'is-accent']].map(([t, px, cls, color], i) => (
          <div key={i} className={cls || undefined} style={{ color, fontSize: `calc(${fit(t, px)}px * var(--hs))` }}>{t}</div>
        ))}
      </div>
      {meta.length ? <div className="ks-meta">{meta.map((m) => <span key={m}>{m}</span>)}</div> : null}
      <Foot>{show.countdown ? `${d.race.days} days to ${d.race.short}` : d.dateLabel}</Foot>
    </>
  );
}

function Intervals({ d, show }) {
  const easy = hexFor('easy');
  const prof = d.reps
    ? [[18, easy, 3], ...Array.from({ length: d.reps.n }, (_, i) => [...(i ? [[24, easy, 1]] : []), [76 + (i % 2) * 6, d.color, 4]]).flat(), [18, easy, 2]]
    : d.steps.map((p, i) => [i === 1 || d.steps.length === 1 ? 78 : 22, i === 1 || d.steps.length === 1 ? d.color : easy, i === 1 ? 6 : 2]);
  const tiles = d.reps ? Array.from({ length: d.reps.n }, (_, i) => [`Rep ${i + 1}`, d.reps.each, d.targetPace]) : d.steps.slice(0, 3).map((p) => [p.label, p.zone, p.text]);
  const items = [d.isRun && show.distance ? ['Total', d.km ?? d.plannedKm, 'km'] : null, d.targetPace ? ['Target', d.targetPace.split('–')[0], d.targetPace.includes('–') ? `–${d.targetPace.split('–')[1]}` : ''] : null, show.hr && d.hr ? ['Avg HR', d.hr] : show.time && d.time ? ['Time', d.time] : null].filter(Boolean);
  return (
    <>
      <Head d={d} show={show} right={d.dateLabel} />
      <h3 className="ks-h3">{d.typeLabel}{d.detail && d.detail !== d.typeLabel ? <><br />{d.detail}</> : null}</h3>
      <span className="ks-tag" style={{ background: tint(d.color, 0.16), color: d.color, marginTop: 8 }}>{d.isDone ? 'Done' : 'Planned'}{d.zone ? ` · ${d.zone}` : ''}</span>
      <div className="ks-prof">{prof.map(([h, c, f], i) => <i key={i} style={{ flex: f, height: `${h}%`, background: c }} />)}</div>
      <div className={cx('ks-reps', 'ks-tall')}>
        {tiles.map(([l, b, sub]) => <div key={l} className="ks-rep"><div className="ks-l">{l}</div><b>{b}</b><span>{sub}</span></div>)}
      </div>
      <Stats items={items} className="ks-gap-s ks-tall2" />
      <Foot>{d.week.label} · {d.week.phase.name}</Foot>
    </>
  );
}

function Photo({ d, show }) {
  const hero = heroOf(d, show);
  const line = [show.time && d.time && [d.time, 'Time'], show.pace && d.pace && [`${d.pace}/km`, 'Pace'], show.hr && d.hr && [d.hr, 'Avg HR'], show.countdown && [d.race.days, `Days to ${d.race.short}`]].filter(Boolean).slice(0, 3);
  return (
    <div className="ks-sticker">
      <div className="ks-big">{hero.v}{hero.u ? <small> {hero.u}</small> : null}</div>
      {line.length ? <div className="ks-line">{line.map(([v, l]) => <span key={l}>{v}<small>{l}</small></span>)}</div> : null}
      {show.mark || (show.name && d.name) ? <div className="ks-sticker-brand">{show.mark ? <Brand /> : null}{show.name && d.name ? <span className="ks-name">{d.name}</span> : null}</div> : null}
    </div>
  );
}

function Clear({ d, show }) {
  const hero = heroOf(d, show);
  const row = [show.time && d.time && [d.time, 'Time'], show.pace && d.pace && [d.pace, '/km'], show.hr && d.hr && [d.hr, 'bpm'], !d.time && show.countdown && [d.race.days, `Days to ${d.race.short}`]].filter(Boolean);
  return (
    <div className="ks-stk">
      <div className="ks-big">{hero.v}{hero.u ? <span> {hero.u}</span> : null}</div>
      {row.length ? <div className="ks-row3">{row.map(([v, l]) => <span key={l}>{v}<small>{l}</small></span>)}</div> : null}
      {show.mark ? <Brand /> : null}
      {show.name && d.name ? <span className="ks-name">{d.name}</span> : null}
    </div>
  );
}

function Count({ d, show }) {
  return (
    <>
      <Head d={d} show={show} right={`${d.race.short} · ${d.race.dateLabel}`} />
      <div className="ks-hero ks-count-big">{d.race.days}</div>
      <div className="ks-unit">days to<br />{d.race.name}</div>
      <div className="ks-today ks-tall2">
        <span className="ks-ic" style={{ background: d.color }}>{d.isDone ? <Icon name="check" size={14} stroke={3} /> : <Icon name={d.type} size={14} stroke={2.4} />}</span>
        <div><b>{d.isToday ? 'Today' : d.dateLabel} · {d.title}{d.isRun && show.distance ? ` ${d.km} km` : ''}</b><br /><span className="ks-sub">{d.week.label} · target {d.race.target.toLowerCase()}</span></div>
      </div>
      {show.week ? <div className="ks-bars ks-tall">{d.block.vols.map((v, i) => <i key={i} className={cx(i < d.block.wk && 'is-done', i === d.block.wk && 'is-now')} style={{ height: `${(v / Math.max(...d.block.vols)) * 100}%` }} />)}</div> : null}
      <Foot right="kairo">Week {d.week.wk} of {d.block.last}</Foot>
    </>
  );
}

function Bib({ d, show }) {
  return (
    <>
      <div className="ks-bib-top">{show.mark ? <Brand /> : <span />}<span className="ks-bib-race">{d.race.name.toUpperCase()} {d.race.dateLabel.slice(-4)}</span></div>
      <div className="ks-holes"><i /><i /></div>
      <div className="ks-hero ks-bibn">{d.race.days}</div>
      <div className="ks-cap">days to the start line</div>
      <div className="ks-band"><span>Target {d.race.target.toLowerCase()}</span><span>{d.race.pace}/km</span></div>
      <div className="ks-bib-today ks-tall2">{d.isToday ? 'Today' : d.dateLabel}: <b>{d.title}{d.isRun && show.distance ? ` ${d.km} km` : ''}</b>{d.isDone ? ' ✓' : ''}<br />{d.week.label} of {d.block.last} · {d.week.phase.name}{show.name && d.name ? <><br />{d.name}</> : null}</div>
      <div className="ks-tear"><span>{d.race.longDate}</span><span>{d.race.short}</span></div>
    </>
  );
}

function Week({ d, show }) {
  const w = d.week;
  const total = w.days.reduce((a, x) => a + x.km, 0) || 1;
  return (
    <>
      <Head d={d} show={show} right={w.range} />
      <h3 className="ks-h3">{w.label}</h3><span className="ks-sub ks-clamp ks-tall">{w.phase.name} · {w.note}</span>
      <div className="ks-days">
        {w.days.map((x, i) => (
          <div key={i} className={cx('ks-day', x.today && 'is-today')}>
            <span className="ks-d">{x.letter}</span>
            <span className="ks-sw" style={{ height: x.km ? 10 + Math.min(x.km, 30) * 2 : 8, background: hexFor(x.type), opacity: x.done || x.rest ? 1 : 0.35 }} />
            <span className="ks-dkm">{x.km || '—'}</span>
            {x.rest ? <span className="ks-dck is-rest" /> : x.done ? <span className="ks-dck"><Icon name="check" size={8} stroke={3.4} /></span> : <span className="ks-dck is-no" />}
          </div>
        ))}
      </div>
      <div className="ks-tot"><b>{w.doneKm}</b><span className="ks-sub">/ {w.plannedKm} km</span></div>
      <div className="ks-wbar ks-tall2">{w.days.map((x, i) => (x.km ? <span key={i} style={{ flex: x.km / total, background: hexFor(x.type), opacity: x.done ? 1 : 0.3 }} /> : null))}</div>
      <Stats className="ks-gap-m ks-tall" items={[['Sessions', w.doneSessions, `/${w.sessions}`], ['Strength', w.gymDone, `/${w.gymTotal}`], ...(d.next ? [['Next', <span key="n" className="ks-next">{d.next.title}<br /><small>{d.next.day}</small></span>]] : [])]} />
      <Foot>{show.countdown ? `${d.race.name} · ${d.race.days} days` : w.phase.name}</Foot>
    </>
  );
}

function Block({ d, show }) {
  const b = d.block; const max = Math.max(...b.vols);
  return (
    <>
      <Head d={d} show={show} right="Training block" />
      <div className="ks-hero ks-wk">Week {b.wk}<small> / {b.last}</small></div>
      <div className="ks-sub ks-tall2" style={{ marginTop: 4 }}>{d.week.phase.name} · {d.week.plannedKm} km planned · peak {b.peakKm} km in week {b.peakWk}</div>
      <div className="ks-vols">{b.vols.map((v, i) => <i key={i} className={cx(i < b.wk && 'is-done', i === b.wk && 'is-now')} style={{ height: `${(v / max) * 100}%` }} />)}</div>
      <div className="ks-ph">{b.phases.map((p) => <span key={p.short} className={cx(p.now && 'is-now')} style={{ flex: p.span }}>{p.short}</span>)}</div>
      <Stats className="ks-gap-l ks-tall" items={[['Done', b.doneKm, 'km'], ['Block', b.plannedKm, 'km'], ...(show.countdown ? [['Race', d.race.days, 'days']] : [])]} />
      <Foot>{d.race.name} · {d.race.target.toLowerCase()}</Foot>
    </>
  );
}

function Streak({ d, show }) {
  const k = d.streak;
  return (
    <>
      <Head d={d} show={show} right="Last 4 weeks" />
      <div className="ks-hero ks-streak-big">{k.done}</div>
      <div className="ks-unit">of {k.total} sessions done</div>
      <div className="ks-dh">{['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((x, i) => <span key={i}>{x}</span>)}</div>
      <div className="ks-dots">{k.cells.map((c, i) => <i key={i} className={`is-${c}`} />)}</div>
      <Stats className="ks-gap-m ks-tall" items={[['Run km', k.runKm], ['Longest', k.longest, 'km'], ['In a row', k.inARow, 'days']]} />
      <Foot>Rest days count. Consistency wins.</Foot>
    </>
  );
}

function Month({ d, show }) {
  const m = d.month;
  return (
    <>
      <Head d={d} show={show} right="Monthly recap" />
      <h3 className="ks-h3">{m.name}</h3>
      <div className="ks-cal">{m.cells.map((c, i) => (c ? <i key={i}>{c.color && (c.done || c.future) ? <b style={{ background: c.color, opacity: c.done ? 1 : 0.25 }} /> : null}</i> : <i key={i} className="is-empty" />))}</div>
      <div className="ks-tot"><b>{m.km}</b><span className="ks-sub">km run</span></div>
      <Stats className="ks-gap-s ks-tall2" items={[['Runs', m.runs], ['Gym', m.gym], ...(m.vsPrev != null ? [[`vs ${m.prevName}`, <span key="v" style={{ color: m.vsPrev >= 0 ? 'var(--c-good)' : undefined }}>{m.vsPrev >= 0 ? '+' : ''}{m.vsPrev}%</span>]] : [])]} />
      <Foot>{d.week.phase.name}{show.countdown ? ` · ${d.race.short} in ${d.race.days} days` : ''}</Foot>
    </>
  );
}

function Milestone({ d, show }) {
  const m = d.milestone; const x = m.subject;
  return (
    <>
      <Head d={d} show={show} right={x ? x.date : d.dateLabel} />
      <span className="ks-kicker">★ {m.isNew ? 'New longest run' : 'Longest run so far'}</span>
      <h3 className="ks-mile-h">{x ? <>{x.km} km.<br />{m.isNew ? 'Further than ever this block.' : 'The longest of the block so far.'}</> : <>First long run<br />still to come.</>}</h3>
      {m.bars.length ? (
        <div className="ks-vs ks-tall2">{m.bars.map((b, i) => <div key={i} className={cx('ks-vr', b.now && 'is-now')}><span>{b.label}</span><i style={{ width: `${b.pct}%` }} /><span>{b.km}</span></div>)}</div>
      ) : null}
      {x ? <Stats className="ks-gap-l ks-tall" items={[...(show.time && x.time ? [['Time', x.time]] : []), ...(show.pace && x.pace ? [['Pace', x.pace, '/km']] : []), ['Week', x.wk, `/${d.block.last}`]]} /> : null}
      <Foot>{x ? x.title : d.week.label}{show.countdown ? ` · ${d.race.days} days to go` : ''}</Foot>
    </>
  );
}

const BODY = { session: Session, grid: Grid, poster: Poster, intervals: Intervals, photo: Photo, clear: Clear, count: Count, bib: Bib, week: Week, block: Block, streak: Streak, month: Month, milestone: Milestone };
// Cards whose look the Style switch doesn't change.
const FIXED = { bib: 'bib', clear: 'clear', photo: 'photo' };

/** One share card. `photo` is a data URL used by the Photo card and the Photo style. */
export const ShareCard = forwardRef(function ShareCard({ kind, d, prefs, photo }, ref) {
  const fmt = FORMATS[prefs.format] || FORMATS.story;
  const Body = BODY[kind] || Session;
  // Countdown is the lime card by default; the Lime style flips it to black.
  const style = FIXED[kind] || (kind === 'count' ? ({ black: 'lime', lime: 'black' }[prefs.style] || prefs.style) : prefs.style);
  const withPhoto = style === 'photo';
  return (
    <div ref={ref} className={cx('ks-card', `ks-${kind}`, `ks-st-${style}`, `ks-f-${prefs.format}`)} style={{ width: fmt.w, height: fmt.h }}>
      {withPhoto ? (photo ? <img className="ks-photo-img" src={photo} alt="" /> : <span className="ks-photo-hint">Your photo</span>) : null}
      {withPhoto ? <span className="ks-photo-shade" /> : null}
      <Body d={d} show={prefs.show} />
    </div>
  );
});
