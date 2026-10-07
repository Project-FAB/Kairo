import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Icon } from './icons.jsx';
import { Toast, cx } from './ui.jsx';
import { useKairo } from '../state/AppState.jsx';
import { daysBetween } from '../lib/dates.js';

export const PRIMARY = [['/', 'Home', 'home'], ['/calendar', 'Calendar', 'calendar'], ['/workouts', 'Workouts', 'workouts'], ['/progress', 'Progress', 'progress'], ['/profile', 'Profile', 'profile']];
export const SECONDARY = [['/plan', 'Training plan', 'plan'], ['/strength', 'Strength', 'strength'], ['/plyo', 'Plyometrics', 'plyo'], ['/recovery', 'Recovery', 'heart'], ['/race', 'Race countdown', 'flag']];

const ShellCtx = createContext(null);
/** layout ('desktop' | 'tablet' | 'mobile'), the week being viewed, and navigation helpers */
export const useShell = () => useContext(ShellCtx);

function useWidth(ref) {
  const [w, setW] = useState(typeof window !== 'undefined' ? window.innerWidth : 1280);
  useEffect(() => {
    if (!ref.current) return undefined;
    const ro = new ResizeObserver((e) => setW(e[0].contentRect.width));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return w;
}

export function BrandMark() { return <span className="k-brand-mark" aria-hidden="true"><i /><i /><i /></span>; }

function NavRail({ collapsed }) {
  const { today, race } = useKairo();
  const days = race ? Math.max(0, daysBetween(today, race.date)) : null;
  const link = ([to, l, ic]) => (
    <NavLink key={to} to={to} end={to === '/'} title={l} className={({ isActive }) => cx('k-navitem', isActive && 'on')}>
      <Icon name={ic} size={20} />{!collapsed ? <span>{l}</span> : null}
    </NavLink>
  );
  return (
    <nav className={cx('k-rail', collapsed && 'is-collapsed')} aria-label="Main">
      <div className="k-brand"><BrandMark />{!collapsed ? <span className="k-brand-name">Kairo</span> : null}</div>
      <div className="k-rail-group">{PRIMARY.map(link)}</div>
      <div className="k-rail-group">
        {!collapsed ? <div className="label k-rail-label">Training</div> : <div className="k-rail-sep" />}
        {SECONDARY.map(link)}
      </div>
      {!collapsed && race ? (
        <NavLink to="/race" className="k-rail-race">
          <span className="label">{race.name.split(' ')[0]} · {race.date.getDate()} {race.date.toLocaleString('en', { month: 'short' })}</span><span><b className="k-num">{days}</b> days</span>
        </NavLink>
      ) : null}
    </nav>
  );
}

function BottomNav() {
  return (
    <nav className="k-bnav" aria-label="Main">
      {PRIMARY.map(([to, l, ic]) => (
        <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => cx('k-bnav-item', isActive && 'on', to === '/workouts' && 'is-center')}>
          <span className="k-bnav-ic"><Icon name={ic} size={to === '/workouts' ? 22 : 21} /></span><span>{l}</span>
        </NavLink>
      ))}
    </nav>
  );
}

export default function Shell() {
  const ref = useRef(null);
  const mainRef = useRef(null);
  const width = useWidth(ref);
  const layout = width >= 1180 ? 'desktop' : width >= 760 ? 'tablet' : 'mobile';
  const { currentWeek, toastMsg, clearToast, isDemo, user } = useKairo();
  const [weekNo, setWeekNoRaw] = useState(currentWeek ?? 0);
  const navigate = useNavigate();
  const loc = useLocation();
  useEffect(() => { if (mainRef.current) mainRef.current.scrollTop = 0; }, [loc.pathname]);
  useEffect(() => { if (currentWeek != null) setWeekNoRaw(currentWeek); }, [currentWeek]);

  const shell = {
    layout, weekNo,
    setWeekNo: (n) => setWeekNoRaw(Math.max(0, Math.min(21, n))),
    go: (to) => navigate(to),
    back: () => (window.history.length > 1 ? navigate(-1) : navigate('/')),
    openSession: (s) => navigate(`/workout/${s.id}`),
  };
  return (
    <ShellCtx.Provider value={shell}>
      <div ref={ref} className={cx('k-app', `is-${layout}`)} style={{ height: '100dvh' }}>
        {layout !== 'mobile' ? <NavRail collapsed={layout === 'tablet'} /> : null}
        <main ref={mainRef} className="k-main">
          {layout === 'mobile' ? (
            <div className="k-mtop"><BrandMark /><span className="k-brand-name">Kairo</span><span className="k-mtop-sp" />
              <button className="k-avatar" onClick={() => navigate('/profile')} aria-label="Profile">{(user?.email || 'K')[0].toUpperCase()}</button></div>
          ) : null}
          {isDemo ? <div className="k-demo-banner body-s">Demo mode — data is stored in this browser only. Add your Supabase keys to go live.</div> : null}
          <div className="k-main-inner"><Outlet /></div>
        </main>
        {layout === 'mobile' ? <BottomNav /> : null}
        {toastMsg ? <Toast onDone={clearToast}>{toastMsg}</Toast> : null}
      </div>
    </ShellCtx.Provider>
  );
}
