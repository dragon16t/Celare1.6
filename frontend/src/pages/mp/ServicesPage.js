import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Clock, Home, ArrowRight, MapPinOff } from 'lucide-react';
import { mp } from '../../utils/mpApi';
import LocationGate, { useSharedLocation } from '../../components/mp/LocationGate';
import SEOHead from '../../components/SEOHead';
import { HbCategoryGrid } from './HbCategoryPage';
import { PriceTag, DiscountBadge } from '../../components/mp/PriceTag';

const ServicesPage = () => {
  const [searchParams] = useSearchParams();
  const [services, setServices] = useState([]);
  const [cat] = useState(searchParams.get('cat') || '');
  const [cats, setCats] = useState([]);
  const [enabled, setEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const loc = useSharedLocation();

  useEffect(() => {
    mp.get('/config').then((r) => setEnabled(r.data.home_services_enabled)).catch(() => {});
    mp.get('/categories', { params: { module: 'service' } }).then((r) => setCats(r.data)).catch(() => {});
  }, []);
  useEffect(() => {
    if (!loc) return;
    setLoading(true);
    const catObj = cats.find((c) => c.title === cat);
    mp.get('/services', { params: { ...(catObj ? { category_id: catObj.cat_id } : {}), lat: loc.lat, lng: loc.lng } })
      .then((r) => setServices(r.data)).catch(() => setServices([])).finally(() => setLoading(false));
  }, [cat, cats, loc?.lat, loc?.lng]); // eslint-disable-line

  if (!enabled) return (
    <div className="max-w-xl mx-auto px-6 py-24 text-center" data-testid="services-disabled">
      <h1 className="text-2xl font-extrabold text-stone-900">Home services are taking a short break</h1>
      <p className="text-stone-500 mt-2">Back very soon.</p>
    </div>
  );

  return (
    <div className="bg-white min-h-screen" data-testid="services-page">
      <SEOHead title="Home Beauty & Wellness Services" canonicalPath="/services"
        description="Book verified beauty and wellness professionals at home — facials, hair spa, colouring and more with live partner tracking on Celesta Glow." />
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-8 sm:py-12">
        <div className="text-center mb-8">
          <p className="text-xs font-bold tracking-[0.2em] text-emerald-700 uppercase">Salon glow. Zero travel.</p>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-stone-900 mt-2">Salon at your doorstep</h1>
        </div>
        {!loc ? (
          <LocationGate title="See services available at your doorstep" subtitle="Share your location so we can show partners who serve your area." />
        ) : (
        <>
        <HbCategoryGrid />
        <h2 className="mt-10 text-lg font-extrabold text-stone-900">{cat || 'Popular services'}</h2>
        <div className="mt-4 grid grid-cols-3 gap-2 sm:gap-5" data-testid="service-list">
          {loading && <p className="col-span-full text-center text-stone-400 py-16">Loading services…</p>}
          {!loading && services.length === 0 && (
            <div className="col-span-full flex justify-center py-10" data-testid="no-services-nearby">
              <div className="max-w-md w-full text-center bg-gradient-to-br from-emerald-50 via-white to-teal-50 border border-emerald-100 rounded-3xl p-8 sm:p-10 shadow-sm">
                <div className="mx-auto w-16 h-16 rounded-2xl bg-white shadow-sm ring-1 ring-emerald-100 flex items-center justify-center text-emerald-600 mb-4"><MapPinOff size={30} strokeWidth={1.6} /></div>
                <h3 className="text-xl font-extrabold text-stone-900">We're not available at your location yet</h3>
                <p className="text-sm text-stone-500 mt-2 leading-relaxed">No service partners near you right now. We're expanding fast — switch your area from the top bar to explore nearby, or check back soon.</p>
                <Link to="/pro" className="inline-flex items-center gap-1.5 mt-5 text-emerald-700 font-bold text-sm hover:underline">Are you a beauty pro? Earn with us <ArrowRight size={14} /></Link>
              </div>
            </div>
          )}
          {services.map((s) => (
            <Link to={`/services/${s.service_id}`} key={s.service_id} data-testid={`service-card-${s.service_id}`}
              className="group bg-white rounded-2xl sm:rounded-3xl border border-stone-200 overflow-hidden hover:border-emerald-400 hover:shadow-xl transition-[box-shadow,border-color] flex flex-col min-w-0">
              <div className="relative aspect-square sm:aspect-[4/3] bg-stone-50 overflow-hidden">
                {(s.thumbnail || s.images?.[0])
                  ? <img src={s.thumbnail || s.images[0]} alt={s.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  : <div className="w-full h-full flex items-center justify-center text-emerald-200"><Home size={36} /></div>}
                <DiscountBadge pct={s.discount_pct} className="absolute top-1.5 left-1.5" />
              </div>
              <div className="p-2 sm:p-5 flex-1 flex flex-col">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h3 className="font-extrabold text-stone-900 text-[11px] sm:text-base leading-snug line-clamp-2">{s.name}</h3>
                </div>
                {(s.gender === 'women' || s.gender === 'men') && (
                  <span className={`mt-1 inline-flex w-fit items-center text-[8px] sm:text-[10px] font-extrabold rounded-full px-2 py-0.5 ${s.gender === 'women' ? 'bg-pink-50 text-pink-700' : 'bg-sky-50 text-sky-700'}`} data-testid={`gender-badge-${s.service_id}`}>{s.gender === 'women' ? 'For Women' : 'For Men'}</span>
                )}
                <p className="hidden sm:block text-xs text-stone-500 mt-1.5 line-clamp-2">{s.short_desc}</p>
                <div className="mt-auto pt-2 flex items-end justify-between gap-1">
                  <div className="min-w-0">
                    <PriceTag price={s.price} mrp={s.mrp} size="sm" />
                    <p className="text-[9px] sm:text-[11px] text-stone-400 flex items-center gap-1"><Clock size={10} /> {s.duration_min} min</p>
                  </div>
                  <span className="hidden sm:inline-flex items-center gap-1 bg-emerald-700 text-white text-xs font-bold rounded-full px-3.5 py-2">Book <ArrowRight size={13} /></span>
                </div>
              </div>
            </Link>
          ))}
        </div>
        </>
        )}
        <p className="text-center mt-10 text-sm text-stone-500">
          Beauty pro? <Link to="/pro" className="text-emerald-700 font-bold underline">Earn with Celesta Glow</Link>
        </p>
      </div>
    </div>
  );
};

export default ServicesPage;
