import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Clock, ArrowRight, MapPinOff } from 'lucide-react';
import { mp } from '../../utils/mpApi';
import LocationGate, { useSharedLocation } from '../../components/mp/LocationGate';
import SEOHead from '../../components/SEOHead';
import { PriceTag, DiscountBadge } from '../../components/mp/PriceTag';

const GENDERS = [['', 'All'], ['women', 'Women'], ['men', 'Men']];

const ServiceCard = ({ s }) => (
  <Link to={`/services/${s.service_id}`} data-testid={`hb-service-${s.service_id}`}
    className="group bg-white rounded-2xl border border-stone-200 overflow-hidden hover:border-emerald-400 hover:shadow-lg transition-[box-shadow,border-color] flex flex-col">
    <div className="relative aspect-square bg-stone-50 overflow-hidden">
      {s.thumbnail && <img src={s.thumbnail} alt={s.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />}
      <DiscountBadge pct={s.discount_pct} className="absolute top-1.5 left-1.5" />
      {s.gender && s.gender !== 'unisex' && <span className="absolute top-1.5 right-1.5 text-[9px] font-bold bg-white/90 rounded-full px-1.5 py-0.5 capitalize">{s.gender}</span>}
    </div>
    <div className="p-2.5 sm:p-4 flex-1 flex flex-col">
      <h3 className="font-extrabold text-stone-900 text-xs sm:text-sm leading-snug line-clamp-2">{s.name}</h3>
      <div className="mt-auto pt-2 flex items-end justify-between gap-1">
        <div><PriceTag price={s.price} mrp={s.mrp} size="sm" />
          <p className="text-[10px] text-stone-400 flex items-center gap-1"><Clock size={10} /> {s.duration_min} min</p></div>
        <ArrowRight size={15} className="text-emerald-700 group-hover:translate-x-0.5 transition-transform" />
      </div>
    </div>
  </Link>
);

export default function HbCategoryPage() {
  const { catId } = useParams();
  const [tree, setTree] = useState(null);
  const [sub, setSub] = useState('');
  const [gender, setGender] = useState('');
  const [nearbyIds, setNearbyIds] = useState(null);
  const loc = useSharedLocation();
  useEffect(() => { mp.get('/catalog/tree', { params: { context: 'home' } }).then((r) => setTree(r.data)).catch(() => setTree([])); }, []);
  useEffect(() => {
    if (!loc) { setNearbyIds(null); return; }
    mp.get('/services', { params: { lat: loc.lat, lng: loc.lng } })
      .then((r) => setNearbyIds(new Set(r.data.map((s) => s.service_id)))).catch(() => setNearbyIds(new Set()));
  }, [loc?.lat, loc?.lng]);
  const cat = useMemo(() => (tree || []).find((c) => c.cat_id === catId), [tree, catId]);
  if (!tree) return <div className="py-24 text-center text-stone-400">Loading…</div>;
  if (!cat) return <div className="py-24 text-center" data-testid="hb-cat-missing">Category not available. <Link to="/services" className="text-emerald-700 underline">All services</Link></div>;
  const subs = cat.subcategories.filter((s) => s.services.length);
  const shown = subs.filter((s) => !sub || s.sub_id === sub)
    .flatMap((s) => s.services)
    .filter((s) => !gender || s.gender === gender || s.gender === 'unisex' || !s.gender)
    .filter((s) => !nearbyIds || nearbyIds.has(s.service_id));

  return (
    <div className="bg-white min-h-screen" data-testid="hb-category-page">
      <SEOHead title={`${cat.title} at Home`} canonicalPath={`/services/category/${catId}`} description={cat.description || `${cat.title} services at home by verified professionals.`} />
      <div className="max-w-6xl mx-auto px-3 sm:px-6 py-6 sm:py-10">
        <Link to="/services" className="text-sm text-stone-500 inline-flex items-center gap-1 mb-4"><ArrowLeft size={15} /> All categories</Link>
        <div className="flex items-center gap-4 sm:gap-6">
          <img src={cat.image} alt={cat.title} className="w-20 h-20 sm:w-28 sm:h-28 rounded-2xl object-cover border border-stone-100" />
          <div>
            <p className="text-[10px] font-black tracking-[0.2em] uppercase text-sky-800">Health & Beauty at Home</p>
            <h1 className="text-2xl sm:text-4xl font-extrabold text-stone-900">{cat.title}</h1>
            {cat.description && <p className="text-sm text-stone-500 mt-1">{cat.description}</p>}
          </div>
        </div>
        <div className="mt-6 flex gap-2 overflow-x-auto pb-2 -mx-1 px-1" data-testid="hb-sub-chips">
          <button onClick={() => setSub('')} data-testid="hb-sub-all" className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold border ${!sub ? 'bg-emerald-700 text-white border-emerald-700' : 'border-stone-200 text-stone-600'}`}>All</button>
          {subs.map((s) => (
            <button key={s.sub_id} onClick={() => setSub(s.sub_id)} data-testid={`hb-sub-${s.sub_id}`}
              className={`shrink-0 inline-flex items-center gap-2 rounded-full pl-1 pr-4 py-1 text-xs font-bold border ${sub === s.sub_id ? 'bg-emerald-700 text-white border-emerald-700' : 'border-stone-200 text-stone-700'}`}>
              <img src={s.image || cat.image} alt="" className="w-7 h-7 rounded-full object-cover" /> {s.title}
            </button>
          ))}
        </div>
        <div className="mt-3 inline-flex p-1 bg-stone-100 rounded-full" data-testid="hb-gender-filter">
          {GENDERS.map(([g, l]) => (
            <button key={g || 'all'} onClick={() => setGender(g)} data-testid={`hb-gender-${g || 'all'}`}
              className={`rounded-full px-4 py-1.5 text-xs font-extrabold ${gender === g ? 'bg-white shadow text-stone-900' : 'text-stone-500'}`}>{l}</button>
          ))}
        </div>
        {!loc ? (
          <div className="mt-6"><LocationGate title="See services available at your doorstep" subtitle="Share your location so we can show partners who serve your area." /></div>
        ) : (
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5" data-testid="hb-service-grid">
          {shown.map((s) => <ServiceCard key={s.service_id} s={s} />)}
          {shown.length === 0 && (
            <div className="col-span-full flex justify-center py-10" data-testid="no-services-nearby">
              <div className="max-w-md w-full text-center bg-gradient-to-br from-emerald-50 via-white to-teal-50 border border-emerald-100 rounded-3xl p-8 sm:p-10 shadow-sm">
                <div className="mx-auto w-14 h-14 rounded-2xl bg-white shadow-sm ring-1 ring-emerald-100 flex items-center justify-center text-emerald-600 mb-3"><MapPinOff size={26} strokeWidth={1.6} /></div>
                <h3 className="text-lg font-extrabold text-stone-900">We're not available at your location yet</h3>
                <p className="text-sm text-stone-500 mt-1.5">No service partners near you for this category right now. Try switching your area from the top bar.</p>
              </div>
            </div>
          )}
        </div>
        )}
      </div>
    </div>
  );
}

export const HbCategoryGrid = () => {
  const [cats, setCats] = useState([]);
  useEffect(() => { mp.get('/categories', { params: { module: 'service' } }).then((r) => setCats(r.data.filter((c) => c.show_on_home !== false))).catch(() => {}); }, []);
  return (
    <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-3" data-testid="hb-category-grid">
      {cats.map((c) => (
        <Link key={c.cat_id} to={`/services/category/${c.cat_id}`} data-testid={`hb-cat-${c.cat_id}`} className="group text-center">
          <div className="aspect-square rounded-2xl overflow-hidden bg-sky-50 border border-stone-100">
            {c.image && <img src={c.image} alt={c.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />}
          </div>
          <p className="mt-1.5 text-[11px] sm:text-xs font-bold text-stone-800 leading-tight">{c.title}</p>
        </Link>
      ))}
    </div>
  );
};
