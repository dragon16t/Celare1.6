import React, { useEffect, useState } from 'react';
import { ImagePlus, Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { mp, adminHdr } from '../../utils/mpApi';

const input = 'w-full rounded-lg border border-stone-200 px-3 py-2 text-xs focus:outline-none focus:border-emerald-500';

const ContentRow = ({ item, fields, image, onImage, onSave, testid }) => {
  const [vals, setVals] = useState(() => Object.fromEntries(fields.map(([k, , get]) => [k, get(item)])));
  const [busy, setBusy] = useState(false);
  const save = async () => { setBusy(true); try { await onSave(vals); } finally { setBusy(false); } };
  const upload = async (f) => { setBusy(true); try { await onImage(f); } finally { setBusy(false); } };
  return (
    <div className="bg-white rounded-2xl border border-stone-200 p-4 flex gap-4" data-testid={testid}>
      <div className="w-24 shrink-0">
        <div className="w-24 h-24 rounded-xl overflow-hidden bg-emerald-50 border border-stone-100">
          {image ? <img src={image} alt="" className="w-full h-full object-cover" /> : <span className="w-full h-full flex items-center justify-center text-[10px] text-stone-400">No image</span>}
        </div>
        <label className="mt-2 w-full border border-stone-300 text-[11px] font-bold rounded-full py-1.5 cursor-pointer inline-flex items-center justify-center gap-1 hover:border-emerald-600" data-testid={`${testid}-image`}>
          <ImagePlus size={12} /> Replace
          <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => e.target.files[0] && upload(e.target.files[0])} />
        </label>
      </div>
      <div className="flex-1 min-w-0 space-y-2">
        {fields.map(([k, label, , multi]) => (
          <label key={k} className="block">
            <span className="text-[10px] font-bold uppercase tracking-wide text-stone-500">{label}</span>
            {multi
              ? <textarea rows={2} value={vals[k]} onChange={(e) => setVals({ ...vals, [k]: e.target.value })} className={input} data-testid={`${testid}-${k}`} />
              : <input value={vals[k]} onChange={(e) => setVals({ ...vals, [k]: e.target.value })} className={input} data-testid={`${testid}-${k}`} />}
          </label>
        ))}
        <button onClick={save} disabled={busy} data-testid={`${testid}-save`}
          className="bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] font-bold rounded-full px-4 py-2 inline-flex items-center gap-1.5">
          {busy ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} Save
        </button>
      </div>
    </div>
  );
};

const patch = (kind, id, body) => mp.patch(`/admin/content/${kind}/${id}`, body, adminHdr())
  .then(() => toast.success('Saved')).catch((e) => toast.error(e.response?.data?.detail || 'Save failed'));
const upload = (url, f, reload) => { const fd = new FormData(); fd.append('file', f);
  return mp.post(url, fd, adminHdr()).then(() => { toast.success('Image updated'); reload(); }).catch((e) => toast.error(e.response?.data?.detail || 'Upload failed')); };

const SVC_FIELDS = [['name', 'Service name', (s) => s.name || ''], ['short_desc', 'Short description', (s) => s.short_desc || '', true], ['full_desc', 'Full description', (s) => s.full_desc || '', true]];
const CAT_FIELDS = [['title', 'Title', (c) => c.title || ''], ['description', 'Description', (c) => c.description || '', true]];
const DOC_FIELDS = [['professional.specialisation', 'Headline specialisation', (d) => d.professional?.specialisation || ''],
  ['professional.specialties', 'Specialties (comma separated)', (d) => (d.professional?.specialties || []).join(', ')], ['professional.bio', 'Bio', (d) => d.professional?.bio || '', true]];

// Admin "Services & Content" — list every item with editable text + image, per module.
export default function MpContentManager({ module }) {
  const [items, setItems] = useState(null);
  const [cats, setCats] = useState([]);
  const load = () => {
    const catModule = module === 'doctor' ? 'doctor' : 'service';
    mp.get('/admin/categories', { ...adminHdr(), params: { module: catModule } }).then((r) => setCats(r.data.filter((c) => c.module === catModule))).catch(() => {});
    mp.get(module === 'doctor' ? '/admin/doctors' : '/admin/services', adminHdr()).then((r) => setItems(r.data)).catch(() => setItems([]));
  };
  useEffect(load, [module]); // eslint-disable-line
  if (!items) return <p className="text-sm text-stone-400 p-4">Loading…</p>;
  const isDoc = module === 'doctor';
  return (
    <div className="space-y-6" data-testid={`content-manager-${module}`}>
      <section>
        <h2 className="font-extrabold text-stone-900">{isDoc ? 'Dermatologist profiles' : 'All partner services'}</h2>
        <p className="text-[11px] text-stone-400 mb-3">Edit the text and image customers see. Changes go live instantly.</p>
        <div className="grid lg:grid-cols-2 gap-3">
          {items.map((it) => isDoc ? (
            <ContentRow key={it.doctor_id} item={it} fields={DOC_FIELDS} testid={`content-doc-${it.doctor_id}`}
              image={it.photo?.chosen || it.photo?.original_url}
              onImage={(f) => upload(`/admin/doctors/${it.doctor_id}/photo`, f, load)}
              onSave={(v) => patch('doctor', it.doctor_id, { ...v, 'professional.specialties': v['professional.specialties'].split(',').map((s) => s.trim()).filter(Boolean) })} />
          ) : (
            <ContentRow key={it.service_id} item={it} fields={SVC_FIELDS} testid={`content-svc-${it.service_id}`}
              image={it.thumbnail || it.images?.[0]}
              onImage={(f) => upload(`/admin/services/${it.service_id}/images?replace=true`, f, load)}
              onSave={(v) => patch('service', it.service_id, v)} />
          ))}
          {items.length === 0 && <p className="text-xs text-stone-400">Nothing here yet.</p>}
        </div>
      </section>
      <section>
        <h2 className="font-extrabold text-stone-900">{isDoc ? 'Consultation categories' : 'Service categories'}</h2>
        <div className="grid lg:grid-cols-2 gap-3 mt-3">
          {cats.map((c) => (
            <ContentRow key={c.cat_id} item={c} fields={CAT_FIELDS} testid={`content-cat-${c.cat_id}`} image={c.image}
              onImage={(f) => upload(`/admin/categories/${c.cat_id}/image`, f, load)}
              onSave={(v) => patch('category', c.cat_id, v)} />
          ))}
        </div>
      </section>
    </div>
  );
}
