import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Segmented, Sheet, cx } from './ui.jsx';
import { Icon } from './icons.jsx';
import { ShareCard } from './ShareCards.jsx';
import { useKairo } from '../state/AppState.jsx';
import { useShell } from './Shell.jsx';
import { sameDay } from '../lib/dates.js';
import { CARDS, CARD_LIST, FORMATS, STYLES, SHOW, buildShareData, suggestCard, prefsFrom, cardToBlob, shareBlob, saveBlob, copyBlob, canCopyImage, fileName } from '../lib/share.js';
import '../styles/share.css';

const canShareFiles = () => { try { return !!navigator.canShare?.({ files: [new File([''], 'x.png', { type: 'image/png' })] }); } catch (e) { return false; } };
const readPhoto = (file) => new Promise((ok, bad) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = bad; r.readAsDataURL(file); });

/** Today's main session: the run, else the first real session, else nothing (rest day). */
function todayMain(weeks, today) {
  const day = weeks.flatMap((w) => w.days).find((d) => sameDay(d.date, today));
  if (!day) return null;
  return day.sessions.find((x) => x.kind === 'run') || day.sessions.find((x) => x.kind !== 'rest') || null;
}

/** "Share today": pick a card, choose what it shows, then share / save / copy a 1080 px PNG. */
export default function ShareSheet({ sessionId, onClose }) {
  const k = useKairo();
  const { layout } = useShell();
  const s = (sessionId && k.sessions.find((x) => x.id === sessionId)) || todayMain(k.weeks, k.today);
  const d = useMemo(() => buildShareData({ s, sessions: k.sessions, weeks: k.weeks, status: k.status, today: k.today, race: k.race, profile: k.profile, currentWeek: k.currentWeek }), [s, k.sessions, k.weeks, k.status, k.today, k.race, k.profile, k.currentWeek]);
  const [card, setCard] = useState(() => suggestCard(s, d));
  const [prefs, setPrefs] = useState(() => prefsFrom(k.profile?.share_prefs));
  const [photo, setPhoto] = useState(null);
  const [busy, setBusy] = useState(null);
  const nodeRef = useRef(null);
  const fileRef = useRef(null);
  const ready = useRef({ key: null, blob: null }); // pre-rendered PNG so the share sheet opens inside the tap
  const key = JSON.stringify([card, prefs, !!photo, photo?.length, d.s?.id, d.km, d.time, d.isDone]);
  const shareable = useMemo(canShareFiles, []);
  const copyable = useMemo(canCopyImage, []);
  const fmt = FORMATS[prefs.format];
  const scale = layout === 'mobile' ? 0.8 : 0.9;
  const usesPhoto = card === 'photo' || (prefs.style === 'photo' && !['bib', 'clear'].includes(card));
  const meta = CARDS.flatMap((g) => g.list.map(([id, n]) => ({ id, n, group: g.group }))).find((x) => x.id === card);

  useEffect(() => {
    let alive = true;
    const t = setTimeout(() => { if (nodeRef.current) cardToBlob(nodeRef.current).then((blob) => { if (alive) ready.current = { key, blob }; }).catch(() => {}); }, 450);
    return () => { alive = false; clearTimeout(t); };
  }, [key]);

  const setShow = (id) => setPrefs((p) => ({ ...p, show: { ...p.show, [id]: !p.show[id] } }));
  const pickPhoto = () => fileRef.current?.click();
  const onPhoto = async (e) => {
    const f = e.target.files?.[0]; e.target.value = '';
    if (!f) return;
    try { setPhoto(await readPhoto(f)); } catch (err) { k.actions.toast('Couldn’t read that photo'); }
  };
  const setStyle = (v) => { setPrefs((p) => ({ ...p, style: v })); if (v === 'photo' && !photo) pickPhoto(); };

  const blob = async () => (ready.current.key === key && ready.current.blob) || cardToBlob(nodeRef.current);
  const run = async (what, fn) => {
    setBusy(what);
    try {
      k.actions.saveSharePrefs(prefs);
      await fn(await blob());
    } catch (e) { k.actions.toast(`Couldn’t create the image — ${e.message || e}`); } finally { setBusy(null); }
  };
  const name = fileName(d, card);
  const onShare = () => run('share', async (b) => { const r = await shareBlob(b, name, `${d.title} · Kairo`); if (r === 'saved') k.actions.toast('Image saved'); });
  const onSave = () => run('save', async (b) => { saveBlob(b, name); k.actions.toast('Image saved'); });
  const onCopy = () => run('copy', async (b) => { await copyBlob(b); k.actions.toast('Image copied'); });

  return (
    <Sheet title="Share today" onClose={onClose} className="ks-sheet">
      <input ref={fileRef} className="ks-file" type="file" accept="image/*" onChange={onPhoto} />
      <div className="ks-body">
        <div className="ks-preview">
          <div className={cx('ks-frame', card === 'clear' && 'is-clear', usesPhoto && 'is-pickable')} style={{ width: fmt.w * scale, height: fmt.h * scale }}
            onClick={usesPhoto ? pickPhoto : undefined} title={usesPhoto ? 'Choose a photo' : undefined}>
            <div className="ks-scale" style={{ transform: `scale(${scale})` }}>
              <ShareCard ref={nodeRef} kind={card} d={d} prefs={prefs} photo={photo} />
            </div>
          </div>
          <div className="ks-cardname"><b>{meta?.n}</b> · {meta?.group}</div>
        </div>

        <div className="ks-side">
          <div className="ks-thumbs" role="listbox" aria-label="Card">
            {CARD_LIST.map(([id, n]) => (
              <button key={id} type="button" role="option" aria-selected={card === id} aria-label={n} title={n} className={cx('ks-thumb', card === id && 'on', id === 'clear' && 'is-clear')} onClick={() => setCard(id)}>
                <div className="ks-scale"><ShareCard kind={id} d={d} prefs={{ ...prefs, format: 'story' }} photo={photo} /></div>
              </button>
            ))}
          </div>
          <div className="ks-row"><span className="label k-muted">Format</span><Segmented size="sm" options={Object.entries(FORMATS).map(([v, f]) => ({ value: v, label: f.label }))} value={prefs.format} onChange={(v) => setPrefs((p) => ({ ...p, format: v }))} /></div>
          <div className="ks-row"><span className="label k-muted">Style</span><Segmented size="sm" options={STYLES.map(([v, l]) => ({ value: v, label: l }))} value={prefs.style} onChange={setStyle} /></div>
          {usesPhoto ? (
            <div className="ks-row">
              <span className="ks-hint">{photo ? 'Your photo stays on this device.' : 'Pick a photo from your camera roll. It never leaves this device.'}</span>
              <Button variant="secondary" size="sm" icon="image" onClick={pickPhoto}>{photo ? 'Change photo' : 'Add photo'}</Button>
            </div>
          ) : null}
          <div>
            <div className="label k-muted" style={{ marginBottom: 6 }}>Show</div>
            <div className="ks-chips">
              {SHOW.map(([id, l]) => (
                <button key={id} type="button" role="switch" aria-checked={!!prefs.show[id]} className={cx('ks-chip', prefs.show[id] && 'on')} onClick={() => setShow(id)}>
                  {prefs.show[id] ? <Icon name="check" size={13} stroke={2.6} /> : null}{l}
                </button>
              ))}
            </div>
          </div>
          {!d.isDone && d.s ? <p className="ks-hint">This session isn’t marked done yet. The card shows the plan until you log it.</p> : null}
        </div>
      </div>
      <div className="ks-actions">
        <Button variant="primary" size="lg" icon={shareable ? 'share' : 'download'} onClick={shareable ? onShare : onSave} disabled={!!busy}>{busy ? 'Preparing…' : shareable ? 'Share…' : 'Download PNG'}</Button>
        {shareable ? <Button variant="icon" size="lg" icon="download" onClick={onSave} disabled={!!busy} aria-label="Save image" title="Save image" /> : null}
        {copyable ? <Button variant="icon" size="lg" icon="copy" onClick={onCopy} disabled={!!busy} aria-label="Copy image" title="Copy image" /> : null}
      </div>
    </Sheet>
  );
}
