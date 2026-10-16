import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Pencil, Trash2, X, Save, Loader2, BadgeCheck, ImagePlus, RefreshCcw } from 'lucide-react';
import { mp, adminHdr, statusColor, fmtStatus } from '../../utils/mpApi';

const input = 'w-full rounded-lg border border-stone-200 px-3 py-2 text-xs focus:outline-none focus:border-emerald-500';
const FIELDS = [
  ['name', 'Full name'], ['email', 'Email'], ['mobile', 'Mobile'],
  ['city', 'City'], ['state', 'State'], ['pincode', 'Pincode'],
  ['qualification', 'Qualification'], ['institution', 'Institution'],
  ['specialisation', 'Headline specialisation'], ['experience_years', 'Experience (years)'],
  ['registration_number', 'Registration no.'], ['issuing_authority', 'Issuing authority'],
  ['fee', 'Consultation fee (₹)'], ['duration_min', 'Duration (min)'],
  ['specialties', 'Specialties (comma separated)'], ['languages', 'Languages (comma separated)'],
  ['bio', 'Bio', true],
];

const toForm = (d) => ({
  name: d.personal?.name || '', email: d.personal?.email || '', mobile: d.personal?.mobile || '',
  city: d.personal?.city || '', state: d.personal?.state || '', pincode: d.personal?.pincode || '',
  qualification: d.professional?.qualification || '', institution: d.professional?.institution || '',
  specialisation: d.professional?.specialisation || '', experience_years: d.professional?.experience_years ?? '',
  registration_number: d.professional?.registration_number || '', issuing_authority: d.professional?.issuing_authority || '',
  fee: d.consultation?.fee ?? '', duration_min: d.consultation?.duration_min ?? '',
  specialties: (d.professional?.specialties || []).join(', '), languages: (d.consultation?.languages || []).join(', '),
  bio: d.professional?.bio || '',
});

const EditModal = ({ doc, onClose, onSaved }) => {
  const [f, setF] = useState(() => toForm(doc));
  const [busy, setBusy] = useState(false);
  const photo = doc.photo?.chosen || doc.photo?.original_url;
  const save = async () => {
    setBusy(true);
    try { await mp.put(`/admin/doctors/${doc.doctor_id}/details`, f, adminHdr()); toast.success('Dermatologist updated'); onSaved(); onClose(); }
    catch (e) { toast.error(e.response?.data?.detail || 'Save failed'); }
    finally { setBusy(false); }
  };
  const uploadPhoto = async (file) => {
    const fd = new FormData(); fd.append('file', file);
    try { await mp.post(`/admin/doctors/${doc.doctor_id}/photo`, fd, adminHdr()); toast.success('Photo replaced'); onSaved(); }
    catch (e) { toast.error(e.response?.data?.detail || 'Upload failed'); }
  };
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center overflow-y-auto py-8 px-4" data-testid="derm-edit-modal">
      <div className="bg-white rounded-3xl w-full max-w-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl overflow-hidden bg-stone-50 border">
              {photo ? <img src={photo} alt="" className="w-full h-full object-cover object-top" /> : <span className="w-full h-full flex items-center justify-center text-emerald-700 font-extrabold">{(f.name || '?')[0]}</span>}
            </div>
            <div><p className="font-extrabold text-stone-900">Edit dermatologist</p><p className="text-[11px] text-stone-400">{doc.doctor_id}</p></div>
          </div>
          <button onClick={onClose} data-testid="derm-edit-close"><X size={20} className="text-stone-400" /></button>
        </div>
        <label className="inline-flex items-center gap-1.5 border border-stone-300 text-xs font-bold rounded-full px-4 py-2 cursor-pointer mb-4" data-testid="derm-edit-photo">
          <ImagePlus size={13} /> Replace photo
          <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files[0] && uploadPhoto(e.target.files[0])} />
        </label>
        <div className="grid sm:grid-cols-2 gap-3 max-h-[55vh] overflow-y-auto pr-1">
          {FIELDS.map(([k, label, multi]) => (
            <label key={k} className={`block ${multi ? 'sm:col-span-2' : ''}`}>
              <span className="text-[10px] font-bold uppercase tracking-wide text-stone-500">{label}</span>
              {multi
                ? <textarea rows={3} value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} className={input} data-testid={`derm-f-${k}`} />
                : <input value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} className={input} data-testid={`derm-f-${k}`} />}
            </label>
          ))}
        </div>
        <button onClick={save} disabled={busy} data-testid="derm-edit-save"
          className="mt-4 w-full bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-extrabold rounded-full px-4 py-3 inline-flex items-center justify-center gap-2">
          {busy ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Save all details
        </button>
      </div>
    </div>
  );
};

