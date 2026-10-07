import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Icon } from '../components/icons.jsx';
import { Button, Card, Segmented, WeekCalendar, MonthCalendar, BlockTimeline, CalendarLegend } from '../components/ui.jsx';
import { ScreenHead } from '../components/common.jsx';
import { useKairo } from '../state/AppState.jsx';
import { useShell } from '../components/Shell.jsx';
import { daysBetween } from '../lib/dates.js';
import { RaceBody } from './Race.jsx';

function WeekFocus({ week }) {
  const { openSession } = useShell();
  const ph = week.phase;
  const sun = week.days[6].sessions[0];
  return (
    <div className="k-grid-3">
      <Card eyebrow="Week focus" title={week.key}>
        <p className="body-s k-muted">{ph.goal}</p>
        <div className="k-kv"><span>Long run</span><b>{week.longKm} km · {week.longNote}</b></div>
        <div className="k-kv"><span>Strength</span><b>{ph.strength}</b></div>
        <div className="k-kv"><span>Plyos</span><b>{ph.plyo}</b></div>
      </Card>
      <Card eyebrow="Rules this week" title="Protect the long run">
        <ul className="k-list body-s">
          <li>Hard day Tuesday: quality run, plyos and heavy legs together.</li>
          <li>72 h between last hard leg stress and Sunday.</li>
          <li>{week.wk <= 11 ? 'Taekwondo Saturday counts as a leg day — rest Friday.' : 'Saturday is rest or a 20–30 min shakeout if shins are 0/10.'}</li>
        </ul>
      </Card>
      <Card eyebrow="Fuel" title={`Sunday · ${sun?.km ?? week.longKm} km`}>
        <p className="body-s k-muted">{sun?.fuel ? `${sun.fuel.carbs} · gels at ${sun.fuel.gels.join(', ')} ${sun.fuel.gelUnit === 'km' ? 'km' : 'min'}` : 'Under 75 min — water only.'}</p>
        {sun && !sun.synthetic ? <Button variant="secondary" size="sm" iconRight="chevR" onClick={() => openSession(sun)}>Long run fuel plan</Button> : null}
      </Card>
    </div>
  );
}

export default function Calendar() {
  const { weeks, status, today, currentWeek, plan, actions } = useKairo();
  const { layout, weekNo, setWeekNo, openSession } = useShell();
  const [params, setParams] = useSearchParams();
  const view = params.get('view') || 'Week';
  const setView = (v) => setParams(v === 'Week' ? {} : { view: v }, { replace: true });
  const [ym, setYm] = useState([today.getFullYear(), today.getMonth()]);
  const shiftMonth = (n) => setYm(([y, m]) => { const d = new Date(y, m + n, 1); return [d.getFullYear(), d.getMonth()]; });
  const mobile = layout === 'mobile';
  const week = weeks[weekNo];
  return (
    <div className="k-screen">
      <ScreenHead eyebrow="Plan your training" title="Calendar" actions={<Segmented options={['Week', 'Month', 'Block', 'Race']} value={view} onChange={setView} />} />
      {view === 'Week' ? (
        <>
          <WeekCalendar week={week} status={status} onOpen={openSession} onToggle={actions.toggleDone} compact={mobile} onPrev={() => setWeekNo(weekNo - 1)} onNext={() => setWeekNo(weekNo + 1)} onJumpToday={() => setWeekNo(currentWeek)} />
          {!mobile ? <CalendarLegend /> : null}
          <WeekFocus week={week} />
        </>
      ) : null}
      {view === 'Month' ? <MonthCalendar weeks={weeks} year={ym[0]} month={ym[1]} status={status} compact={mobile} onPrev={() => shiftMonth(-1)} onNext={() => shiftMonth(1)}
        onOpenDay={(d) => { setWeekNo(Math.floor(daysBetween(weeks[0].start, d) / 7)); setView('Week'); }} /> : null}
      {view === 'Block' ? (
        <Card title="Training block" eyebrow="Baseline + 21 weeks · tap a week to open it">
          <BlockTimeline weeks={weeks} status={status} current={currentWeek} onPickWeek={(wk) => { setWeekNo(wk); setView('Week'); }} />
          <div className="k-btl-legend body-s k-muted"><span><Icon name="test" size={13} /> Test week</span><span><Icon name="star" size={13} /> Peak</span><span><i className="k-sw k-sw-done" /> Completed</span><span><i className="k-sw k-sw-plan" /> Planned</span><span>Dashed bars = cutback weeks</span></div>
        </Card>
      ) : null}
      {view === 'Race' ? <RaceBody /> : null}
    </div>
  );
}
