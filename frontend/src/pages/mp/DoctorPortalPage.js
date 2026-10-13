import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Camera, Wand2, CheckCircle2, Wallet, CalendarDays, Bell, FileText } from 'lucide-react';
import { toast } from 'sonner';
import SlotPicker from '../../components/mp/SlotPicker';
import BookingAlerts from '../../components/mp/BookingAlerts';
import ProviderHeader from '../../components/mp/ProviderHeader';
import { mp, doctorHdr, WEEK_DAYS, statusColor, fmtStatus } from '../../utils/mpApi';
import PresenceToggle from '../../components/mp/PresenceToggle';
import DoctorInstantRequests from '../../components/mp/DoctorInstantRequests';
import WalletPanel from '../../components/mp/WalletPanel';
import EarningHint from '../../components/mp/EarningHint';

const input = 'w-full rounded-xl border border-stone-200 px-3.5 py-2.5 text-sm';
const tabBtn = (active) => `px-4 py-2.5 rounded-xl text-xs font-extrabold whitespace-nowrap transition-colors ${active ? 'bg-stone-900 text-white shadow' : 'bg-white border border-stone-200 text-stone-600 hover:border-emerald-400'}`;

const Login = ({ role, onLogin }) => {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [stage, setStage] = useState('email');
  const [busy, setBusy] = useState(false);
  const isDoc = role === 'doctor';
  const send = async () => {
    setBusy(true);
    try { await mp.post('/auth/send-otp', { email, role, portal: true }); setStage('otp'); toast.success('Code sent to your email'); }
    catch (e) { toast.error(e.response?.data?.detail || 'Could not send code'); } finally { setBusy(false); }
  };
  const verify = async () => {
    setBusy(true);
    try {
      const r = await mp.post('/auth/verify-otp', { email, role, otp });
      localStorage.setItem(`mp_${role}_token`, r.data.token);
      onLogin();
    } catch (e) { toast.error(e.response?.data?.detail || 'Incorrect code'); } finally { setBusy(false); }
  };
  return (
    <div className="max-w-4xl mx-auto mt-6 sm:mt-12 grid md:grid-cols-2 rounded-[2rem] overflow-hidden shadow-2xl shadow-emerald-900/10 border border-stone-200 bg-white" data-testid={`${role}-login`}>
      <div className="relative bg-gradient-to-br from-emerald-800 via-emerald-700 to-teal-700 text-white p-8 sm:p-10 flex flex-col justify-between min-h-[220px]">
        <div className="absolute -right-10 -top-10 w-48 h-48 rounded-full bg-white/10" />
        <div className="absolute right-10 bottom-10 w-24 h-24 rounded-full bg-sky-300/20" />
        <span className="relative text-[10px] font-black tracking-[0.25em] uppercase bg-white/15 rounded-md px-2.5 py-1 self-start">{isDoc ? 'Dermatologist' : 'Service partner'} dashboard</span>
        <div className="relative">
          <h2 className="text-2xl sm:text-3xl font-extrabold leading-tight">{isDoc ? 'Your patients are waiting.' : 'Your next booking is one tap away.'}</h2>
          <p className="text-sm text-emerald-100 mt-2">Approved {isDoc ? 'doctors' : 'partners'} only. Login with a one-time code sent to your registered email.</p>
        </div>
      </div>
      <div className="p-8 sm:p-10">
        <p className="text-xl font-extrabold text-stone-900">{stage === 'email' ? 'Welcome back' : 'Check your inbox'}</p>
        <p className="text-sm text-stone-500 mt-1">{stage === 'email' ? 'Enter the email from your approved application.' : `We sent a 6-digit code to ${email}`}</p>
        {stage === 'email' ? (
          <>
            <input type="email" data-testid="portal-login-email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className={`${input} mt-6 !py-3.5`} />
            <button onClick={send} disabled={busy || !email} data-testid="portal-send-otp" className="w-full mt-3 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-extrabold rounded-full py-3.5 text-sm transition-colors">{busy ? 'Sending…' : 'Send login code'}</button>
          </>
        ) : (
          <>
            <input data-testid="portal-login-otp" placeholder="••••••" value={otp} onChange={(e) => setOtp(e.target.value)} className={`${input} mt-6 !py-3.5 text-center tracking-[0.5em] font-extrabold text-lg`} />
            <button onClick={verify} disabled={busy || otp.length < 6} data-testid="portal-verify-otp" className="w-full mt-3 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-extrabold rounded-full py-3.5 text-sm transition-colors">{busy ? 'Verifying…' : 'Verify & log in'}</button>
            <button onClick={() => setStage('email')} className="w-full mt-2 text-xs text-stone-400 underline">Use a different email</button>
          </>
        )}
        <p className="text-xs text-stone-500 mt-6 text-center">Not registered yet? <a href="/pro" className="text-emerald-700 font-bold underline">Apply to join</a></p>
      </div>
    </div>
  );
};
export { Login as MpLogin };

