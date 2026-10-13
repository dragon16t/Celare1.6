import React, { useEffect, useRef, useState } from 'react';
import { Wallet, Inbox, CalendarDays, Sparkles, Bell, Navigation, MapPin, Camera, ShieldAlert, Users } from 'lucide-react';
import { toast } from 'sonner';
import { mp, partnerHdr, statusColor, fmtStatus } from '../../utils/mpApi';
import { MpLogin } from './DoctorPortalPage';
import WalletPanel from '../../components/mp/WalletPanel';
import PartnerServicesPanel from '../../components/mp/PartnerServicesPanel';
import PresenceToggle from '../../components/mp/PresenceToggle';
import BookingAlerts from '../../components/mp/BookingAlerts';
import ProviderHeader from '../../components/mp/ProviderHeader';
import SlotPicker from '../../components/mp/SlotPicker';
import { WEEK_DAYS } from '../../utils/mpApi';

const input = 'w-full rounded-xl border border-stone-200 px-3.5 py-2.5 text-sm';
const tabBtn = (active) => `px-4 py-2.5 rounded-xl text-xs font-extrabold whitespace-nowrap transition-colors ${active ? 'bg-stone-900 text-white shadow' : 'bg-white border border-stone-200 text-stone-600 hover:border-emerald-400'}`;

const FemaleOnly = ({ b }) => (b?.staff_gender === 'female' ? (
  <div className="flex gap-2 items-start bg-pink-50 border border-pink-200 text-pink-900 rounded-xl p-3 text-xs" data-testid={`female-only-${b.booking_id}`}>
    <ShieldAlert size={16} className="shrink-0 mt-0.5" />
    <span><b>FEMALE STAFF ONLY.</b> Mandatory guideline: send only a female professional to this booking. Sending male staff will lead to immediate membership cancellation.</span>
  </div>
) : b?.staff_gender === 'male' ? <p className="text-[11px] font-bold text-sky-800">Customer requested male staff</p> : null);

const HoursEditor = ({ initial, onSave }) => {
  const [v, setV] = useState(initial);
  return (
    <div className="space-y-3" data-testid="partner-hours">
      <p className="text-xs text-stone-500">Pick the times you can take bookings each day.</p>
      <SlotPicker days={WEEK_DAYS} value={v} onChange={setV} />
      <button onClick={() => onSave(v)} data-testid="save-hours" className="bg-emerald-700 text-white text-xs font-extrabold rounded-full px-6 py-2.5">Update working hours</button>
    </div>
  );
};

const getPos = () => new Promise((resolve) => {
  if (!navigator.geolocation) return resolve(null);
  navigator.geolocation.getCurrentPosition((p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }), () => resolve(null),
    { enableHighAccuracy: true, timeout: 10000 });
});

