import React, { useEffect, useState } from 'react';
import { Plus, Trash2, ImagePlus, Save, ChevronDown, ChevronRight, Users } from 'lucide-react';
import { toast } from 'sonner';
import { mp, adminHdr, statusColor, fmtStatus } from '../../utils/mpApi';

const inp = 'rounded-lg border border-stone-200 px-2.5 py-1.5 text-xs focus:outline-none focus:border-emerald-500';
const err = (e) => toast.error(e.response?.data?.detail || 'Failed');
const uploadTo = async (url, file, done) => {
  const fd = new FormData(); fd.append('file', file);
  try { await mp.post(url, fd, adminHdr()); toast.success('Image updated'); done(); } catch (e) { err(e); }
};

const Img = ({ src, url, done, testid }) => (
  <label className="relative w-12 h-12 rounded-lg overflow-hidden bg-sky-50 border border-stone-200 shrink-0 cursor-pointer group" data-testid={testid}>
    {src && <img src={src} alt="" className="w-full h-full object-cover" />}
    <span className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white"><ImagePlus size={14} /></span>
    <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files[0] && uploadTo(url, e.target.files[0], done)} />
  </label>
);

const ServiceRow = ({ s, reload }) => {
  const [v, setV] = useState({ name: s.name, price: s.price, duration_min: s.duration_min, gender: s.gender || 'unisex', status: s.status, show_in_onboarding: s.show_in_onboarding !== false, order: s.order || 0 });
  const save = () => mp.put(`/admin/hb/services/${s.service_id}`, { ...v, price: Number(v.price), duration_min: Number(v.duration_min), order: Number(v.order) }, adminHdr()).then(() => { toast.success('Service saved'); reload(); }).catch(err);
  return (
    <div className="flex flex-wrap items-center gap-1.5 py-1.5 border-b border-stone-50 last:border-0" data-testid={`hb-adm-svc-${s.service_id}`}>
      <input value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} className={`${inp} flex-1 min-w-[140px]`} />
      <input type="number" value={v.price} onChange={(e) => setV({ ...v, price: e.target.value })} className={`${inp} w-20`} title="Base price ₹" />
      <input type="number" value={v.duration_min} onChange={(e) => setV({ ...v, duration_min: e.target.value })} className={`${inp} w-16`} title="Minutes" />
      <select value={v.gender} onChange={(e) => setV({ ...v, gender: e.target.value })} className={inp}><option value="unisex">Unisex</option><option value="women">Women</option><option value="men">Men</option></select>
      <select value={v.status} onChange={(e) => setV({ ...v, status: e.target.value })} className={inp}><option value="active">Active</option><option value="inactive">Inactive</option><option value="archived">Archived</option></select>
      <label className="text-[10px] flex items-center gap-1"><input type="checkbox" checked={v.show_in_onboarding} onChange={(e) => setV({ ...v, show_in_onboarding: e.target.checked })} /> Onboarding</label>
      <button onClick={save} className="text-emerald-700" data-testid={`hb-adm-svc-save-${s.service_id}`}><Save size={14} /></button>
      <button onClick={() => window.confirm('Remove this service?') && mp.delete(`/admin/hb/services/${s.service_id}`, adminHdr()).then(reload)} className="text-rose-500"><Trash2 size={14} /></button>
    </div>
  );
};