const WeeklySlotsEditor = ({ initial, onSave }) => {
  const [ws, setWs] = useState(initial);
  return (
    <div data-testid="weekly-slots-editor">
      <p className="text-xs font-bold text-stone-600 uppercase mb-2">Weekly slots — tap times or pick from the clock</p>
      <SlotPicker days={WEEK_DAYS} value={ws} onChange={setWs} />
      <button type="button" onClick={() => onSave(ws)} data-testid="save-weekly-slots"
        className="mt-3 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-extrabold rounded-full px-6 py-2.5">Update availability</button>
    </div>
  );
};

const DoctorPortalPage = () => {
  const [me, setMe] = useState(null);
  const [err, setErr] = useState(false);
  const [tab, setTab] = useState('bookings');
  const [bookings, setBookings] = useState([]);
  const [wallet, setWallet] = useState(null);
  const [notifs, setNotifs] = useState([]);
  const [otpMap, setOtpMap] = useState({});
  const [rxDraft, setRxDraft] = useState({});
  const [feeDraft, setFeeDraft] = useState('');

  const loadAll = () => {
    mp.get('/doctor/bookings', doctorHdr()).then((r) => setBookings(r.data)).catch(() => {});
    mp.get('/doctor/wallet', doctorHdr()).then((r) => setWallet(r.data)).catch(() => {});
    mp.get('/doctor/notifications', doctorHdr()).then((r) => setNotifs(r.data)).catch(() => {});
  };
  const loadMe = () => mp.get('/auth/me', doctorHdr()).then((r) => { setMe(r.data); setErr(false); loadAll(); }).catch(() => setErr(true));
  useEffect(() => { loadMe(); /* eslint-disable-next-line */ }, []);

  if (err) return <div className="px-4 py-10 bg-stone-50 min-h-screen"><Login role="doctor" onLogin={loadMe} /></div>;
  if (!me) return <div className="py-24 text-center text-stone-400">Loading…</div>;
  const profile = me.profile || {};
  const photo = profile.photo || {};

  const saveProfile = async (patch) => {
    try { await mp.put('/doctor/profile', patch, doctorHdr()); toast.success('Saved'); loadMe(); }
    catch (e) { toast.error(e.response?.data?.detail || 'Save failed'); }
  };
  const uploadPhoto = async (file) => {
    const fd = new FormData(); fd.append('file', file);
    try { await mp.post('/doctor/photo', fd, doctorHdr()); toast.success('Photo uploaded'); loadMe(); }
    catch (e) { toast.error(e.response?.data?.detail || 'Upload failed'); }
  };
  const processPhoto = async () => {
    toast.info('AI is processing your photo — this can take up to a minute…');
    try { await mp.post('/doctor/photo/process', {}, doctorHdr()); toast.success('White-background photo ready'); loadMe(); }
    catch (e) { toast.error(e.response?.data?.detail || 'Processing failed'); loadMe(); }
  };
  const choosePhoto = async (use) => {
    try { await mp.post('/doctor/photo/choose', { use }, doctorHdr()); toast.success('Profile photo updated'); loadMe(); }
    catch (e) { toast.error(e.response?.data?.detail || 'Failed'); }
  };
  const act = async (bid, action, body = {}) => {
    try { await mp.post(`/doctor/bookings/${bid}/${action}`, body, doctorHdr()); toast.success('Done'); loadAll(); }
    catch (e) { toast.error(e.response?.data?.detail || 'Action failed'); }
  };
  const saveRx = async (bid, finalize = false) => {
    const d = rxDraft[bid] || {};
    try {
      await mp.post(`/doctor/bookings/${bid}/prescription`, {
        assessment: d.assessment || '', precautions: d.precautions || '', followup: d.followup || '',
        medications: (d.meds || '').split('\n').filter(Boolean).map((line) => {
          const [name, rest] = line.split('—').map((s) => s.trim());
          return { name: name || line, strength: '', dosage: rest || '', route: 'oral', frequency: '', duration: '' };
        }),
      }, doctorHdr());
      if (finalize) await mp.post(`/doctor/bookings/${bid}/prescription/finalize`, {}, doctorHdr());
      toast.success(finalize ? 'Prescription finalised & shared' : 'Draft saved');
    } catch (e) { toast.error(e.response?.data?.detail || 'Save failed'); }
  };
  const withdraw = async () => {
    const amt = Number(prompt('Amount to withdraw (₹):'));
    if (!amt) return;
    try { await mp.post('/doctor/withdraw', { amount: amt }, doctorHdr()); toast.success('Withdrawal requested'); loadAll(); }
    catch (e) { toast.error(e.response?.data?.detail || 'Failed'); }
  };

  return (
    <div className="bg-stone-50 min-h-screen" data-testid="doctor-portal">
      <div className="max-w-4xl mx-auto px-3 sm:px-6 py-8">
        <ProviderHeader title={`Dr. ${me.name}`} subtitle="Dermatologist app" status={fmtStatus(profile.application_status)}
          onLogout={() => { localStorage.removeItem('mp_doctor_token'); setErr(true); }}
          today={bookings.filter((b) => b.date === new Date().toISOString().slice(0, 10)).length}
          pending={bookings.filter((b) => b.status === 'confirmed').length} balance={wallet?.balance}>
          <PresenceToggle role="doctor" />
        </ProviderHeader>
        <DoctorInstantRequests />
        <BookingAlerts bookings={bookings} activeStatuses={['confirmed', 'in_progress']} title={(b) => `Consultation with ${b.customer?.name || 'patient'}`} testid="doctor-booking-alerts" />
        <div className="flex gap-2 overflow-x-auto pb-2 mb-6" data-testid="doctor-tabs">
          {[['bookings', 'Bookings', CalendarDays], ['photo', 'Profile Photo', Camera], ['availability', 'Availability & Fees', CalendarDays],
            ['wallet', 'Wallet', Wallet], ['notifications', `Notifications${notifs.filter((n) => !n.read).length ? ` (${notifs.filter((n) => !n.read).length})` : ''}`, Bell]].map(([k, label, Icon]) => (
            <button key={k} data-testid={`tab-${k}`} onClick={() => setTab(k)} className={tabBtn(tab === k)}><span className="flex items-center gap-1.5"><Icon size={13} />{label}</span></button>
          ))}
        </div>

        {tab === 'bookings' && (
          <div className="space-y-3" data-testid="doctor-bookings">
            {bookings.length === 0 && <p className="text-sm text-stone-400 text-center py-10">No paid consultations yet — go online to get instant requests.</p>}
            {bookings.map((b) => (
              <div key={b.booking_id} className="bg-white rounded-2xl border border-stone-200 p-5 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-bold text-stone-900">{b.customer?.name}</p>
                    <p className="text-xs text-stone-500">{b.booking_id} • {b.date} • {b.slot} • Paid · you earn ₹{b.provider_earning ?? b.fee}</p>
                  </div>
                  <span className={`text-[11px] font-bold rounded-full px-2.5 py-1 ${statusColor(b.status)}`}>{fmtStatus(b.status)}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {['confirmed', 'in_progress'].includes(b.status) && (
                    <Link to={`/consult-room/${b.booking_id}`} data-testid={`open-room-${b.booking_id}`} className="bg-emerald-700 text-white text-xs font-bold rounded-full px-4 py-2">Start call</Link>
                  )}
                  {['confirmed', 'in_progress'].includes(b.status) && (
                    <button onClick={() => act(b.booking_id, 'request-completion')} data-testid={`req-complete-${b.booking_id}`} className="border border-stone-300 text-xs font-bold rounded-full px-4 py-2">Request completion</button>
                  )}
                  {b.status === 'completion_pending' && (
                    <span className="flex items-center gap-2">
                      <input placeholder="OTP" value={otpMap[b.booking_id] || ''} data-testid={`otp-${b.booking_id}`}
                        onChange={(e) => setOtpMap({ ...otpMap, [b.booking_id]: e.target.value })}
                        className="w-24 rounded-full border border-stone-300 px-3 py-1.5 text-xs text-center" />
                      <button onClick={() => act(b.booking_id, 'verify', { otp: otpMap[b.booking_id] || '' })} data-testid={`verify-${b.booking_id}`} className="bg-emerald-700 text-white text-xs font-bold rounded-full px-4 py-2">Verify</button>
                    </span>
                  )}
                </div>
                {['in_progress', 'completion_pending', 'completed'].includes(b.status) && (
                  <div className="border-t border-stone-100 pt-3" data-testid={`rx-editor-${b.booking_id}`}>
                    <p className="text-xs font-extrabold text-stone-700 flex items-center gap-1 mb-2"><FileText size={13} /> Prescription</p>
                    <textarea placeholder="Clinical assessment" rows={2} className={`${input} mb-2`}
                      value={(rxDraft[b.booking_id]?.assessment) || ''}
                      onChange={(e) => setRxDraft({ ...rxDraft, [b.booking_id]: { ...rxDraft[b.booking_id], assessment: e.target.value } })} />
                    <textarea placeholder="Medications — one per line: Name — dose, frequency, duration" rows={2} className={`${input} mb-2`}
                      value={(rxDraft[b.booking_id]?.meds) || ''}
                      onChange={(e) => setRxDraft({ ...rxDraft, [b.booking_id]: { ...rxDraft[b.booking_id], meds: e.target.value } })} />
                    <input placeholder="Follow-up instructions" className={`${input} mb-2`}
                      value={(rxDraft[b.booking_id]?.followup) || ''}
                      onChange={(e) => setRxDraft({ ...rxDraft, [b.booking_id]: { ...rxDraft[b.booking_id], followup: e.target.value } })} />
                    <div className="flex gap-2">
                      <button onClick={() => saveRx(b.booking_id)} data-testid={`rx-save-${b.booking_id}`} className="border border-stone-300 text-xs font-bold rounded-full px-4 py-2">Save draft</button>
                      <button onClick={() => saveRx(b.booking_id, true)} data-testid={`rx-finalize-${b.booking_id}`} className="bg-emerald-700 text-white text-xs font-bold rounded-full px-4 py-2">Finalise & share</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {tab === 'photo' && (
          <div className="bg-white rounded-3xl border border-stone-200 p-6" data-testid="photo-tab">
            <h2 className="font-extrabold text-stone-900 mb-1">Profile photo</h2>
            <p className="text-xs text-stone-500 mb-4">Upload a real photo of yourself. Our AI standardises it to a clean white background — your face is never altered.</p>
            <label className="inline-block bg-emerald-700 text-white text-xs font-bold rounded-full px-5 py-2.5 cursor-pointer" data-testid="photo-upload-label">
              Upload photo
              <input type="file" accept="image/*" className="hidden" data-testid="photo-upload-input" onChange={(e) => e.target.files[0] && uploadPhoto(e.target.files[0])} />
            </label>
            <div className="grid sm:grid-cols-2 gap-4 mt-5">
              <div className="text-center">
                <p className="text-[11px] font-bold text-stone-500 uppercase mb-2">Original (private)</p>
                <div className="aspect-[3/4] rounded-2xl bg-stone-50 border border-stone-100 overflow-hidden flex items-center justify-center">
                  {photo.original_url ? <img src={photo.original_url} alt="original" className="w-full h-full object-cover" /> : <Camera className="text-stone-300" />}
                </div>
              </div>
              <div className="text-center">
                <p className="text-[11px] font-bold text-stone-500 uppercase mb-2">AI white-background preview</p>
                <div className="aspect-[3/4] rounded-2xl bg-white border border-stone-100 overflow-hidden flex items-center justify-center">
                  {photo.processed ? <img src={photo.processed} alt="processed" className="w-full h-full object-cover" /> : <Wand2 className="text-stone-300" />}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 mt-5">
              <button onClick={processPhoto} disabled={!photo.original_url} data-testid="photo-process"
                className="bg-emerald-700 disabled:opacity-40 text-white text-xs font-bold rounded-full px-5 py-2.5">Generate white background</button>
              <button onClick={() => choosePhoto('processed')} disabled={!photo.processed} data-testid="photo-use-processed"
                className="border border-emerald-700 text-emerald-800 disabled:opacity-40 text-xs font-bold rounded-full px-5 py-2.5">Use processed photo</button>
              <button onClick={() => choosePhoto('original')} disabled={!photo.original_url} data-testid="photo-use-original"
                className="border border-stone-300 disabled:opacity-40 text-xs font-bold rounded-full px-5 py-2.5">Use original</button>
            </div>
            {photo.status && <p className="mt-3 text-xs text-stone-500 flex items-center gap-1.5"><CheckCircle2 size={13} className="text-emerald-600" /> Status: {fmtStatus(photo.status)}{photo.error ? ` — ${photo.error}` : ''}</p>}
            {photo.chosen && <div className="mt-4"><p className="text-[11px] font-bold text-stone-500 uppercase mb-2">Live profile photo</p><img src={photo.chosen} alt="chosen" className="w-28 h-36 object-cover rounded-xl border" /></div>}
          </div>
        )}

        {tab === 'availability' && (
          <div className="bg-white rounded-3xl border border-stone-200 p-6 space-y-4" data-testid="availability-tab">
            <div className="grid sm:grid-cols-2 gap-4">
              <label className="text-xs font-bold text-stone-600 uppercase">Your fee (₹)
                <input type="number" className={`${input} mt-1`} defaultValue={profile.consultation?.fee}
                  onChange={(e) => setFeeDraft(e.target.value)}
                  onBlur={(e) => Number(e.target.value) > 0 && saveProfile({ fee: Number(e.target.value) })} data-testid="fee-input" />
                <EarningHint price={feeDraft || profile.consultation?.fee} /></label>
              <label className="text-xs font-bold text-stone-600 uppercase">Duration (min)
                <input type="number" className={`${input} mt-1`} defaultValue={profile.consultation?.duration_min}
                  onBlur={(e) => saveProfile({ duration_min: Number(e.target.value) })} /></label>
            </div>
            <label className="block text-xs font-bold text-stone-600 uppercase">Bio
              <textarea rows={3} className={`${input} mt-1`} defaultValue={profile.professional?.bio}
                onBlur={(e) => saveProfile({ bio: e.target.value })} /></label>
            <WeeklySlotsEditor initial={profile.consultation?.weekly_slots || {}} onSave={(ws) => saveProfile({ weekly_slots: ws })} />
            <p className="text-[11px] text-stone-400">Changes save when you leave a field.</p>
          </div>
        )}

        {tab === 'wallet' && wallet && <WalletPanel wallet={wallet} onWithdraw={withdraw} testid="doctor-wallet" />}

        {tab === 'notifications' && (
          <div className="bg-white rounded-2xl border border-stone-200 divide-y divide-stone-50" data-testid="doctor-notifs">
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

export default DoctorPortalPage;
