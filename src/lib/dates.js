export const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export const parseISO = (s) => { const [y, m, d] = String(s).slice(0, 10).split('-').map(Number); return new Date(y, m - 1, d); };
export const toISO = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
export const sameDay = (a, b) => !!a && !!b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
export const daysBetween = (a, b) => Math.round((Date.UTC(b.getFullYear(), b.getMonth(), b.getDate()) - Date.UTC(a.getFullYear(), a.getMonth(), a.getDate())) / 864e5);
export const dow = (d) => (d.getDay() + 6) % 7; // Mon = 0
export const fmtDate = (d) => `${DAY_NAMES[dow(d)]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
export const fmtLong = (d) => `${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()]} ${d.getDate()} ${MONTHS_LONG[d.getMonth()]} ${d.getFullYear()}`;

export const fmtMin = (m) => (m >= 60 ? `${Math.floor(m / 60)}h ${String(Math.round(m % 60)).padStart(2, '0')}m` : `${Math.round(m)} min`);
export const fmtClock = (sec) => { const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = Math.floor(sec % 60); return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(s).padStart(2, '0'); };
export const paceToSec = (p) => { if (!p) return null; const m = String(p).match(/(\d+):(\d{2})/); return m ? +m[1] * 60 + +m[2] : null; };
export const secToPace = (s) => (s == null || !isFinite(s) ? '—' : `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`);

/** "Today" — the real date, or ?today=YYYY-MM-DD for previewing another day. */
export function getToday() {
  try {
    const q = new URLSearchParams(window.location.search).get('today');
    if (q && /^\d{4}-\d{2}-\d{2}$/.test(q)) { sessionStorage.setItem('kairo-today', q); return parseISO(q); }
    const s = sessionStorage.getItem('kairo-today');
    if (s) return parseISO(s);
  } catch (e) { /* ignore */ }
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), n.getDate());
}
