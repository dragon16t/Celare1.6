import React from 'react';
import { LogOut, CalendarCheck, Inbox, Wallet } from 'lucide-react';

const Stat = ({ icon: Icon, label, value, testid }) => (
  <div className="bg-white/10 backdrop-blur rounded-2xl px-3 py-2.5 min-w-0" data-testid={testid}>
    <p className="text-[10px] uppercase tracking-wider text-emerald-100 flex items-center gap-1"><Icon size={11} /> {label}</p>
    <p className="text-lg font-extrabold leading-tight truncate">{value}</p>
  </div>
);

// Shared hero header for the doctor & partner apps.
export default function ProviderHeader({ title, subtitle, status, onLogout, today = 0, pending = 0, balance = 0, children }) {
  return (
    <div className="relative overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-emerald-800 via-emerald-700 to-teal-700 text-white p-5 sm:p-6 mb-5 shadow-xl shadow-emerald-900/10" data-testid="provider-header">
      <div className="absolute -right-12 -top-12 w-44 h-44 rounded-full bg-white/10" />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-black tracking-[0.25em] uppercase text-emerald-100">{subtitle}</p>
          <h1 className="text-xl sm:text-2xl font-extrabold truncate">{title}</h1>
          {status && <span className="inline-block mt-1 text-[10px] font-bold uppercase bg-white/15 rounded-md px-2 py-0.5">{status}</span>}
        </div>
        <button onClick={onLogout} data-testid="provider-logout" className="inline-flex items-center gap-1 bg-white/15 hover:bg-white/25 rounded-full px-3 py-1.5 text-xs font-bold transition-colors"><LogOut size={13} /> Log out</button>
      </div>
      <div className="relative grid grid-cols-3 gap-2 mt-4">
        <Stat icon={CalendarCheck} label="Today" value={today} testid="stat-today" />
        <Stat icon={Inbox} label="Pending" value={pending} testid="stat-pending" />
        <Stat icon={Wallet} label="Wallet" value={`₹${Number(balance || 0).toLocaleString('en-IN')}`} testid="stat-wallet" />
      </div>
      {children && <div className="relative flex flex-wrap items-center gap-2 mt-4">{children}</div>}
    </div>
  );
}
