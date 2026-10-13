# Changelog

## 2026-10-13 — Re-clone celare-1.4 + Marketplace Phase 1
Re-cloned github.com/dragon16t/celare-1.4 into /app (replacing celesta-only codebase).
Verified homepage/doctors/services/admin match reference celare-preview-2.

### Integrations
- Agora RTC video keys wired: AGORA_APP_ID + AGORA_APP_CERTIFICATE (backend/.env),
  REACT_APP_AGORA_APP_ID (frontend/.env). agora_service.py reads them; backend boots clean.
- SendGrid key user-supplied was TRUNCATED → not set; email stays on live Gmail SMTP.

### Marketplace changes (verified via testing_agent iteration_7, backend+frontend 100%)
- Copy: homepage cards → "Book a Nearby Dermatologist" + "Glow Without Leaving Home";
  /services heading → "Salon at your doorstep".
- Rich empty states on /doctors and /services: "We're not available at your location yet" card.
- ServiceDetail gender picker relabeled "Select your gender"; female-with-no-staff →
  "No nearby female staff near you right now."
- Wallet logic (services/mp_common.wallet_move gains allow_negative; mp_ops._settle):
  pay-after-service (cash) bookings now DEBIT the platform commission from the provider
  wallet (shows as minus, nets against online earnings); online bookings credit the wallet.
- Withdrawal rules (mp_ops._guard_withdraw, doctor + partner): min ₹100, ≤ balance, max 2/day.
- NEW admin "Withdrawals" tab in BOTH Dermatologist Manager (/admin/dermatologists) and
  Service Partner Manager (/admin/partners) → components/admin/MpWithdrawals.js. Approve
  (mark paid + reference) / Reject (refunds wallet). Backend /admin/withdrawals gains
  owner_type filter + owner_name/owner_balance enrichment.
- FIXED support-ticket runtime crash (AdminSupport.js useEffect(load,…) returned a Promise →
  "destroy is not a function"). Swept the same anti-pattern; fixed MpCategories.js too.
- Dermatologist photos: 3 seeded doctors given gender-matched professional portraits.

### Marketplace Phase 2 (same session, code-reviewed; provider/customer flows need live-OTP testing)
- Partner portal: NEW-booking alert now loops a beep every 2s (non-stop) until the partner
  accepts/declines or the request expires (requests list empties). (PartnerPortalPage.js)
- Removed the double cash step: the separate "Cash collected" button is gone; a cash
  (pay-after-service) booking is auto-marked paid_cash when the partner verifies the customer
  completion OTP (mp_ops.partner_verify). UI shows a "collect ₹X cash" note instead.
- My Bookings: "Book again" button on consultations → /doctors/{doctor_id} to rebook new timings.
- Services: per-card gender badge "For Women" / "For Men" (ServicesPage.js).
- Verified already-present: partner "Navigate" → Google Maps dir link (customer lat/lng),
  prescription PDF download (My Bookings), merchant earnings/balance (WalletPanel),
  green "Paid" badge (TransactionsPanel).

### Remaining backlog (requested, not yet built) — Phase 3 (larger admin UI)
- (none outstanding from the original spec — see Phase 3 below)

### Marketplace Phase 3 (same session — admin UI; NOT run through testing agent per user instruction)
- HbCatalogManager: "Add catalog" button (placeholder hints Men / Women / Healthy Beauty) +
  a Manage-for gender filter (All / Women / Men / Unisex) so admins manage each gender's
  services/images separately in the one unified catalog page. Category/subcategory/service
  add-edit-update-delete + image replace already existed.
- MpContentManager (Dermatologist Manager → Services & Content): first section relabeled
  "Complete dermatologist profiles" (edit headline/specialties/bio/photo); the concern tiles
  section relabeled "Homepage concern tiles (discovery categories)" with a note clarifying
  they are NOT doctor profiles — fixes the user's "concerns wrongly under dermatology profile".
- Partner order "Navigate" link now always present → Google Maps directions (customer lat/lng
  when synced, else a maps search on the address).

### Notes / not code-changed
- "Super fast": clone already ships lazy routes + Cloudinary image optimizer + CDN sizing.
- km-limit: /doctors and /services already filter providers by saved location (lat/lng) server-side.
