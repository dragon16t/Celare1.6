import React from 'react';
import { Sparkle } from 'lucide-react';

export const SPECIALTIES = ['Skin', 'Hair', 'Nails', 'Acne', 'Anti-Aging', 'Pigmentation', 'Allergy & Eczema',
  'Cosmetic Dermatology', 'Laser & Aesthetics', 'Pediatric Dermatology'];

export const SpecialtyBadges = ({ items = [], size = 'sm', max = 99, testid = 'specialty-badges' }) => {
  if (!items?.length) return null;
  const cls = size === 'lg'
    ? 'text-xs px-3 py-1.5'
    : 'text-[8px] sm:text-[10px] px-1.5 sm:px-2 py-0.5';
  return (
    <div className="flex flex-wrap gap-1" data-testid={testid}>
      {items.slice(0, max).map((s) => (
        <span key={s} className={`inline-flex items-center gap-1 rounded-full font-extrabold bg-amber-100 text-amber-900 border border-amber-200 ${cls}`}>
          <Sparkle size={size === 'lg' ? 11 : 8} /> {s}
        </span>
      ))}
      {items.length > max && <span className={`rounded-full font-bold bg-stone-100 text-stone-500 ${cls}`}>+{items.length - max}</span>}
    </div>
  );
};

export const fmtEta = (m) => {
  if (m == null) return '';
  if (m < 60) return `~${m} min away`;
  const h = Math.floor(m / 60); const r = m % 60;
  return `~${h} hr${r ? ` ${r} min` : ''} away`;
};
