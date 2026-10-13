import React, { useState } from 'react';
import { Clock, X, Plus } from 'lucide-react';

const PRESETS = ['09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'];
const fmt12 = (t) => { const [h, m] = t.split(':').map(Number); return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`; };

// Clock-style time selector for one day: tap presets or pick any time with the native clock.
export const DaySlots = ({ day, label, value = [], onChange }) => {
  const [t, setT] = useState('');
  const set = (arr) => onChange([...new Set(arr)].sort());
  const toggle = (x) => set(value.includes(x) ? value.filter((v) => v !== x) : [...value, x]);
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-3" data-testid={`slots-${day}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-extrabold text-stone-800">{label}</span>
        <span className={`text-[10px] font-bold ${value.length ? 'text-emerald-700' : 'text-stone-400'}`}>{value.length ? `${value.length} slots` : 'Off'}</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {PRESETS.map((p) => (
          <button type="button" key={p} onClick={() => toggle(p)} data-testid={`slot-${day}-${p}`}
            className={`text-[11px] font-bold rounded-full px-2.5 py-1 border transition-colors ${value.includes(p) ? 'bg-emerald-700 border-emerald-700 text-white' : 'border-stone-200 text-stone-600 hover:border-emerald-400'}`}>{fmt12(p)}</button>
        ))}
        {value.filter((v) => !PRESETS.includes(v)).map((v) => (
          <span key={v} className="inline-flex items-center gap-1 text-[11px] font-bold rounded-full pl-2.5 pr-1 py-1 bg-emerald-700 text-white">
            {fmt12(v)}<button type="button" onClick={() => toggle(v)} aria-label="Remove"><X size={11} /></button>
          </span>
        ))}
      </div>
      <div className="flex items-center gap-2 mt-2">
        <Clock size={14} className="text-stone-400" />
        <input type="time" step="900" value={t} onChange={(e) => setT(e.target.value)} data-testid={`slot-time-${day}`}
          className="rounded-lg border border-stone-200 px-2 py-1 text-xs" />
        <button type="button" disabled={!t} onClick={() => { set([...value, t]); setT(''); }} data-testid={`slot-add-${day}`}
          className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 disabled:opacity-40"><Plus size={12} /> Add time</button>
        {value.length > 0 && <button type="button" onClick={() => onChange([])} className="ml-auto text-[10px] text-stone-400 underline">Clear</button>}
      </div>
    </div>
  );
};

export default function SlotPicker({ days, value = {}, onChange }) {
  return (
    <div className="grid sm:grid-cols-2 gap-2" data-testid="slot-picker">
      {days.map(([key, label]) => (
        <DaySlots key={key} day={key} label={label} value={value[key] || []} onChange={(arr) => onChange({ ...value, [key]: arr })} />
      ))}
    </div>
  );
}
