import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Icon, WorkoutIcon } from '../components/icons.jsx';
import { Button, Card, Segmented, Meter, ExerciseRow, DoneToggle, StatusMark, cx } from '../components/ui.jsx';
import { ScreenHead, Empty, SessionActions } from '../components/common.jsx';
import { useKairo } from '../state/AppState.jsx';
import { useShell } from '../components/Shell.jsx';
import { STRENGTH, PLYO, plyoFor } from '../lib/plan.js';
import { daysBetween, fmtDate, fmtClock, dow, parseISO } from '../lib/dates.js';

/** The session to show: ?session=id, else today's, else the next upcoming one matching `match`. */
function pickSession(sessions, today, id, match) {
  if (id) { const s = sessions.find((x) => x.id === id); if (s) return s; }
  const list = sessions.filter(match);
  return list.find((s) => daysBetween(today, s.date) === 0) || list.find((s) => daysBetween(today, s.date) > 0) || list[list.length - 1] || null;
}

function useRestTimer() {
  const [rest, setRest] = useState(0);
  const [total, setTotal] = useState(0);
  useEffect(() => { if (rest <= 0) return undefined; const i = setTimeout(() => setRest((r) => r - 1), 1000); return () => clearTimeout(i); }, [rest]);
  const start = (sec) => { setTotal(sec); setRest(sec); };
  return { rest, total, start, skip: () => setRest(0) };
}
const restSeconds = (txt) => { const n = parseInt(txt, 10); if (!n) return 90; return /min/.test(txt) ? n * 60 : n; };

/** Mobile: countdown pinned under the top bar while resting, so it's visible without scrolling. */
function RestBar({ rest, total, onSkip }) {
  return (
    <div className="k-restbar" role="timer" aria-live="off">
      <Icon name="test" size={20} />
      <span className="k-restbar-label body-s">Recovering</span>
      <span className="metric-m k-num">{fmtClock(Math.max(0, rest))}</span>
      <Button variant="ghost" size="sm" onClick={onSkip}>Skip</Button>
      <i className="k-restbar-fill" style={{ width: (total ? (rest / total) * 100 : 0) + '%' }} />
    </div>
  );
}

export default function Strength() {
  const { sessions, strengthLogs, status, today, actions } = useKairo();
  const { back, layout } = useShell();
  const [params, setParams] = useSearchParams();
  const fromId = params.get('session');
  const pickedId = useMemo(() => pickSession(sessions, today, fromId, (s) => s.type === 'upper' || s.type === 'strength')?.id, [fromId, sessions.length]);
  const initial = sessions.find((s) => s.id === pickedId) || null; // fresh copy so moves/status changes show
  const [k, setK] = useState(initial?.session || 'A');
  useEffect(() => { if (initial?.session) setK(initial.session); }, [initial?.id]);
  const target = initial && initial.session === k ? initial : pickSession(sessions, today, null, (s) => s.session === k);
  const S = STRENGTH[k];
  const { rest, total: restTotal, start: startRest, skip: skipRest } = useRestTimer();
  const mobile = layout === 'mobile';

  const logFor = (ex) => strengthLogs.find((l) => l.session_id === target?.id && l.exercise === ex);
  const lastWeight = (ex) => strengthLogs.find((l) => l.exercise === ex && l.weight_kg != null && l.session_id !== target?.id)?.weight_kg;
  const done = S.ex.reduce((a, e) => a + Math.min(e[1], logFor(e[0])?.sets_done || 0), 0);
  const total = S.ex.reduce((a, e) => a + e[1], 0);

  return (
    <div className="k-screen">
      <ScreenHead back={fromId ? 'Back' : null} onBack={back} eyebrow={target ? `${fmtDate(target.date)} · strength supports your running` : 'Strength'} title={S.name} sub={S.focus}
        actions={<Segmented size="sm" options={[{ value: 'A', label: 'Upper A' }, { value: 'B', label: 'Upper B' }, { value: 'C', label: 'Upper C' }, { value: 'L', label: 'Lower' }]} value={k} onChange={(v) => { setK(v); if (fromId) setParams({}, { replace: true }); }} />} />
      <div className="k-why">
        <WorkoutIcon type={k === 'L' ? 'strength' : 'upper'} size={40} />
        <p className="body">{S.why}</p>
        <div className="k-why-chain body-s"><span>{k === 'L' ? 'Heavy legs' : 'Upper volume'}</span><Icon name="arrowR" size={14} /><span>{k === 'L' ? 'Economy + shin durability' : 'Posture + physique'}</span><Icon name="arrowR" size={14} /><span className="is-goal">Marathon</span></div>
      </div>
      {!target ? <Empty icon="strength" title="No session of this type in the plan" /> : (
        <div className="k-detail-grid">
          {mobile && rest > 0 ? <RestBar rest={rest} total={restTotal} onSkip={skipRest} /> : null}
          <div className="k-detail-main">
            <Card title="Exercises" eyebrow={`${S.ex.length} movements · ~${S.min} min · RIR 1–2`} action={<span className="body-s k-muted k-num">{done}/{total} sets</span>}>
              <div className="k-exlist">
                {S.ex.map((e, i) => {
                  const log = logFor(e[0]);
                  return (
                    <ExerciseRow key={k + i} index={i + 1} name={e[0]} sets={e[1]} reps={e[2]} rest={e[4]}
                      weight={log?.weight_kg ?? lastWeight(e[0]) ?? (e[3] || '')} done={log?.sets_done || 0}
                      onWeight={(w) => actions.saveStrength(target.id, e[0], { weight_kg: w === '' ? null : +w })}
                      onSet={(n) => { actions.saveStrength(target.id, e[0], { sets_done: n, weight_kg: log?.weight_kg ?? lastWeight(e[0]) ?? (e[3] || null) }); if (n > (log?.sets_done || 0)) startRest(restSeconds(e[4])); }} />
                  );
                })}
              </div>
              <p className="body-s k-muted">Weights carry over from your last session. Hit the top of the rep range on every set at RIR 1–2, then add load.</p>
            </Card>
          </div>
          <aside className="k-detail-side">
            <SessionActions s={target} toggle={<DoneToggle done={status[target.id] === 'done'} onChange={(v) => actions.toggleDone(target, v)} label={['Mark session as done', 'Session done · tap to undo']} />} />
            {!mobile ? (
              <Card eyebrow="Rest timer" title={rest > 0 ? 'Recovering' : 'Ready for next set'}>
                <div className="k-rest"><span className="metric-xl k-num">{fmtClock(Math.max(0, rest))}</span><Button variant="ghost" size="sm" onClick={skipRest}>Skip</Button></div>
              </Card>
            ) : null}
            <Card eyebrow="Rules" title="Keep it running-friendly">
              <ul className="k-list body-s"><li>Lower day = Tuesday, same day as the quality run.</li><li>≥ 48 h between heavy legs and the long run.</li><li>Cutback weeks: drop one set, keep the load.</li></ul>
            </Card>
          </aside>
        </div>
      )}
    </div>
  );
}

