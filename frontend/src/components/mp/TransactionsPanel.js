import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Receipt, Package, Stethoscope, Sparkles } from 'lucide-react';
import { mp, customerHdr } from '../../utils/mpApi';

const API = process.env.REACT_APP_BACKEND_URL;
const ICON = { order: Package, consultation: Stethoscope, home: Sparkles };
const isPaid = (s) => ['paid', 'paid_cash', 'captured', 'success', 'completed'].includes(String(s || '').toLowerCase());

// Every payment of the customer: product orders + dermatology + home services.
export default function TransactionsPanel({ token }) {
  const [rows, setRows] = useState(null);
  useEffect(() => {
    Promise.allSettled([
      axios.get(`${API}/api/auth/orders`, { headers: { Authorization: `Bearer ${token}` } }),
      mp.get('/my/bookings', customerHdr()),
    ]).then(([o, b]) => {
      const orders = o.status === 'fulfilled' ? (o.value.data.orders || o.value.data || []) : [];
      const bk = b.status === 'fulfilled' ? b.value.data : { consultations: [], home_bookings: [] };
      const all = [
        ...(Array.isArray(orders) ? orders : []).map((x) => ({ id: x.order_id || x.id, kind: 'order', label: `Product order (${(x.items || []).length} items)`, amount: x.total || x.total_amount || x.amount, status: x.payment_status || x.status, method: x.payment_method, at: x.created_at })),
        ...bk.consultations.map((x) => ({ id: x.booking_id, kind: 'consultation', label: `Consultation — Dr. ${x.doctor_name}`, amount: x.fee, status: x.payment_status, method: 'online', at: x.created_at })),
        ...bk.home_bookings.map((x) => ({ id: x.booking_id, kind: 'home', label: x.service_name, amount: x.total_amount || x.price, status: x.payment_status, method: x.payment_method, at: x.created_at })),
      ].sort((a, c) => String(c.at).localeCompare(String(a.at)));
      setRows(all);
    });
  }, [token]);
  if (!rows) return <p className="text-sm text-stone-400 p-4">Loading…</p>;
  const total = rows.filter((r) => isPaid(r.status)).reduce((a, r) => a + Number(r.amount || 0), 0);
  return (
    <div className="space-y-3" data-testid="transactions-panel">
      <div className="bg-white rounded-2xl border border-stone-100 p-5 flex items-center justify-between">
        <span className="flex items-center gap-2 text-sm font-black text-stone-900"><Receipt size={16} className="text-emerald-600" /> All transactions</span>
        <span className="text-sm text-stone-500">Total paid <b className="text-stone-900" data-testid="tx-total">₹{total.toLocaleString('en-IN')}</b></span>
      </div>
      {rows.length === 0 && <p className="text-sm text-stone-400 text-center py-10">No transactions yet.</p>}
      {rows.map((r) => {
        const Icon = ICON[r.kind];
        return (
          <div key={`${r.kind}-${r.id}`} className="bg-white rounded-2xl border border-stone-100 p-4 flex items-center gap-3" data-testid={`tx-${r.id}`}>
            <span className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0"><Icon size={17} /></span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-stone-900 truncate">{r.label}</p>
              <p className="text-[11px] text-stone-400">{r.id} • {r.at ? new Date(r.at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : ''} • {String(r.method || '').replace(/_/g, ' ')}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-extrabold text-stone-900">₹{Number(r.amount || 0).toLocaleString('en-IN')}</p>
              <span className={`text-[10px] font-bold rounded-full px-2 py-0.5 ${isPaid(r.status) ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>{isPaid(r.status) ? 'Paid' : String(r.status || 'pending').replace(/_/g, ' ')}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
