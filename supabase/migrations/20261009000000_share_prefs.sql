-- Share today: the athlete's last-used share card format, style and "Show" toggles.
-- Shape: { "format": "story"|"post"|"square", "style": "black"|"lime"|"light"|"photo", "show": { "distance": bool, ... } }
alter table public.profiles add column if not exists share_prefs jsonb;
