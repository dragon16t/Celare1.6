import React, { useEffect, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { mp } from '../../utils/mpApi';

const inp = 'w-full rounded-xl border border-stone-200 px-3 py-2 text-xs';

// Category → subcategory → service picker for partner onboarding. `selected` = {service_id: {service_id, price, mode}}
export default function HbServicePicker({ selected, onChange }) {
  const [tree, setTree] = useState([]);
  const [open, setOpen] = useState('');
  useEffect(() => { mp.get('/catalog/tree', { params: { context: 'onboarding' } }).then((r) => { setTree(r.data); setOpen(r.data[0]?.cat_id || ''); }).catch(() => {}); }, []);
  const toggle = (s) => {
    const n = { ...selected };
    if (n[s.service_id]) delete n[s.service_id]; else n[s.service_id] = { service_id: s.service_id, price: s.price, mode: 'home', coverage: '' };
    onChange(n);
  };
  const countIn = (c) => c.subcategories.reduce((a, sb) => a + sb.services.filter((s) => selected[s.service_id]).length, 0);
  const cat = tree.find((c) => c.cat_id === open);
  return (
    <div data-testid="hb-service-picker">
      <div className="grid grid-cols-3 gap-2">
        {tree.map((c) => (
          <button type="button" key={c.cat_id} onClick={() => setOpen(c.cat_id)} data-testid={`hb-pick-cat-${c.cat_id}`}
            className={`relative rounded-xl border p-1.5 text-center transition-colors ${open === c.cat_id ? 'border-emerald-600 bg-emerald-50' : 'border-stone-200'}`}>
            <img src={c.image} alt="" className="w-full aspect-square rounded-lg object-cover" />
            <span className="block text-[10px] font-bold text-stone-800 mt-1 leading-tight">{c.title}</span>
            {countIn(c) > 0 && <span className="absolute -top-1.5 -right-1.5 bg-emerald-700 text-white text-[10px] font-black rounded-full w-5 h-5 flex items-center justify-center">{countIn(c)}</span>}
          </button>
        ))}
      </div>
      {cat && (
        <div className="mt-3 rounded-2xl border border-stone-200 p-3 space-y-3" data-testid="hb-pick-panel">
          <div className="flex items-center justify-between">
            <p className="text-sm font-extrabold text-stone-900">{cat.title}</p>
            <button type="button" data-testid="hb-pick-all" onClick={() => {
              const n = { ...selected };
              cat.subcategories.forEach((sb) => sb.services.forEach((s) => { n[s.service_id] = n[s.service_id] || { service_id: s.service_id, price: s.price, mode: 'home', coverage: '' }; }));
              onChange(n);
            }} className="text-[11px] font-bold text-emerald-700 underline">Select all</button>
          </div>
          {cat.subcategories.map((sb) => (
            <div key={sb.sub_id}>
              <p className="text-[10px] font-black uppercase tracking-wider text-stone-500 mb-1">{sb.title}</p>
              {sb.services.map((s) => {
                const sel = selected[s.service_id];
                return (
                  <div key={s.service_id} className={`rounded-xl border p-2.5 mb-1.5 ${sel ? 'border-emerald-500 bg-emerald-50/50' : 'border-stone-100'}`}>
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-stone-800">
                      <input type="checkbox" checked={!!sel} onChange={() => toggle(s)} className="accent-emerald-700" data-testid={`hb-pick-svc-${s.service_id}`} />
                      <span className="flex-1">{s.name}</span>
                      <span className="text-[10px] capitalize rounded-full bg-stone-100 px-1.5 py-0.5 text-stone-500">{s.gender || 'unisex'}</span>
                      <span className="text-[10px] text-stone-400">₹{s.price_range?.min || s.price}–{s.price_range?.max || s.price}</span>
                    </label>
                    {sel && (
                      <input type="number" value={sel.price} min={s.price_range?.min || 0} max={s.price_range?.max || undefined} placeholder="Your price ₹"
                        onChange={(e) => onChange({ ...selected, [s.service_id]: { ...sel, price: Number(e.target.value) } })}
                        className={`${inp} mt-2`} data-testid={`hb-pick-price-${s.service_id}`} />
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
      {Object.keys(selected).length > 0 && (
        <p className="mt-2 text-[11px] text-emerald-800 flex items-center gap-1" data-testid="hb-pick-count"><CheckCircle2 size={13} /> {Object.keys(selected).length} services selected</p>
      )}
    </div>
  );
}
