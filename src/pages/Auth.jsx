import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Segmented } from '../components/ui.jsx';
import { Field } from '../components/common.jsx';
import { BrandMark } from '../components/Shell.jsx';
import { db, isDemo } from '../lib/db.js';
import { useKairo } from '../state/AppState.jsx';
import { DEFAULT_PLAN } from '../lib/plan.js';

function AuthFrame({ children, title, sub }) {
  return (
    <div className="k-auth">
      <div className="k-auth-card">
        <div className="k-brand"><BrandMark /><span className="k-brand-name">Kairo</span></div>
        <div><h1 className="title-l">{title}</h1>{sub ? <p className="body k-muted">{sub}</p> : null}</div>
        {children}
      </div>
      <div className="k-auth-side" aria-hidden="true">
        <div className="label">{DEFAULT_PLAN.race_name}</div>
        <div className="display-xl">21 weeks</div>
        <p className="body">One clear session a day, a calendar that shows the whole block, and a check-in that tells you when to back off.</p>
      </div>
    </div>
  );
}

export default function Auth() {
  const [mode, setMode] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setMsg(null);
    try {
      if (mode === 'signin') await db.signIn(email, password);
      else if (mode === 'signup') {
        const r = await db.signUp(email, password, name);
        if (!r.session && !isDemo) setMsg({ ok: true, text: 'Check your email to confirm your account, then sign in.' });
      } else { await db.resetPassword(email); setMsg({ ok: true, text: 'If that email has an account, a reset link is on its way.' }); }
    } catch (err) { setMsg({ ok: false, text: err.message || String(err) }); } finally { setBusy(false); }
  };
  return (
    <AuthFrame title={mode === 'signup' ? 'Create your account' : mode === 'reset' ? 'Reset your password' : 'Welcome back'} sub={isDemo ? 'Demo mode: any email and password work; data stays in this browser.' : 'Train for the day. Build for race day.'}>
      {mode !== 'reset' ? <Segmented options={[{ value: 'signin', label: 'Sign in' }, { value: 'signup', label: 'Create account' }]} value={mode} onChange={(v) => { setMode(v); setMsg(null); }} /> : null}
      <form className="k-form" onSubmit={submit}>
        {mode === 'signup' ? <Field label="Name"><input className="k-input" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" placeholder="Fritz" /></Field> : null}
        <Field label="Email"><input className="k-input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" /></Field>
        {mode !== 'reset' ? <Field label="Password"><input className="k-input" type="password" required minLength={isDemo ? 1 : 8} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} /></Field> : null}
        {msg ? <p className={`body-s ${msg.ok ? 'k-ok' : 'k-err'}`} role="status">{msg.text}</p> : null}
        <Button variant="primary" size="lg" type="submit" disabled={busy}>{busy ? 'Please wait…' : mode === 'signin' ? 'Sign in' : mode === 'signup' ? 'Create account' : 'Send reset link'}</Button>
      </form>
      <button className="k-linkbtn body-s" onClick={() => { setMode(mode === 'reset' ? 'signin' : 'reset'); setMsg(null); }}>{mode === 'reset' ? 'Back to sign in' : 'Forgot your password?'}</button>
    </AuthFrame>
  );
}

export function ResetPassword() {
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState(null);
  const nav = useNavigate();
  const { user } = useKairo();
  const submit = async (e) => {
    e.preventDefault();
    try { await db.updatePassword(password); setMsg({ ok: true, text: 'Password updated.' }); setTimeout(() => nav('/'), 900); } catch (err) { setMsg({ ok: false, text: err.message || String(err) }); }
  };
  return (
    <AuthFrame title="Choose a new password" sub={user ? user.email : 'Open this page from the link in your reset email.'}>
      <form className="k-form" onSubmit={submit}>
        <Field label="New password"><input className="k-input" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" /></Field>
        {msg ? <p className={`body-s ${msg.ok ? 'k-ok' : 'k-err'}`}>{msg.text}</p> : null}
        <Button variant="primary" size="lg" type="submit" disabled={!user}>Update password</Button>
      </form>
    </AuthFrame>
  );
}

export function Onboarding() {
  const { actions, loading, error, profile } = useKairo();
  return (
    <AuthFrame title={`Hi${profile?.display_name ? ` ${profile.display_name}` : ''} — let's build your block`} sub={`${DEFAULT_PLAN.race_name} · Sun 7 March 2027 · target ${DEFAULT_PLAN.target_label}`}>
      <ul className="k-list body">
        <li>Baseline week from Mon 5 Oct with the 30-minute threshold test, then 21 weeks from Mon 12 Oct.</li>
        <li>Four runs a week, three upper sessions, one heavy lower, short plyometric blocks and Taekwondo Saturdays until Christmas.</li>
        <li>Cutbacks in weeks 4, 8, 11, 14 and 17; a 3-week taper into race day.</li>
      </ul>
      {error ? <p className="body-s k-err">{error}</p> : null}
      <Button variant="primary" size="lg" icon="calendar" onClick={actions.createPlan} disabled={loading}>{loading ? 'Building your plan…' : 'Create my plan'}</Button>
      <button className="k-linkbtn body-s" onClick={actions.signOut}>Sign out</button>
    </AuthFrame>
  );
}
