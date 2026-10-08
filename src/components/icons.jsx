import React from "react";
// Kairo line icons — 24 grid, 1.75 stroke, round caps. Workout glyphs are shape-distinct so type never relies on colour.
const P = {
  // workout types
  easy: <><path d="M3 15c3 0 3-3 6-3s3 3 6 3 3-3 6-3" /><circle cx="12" cy="7" r="2" /></>,
  recovery: <><path d="M4 16c3-1.5 5-1.5 8 0s5 1.5 8 0" /><path d="M8 10.5c2.5-1 5.5-1 8 0" /></>,
  long: <><path d="M5 20c0-4 4-4 7-8s7-4 7-8" /><circle cx="5" cy="20" r="1.4" /><circle cx="19" cy="4" r="1.4" /></>,
  threshold: <><path d="M4 17a8 8 0 1 1 16 0" /><path d="M12 17l4-5" /><path d="M7 17h0.01M17 17h0.01" /></>,
  interval: <><path d="M5 18V9M10 18V6M15 18V9M20 18V6" /></>,
  mp: <><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="4" /><circle cx="12" cy="12" r="0.8" fill="currentColor" /></>,
  test: <><circle cx="12" cy="13.5" r="7" /><path d="M12 13.5V10M10 3h4M18.5 6.5l1.5-1.5" /></>,
  race: <><path d="M5 21V4" /><path d="M5 4h12l-2.5 4L17 12H5" /></>,
  strength: <><path d="M3 9v6M6.5 7v10M17.5 7v10M21 9v6M6.5 12h11" /></>,
  upper: <><path d="M3 9v6M6.5 7v10M17.5 7v10M21 9v6M6.5 12h11" /></>,
  plyo: <><path d="M3 19h4l3-9 3 9h0" /><path d="M13 19l3-6 2 6h3" /><path d="M10 5.5v0.01" /></>,
  cross: <><path d="M4 10h16v4H4z" /><path d="M11 14l-2 6M13 14l2 6" /><path d="M10 10l2 2 2-2" /></>,
  rest: <><path d="M19 14.5A7.5 7.5 0 0 1 9.5 5a7.5 7.5 0 1 0 9.5 9.5z" /></>,
  mobility: <><circle cx="12" cy="5" r="1.8" /><path d="M5 10l7 1.5 7-1.5M12 11.5V15l-4 5M12 15l4 5" /></>,
  // ui
  home: <><path d="M4 11l8-7 8 7" /><path d="M6 9.5V20h12V9.5" /></>,
  calendar: <><rect x="3.5" y="5" width="17" height="15" rx="3" /><path d="M3.5 10h17M8 3v4M16 3v4" /></>,
  play: <><path d="M8 5.5v13l10.5-6.5z" /></>,
  workouts: <><rect x="5" y="4.5" width="14" height="16" rx="3" /><path d="M9 4.5V3h6v1.5" /><path d="M8.5 12.5l2.5 2.5 4.5-5" /></>,
  progress: <><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></>,
  profile: <><circle cx="12" cy="8" r="3.5" /><path d="M5 20c1-4 4-5.5 7-5.5s6 1.5 7 5.5" /></>,
  plan: <><path d="M6 4v16" /><circle cx="6" cy="6" r="2" /><circle cx="6" cy="12" r="2" /><circle cx="6" cy="18" r="2" /><path d="M11 6h9M11 12h9M11 18h6" /></>,
  heart: <><path d="M12 20s-7.5-4.5-7.5-10A4.3 4.3 0 0 1 12 7.5 4.3 4.3 0 0 1 19.5 10c0 5.5-7.5 10-7.5 10z" /><path d="M7 12.5h3l1.5-2 2 4 1.5-2h2" /></>,
  bowl: <><path d="M3.5 11h17a8.5 8.5 0 0 1-17 0z" /><path d="M9 7c0-2 2-2 2-4M14 7c0-2 2-2 2-4" /></>,
  flag: <><path d="M5 21V4" /><path d="M5 4h12l-2.5 4L17 12H5" /></>,
  check: <><path d="M5 12.5l4.5 4.5L19 7.5" /></>,
  x: <><path d="M6 6l12 12M18 6L6 18" /></>,
  chevL: <><path d="M15 5l-7 7 7 7" /></>,
  chevR: <><path d="M9 5l7 7-7 7" /></>,
  chevD: <><path d="M5 9l7 7 7-7" /></>,
  plus: <><path d="M12 5v14M5 12h14" /></>,
  minus: <><path d="M5 12h14" /></>,
  pause: <><path d="M8 5v14M16 5v14" /></>,
  stop: <><rect x="6" y="6" width="12" height="12" rx="2" /></>,
  lap: <><path d="M4 12a8 8 0 1 0 2.5-5.8" /><path d="M4 4v4h4" /></>,
  move: <><rect x="3.5" y="5" width="17" height="15" rx="3" /><path d="M3.5 10h17M9 15h6M13 13l2 2-2 2" /></>,
  skip: <><path d="M6 6l8 6-8 6zM18 6v12" /></>,
  note: <><path d="M5 4h10l4 4v12H5z" /><path d="M9 12h6M9 16h4" /></>,
  bolt: <><path d="M13 3L5 14h6l-1 7 8-11h-6z" /></>,
  moon: <><path d="M19 14.5A7.5 7.5 0 0 1 9.5 5a7.5 7.5 0 1 0 9.5 9.5z" /></>,
  drop: <><path d="M12 3.5s6 6.5 6 10.5a6 6 0 0 1-12 0c0-4 6-10.5 6-10.5z" /></>,
  watch: <><rect x="7" y="7" width="10" height="10" rx="3" /><path d="M9 7l1-4h4l1 4M9 17l1 4h4l1-4" /></>,
  shoe: <><path d="M3 16v-5l4-1 3 3 6 1 5 2v3H3z" /><path d="M3 16h18" /></>,
  gear: <><circle cx="12" cy="12" r="3" /><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" /></>,
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" /></>,
  star: <><path d="M12 4l2.4 5 5.4.6-4 3.7 1.1 5.3L12 16l-4.9 2.6 1.1-5.3-4-3.7 5.4-.6z" /></>,
  arrowR: <><path d="M4 12h15M13 6l6 6-6 6" /></>,
  info: <><circle cx="12" cy="12" r="8.5" /><path d="M12 11v5M12 8h0.01" /></>,
  link: <><path d="M10 14l4-4" /><path d="M8.5 11.5l-2 2a3 3 0 0 0 4 4l2-2M15.5 12.5l2-2a3 3 0 0 0-4-4l-2 2" /></>,
  share: <><path d="M12 3.5v11" /><path d="M7.5 8L12 3.5 16.5 8" /><path d="M5 12.5V18a2.5 2.5 0 0 0 2.5 2.5h9A2.5 2.5 0 0 0 19 18v-5.5" /></>,
  download: <><path d="M12 4v11" /><path d="M7.5 10.5L12 15l4.5-4.5" /><path d="M5 20h14" /></>,
  copy: <><rect x="8.5" y="8.5" width="11.5" height="11.5" rx="2.5" /><path d="M15.5 8.5V6.5A2.5 2.5 0 0 0 13 4H6.5A2.5 2.5 0 0 0 4 6.5V13a2.5 2.5 0 0 0 2.5 2.5h2" /></>,
  image: <><rect x="3.5" y="4.5" width="17" height="15" rx="3" /><circle cx="9" cy="10" r="1.6" /><path d="M20.5 15.5l-5-5-8.5 9" /></>,
};

export function Icon({ name, size = 20, stroke = 1.75, className, style, title }) {
  return (
    <svg className={['k-icon', className].filter(Boolean).join(' ')} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" style={style} aria-hidden={title ? undefined : true} role={title ? 'img' : undefined}>
      {title ? <title>{title}</title> : null}
      {P[name] || P.info}
    </svg>
  );
}

// Workout type → colour family (soft ground + ink) + glyph
export const TYPE_TONE = { heart: 'lav', easy: 'easy', recovery: 'recovery', long: 'long', threshold: 'threshold', interval: 'interval', test: 'interval', mp: 'mp', race: 'accent', strength: 'strength', upper: 'strength', plyo: 'plyo', cross: 'cross', rest: 'rest', mobility: 'recovery' };

export function WorkoutIcon({ type, size = 36, solid = false }) {
  const tone = TYPE_TONE[type] || 'easy';
  return (
    <span className={`k-wicon k-tone-${tone}${solid ? ' is-solid' : ''}`} style={{ width: size, height: size }}>
      <Icon name={type} size={Math.round(size * 0.56)} stroke={1.9} />
    </span>
  );
}