// Dedicated "All Dermatologists" admin section: list every doctor, edit all details, remove from user app.
export default function AllDermatologists() {
  const [docs, setDocs] = useState(null);
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState(null);

  const load = useCallback(() => {
    mp.get('/admin/doctors', adminHdr()).then((r) => setDocs(r.data)).catch(() => { setDocs([]); toast.error('Failed to load'); });
  }, []);
  useEffect(() => { load(); }, [load]);

  const remove = async (d) => {
    if (!window.confirm(`Remove Dr. ${d.personal?.name || d.doctor_id} from the user app? Patients will no longer see them. You can re-approve later.`)) return;
    try { await mp.delete(`/admin/doctors/${d.doctor_id}`, adminHdr()); toast.success('Removed from user app'); load(); }
    catch (e) { toast.error(e.response?.data?.detail || 'Failed'); }
  };
  const reactivate = async (d) => {
    try { await mp.post(`/admin/doctors/${d.doctor_id}/review`, { action: 'approve', reason: '' }, adminHdr()); toast.success('Restored & live'); load(); }
    catch (e) { toast.error(e.response?.data?.detail || 'Failed'); }
  };

  if (!docs) return <p className="text-sm text-stone-400 p-4">Loading…</p>;
  const term = q.trim().toLowerCase();
  const list = term ? docs.filter((d) => `${d.personal?.name} ${d.personal?.email} ${d.personal?.mobile} ${d.professional?.specialisation}`.toLowerCase().includes(term)) : docs;

  return (
    <div data-testid="all-dermatologists">
      <h2 className="text-lg font-extrabold text-stone-900">All dermatologists</h2>
      <p className="text-sm text-stone-500">Every dermatologist on the platform. Edit any detail, replace the photo, or remove them from the user app.</p>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, email, phone or specialisation…"
        className="mt-4 w-full max-w-md rounded-full border border-stone-200 px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500" data-testid="derm-search" />
      <div className="mt-5 grid gap-3" data-testid="derm-list">
        {list.length === 0 && <p className="text-sm text-stone-400 text-center py-10">No dermatologists found.</p>}
        {list.map((d) => {
          const photo = d.photo?.chosen || d.photo?.original_url;
          const removed = d.application_status === 'removed' || d.active === false;
          return (
            <div key={d.doctor_id} className={`bg-white rounded-2xl border p-4 flex items-center gap-4 ${removed ? 'border-rose-100 opacity-70' : 'border-stone-200'}`} data-testid={`derm-row-${d.doctor_id}`}>
              <div className="w-14 h-14 rounded-xl overflow-hidden bg-stone-50 border border-stone-100 shrink-0">
                {photo ? <img src={photo} alt="" className="w-full h-full object-cover object-top" /> : <span className="w-full h-full flex items-center justify-center text-emerald-700 font-extrabold text-lg">{(d.personal?.name || '?')[0]}</span>}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-stone-900 flex items-center gap-2 truncate">{d.personal?.name || '—'} {d.application_status === 'approved' && <BadgeCheck size={15} className="text-emerald-600 shrink-0" />}</p>
                <p className="text-xs text-stone-500 truncate">{d.professional?.specialisation || '—'} • {d.personal?.city || '—'} • ₹{d.consultation?.fee ?? '—'}</p>
                <p className="text-xs text-stone-700 font-semibold truncate">{d.personal?.mobile || '—'} • {d.personal?.email || '—'}</p>
              </div>
              <span className={`hidden sm:inline-block text-[11px] font-bold rounded-full px-2.5 py-1 ${statusColor(d.application_status)}`}>{fmtStatus(d.application_status)}</span>
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={() => setEditing(d)} data-testid={`derm-edit-${d.doctor_id}`}
                  className="inline-flex items-center gap-1 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-full px-3 py-2"><Pencil size={13} /> Edit</button>
                {removed
                  ? <button onClick={() => reactivate(d)} data-testid={`derm-restore-${d.doctor_id}`} className="inline-flex items-center gap-1 border border-emerald-400 text-emerald-700 text-xs font-bold rounded-full px-3 py-2"><RefreshCcw size={13} /> Restore</button>
                  : <button onClick={() => remove(d)} data-testid={`derm-remove-${d.doctor_id}`} className="inline-flex items-center gap-1 border border-rose-300 text-rose-600 text-xs font-bold rounded-full px-3 py-2"><Trash2 size={13} /> Remove</button>}
              </div>
            </div>
          );
        })}
      </div>
      {editing && <EditModal doc={editing} onClose={() => setEditing(null)} onSaved={load} />}
    </div>
  );
}