const SubBlock = ({ sb, reload }) => {
  const [v, setV] = useState({ title: sb.title, order: sb.order || 0, active: sb.active !== false });
  const [n, setN] = useState({ name: '', price: '', duration_min: 30, gender: 'unisex' });
  const add = () => n.name && n.price && mp.post('/admin/hb/services', { ...n, subcategory_id: sb.sub_id, price: Number(n.price), duration_min: Number(n.duration_min) }, adminHdr()).then(() => { setN({ name: '', price: '', duration_min: 30, gender: 'unisex' }); reload(); toast.success('Service added'); }).catch(err);
  return (
    <div className="ml-4 sm:ml-8 mt-2 rounded-xl border border-stone-100 bg-stone-50/50 p-3" data-testid={`hb-adm-sub-${sb.sub_id}`}>
      <div className="flex flex-wrap items-center gap-2">
        <Img src={sb.image} url={`/admin/subcategories/${sb.sub_id}/image`} done={reload} testid={`hb-adm-sub-img-${sb.sub_id}`} />
        <input value={v.title} onChange={(e) => setV({ ...v, title: e.target.value })} className={`${inp} flex-1 font-bold`} />
        <input type="number" value={v.order} onChange={(e) => setV({ ...v, order: Number(e.target.value) })} className={`${inp} w-14`} title="Order" />
        <label className="text-[10px] flex items-center gap-1"><input type="checkbox" checked={v.active} onChange={(e) => setV({ ...v, active: e.target.checked })} /> Active</label>
        <button onClick={() => mp.put(`/admin/subcategories/${sb.sub_id}`, v, adminHdr()).then(() => { toast.success('Saved'); reload(); }).catch(err)} className="text-emerald-700"><Save size={14} /></button>
        <button onClick={() => window.confirm(`Delete "${sb.title}" and archive its services?`) && mp.delete(`/admin/subcategories/${sb.sub_id}`, adminHdr()).then(reload)} className="text-rose-500"><Trash2 size={14} /></button>
      </div>
      <div className="mt-2">{sb.services.map((s) => <ServiceRow key={s.service_id} s={s} reload={reload} />)}</div>
      <div className="flex flex-wrap gap-1.5 mt-2">
        <input placeholder="New service name" value={n.name} onChange={(e) => setN({ ...n, name: e.target.value })} className={`${inp} flex-1`} data-testid={`hb-adm-new-svc-${sb.sub_id}`} />
        <input placeholder="₹" type="number" value={n.price} onChange={(e) => setN({ ...n, price: e.target.value })} className={`${inp} w-20`} />
        <select value={n.gender} onChange={(e) => setN({ ...n, gender: e.target.value })} className={inp}><option value="unisex">Unisex</option><option value="women">Women</option><option value="men">Men</option></select>
        <button onClick={add} className="bg-emerald-700 text-white text-[11px] font-bold rounded-full px-3 inline-flex items-center gap-1"><Plus size={12} /> Service</button>
      </div>
    </div>
  );
};

const CatBlock = ({ c, reload }) => {
  const [openC, setOpenC] = useState(false);
  const [v, setV] = useState({ title: c.title, description: c.description || '', order: c.order || 0, active: c.active !== false, show_on_home: c.show_on_home !== false, show_in_onboarding: c.show_in_onboarding !== false });
  const [sub, setSub] = useState('');
  const save = () => mp.put(`/admin/categories/${c.cat_id}`, { ...c, ...v, module: 'service', image: c.image || '' }, adminHdr()).then(() => { toast.success('Category saved'); reload(); }).catch(err);
  return (
    <div className="bg-white rounded-2xl border border-stone-200 p-4" data-testid={`hb-adm-cat-${c.cat_id}`}>
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={() => setOpenC(!openC)} className="text-stone-400">{openC ? <ChevronDown size={16} /> : <ChevronRight size={16} />}</button>
        <Img src={c.image} url={`/admin/categories/${c.cat_id}/image`} done={reload} testid={`hb-adm-cat-img-${c.cat_id}`} />
        <input value={v.title} onChange={(e) => setV({ ...v, title: e.target.value })} className={`${inp} flex-1 font-extrabold text-sm`} />
        <input type="number" value={v.order} onChange={(e) => setV({ ...v, order: Number(e.target.value) })} className={`${inp} w-14`} title="Display order" />
        {[['active', 'Active'], ['show_on_home', 'Homepage'], ['show_in_onboarding', 'Onboarding']].map(([k, l]) => (
          <label key={k} className="text-[10px] flex items-center gap-1"><input type="checkbox" checked={v[k]} onChange={(e) => setV({ ...v, [k]: e.target.checked })} /> {l}</label>
        ))}
        <button onClick={save} data-testid={`hb-adm-cat-save-${c.cat_id}`} className="bg-emerald-700 text-white text-[11px] font-bold rounded-full px-3 py-1.5">Save</button>
        <button onClick={() => window.confirm(`Delete "${c.title}"?`) && mp.delete(`/admin/categories/${c.cat_id}`, adminHdr()).then(reload)} className="text-rose-500"><Trash2 size={15} /></button>
      </div>
      <input placeholder="Description" value={v.description} onChange={(e) => setV({ ...v, description: e.target.value })} className={`${inp} w-full mt-2`} />
      <p className="text-[10px] text-stone-400 mt-1">{c.subcategories.length} subcategories • {c.subcategories.reduce((a, s) => a + s.services.length, 0)} services</p>
      {openC && (
        <>
          {c.subcategories.map((sb) => <SubBlock key={sb.sub_id} sb={sb} reload={reload} />)}
          <div className="ml-4 sm:ml-8 mt-2 flex gap-2">
            <input placeholder="New subcategory" value={sub} onChange={(e) => setSub(e.target.value)} className={`${inp} flex-1`} data-testid={`hb-adm-new-sub-${c.cat_id}`} />
            <button onClick={() => sub && mp.post('/admin/subcategories', { cat_id: c.cat_id, title: sub, order: c.subcategories.length, image: c.image }, adminHdr()).then(() => { setSub(''); reload(); }).catch(err)}
              className="bg-sky-700 text-white text-[11px] font-bold rounded-full px-3 inline-flex items-center gap-1" data-testid={`hb-adm-add-sub-${c.cat_id}`}><Plus size={12} /> Subcategory</button>
          </div>
        </>
      )}
    </div>
  );
};

