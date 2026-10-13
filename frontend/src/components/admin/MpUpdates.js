import React, { useEffect, useState } from 'react';
import { MapPinned, Megaphone, Send, Timer } from 'lucide-react';
import { toast } from 'sonner';
import { mp, adminHdr } from '../../utils/mpApi';

const inp = 'w-full rounded-xl border border-stone-200 px-3.5 py-2.5 text-sm focus:outline-none focus:border-emerald-500';

// Admin "Updates" — service radius, request window and broadcast notices for one provider type.
export default function MpUpdates({ module }) {
  const isDoc = module === 'doctor';
  const rKey = isDoc ? 'doctor_radius_km' : 'service_radius_km';
  const audience = isDoc ? 'doctor' : 'partner';
  const [cfg, setCfg] = useState(null);
  const [radius, setRadius] = useState('');
  const [expiry, setExpiry] = useState('');
  const [msg, setMsg] = useState({ title: '', body: '' });
  const [history, setHistory] = useState([]);
  const load = () => {
    mp.get('/admin/config', adminHdr()).then((r) => { setCfg(r.data); setRadius(r.data[rKey]); setExpiry(r.data.offer_expiry_minutes); }).catch(() => {});
    mp.get('/admin/announcements', { ...adminHdr(), params: { audience } }).then((r) => setHistory(r.data)).catch(() => {});
  };
  useEffect(load, [module]); // eslint-disable-line
  if (!cfg) return <p className="text-sm text-stone-400">Loading…</p>;
  const saveCfg = (patch) => mp.put('/admin/config', patch, adminHdr()).then(() => { toast.success('Updated'); load(); }).catch(() => toast.error('Update failed'));
  const send = () => mp.post('/admin/announcements', { audience, ...msg }, adminHdr())
    .then((r) => { toast.success(`Sent to ${r.data.recipients} ${audience}s`); setMsg({ title: '', body: '' }); load(); })
    .catch((e) => toast.error(e.response?.data?.detail || 'Failed'));

  return (
    <div className="grid lg:grid-cols-2 gap-4" data-testid={`updates-${module}`}>
      <div className="bg-white rounded-2xl border border-stone-200 p-5">
        <p className="font-extrabold text-stone-900 text-sm flex items-center gap-1.5"><MapPinned size={15} /> {isDoc ? 'Dermatologist discovery radius' : 'Home service radius'}</p>
        <p className="text-[11px] text-stone-400 mt-1">{isDoc ? 'Customers see dermatologists within this distance.' : 'Only partners within this distance get bookings & are shown.'}</p>
        <div className="flex gap-2 mt-3">
          <input type="number" min="1" max="200" value={radius} onChange={(e) => setRadius(e.target.value)} className={inp} data-testid={`radius-${module}`} />
          <span className="self-center text-sm font-bold text-stone-500">km</span>
          <button onClick={() => saveCfg({ [rKey]: Number(radius) })} data-testid={`radius-save-${module}`} className="bg-emerald-700 text-white text-xs font-extrabold rounded-full px-5">Update</button>
        </div>
        <p className="font-extrabold text-stone-900 text-sm flex items-center gap-1.5 mt-6"><Timer size={15} /> Booking request window</p>
        <p className="text-[11px] text-stone-400 mt-1">Minutes a scheduled request stays open for {audience}s to accept (instant requests: 3 min).</p>
        <div className="flex gap-2 mt-3">
          <input type="number" min="1" max="120" value={expiry} onChange={(e) => setExpiry(e.target.value)} className={inp} data-testid={`expiry-${module}`} />
          <span className="self-center text-sm font-bold text-stone-500">min</span>
          <button onClick={() => saveCfg({ offer_expiry_minutes: Number(expiry) })} className="bg-emerald-700 text-white text-xs font-extrabold rounded-full px-5">Update</button>
        </div>
      </div>
      <div className="bg-white rounded-2xl border border-stone-200 p-5">
        <p className="font-extrabold text-stone-900 text-sm flex items-center gap-1.5"><Megaphone size={15} /> Send update to all {isDoc ? 'dermatologists' : 'service partners'}</p>
        <input placeholder="Title" value={msg.title} onChange={(e) => setMsg({ ...msg, title: e.target.value })} className={`${inp} mt-3`} data-testid={`ann-title-${module}`} />
        <textarea rows={3} placeholder="Message" value={msg.body} onChange={(e) => setMsg({ ...msg, body: e.target.value })} className={`${inp} mt-2`} data-testid={`ann-body-${module}`} />
        <button onClick={send} disabled={!msg.title} data-testid={`ann-send-${module}`} className="mt-2 inline-flex items-center gap-1.5 bg-sky-700 disabled:opacity-40 text-white text-xs font-extrabold rounded-full px-5 py-2.5"><Send size={13} /> Send update</button>
        <div className="mt-4 divide-y divide-stone-50">
          {history.map((h) => (
            <div key={h.ann_id} className="py-2 text-xs">
              <p className="font-bold text-stone-800">{h.title} <span className="font-normal text-stone-400">• {h.recipients} recipients • {new Date(h.at).toLocaleString('en-IN')}</span></p>
              {h.body && <p className="text-stone-500">{h.body}</p>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