const PartnerPortalPage = () => {
  const [me, setMe] = useState(null);
  const [err, setErr] = useState(false);
  const [tab, setTab] = useState('requests');
  const [requests, setRequests] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [services, setServices] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [notifs, setNotifs] = useState([]);
  const [otpMap, setOtpMap] = useState({});
  const watchRef = useRef(null);
  const prevReqCount = useRef(0);
  useEffect(() => {
    if (requests.length > prevReqCount.current) {
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const o = ctx.createOscillator(); const g = ctx.createGain();
        o.connect(g); g.connect(ctx.destination);
        o.frequency.value = 880; g.gain.setValueAtTime(0.15, ctx.currentTime);
        o.start(); o.stop(ctx.currentTime + 0.6);
      } catch { /* blocked until gesture */ }
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Celesta Glow — new booking request', { body: 'First to accept gets the booking.' });
      }
    }
    prevReqCount.current = requests.length;
  }, [requests]);
  useEffect(() => { if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission(); }, []);


  const loadAll = () => {
    mp.get('/partner/requests', partnerHdr()).then((r) => setRequests(r.data)).catch(() => {});
    mp.get('/partner/bookings', partnerHdr()).then((r) => setBookings(r.data)).catch(() => {});
    mp.get('/partner/services', partnerHdr()).then((r) => setServices(r.data)).catch(() => {});
    mp.get('/partner/wallet', partnerHdr()).then((r) => setWallet(r.data)).catch(() => {});
    mp.get('/partner/notifications', partnerHdr()).then((r) => setNotifs(r.data)).catch(() => {});
  };
  const loadMe = () => mp.get('/auth/me', partnerHdr()).then((r) => { setMe(r.data); setErr(false); loadAll(); }).catch(() => setErr(true));
  useEffect(() => { loadMe(); const t = setInterval(loadAll, 15000); return () => clearInterval(t); /* eslint-disable-next-line */ }, []);

  const stopWatch = () => { if (watchRef.current != null) { navigator.geolocation.clearWatch(watchRef.current); watchRef.current = null; } };
  useEffect(() => stopWatch, []);

  if (err) return <div className="px-4 py-10 bg-stone-50 min-h-screen"><MpLogin role="partner" onLogin={loadMe} /></div>;
  if (!me) return <div className="py-24 text-center text-stone-400">Loading…</div>;
  const profile = me.profile || {};

  const act = async (bid, action, body = {}) => {
    try { const r = await mp.post(`/partner/bookings/${bid}/${action}`, body, partnerHdr()); toast.success('Done'); loadAll(); return r.data; }
    catch (e) { toast.error(e.response?.data?.detail || 'Action failed'); throw e; }
  };
  const respond = async (bid, action) => {
    try { await mp.post(`/partner/requests/${bid}/${action}`, {}, partnerHdr()); toast.success(action === 'accept' ? 'Booking assigned to you!' : 'Declined'); loadAll(); }
    catch (e) { toast.error(e.response?.data?.detail || 'Action failed'); }
  };
  const uploadArrival = async (bid, file) => {
    const pos = await getPos();
    const send = async (force) => {
      const fd = new FormData(); fd.append('file', file);
      if (pos) { fd.append('lat', pos.lat); fd.append('lng', pos.lng); }
      fd.append('force', force ? 'true' : 'false');
      await mp.post(`/partner/bookings/${bid}/arrival-photo`, fd, partnerHdr());
    };
    try { await send(false); stopWatch(); toast.success('Arrival photo & location synced'); loadAll(); }
    catch (e) {
      const msg = e.response?.data?.detail || 'Upload failed';
      if (e.response?.status === 400 && msg.includes('km') && window.confirm(`${msg}\n\nUpload anyway?`)) {
        try { await send(true); stopWatch(); toast.success('Arrival photo uploaded'); loadAll(); } catch (e2) { toast.error(e2.response?.data?.detail || 'Upload failed'); }
      } else toast.error(msg);
    }
  };
  const editStaff = async () => {
    const st = profile.staff || {};
    const fe = prompt('Number of FEMALE staff:', st.female ?? 0); if (fe === null) return;
    const ma = prompt('Number of MALE staff:', st.male ?? 0); if (ma === null) return;
    try { await mp.put('/partner/profile', { staff_female: Number(fe) || 0, staff_male: Number(ma) || 0 }, partnerHdr()); toast.success('Team updated'); loadMe(); }
    catch { toast.error('Failed'); }
  };

  const startJourney = async (bid) => {
    await act(bid, 'start-journey');
    if (navigator.geolocation) {
      stopWatch();
      watchRef.current = navigator.geolocation.watchPosition(
        (pos) => mp.post(`/partner/bookings/${bid}/location`, { lat: pos.coords.latitude, lng: pos.coords.longitude }, partnerHdr()).catch(() => {}),
        () => toast.error('Location permission is required for live tracking'),
        { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 });
      toast.success('Live location sharing started');
    }
  };
  const togglePause = async () => {
    try { await mp.put('/partner/profile', { paused: !profile.paused }, partnerHdr()); loadMe(); }
    catch { toast.error('Failed'); }
  };
  const withdraw = async () => {
    const amt = Number(prompt('Amount to withdraw (₹):'));
    if (!amt) return;
    try { await mp.post('/partner/withdraw', { amount: amt }, partnerHdr()); toast.success('Withdrawal requested'); loadAll(); }
    catch (e) { toast.error(e.response?.data?.detail || 'Failed'); }
  };

  const active = bookings.filter((b) => ['assigned', 'en_route', 'arrived', 'in_service', 'completion_pending'].includes(b.status));

  return (
    <div className="bg-stone-50 min-h-screen" data-testid="partner-portal">
      <div className="max-w-4xl mx-auto px-3 sm:px-6 py-8">
        <ProviderHeader title={profile.applicant?.business_name || me.name} subtitle="Service partner app"
          status={`${fmtStatus(profile.application_status)}${profile.paused ? ' • paused' : ''}`}
          onLogout={() => { localStorage.removeItem('mp_partner_token'); setErr(true); }}
          today={bookings.filter((b) => b.date === new Date().toISOString().slice(0, 10)).length}
          pending={requests.length} balance={wallet?.balance}>
          <PresenceToggle role="partner" />
          <button onClick={togglePause} data-testid="pause-toggle"
            className="text-xs font-bold rounded-full px-4 py-2 bg-white/15 hover:bg-white/25 transition-colors">
            {profile.paused ? 'Resume receiving bookings' : 'Pause my availability'}
          </button>
          <button onClick={editStaff} data-testid="edit-staff" className="text-xs font-bold rounded-full px-4 py-2 bg-pink-100 text-pink-900 inline-flex items-center gap-1.5">
            <Users size={13} /> Team: {profile.staff?.female ?? 0} female · {profile.staff?.male ?? 0} male
          </button>
        </ProviderHeader>
        {requests.length > 0 && tab !== 'requests' && (
          <button onClick={() => setTab('requests')} data-testid="new-request-alert"
            className="w-full mb-4 flex items-center gap-3 bg-rose-600 text-white rounded-2xl p-4 text-left shadow-lg shadow-rose-600/30 animate-pulse">
            <Bell size={20} /> <span className="flex-1 text-sm font-extrabold">{requests.length} new booking request{requests.length > 1 ? 's' : ''} — accept before it expires</span>
          </button>
        )}
        <BookingAlerts bookings={bookings} activeStatuses={['assigned', 'en_route', 'arrived', 'in_service']} testid="partner-booking-alerts"
          title={(b) => `${b.service_name} for ${b.customer?.name || 'customer'}${b.staff_gender === 'female' ? ' (female staff only)' : ''}`} />
        <div className="flex gap-2 overflow-x-auto pb-2 mb-6" data-testid="partner-tabs">
          {[['requests', `New Requests${requests.length ? ` (${requests.length})` : ''}`, Inbox], ['active', 'Active', Navigation],
            ['bookings', 'All Bookings', CalendarDays], ['services', 'Services', Sparkles], ['hours', 'Working Hours', CalendarDays], ['wallet', 'Wallet', Wallet], ['notifications', 'Notifications', Bell]].map(([k, label, Icon]) => (
            <button key={k} data-testid={`tab-${k}`} onClick={() => setTab(k)} className={tabBtn(tab === k)}><span className="flex items-center gap-1.5"><Icon size={13} />{label}</span></button>
          ))}
        </div>

        {tab === 'requests' && (
          <div className="space-y-3" data-testid="partner-requests">
            {requests.length === 0 && <p className="text-sm text-stone-400 text-center py-10">No pending requests. New bookings appear here in real time.</p>}
            {requests.map((o) => (
              <div key={o.booking_id} className="bg-white rounded-2xl border border-amber-200 p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-bold text-stone-900">{o.booking?.service_name}</p>
                    <p className="text-xs text-stone-500">{o.booking_id} • {o.booking?.date} • {o.booking?.slot} • {o.booking?.customer?.area || o.booking?.customer?.city || o.booking?.customer?.pincode}</p>
                    <p className="text-xs text-emerald-700 font-bold mt-1">Expected earnings: ₹{o.expected_earnings}</p>
                    <p className="text-[10px] text-amber-600">Respond by {new Date(o.expires_at).toLocaleTimeString('en-IN')}</p>
                  </div>
                  <div className="w-full order-last"><FemaleOnly b={o.booking} /></div>
                  <div className="flex gap-2">
                    <button onClick={() => respond(o.booking_id, 'accept')} data-testid={`accept-${o.booking_id}`} className="bg-emerald-700 text-white text-xs font-bold rounded-full px-5 py-2.5">Accept</button>
                    <button onClick={() => respond(o.booking_id, 'decline')} data-testid={`decline-${o.booking_id}`} className="border border-stone-300 text-xs font-bold rounded-full px-5 py-2.5">Decline</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'active' && (
          <div className="space-y-3" data-testid="partner-active">
            {active.length === 0 && <p className="text-sm text-stone-400 text-center py-10">No active bookings.</p>}
            {active.map((b) => (
              <div key={b.booking_id} className="bg-white rounded-2xl border border-stone-200 p-5 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-bold text-stone-900">{b.service_name}</p>
                    <p className="text-xs text-stone-500">{b.booking_id}</p>
                    <p className="text-sm font-extrabold text-stone-900 mt-0.5" data-testid={`when-${b.booking_id}`}>{b.date} • {b.slot} • {b.duration_min || 60} min • ₹{b.total_amount || b.price} {b.payment_method === 'pay_after_service' ? '(collect cash)' : '(paid online)'}</p>
                    <p className="text-xs text-stone-600 mt-1 flex items-start gap-1"><MapPin size={12} className="mt-0.5 shrink-0" /> {b.customer?.address}{b.customer?.pincode ? `, ${b.customer.pincode}` : ''}</p>
                    <p className="text-xs text-stone-500 mt-1">{b.customer?.name} • {b.customer?.phone}</p>
                  </div>
                  <span className={`text-[11px] font-bold rounded-full px-2.5 py-1 ${statusColor(b.status)}`}>{fmtStatus(b.status)}</span>
                </div>
                <FemaleOnly b={b} />
                {b.arrival_photo && (
                  <div className="flex items-center gap-3 bg-stone-50 rounded-xl p-2.5" data-testid={`arrival-photo-${b.booking_id}`}>
                    <img src={b.arrival_photo.url} alt="arrival" className="w-14 h-14 rounded-lg object-cover" />
                    <p className="text-[11px] text-stone-600">Arrival photo synced {new Date(b.arrival_photo.at).toLocaleTimeString('en-IN')}
                      {b.arrival_photo.distance_km != null && <span className="block">{b.arrival_photo.distance_km} km from customer address</span>}</p>
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  {b.customer?.lat && (
                    <a target="_blank" rel="noreferrer" href={`https://www.google.com/maps/dir/?api=1&destination=${b.customer.lat},${b.customer.lng}`}
                      className="border border-stone-300 text-xs font-bold rounded-full px-4 py-2 inline-flex items-center gap-1"><Navigation size={12} /> Navigate</a>
                  )}
                  {b.status === 'assigned' && <button onClick={() => startJourney(b.booking_id)} data-testid={`journey-${b.booking_id}`} className="bg-sky-600 text-white text-xs font-bold rounded-full px-4 py-2">Start journey (live tracking)</button>}
                  {['en_route', 'arrived'].includes(b.status) && (
                    <label className="bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-full px-4 py-2 inline-flex items-center gap-1.5 cursor-pointer" data-testid={`arrived-${b.booking_id}`}>
                      <Camera size={13} /> {b.arrival_photo ? 'Retake arrival photo' : 'Arrived — upload photo from location'}
                      <input type="file" accept="image/*" capture="environment" className="hidden" data-testid={`arrival-input-${b.booking_id}`}
                        onChange={(e) => e.target.files[0] && uploadArrival(b.booking_id, e.target.files[0])} />
                    </label>
                  )}
                  {b.status === 'arrived' && b.arrival_photo && <button onClick={() => { stopWatch(); act(b.booking_id, 'start-service'); }} data-testid={`start-service-${b.booking_id}`} className="bg-indigo-600 text-white text-xs font-bold rounded-full px-4 py-2">Start service</button>}
                  {b.status === 'in_service' && <button onClick={() => act(b.booking_id, 'request-completion')} data-testid={`complete-${b.booking_id}`} className="bg-violet-600 text-white text-xs font-bold rounded-full px-4 py-2">Complete — email OTP to customer</button>}
                  {b.payment_method === 'pay_after_service' && ['in_service', 'completion_pending'].includes(b.status) && b.payment_status !== 'paid_cash' && (
                    <button onClick={() => act(b.booking_id, 'cash-collected')} data-testid={`cash-${b.booking_id}`} className="bg-emerald-700 text-white text-xs font-bold rounded-full px-4 py-2">Cash collected (₹{b.total_amount || b.price})</button>
                  )}
                  {b.status === 'completion_pending' && (
                    <span className="flex items-center gap-2">
                      <input placeholder="Customer code" value={otpMap[b.booking_id] || ''} data-testid={`potp-${b.booking_id}`}
                        onChange={(e) => setOtpMap({ ...otpMap, [b.booking_id]: e.target.value })}
                        className="w-32 rounded-full border border-stone-300 px-3 py-1.5 text-xs text-center" />
                      <button onClick={() => act(b.booking_id, 'verify', { otp: otpMap[b.booking_id] || '' })} data-testid={`pverify-${b.booking_id}`} className="bg-emerald-700 text-white text-xs font-bold rounded-full px-4 py-2">Verify & finish</button>
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'bookings' && (
          <div className="space-y-3" data-testid="partner-all-bookings">
            {bookings.length === 0 && <p className="text-sm text-stone-400 text-center py-10">No bookings yet.</p>}
            {bookings.map((b) => (
              <div key={b.booking_id} className="bg-white rounded-2xl border border-stone-200 p-4 flex items-center justify-between">
                <div>
                  <p className="font-bold text-stone-900 text-sm">{b.service_name}</p>
                  <p className="text-xs text-stone-500">{b.booking_id} • {b.date} • listed ₹{b.price} · you earn ₹{b.provider_earning ?? b.price}</p>
                </div>
                <span className={`text-[11px] font-bold rounded-full px-2.5 py-1 ${statusColor(b.status)}`}>{fmtStatus(b.status)}</span>
              </div>
            ))}
          </div>
        )}

        {tab === 'services' && services && <PartnerServicesPanel services={services} reload={loadAll} />}

        {tab === 'hours' && <HoursEditor initial={profile.availability || {}} onSave={async (v) => {
          try { await mp.put('/partner/profile', { availability: v }, partnerHdr()); toast.success('Working hours updated'); loadMe(); } catch { toast.error('Failed'); }
        }} />}

        {tab === 'wallet' && wallet && <WalletPanel wallet={wallet} onWithdraw={withdraw} testid="partner-wallet" />}

        {tab === 'notifications' && (
          <div className="bg-white rounded-2xl border border-stone-200 divide-y divide-stone-50" data-testid="partner-notifs">
            {notifs.length === 0 && <p className="text-xs text-stone-400 p-4">No notifications.</p>}
            {notifs.map((n) => (
              <div key={n.notif_id} className="p-4">
                <p className="text-sm font-bold text-stone-800">{n.title}</p>
                <p className="text-xs text-stone-500">{n.body}</p>
                <p className="text-[10px] text-stone-300 mt-1">{new Date(n.at).toLocaleString('en-IN')}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PartnerPortalPage;
