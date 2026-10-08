import React from 'react';
import { Button, Card, StatTile, RaceCountdown, TodayCard, WeekCalendar, MileageChart, ReadinessScore, SystemsChain, ReadinessIndicator, RecoveryPanel } from '../components/ui.jsx';
import { KeyWorkouts, Empty } from '../components/common.jsx';
import { useKairo } from '../state/AppState.jsx';
import { useShell } from '../components/Shell.jsx';
import { sameDay, daysBetween, fmtDate, toISO } from '../lib/dates.js';
import { weekTotals, doneKm } from '../lib/model.js';

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

export function weekStats(week, status) {
  const t = weekTotals(week, status);
  const all = week.days.flatMap((d) => d.sessions);
  const strength = all.filter((s) => s.type === 'upper' || s.type === 'strength');
  const plyo = all.filter((s) => s.type === 'plyo');
  return {
    ...t,
    strengthDone: strength.filter((s) => status[s.id] === 'done').length, strengthTotal: strength.length,
    contactsDone: plyo.filter((s) => status[s.id] === 'done').reduce((a, s) => a + (s.contacts || 0), 0), contactsTotal: plyo.reduce((a, s) => a + (s.contacts || 0), 0),
  };
}

export function trainingLoad(sessions, today) {
  const done = sessions.filter((s) => s.kind === 'run' && s.status === 'done');
  const inRange = (a, b) => done.filter((s) => { const d = daysBetween(s.date, today); return d >= a && d < b; }).reduce((x, s) => x + doneKm(s), 0);
  const acute = inRange(0, 7);
  const chronic = inRange(0, 28) / 4;
  if (!chronic) return { label: acute ? 'Building' : 'No data yet', ratio: null };
  const ratio = acute / chronic;
  return { ratio, label: ratio < 0.8 ? 'Low' : ratio <= 1.3 ? 'Moderate' : 'High' };
}

