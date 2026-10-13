import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Wallet, CheckCircle2, XCircle } from 'lucide-react';
import { mp, adminHdr, statusColor, fmtStatus } from '../../utils/mpApi';

// Separate withdrawal-request management for a single provider type (doctor | partner).
export default function MpWithdrawals({ ownerType }) {
  const [rows, setRows] = useState([]);
  const [filter, setFilter] = useState('pending');
  const [busy, setBusy] = useState('');

  const load = useCallback(() => {
    mp.get('/admin/withdrawals', { ...adminHdr(), params: { owner_type: ownerType, ...(filter ? { status: filter } : {}) } })
      .then((r) => setRows(r.data)).catch(() => toast.error('Failed to load withdrawals'));
  }, [ownerType, filter]);
  useEffect(load, [load]);

  const process = async (w, action) => {
    const extra = action === 'paid'
      ? { reference: window.prompt('Payment reference / UTR (optional)') || '' }
      : { reason: window.prompt('Reason for rejection (optional)') || '' };
    setBusy(w.withdrawal_id);
    try {
      await mp.post(`/admin/withdrawals/${w.withdrawal_id}/process`, { action, ...extra }, adminHdr());
      toast.success(action === 'paid' ? 'Marked as paid' : 'Rejected & refunded to wallet');
      load();
    } catch (e) { toast.error(e.response?.data?.detail || 'Failed'); }
    finally { setBusy(''); }
  };

  const label = ownerType === 'doctor' ? 'Dermatologist' : 'Service partner';
  return (
    <div data-testid={`admin-withdrawals-${ownerType}`}>
      <div className="flex items-center gap-2 mb-1"><Wallet size={18} className="text-emerald-700" />
        <h2 className="text-lg font-extrabold text-stone-900">{label} withdrawal requests</h2></div>
      <p className="text-sm text-stone-500">Approve payouts or reject (rejected amounts are refunded to the provider wallet).</p>
      <div className="flex gap-2 mt-4 flex-wrap">
        {['pending', 'paid', 'rejected', ''].map((s) => (
          <button key={s} onClick={() => setFilter(s)} data-testid={`wfilter-${s || 'all'}`}
            className={`text-xs font-bold rounded-full px-4 py-2 ${filter === s ? 'bg-emerald-700 text-white' : 'bg-white border border-stone-200'}`}>{s ? fmtStatus(s) : 'All'}</button>
        ))}
      </div>
      <div className="mt-5 space-y-3" data-testid="withdrawal-list">
        {rows.length === 0 && <p className="text-sm text-stone-400 text-center py-10">No withdrawal requests in this view.</p>}
        {rows.map((w) => (
          <div key={w.withdrawal_id} className="bg-white rounded-2xl border border-stone-200 p-5 flex flex-wrap items-center justify-between gap-3" data-testid={`withdrawal-${w.withdrawal_id}`}>
            <div className="min-w-0">
              <p className="font-bold text-stone-900 text-sm">{w.owner_name} <span className="text-stone-400 font-normal">· {w.owner_id}</span></p>
              <p className="text-xs text-stone-500">{w.withdrawal_id} • {new Date(w.at).toLocaleString('en-IN')}{w.reference ? ` • Ref: ${w.reference}` : ''}{w.reason ? ` • ${w.reason}` : ''}</p>
              <p className="text-[11px] text-stone-400 mt-0.5">Current wallet balance: ₹{Number(w.owner_balance ?? 0).toFixed(2)}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-extrabold text-stone-900">₹{Number(w.amount).toFixed(2)}</span>
              <span className={`text-[11px] font-bold rounded-full px-2.5 py-1 ${statusColor(w.status)}`}>{fmtStatus(w.status)}</span>
              {w.status === 'pending' && (
                <>
                  <button disabled={busy === w.withdrawal_id} onClick={() => process(w, 'paid')} data-testid={`wpay-${w.withdrawal_id}`}
                    className="inline-flex items-center gap-1 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-xs font-bold rounded-full px-3 py-1.5"><CheckCircle2 size={13} /> Mark paid</button>
                  <button disabled={busy === w.withdrawal_id} onClick={() => process(w, 'rejected')} data-testid={`wreject-${w.withdrawal_id}`}
                    className="inline-flex items-center gap-1 border border-rose-300 text-rose-600 text-xs font-bold rounded-full px-3 py-1.5"><XCircle size={13} /> Reject</button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
