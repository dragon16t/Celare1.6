import React, { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { mp, doctorHdr, partnerHdr } from '../../utils/mpApi';

const PresenceToggle = ({ role }) => {
  const hdr = role === 'doctor' ? doctorHdr : partnerHdr;
  const [online, setOnline] = useState(false);
  const timer = useRef(null);

  const setPresence = async (on) => {
    try {
      await mp.post(`/${role}/presence`, { online: on }, hdr());
      setOnline(on);
      toast.success(on ? 'You are online — instant requests enabled' : 'You are offline');
    } catch (e) { toast.error(e.response?.data?.detail || 'Could not update presence'); }
  };

  useEffect(() => {
    mp.get(`/${role}/profile`, hdr()).then((p) => setOnline(!!p.data.online)).catch(() => {});
    return () => clearInterval(timer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!online) return undefined;
    timer.current = setInterval(() => {
      mp.post(`/${role}/presence`, { online: true }, hdr()).catch(() => {});
    }, 60000);
    const off = () => { mp.post(`/${role}/presence`, { online: false }, hdr()).catch(() => {}); };
    window.addEventListener('beforeunload', off);
    return () => { clearInterval(timer.current); window.removeEventListener('beforeunload', off); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online]);

  return (
    <button type="button" role="switch" aria-checked={online} onClick={() => setPresence(!online)} data-testid="presence-toggle"
      className={`inline-flex items-center gap-3 rounded-full pl-2 pr-4 py-1.5 text-xs font-extrabold border shadow-sm transition-colors ${online ? 'bg-emerald-50 border-emerald-300 text-emerald-800' : 'bg-white border-stone-300 text-stone-500'}`}>
      <span className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors ${online ? 'bg-emerald-600' : 'bg-stone-300'}`} data-testid="presence-switch">
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${online ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
      </span>
      <span className="flex items-center gap-1.5">
        {online && <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />}
        {online ? 'Online now — receiving instant requests' : 'Offline — tap to go online'}
      </span>
    </button>
  );
};

export default PresenceToggle;
