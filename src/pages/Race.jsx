import React from 'react';
import { Card, RaceCountdown, FuelingCard, StatusMark, cx } from '../components/ui.jsx';
import { ScreenHead } from '../components/common.jsx';
import { useKairo } from '../state/AppState.jsx';
import { useShell } from '../components/Shell.jsx';
import { RACE_GOALS } from '../lib/plan.js';
import { sessionState } from '../lib/model.js';
import { fmtDate } from '../lib/dates.js';

const CHECKPOINTS = [
  { wk: 8, day: 1, title: 'Threshold retest', target: '10–20 s/km faster', note: 'Supports the realistic goal' },
  { wk: 14, day: 1, title: '10 km time trial', target: '58–60 min', note: 'Realistic · ≤ 55 min = stretch' },
  { wk: 16, day: 6, title: '32 km race rehearsal', target: '3:30 cap', note: 'Kit, shoes, fuel, breakfast' },
  { wk: 18, day: 6, title: '16 km at marathon pace', target: '6:25–6:35', note: 'HR ≤ 90% LTHR · RPE ≤ 6' },
];

export function RaceBody() {
  const { weeks, status, today } = useKairo();
  const { openSession } = useShell();
  const race = weeks[21].days[6].sessions.find((s) => s.type === 'race') || weeks[21].days[6].sessions[0];
  return (
    <>
      <div className="k-two k-two-wide">
        <RaceCountdown variant="hero" />
        <Card title="Goal options" eyebrow="Decided after week 18">
          <div className="k-goals">{RACE_GOALS.map((g) => <div key={g.tier} className={cx('k-goal', g.tier === 'Realistic' && 'is-main')}><div className="k-goal-top"><span className="label">{g.tier}</span><b className="metric-m k-num">{g.time}</b><span className="body-s k-muted k-num">{g.pace}</span></div><p className="body-s k-muted">{g.proof}</p></div>)}</div>
        </Card>
      </div>
      <div className="k-two">
        <Card title="Checkpoints" eyebrow="Is the goal still right?">
          <div className="k-results">
            {CHECKPOINTS.map((c) => {
              const s = weeks[c.wk].days[c.day].sessions.find((x) => x.kind === 'run');
              const st = s ? sessionState(s, today, status) : 'planned';
              return (
                <button key={c.title} className="k-result k-result-btn" onClick={() => s && openSession(s)}>
                  <StatusMark status={st === 'today' ? 'planned' : st} size={22} />
                  <div><div className="k-sline-title">Week {c.wk} · {c.title}</div><div className="body-s k-muted">{s ? fmtDate(s.date) : ''} · {c.note}</div></div>
                  <b className="k-num">{c.target}</b>
                </button>
              );
            })}
          </div>
        </Card>
        <Card title="Race-day pacing" eyebrow="Finish strong">
          <ol className="k-steps">{race.steps.map((p, i) => <li key={i} className="k-step"><span className="k-step-dot">{i + 1}</span><div className="k-step-main"><div className="label k-muted">{p.label}</div><div className="k-step-text">{p.text}</div></div><span className="k-zone">{p.zone}</span></li>)}</ol>
        </Card>
      </div>
      {race.fuel ? <Card><FuelingCard session={race} /></Card> : null}
    </>
  );
}

export default function Race() {
  const { race } = useKairo();
  return (
    <div className="k-screen">
      <ScreenHead eyebrow="Race countdown" title={race.name} sub={`${race.dateLabel} · Target ${race.target} · goal pace ${race.targetPace}/km`} />
      <RaceBody />
    </div>
  );
}
