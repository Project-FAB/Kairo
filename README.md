# Kairo — marathon training app

React (Vite) + Supabase, deployed on Vercel. Built from the Kairo design system and prototype, with the Tokyo Marathon 2027 integrated plan (baseline week + 21 weeks, 5 Oct 2026 → 7 Mar 2027) generated for you on first sign-in.

## What it does

- **Dashboard**: shows the race countdown, today's workout with a done toggle, this week's calendar, weekly mileage, recovery and training load, marathon readiness, upcoming key workouts and the running → strength → plyos → recovery → marathon chain.
- **Calendar**: has Week, Month, Block and Race views. Tap the ring on any session to mark it done, or tap the session to open it.
- **Workout detail**: shows structure, targets and the fuel plan. You can mark it done, reschedule it to another day, skip it, add notes, and log distance, time and average HR after a run (all optional).
- **Strength**: Upper A/B/C and Lower, with weights and ticked sets saved per session. Weights carry forward to the next session, and there's a rest timer.
- **Plyometrics**: a phase-appropriate program, a contact counter and the cap.
- **Recovery**: a morning check-in (sleep, resting HR, HRV, soreness, energy, stress, shin hop test, checklist). It turns into a verdict: ready, train easy or back off.
- **Progress**: estimated finish, fitness numbers, longest run, weekly and monthly km, easy-pace trend, readiness breakdown, and a test results log.
- **Race**: countdown, goal tiers, checkpoints, pacing plan and race fueling.
- **Profile**: name, weight, threshold pace, LTHR, VO2 max, HR zones, shoe mileage, dark/light theme, sign out and plan reset.

Without Supabase keys the app runs in **demo mode**: it signs in a local user and stores everything in `localStorage`. This is handy for trying it out or for preview deploys.

---

## 1. Supabase

1. Create a project at <https://supabase.com> (the free tier is fine).
2. **SQL Editor → New query**: paste `supabase/migrations/20261007000000_init.sql` and run it. This creates the tables, the `updated_at` triggers, the profile-on-signup trigger, and Row Level Security so every row is private to its owner.
   - With the Supabase CLI you can instead run `supabase link --project-ref <ref>` and then `supabase db push`.
3. **Authentication → Providers → Email**: keep it enabled. "Confirm email" can stay on; new users get a confirmation link.
4. **Authentication → URL Configuration**:
   - **Site URL**: your Vercel URL, e.g. `https://kairo.vercel.app`.
   - **Redirect URLs**: add `https://kairo.vercel.app/**` and `http://localhost:5173/**`. The password-reset email links to `/reset-password`.
5. **Project Settings → API**: copy the **Project URL** and the **anon public** key.

## 2. Run locally

```bash
cp .env.example .env.local      # paste the URL + anon key
npm install
npm run dev                     # http://localhost:5173
```

Sign up, confirm your email, sign in, then tap **Create my plan**.

Preview any date with `?today=2026-12-09` (it sticks for the browser tab). This is useful for seeing mid-block states.

## 3. Deploy to Vercel

1. Push this folder to a GitHub repo.
2. In Vercel, go to **Add New → Project** and import the repo. The framework is detected as Vite; `vercel.json` already sets the build command, the `dist` output and the SPA rewrites.
3. **Settings → Environment Variables**: add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` for Production, Preview and Development.
4. Deploy. Then put the production URL into Supabase's Site URL and Redirect URLs (step 1.4).

Or use the CLI: `npm i -g vercel`, then `vercel`, then `vercel env add VITE_SUPABASE_URL`, and so on, then `vercel --prod`.

The anon key is meant to be public. Row Level Security is what protects the data. Never put the `service_role` key in a `VITE_` variable.

---

## Project structure

```
supabase/migrations/…_init.sql   schema + RLS
src/lib/plan.js                  Tokyo 2027 template → session rows (generateSessions)
src/lib/model.js                 rows → weeks/days, status, recovery verdict, readiness, analytics
src/lib/db.js                    Supabase client + localStorage demo backend (same interface)
src/state/AppState.jsx           auth, loading, optimistic mutations, toasts
src/components/                  design-system components (ui.jsx, icons.jsx) + Shell (nav)
src/pages/                       Dashboard, Calendar, Workout, Plan, Progress, Strength/Plyo, Recovery, Race, Profile, Auth
src/styles/                      tokens.css (design tokens, dark default) + app.css + extra.css
```

## Data model

| table | purpose |
| --- | --- |
| `profiles` | name, weight, threshold pace, LTHR, VO2 max, estimated finish, theme |
| `plans` | one per user: race, date, plan start, target |
| `sessions` | every planned session, rest days included. `status` is `planned`, `done` or `skipped`; "missed" is derived (a past session not done). Also holds `actual_km`, `actual_minutes`, `avg_hr`, notes, and `moved` + `original_date` |
| `strength_logs` | weight + sets ticked per exercise per session (also used for plyo drills) |
| `recovery_logs` | one check-in per day |
| `test_results` | threshold tests, time trials, races |
| `shoes` | mileage per pair |

## Notes

- **Readiness score**: the average of five parts, each computed from your own data:
  - aerobic: km done vs planned over the last 4 weeks
  - endurance: longest recent run vs 32 km
  - speed: quality sessions done
  - recovery: today's check-in
  - consistency: sessions done vs planned over the last 28 days
- **Estimated finish**: your override in Profile, or threshold pace × 1.09 over 42.195 km.
- **Changing the plan**: edit the template in `src/lib/plan.js` (`WEEK_META`, `buildWeek`, `STRENGTH`, `PLYO_PROGRAM`), then use Profile → Reset plan to regenerate it. This deletes logged sessions.