export function Plyo() {
  const { sessions, strengthLogs, status, today, actions } = useKairo();
  const { back } = useShell();
  const [params] = useSearchParams();
  const fromId = params.get('session');
  const target = pickSession(sessions, today, fromId, (s) => s.type === 'plyo');
  if (!target) return <div className="k-screen"><ScreenHead title="Plyometrics" /><Empty icon="plyo" title="No plyometric sessions left in the plan" /></div>;
  const short = dow(target.row?.original_date ? parseISO(target.row.original_date) : target.date) !== 1; // planned on Tuesday = full session, even if moved
  const prog = plyoFor(target.week, short);
  const isDone = (ex) => (strengthLogs.find((l) => l.session_id === target.id && l.exercise === ex)?.sets_done || 0) > 0;
  const contacts = prog.ex.reduce((a, e) => a + (isDone(e[0]) ? e[2] : 0), 0);
  const planned = prog.ex.reduce((a, e) => a + e[2], 0);
  return (
    <div className="k-screen">
      <ScreenHead back={fromId ? 'Back' : null} onBack={back} eyebrow={`Plyometrics · ${fmtDate(target.date)} · ${prog.label}`} title="Elastic power" sub="A micro-dose that makes every stride cheaper. Quick and quiet contacts only." />
      <div className="k-detail-grid">
        <div className="k-detail-main">
          <Card title={short ? 'Short session · after the easy run' : 'Full session · before the quality run'} eyebrow={`~${target.contacts || planned} foot contacts · rest 60–90 s`}>
            <div className="k-exlist">
              {prog.ex.map((e, i) => (
                <button key={e[0]} className={cx('k-plyo', isDone(e[0]) && 'is-done')} onClick={() => actions.saveStrength(target.id, e[0], { sets_done: isDone(e[0]) ? 0 : 1 })}>
                  <span className="k-ex-n k-num">{i + 1}</span>
                  <WorkoutIcon type="plyo" size={32} />
                  <span className="k-ex-main"><span className="k-ex-name">{e[0]}</span><span className="body-s k-muted k-num">{e[1]}{e[2] ? ` · ${e[2]} contacts` : ' · drill'}</span></span>
                  <StatusMark status={isDone(e[0]) ? 'done' : 'planned'} size={22} />
                </button>
              ))}
            </div>
            <Meter value={contacts} max={PLYO.cap} label="Contacts today" right={`${contacts} / ${PLYO.cap} cap`} tone="plyo" />
          </Card>
          <Card title="Why it helps a marathoner" eyebrow="Running economy">
            <div className="k-whygrid">{PLYO.why.map(([a, b]) => <div key={a}><div className="k-sline-title">{a}</div><p className="body-s k-muted">{b}</p></div>)}</div>
          </Card>
        </div>
        <aside className="k-detail-side">
          <SessionActions s={target} toggle={<DoneToggle done={status[target.id] === 'done'} onChange={(v) => actions.toggleDone(target, v)} label={['Mark plyos as done', 'Plyos done · tap to undo']} />} />
          <Card eyebrow="Progression" title="Contacts per session">
            <div className="k-prog">
              {[['1–3', 70, [1, 3]], ['4–6', 95, [4, 6]], ['7–11', 120, [7, 11]], ['12–18', 80, [12, 18]], ['19–20', 35, [19, 20]], ['21', 0, [21, 21]]].map(([w, c, r]) => (
                <div key={w} className={cx('k-prog-row', target.week >= r[0] && target.week <= r[1] && 'is-current')}><span className="label">Wk {w}</span><span className="k-prog-bar"><i style={{ width: (c / 120) * 100 + '%' }} /></span><b className="k-num">{c || '—'}</b></div>
              ))}
            </div>
          </Card>
          <Card eyebrow="Placement" title="Rules">
            <ul className="k-list body-s">{PLYO.rules.map((r) => <li key={r}>{r}</li>)}</ul>
          </Card>
        </aside>
      </div>
    </div>
  );
}
