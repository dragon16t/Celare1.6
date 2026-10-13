import React, { useEffect, useMemo, useState } from 'react';
import { BellRing, CalendarClock, X } from 'lucide-react';

const startOf = (b) => {
  if (!b.date || !b.slot || !/^\d{1,2}:\d{2}$/.test(b.slot)) return null;
  const d = new Date(`${b.date}T${b.slot.padStart(5, '0')}:00`);
  return Number.isNaN(d.getTime()) ? null : d;
};
const beep = () => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator(); const g = ctx.createGain(); o.connect(g); g.connect(ctx.destination);
    o.frequency.value = 660; g.gain.setValueAtTime(0.15, ctx.currentTime); o.start(); o.stop(ctx.currentTime + 0.5);
  } catch { /* needs a user gesture */ }
};

// Upcoming schedule + automatic reminder pop-up 15 min before each booking (providers & customers).
export default function BookingAlerts({ bookings = [], title = (b) => b.service_name, activeStatuses, testid = 'booking-alerts', floating = false }) {
  const [now, setNow] = useState(Date.now());
  const [dismissed, setDismissed] = useState(() => JSON.parse(localStorage.getItem('cg_dismissed_reminders') || '[]'));
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(t); }, []);
  const upcoming = useMemo(() => bookings
    .filter((b) => activeStatuses.includes(b.status))
    .map((b) => ({ b, at: startOf(b) }))
    .filter((x) => x.at && x.at.getTime() > now - 60 * 60000)
    .sort((a, c) => a.at - c.at), [bookings, now, activeStatuses]);
  const due = upcoming.filter((x) => x.at.getTime() - now <= 15 * 60000 && !dismissed.includes(x.b.booking_id));

  useEffect(() => {
    due.forEach(({ b }) => {
      const key = `cg_rem_${b.booking_id}`;
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, '1'); beep();
      if ('Notification' in window && Notification.permission === 'granted') new Notification('Celesta Glow reminder', { body: `${title(b)} at ${b.slot} — starting soon` });
    });
  }, [due, title]);

  const dismiss = (id) => { const n = [...dismissed, id]; setDismissed(n); localStorage.setItem('cg_dismissed_reminders', JSON.stringify(n.slice(-100))); };
  if (!upcoming.length || (floating && !due.length)) return null;
  return (
    <div className={floating ? 'fixed bottom-24 left-3 right-3 sm:left-auto sm:right-6 sm:w-96 z-[60] space-y-2' : 'space-y-2 mb-5'} data-testid={testid}>
      {due.map(({ b, at }) => (
        <div key={b.booking_id} className="flex items-start gap-3 bg-amber-400 text-stone-900 rounded-2xl p-4 shadow-lg shadow-amber-500/30 animate-pulse" data-testid={`reminder-${b.booking_id}`}>
          <BellRing size={20} className="shrink-0 mt-0.5" />
          <div className="flex-1 text-sm"><b>Reminder:</b> {title(b)} {at.getTime() > now ? `starts at ${b.slot}` : `was due at ${b.slot}`} • {b.booking_id}</div>
          <button onClick={() => dismiss(b.booking_id)} aria-label="Dismiss" data-testid={`reminder-dismiss-${b.booking_id}`}><X size={16} /></button>
        </div>
      ))}
      {!floating && <div className="bg-white rounded-2xl border border-stone-200 p-4">
        <p className="text-xs font-extrabold text-stone-800 flex items-center gap-1.5 mb-2"><CalendarClock size={14} /> Upcoming schedule</p>
        {upcoming.slice(0, 6).map(({ b, at }) => (
          <div key={b.booking_id} className="flex items-center justify-between text-xs py-1.5 border-b border-stone-50 last:border-0">
            <span className="font-semibold text-stone-700">{title(b)}</span>
            <span className="text-stone-500">{at.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })} • <b className="text-stone-900">{at.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}</b></span>
          </div>
        ))}
      </div>}
    </div>
  );
}