const PartnerSelections = () => {
  const [rows, setRows] = useState(null);
  useEffect(() => { mp.get('/admin/hb/partner-selections', adminHdr()).then((r) => setRows(r.data)).catch(() => setRows([])); }, []);
  if (!rows) return null;
  return (
    <div className="bg-white rounded-2xl border border-stone-200 p-4" data-testid="hb-partner-selections">
      <p className="font-extrabold text-stone-900 text-sm flex items-center gap-1.5 mb-3"><Users size={15} /> Services selected by each partner</p>
      {rows.map((p) => (
        <details key={p.partner_id} className="border-b border-stone-50 last:border-0 py-2">
          <summary className="text-xs font-bold text-stone-800 cursor-pointer">{p.applicant?.business_name || p.applicant?.name} <span className="text-stone-400 font-normal">• {p.services?.length || 0} services • {p.staff?.female ?? 0}F/{p.staff?.male ?? 0}M</span>
            <span className={`ml-2 text-[10px] rounded-full px-2 py-0.5 ${statusColor(p.application_status)}`}>{fmtStatus(p.application_status)}</span></summary>
          <div className="flex flex-wrap gap-1 mt-2">
            {(p.services || []).map((s) => <span key={s.service_id} className="text-[10px] bg-stone-50 border border-stone-100 rounded-full px-2 py-0.5">{s.category_title ? `${s.category_title} › ` : ''}{s.service_name} • ₹{s.price}</span>)}
          </div>
        </details>
      ))}
    </div>
  );
};

export default function HbCatalogManager() {
  const [tree, setTree] = useState(null);
  const [title, setTitle] = useState('');
  const load = () => mp.get('/admin/catalog/tree', adminHdr()).then((r) => setTree(r.data.filter((c) => !c.legacy))).catch(() => setTree([]));
  useEffect(() => { load(); }, []);
  if (!tree) return <p className="text-sm text-stone-400">Loading…</p>;
  return (
    <div className="space-y-3" data-testid="hb-catalog-manager">
      <div className="bg-sky-50 border border-sky-100 rounded-2xl p-4">
        <p className="font-extrabold text-stone-900">Health & Beauty Service Management</p>
        <p className="text-[11px] text-stone-500">One central tree: main categories → subcategories → services. Used by the homepage, category pages and partner onboarding. Click ▸ to manage subcategories & services; click any image to replace it.</p>
        <div className="flex gap-2 mt-3">
          <input placeholder="New main category" value={title} onChange={(e) => setTitle(e.target.value)} className={`${inp} flex-1`} data-testid="hb-adm-new-cat" />
          <button onClick={() => title && mp.post('/admin/categories', { module: 'service', title, order: tree.length }, adminHdr()).then(() => { setTitle(''); load(); }).catch(err)}
            className="bg-emerald-700 text-white text-xs font-bold rounded-full px-4 inline-flex items-center gap-1" data-testid="hb-adm-add-cat"><Plus size={13} /> Category</button>
        </div>
      </div>
      {tree.map((c) => <CatBlock key={`${c.cat_id}-${c.subcategories.length}-${c.image}`} c={c} reload={load} />)}
      <PartnerSelections />
    </div>
  );
}
