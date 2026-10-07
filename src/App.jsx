import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useKairo } from './state/AppState.jsx';
import Shell, { BrandMark } from './components/Shell.jsx';
import Auth, { ResetPassword, Onboarding } from './pages/Auth.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Calendar from './pages/Calendar.jsx';
import WorkoutRoute, { TodayWorkout } from './pages/Workout.jsx';
import Plan from './pages/Plan.jsx';
import Progress from './pages/Progress.jsx';
import Strength, { Plyo } from './pages/Strength.jsx';
import Recovery from './pages/Recovery.jsx';
import Race from './pages/Race.jsx';
import Profile from './pages/Profile.jsx';

function Splash({ text = 'Loading your training…' }) {
  return <div className="k-splash"><BrandMark /><span className="body k-muted">{text}</span></div>;
}

export default function App() {
  const { auth, user, raw, plan, loading, error, actions } = useKairo();
  if (!auth.ready) return <Splash />;
  if (!user) {
    return (
      <Routes>
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="*" element={<Auth />} />
      </Routes>
    );
  }
  if (!raw) {
    if (error) return <div className="k-splash"><span className="body k-err">{error}</span><button className="k-linkbtn" onClick={actions.reload}>Try again</button></div>;
    return <Splash />;
  }
  if (!plan) return <Routes><Route path="/reset-password" element={<ResetPassword />} /><Route path="*" element={<Onboarding />} /></Routes>;
  return (
    <Routes>
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route element={<Shell />}>
        <Route index element={<Dashboard />} />
        <Route path="calendar" element={<Calendar />} />
        <Route path="workouts" element={<TodayWorkout />} />
        <Route path="workout/:id" element={<WorkoutRoute />} />
        <Route path="plan" element={<Plan />} />
        <Route path="progress" element={<Progress />} />
        <Route path="strength" element={<Strength />} />
        <Route path="plyo" element={<Plyo />} />
        <Route path="recovery" element={<Recovery />} />
        <Route path="race" element={<Race />} />
        <Route path="profile" element={<Profile />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
