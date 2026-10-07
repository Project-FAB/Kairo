import React, { useState } from 'react';
import { Icon } from '../components/icons.jsx';
import { Card, StatTile, BlockTimeline, cx } from '../components/ui.jsx';
import { ScreenHead } from '../components/common.jsx';
import { useKairo } from '../state/AppState.jsx';
import { useShell } from '../components/Shell.jsx';
import { PHASES, LAST_WEEK } from '../lib/plan.js';
import { weekStats } from './Dashboard.jsx';

export default function Plan() {
  const { weeks, status, currentWeek, race } = useKairo();
  const { setWeekNo, go } = useShell();
  const cur = weeks[currentWeek];
  const [open, setOpen] = useState(cur.phase.id);
  const openWeek = (wk) => { setWeekNo(wk); go('/calendar'); };
  const ws = weekStats(cur, status);
  return (
    <div className="k-screen">
      <ScreenHead eyebrow={`${race.name} · ${race.date.getFullYear()}`} title="Training plan" sub="Four phases, one job each. Running is the priority; everything else is dosed around the long run." />
      <Card title="Volume across the block" eyebrow="Weekly km · tap a week"><BlockTimeline weeks={weeks} status={status} current={currentWeek} onPickWeek={openWeek} /></Card>
      <div className="k-phases">
        {PHASES.map((p, i) => {
          const isCur = cur.wk >= p.weeks[0] && cur.wk <= p.weeks[1];
          const done = cur.wk > p.weeks[1];
          return (
            <section key={p.id} className={cx('k-phase', isCur && 'is-current', done && 'is-done', open === p.id && 'is-open')}>
              <button className="k-phase-head" onClick={() => setOpen(open === p.id ? null : p.id)}>
                <span className="k-phase-dot">{done ? <Icon name="check" size={14} stroke={2.6} /> : i}</span>
                <span className="k-phase-name"><span className="label k-muted">{p.dates} · {p.weeks[0] === p.weeks[1] ? `week ${p.weeks[0]}` : `weeks ${p.weeks[0]}–${p.weeks[1]}`}</span><span className="title-m">{p.name}</span></span>
                <span className="k-phase-km"><b className="k-num">{p.km}</b> km/wk</span>
                {isCur ? <span className="k-pill is-accent">Now · week {cur.wk}</span> : null}
                <Icon name="chevD" size={18} className="k-phase-chev" />
              </button>
              {open === p.id ? (
                <div className="k-phase-body">
                  <p className="body">{p.goal}</p>
                  <div className="k-tiles cols-4">
                    <StatTile label="Weekly distance" value={p.km} unit="km" />
                    <StatTile label="Long run" value={p.long} />
                    <StatTile label="Strength" value={p.strength.split(' · ')[0]} sub={p.strength.split(' · ')[1]} />
                    <StatTile label="Plyometrics" value={p.plyo.split(' · ')[0]} sub={p.plyo.split(' · ')[1]} />
                  </div>
                  {isCur ? (
                    <div className="k-phase-now">
                      <div className="label k-eyebrow">This week · week {cur.wk}</div>
                      <div className="k-tiles cols-4">
                        <StatTile label="Weekly distance" value={cur.km} unit="km" sub={`${ws.done} km done`} />
                        <StatTile label="Long run" value={cur.longKm} unit="km" />
                        <StatTile label="Key workout" value={cur.key} />
                        <StatTile label="Strength" value={`${ws.strengthDone} / ${ws.strengthTotal}`} unit="sessions" />
                      </div>
                    </div>
                  ) : null}
                  <div className="k-phase-weeks">
                    {weeks.filter((w) => w.wk >= p.weeks[0] && w.wk <= p.weeks[1]).map((w) => (
                      <button key={w.wk} className={cx('k-pweek', w.wk === cur.wk && 'is-current')} onClick={() => openWeek(w.wk)}>
                        <span className="label">W{w.wk}</span><b className="k-num">{w.wk === LAST_WEEK ? 'Race' : `${w.km} km`}</b><span className="body-s k-muted">Long {w.longKm} · {w.key}</span>
                        {w.flags ? <span className="k-pweek-flag body-s">{w.flags.split(' ').map((f) => f[0].toUpperCase() + f.slice(1)).join(' · ')}</span> : null}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </section>
          );
        })}
        <section className="k-phase is-race">
          <div className="k-phase-head"><span className="k-phase-dot"><Icon name="flag" size={14} stroke={2.4} /></span><span className="k-phase-name"><span className="label k-muted">{race.dateLabel}</span><span className="title-m">Race day — {race.name}</span></span><span className="k-phase-km"><b className="k-num">42.2</b> km</span></div>
        </section>
      </div>
    </div>
  );
}
