import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { LocateFixed, MapPin, Search, Loader2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

const GEO = `${process.env.REACT_APP_BACKEND_URL}/api/geo`;

// Enter an address (autocomplete) or use GPS; returns {lat,lng,formatted,city,state,pincode}.
export default function LocationPicker({ value, onChange, testid = 'location-picker' }) {
  const [q, setQ] = useState('');
  const [preds, setPreds] = useState([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (q.trim().length < 3) { setPreds([]); return undefined; }
    const t = setTimeout(() => {
      axios.get(`${GEO}/autocomplete`, { params: { q } }).then((r) => setPreds(r.data.predictions || [])).catch(() => setPreds([]));
    }, 350);
    return () => clearTimeout(t);
  }, [q]);

  const pick = async (p) => {
    setBusy(true); setPreds([]); setQ(p.description);
    try { const r = await axios.get(`${GEO}/place-details`, { params: { place_id: p.place_id } }); onChange(r.data); }
    catch { toast.error('Could not resolve that address'); } finally { setBusy(false); }
  };

  const useGps = () => {
    if (!navigator.geolocation) { toast.error('Location not supported on this device'); return; }
    setBusy(true);
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const { latitude: lat, longitude: lng } = pos.coords;
      let info = { lat, lng, formatted: `${lat.toFixed(5)}, ${lng.toFixed(5)}` };
      try { const r = await axios.get(`${GEO}/reverse-geocode`, { params: { lat, lng } }); info = { ...r.data, lat, lng }; } catch { /* coords only */ }
      onChange(info); setBusy(false); toast.success('Current location captured');
    }, () => { setBusy(false); toast.error('Allow location permission to use current location'); },
    { enableHighAccuracy: true, timeout: 12000 });
  };

  return (
    <div className="space-y-2" data-testid={testid}>
      <button type="button" onClick={useGps} disabled={busy} data-testid={`${testid}-gps`}
        className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-600 text-emerald-700 font-bold text-sm py-2.5 hover:bg-emerald-50 transition-colors">
        {busy ? <Loader2 size={15} className="animate-spin" /> : <LocateFixed size={15} />} Use my current location
      </button>
      <div className="relative">
        <Search size={14} className="absolute left-3 top-3.5 text-stone-400" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="…or search your area / address" data-testid={`${testid}-search`}
          className="w-full rounded-xl border border-stone-200 pl-9 pr-3 py-3 text-sm focus:outline-none focus:border-emerald-500" />
        {preds.length > 0 && (
          <div className="absolute z-20 mt-1 w-full bg-white border border-stone-200 rounded-xl shadow-lg max-h-56 overflow-y-auto">
            {preds.map((p, i) => (
              <button type="button" key={p.place_id} onClick={() => pick(p)} data-testid={`${testid}-pred-${i}`}
                className="w-full text-left px-3 py-2.5 text-xs hover:bg-emerald-50 flex gap-2 border-b border-stone-50 last:border-0">
                <MapPin size={13} className="text-emerald-600 shrink-0 mt-0.5" /> {p.description}
              </button>
            ))}
          </div>
        )}
      </div>
      {value?.lat != null && (
        <p className="text-[11px] text-emerald-800 bg-emerald-50 rounded-lg px-3 py-2 flex gap-1.5" data-testid={`${testid}-value`}>
          <CheckCircle2 size={13} className="shrink-0 mt-0.5" /> {value.formatted || `${value.lat}, ${value.lng}`}
        </p>
      )}
    </div>
  );
}