export default function Dashboard() {
  const { weeks, status, today, currentWeek, race, profile, recovery, readiness, sessions, actions } = useKairo();
  const { layout, weekNo, setWeekNo, go, openSession, share } = useShell();
  const week = weeks[currentWeek];
  const todayDay = weeks.flatMap((w) => w.days).find((d) => sameDay(d.date, today));
  const prev = weeks[currentWeek - 1];
  const ws = weekStats(week, status);
  const prevDone = prev ? weekTotals(prev, status).done : null;
  const change = prev && prev.km ? ((week.km - prev.km) / prev.km) * 100 : null;
  const load = trainingLoad(sessions, today);
  const name = profile?.display_name || 'there';
  const daysToRace = Math.max(0, daysBetween(today, race.date));

  const header = (
    <header className="k-dhead">
      <div>
        <div className="label k-eyebrow">{week.wk === 0 ? 'Baseline week' : `Week ${week.wk} of 21`} · {week.phase.name}</div>
        <h1 className="title-l">{greeting()}, {name}</h1>
        <p className="body k-muted">{race.name} · Target {race.target} · {daysToRace} days to race day</p>
      </div>
    </header>
  );
  const todayCard = todayDay
    ? <TodayCard day={todayDay} status={status} onToggle={actions.toggleDone} onOpen={openSession} onShare={share} compact={layout === 'mobile'} />
    : (
      <section className="k-today is-rest">
        <div className="k-today-head"><span className="label k-eyebrow">Today · {fmtDate(today)}</span></div>
        <h2 className="display-l">{daysBetween(today, weeks[0].start) > 0 ? 'Plan starts soon' : 'Block complete'}</h2>
        <p className="body k-muted">{daysBetween(today, weeks[0].start) > 0 ? `Your baseline week starts ${fmtDate(weeks[0].start)}.` : 'Tokyo is done. Recover, then plan the next one.'}</p>
      </section>
    );
  const weekCal = <WeekCalendar week={weeks[weekNo]} status={status} onOpen={openSession} onToggle={actions.toggleDone} onMove={actions.move} compact={layout === 'mobile'} onPrev={() => setWeekNo(weekNo - 1)} onNext={() => setWeekNo(weekNo + 1)} onJumpToday={() => setWeekNo(currentWeek)} />;
  const longRun = week.days[6].sessions.find((s) => s.type === 'long' || s.type === 'race');
  const mileage = (
    <Card title="Weekly mileage" eyebrow="Volume" action={<Button variant="ghost" size="sm" iconRight="chevR" onClick={() => go('/progress')}>Analytics</Button>}>
      <div className="k-tiles cols-4">
        <StatTile label="This week" value={week.km} unit="km" sub={`${ws.done} km done`} />
        <StatTile label="Last week" value={prevDone ?? '—'} unit={prevDone != null ? 'km' : ''} sub={prev ? `of ${prev.km} planned` : 'Plan starts here'} />
        <StatTile label="Change" value={change == null ? '—' : `${change >= 0 ? '+' : ''}${change.toFixed(0)}%`} sub={week.flags.includes('cutback') ? 'Cutback week' : 'Planned vs last week'} />
        <StatTile label="Long run" value={longRun?.km ?? '—'} unit="km" sub={longRun?.fuel ? `Sun · fuel ${longRun.fuel.carbs}` : 'Sunday'} />
      </div>
      <MileageChart weeks={weeks} status={status} range={[Math.max(0, currentWeek - 5), Math.min(21, Math.max(currentWeek + 3, 8))]} height={layout === 'mobile' ? 120 : 140} />
    </Card>
  );
  const recoveryCard = (
    <Card title={layout === 'desktop' ? 'Load & recovery' : 'Recovery & load'} eyebrow={layout === 'desktop' ? 'Body metrics' : 'This morning'} action={<Button variant="ghost" size="sm" iconRight="chevR" onClick={() => go('/recovery')}>{recovery.latest ? 'Open' : 'Check in'}</Button>}>
      {recovery.latest ? <RecoveryPanel compact /> : <Empty icon="heart" title="No check-in today">Sleep, resting HR and the shin hop test take 30 seconds.</Empty>}
      <div className="k-loadrow"><span className="label k-muted">Training load</span><span className="k-pill">{load.label}</span>{load.ratio ? <span className="body-s k-muted">Acute:chronic {load.ratio.toFixed(2)}{load.ratio > 1.3 ? ' — ease off' : ' — in the safe band'}</span> : null}</div>
    </Card>
  );
  const readinessCard = (
    <Card title="Marathon readiness" eyebrow={`Toward ${race.target}`} action={<Button variant="ghost" size="sm" iconRight="chevR" onClick={() => go('/race')}>Race</Button>}>
      <ReadinessScore score={readiness.score} parts={readiness.parts} compact />
    </Card>
  );
  const upcoming = <Card title="Upcoming key workouts" eyebrow="Next up"><KeyWorkouts /></Card>;
  const chainValues = {
    running: `${ws.done} / ${ws.planned} km`, strength: `${ws.strengthDone} / ${ws.strengthTotal} sessions`,
    plyo: ws.contactsTotal ? `${ws.contactsDone} / ${ws.contactsTotal} contacts` : 'None this week',
    recovery: recovery.status ? `${{ ready: 'Ready', hold: 'Easy', rest: 'Back off' }[recovery.status]} · ${recovery.score}` : 'Check in',
  };
  const chain = <Card title="How this week builds race day" eyebrow="The system"><SystemsChain onGo={(k) => go(k === 'calendar' ? '/calendar' : `/${k}`)} values={chainValues} /></Card>;
  const recoveryMini = (
    <Card eyebrow="This morning" title="Recovery" action={<Button variant="ghost" size="sm" iconRight="chevR" onClick={() => go('/recovery')}>{recovery.latest ? 'Open' : 'Check in'}</Button>}>
      <ReadinessIndicator status={recovery.status} score={recovery.score} reasons={recovery.reasons} />
    </Card>
  );

  if (layout === 'desktop') {
    return (
      <div className="k-dash">
        {header}
        <div className="k-dash-3">
          <div className="k-dash-main">{todayCard}</div>
          <aside className="k-dash-rail"><RaceCountdown onOpen={() => go('/race')} />{recoveryMini}</aside>
        </div>
        {weekCal}
        <div className="k-dash-3">
          <div className="k-dash-main">{mileage}{chain}</div>
          <aside className="k-dash-rail">{recoveryCard}{readinessCard}{upcoming}</aside>
        </div>
      </div>
    );
  }
  if (layout === 'tablet') {
    return (
      <div className="k-dash">
        {header}
        <div className="k-two"><RaceCountdown onOpen={() => go('/race')} />{todayCard}</div>
        {weekCal}{mileage}
        <div className="k-two">{recoveryCard}{readinessCard}</div>
        <div className="k-two">{upcoming}{chain}</div>
      </div>
    );
  }
  return (
    <div className="k-dash">
      {header}
      <RaceCountdown variant="strip" onOpen={() => go('/race')} />
      {todayCard}{weekCal}{mileage}{recoveryCard}{readinessCard}{upcoming}{chain}
    </div>
  );
}
