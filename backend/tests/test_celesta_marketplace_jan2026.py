"""Celesta Glow marketplace regression (Jan 2026) — covers:
- varied discount per service
- service detail w/ partner distance/eta/staff
- doctor list w/ specialties + geo
- female-only home booking + partner notification
- partner arrival-photo gating + settlement meta
- admin platform-wallet summary
- admin content edit + replace image
- partner staff update
- provider onboarding specialties/staff
- Agora consult room token
"""
import io
import os
import secrets
import datetime as dt
import pytest
import requests
import pymongo

BASE = os.environ["REACT_APP_BACKEND_URL"].rstrip("/") + "/api"
ADMIN_PWD = "celestaglow2024"
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "test_database")

mdb = pymongo.MongoClient(MONGO_URL)[DB_NAME]


@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(f"{BASE}/admin/login", json={"password": ADMIN_PWD}, timeout=30)
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="module")
def admin_hdr(admin_token):
    return {"X-Admin-Token": admin_token}


@pytest.fixture(scope="module")
def sample_partner():
    p = mdb.mp_partners.find_one({"applicant.email": "partner@sample.celestaglow.com"})
    assert p, "sample partner not seeded"
    return p


@pytest.fixture(scope="module")
def partner_token(sample_partner):
    """Create a direct mp_sessions row for sample partner (bypasses OTP email)."""
    acc = mdb.mp_accounts.find_one({"role": "partner", "email": "partner@sample.celestaglow.com"})
    assert acc, "sample partner account missing"
    tok = secrets.token_hex(24)
    mdb.mp_sessions.insert_one({
        "token": tok, "account_id": acc["account_id"], "role": "partner",
        "expires_at": (dt.datetime.now(dt.timezone.utc) + dt.timedelta(days=1)).isoformat()})
    yield tok
    mdb.mp_sessions.delete_one({"token": tok})


# --------------------------------------------------------------- 1. varied discount
def test_services_varied_discount():
    r = requests.get(f"{BASE}/mp/services", timeout=30)
    assert r.status_code == 200
    svcs = r.json()
    assert len(svcs) >= 2
    discounts = {s["discount_pct"] for s in svcs}
    for s in svcs:
        assert 25 <= s["discount_pct"] <= 35, s
    assert len(discounts) > 1, "all services share same discount — expected randomised per item"


# --------------------------------------------------------------- 2. service detail partners
def test_service_detail_partners_with_geo(sample_partner):
    svcs = requests.get(f"{BASE}/mp/services", timeout=30).json()
    sid = svcs[0]["service_id"]
    r = requests.get(f"{BASE}/mp/services/{sid}", params={"lat": 12.97, "lng": 77.59}, timeout=30)
    assert r.status_code == 200
    body = r.json()
    assert "partners" in body
    p = next((x for x in body["partners"] if x["partner_id"] == sample_partner["partner_id"]), None)
    assert p is not None, "sample partner should be listed"
    assert "female_staff" in p and "male_staff" in p
    assert p["female_staff"] >= 1
    assert p.get("distance_km") is not None and p.get("eta_minutes") is not None


# --------------------------------------------------------------- 3. doctors specialties + geo
def test_doctors_specialties_and_geo():
    r = requests.get(f"{BASE}/mp/doctors", params={"lat": 12.97, "lng": 77.59}, timeout=30)
    assert r.status_code == 200
    docs = r.json()
    assert docs, "no doctors seeded"
    for d in docs:
        assert isinstance(d.get("specialties"), list) and len(d["specialties"]) >= 1
    assert docs[0].get("distance_km") is not None
    assert docs[0].get("eta_minutes") is not None


# --------------------------------------------------------------- 4. home book female + partner notified
@pytest.fixture(scope="module")
def female_booking(sample_partner):
    # find a service the sample partner offers
    sid = sample_partner["services"][0]["service_id"]
    body = {
        "service_id": sid, "date": "2026-02-01", "slot": "10:00",
        "name": "Test Cust", "email": f"TEST_cust_{secrets.token_hex(3)}@example.com",
        "phone": "9000000000", "address": "MG Road", "city": "Bengaluru", "pincode": "560001",
        "lat": 12.9756, "lng": 77.6050,  # same as partner for arrival check
        "payment_method": "pay_after_service", "staff_gender": "female",
    }
    r = requests.post(f"{BASE}/mp/home/book", json=body, timeout=30)
    assert r.status_code == 200, r.text
    out = r.json()
    assert out["booking"]["staff_gender"] == "female"
    assert out["partners_notified"] >= 1
    return out["booking"]


def test_home_book_female_offers_to_partner(female_booking, partner_token):
    r = requests.get(f"{BASE}/mp/partner/requests",
                     headers={"Authorization": f"Bearer {partner_token}"}, timeout=30)
    assert r.status_code == 200, r.text
    requests_list = r.json()
    assert any(o["booking_id"] == female_booking["booking_id"] for o in requests_list)


# --------------------------------------------------------------- 5. partner journey + arrival photo gating
def test_partner_journey_arrival_photo_gating_and_settlement(female_booking, partner_token):
    bid = female_booking["booking_id"]
    H = {"Authorization": f"Bearer {partner_token}"}

    # accept
    r = requests.post(f"{BASE}/mp/partner/requests/{bid}/accept", headers=H, timeout=30)
    assert r.status_code == 200, r.text

    # start-journey
    r = requests.post(f"{BASE}/mp/partner/bookings/{bid}/start-journey", headers=H, timeout=30)
    assert r.status_code == 200, r.text

    # start-service WITHOUT arrival photo should FAIL
    r = requests.post(f"{BASE}/mp/partner/bookings/{bid}/start-service", headers=H, timeout=30)
    assert r.status_code == 400, f"expected 400, got {r.status_code}: {r.text}"

    # upload arrival photo (small png) — force=True since lat/lng=partner coord vs customer coord
    png = (b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde"
           b"\x00\x00\x00\x0cIDATx\x9cc\xf8\xcf\xc0\x00\x00\x00\x03\x00\x01\xdd\x8d\xb4\x1c\x00\x00\x00\x00IEND\xaeB`\x82")
    files = {"file": ("arr.png", io.BytesIO(png), "image/png")}
    data = {"lat": "12.9756", "lng": "77.6050", "force": "true"}
    r = requests.post(f"{BASE}/mp/partner/bookings/{bid}/arrival-photo",
                      headers=H, files=files, data=data, timeout=60)
    assert r.status_code == 200, r.text
    assert r.json()["status"] == "arrived"

    # start-service now OK
    r = requests.post(f"{BASE}/mp/partner/bookings/{bid}/start-service", headers=H, timeout=30)
    assert r.status_code == 200, r.text

    # request-completion -> OTP written; fetch from DB
    r = requests.post(f"{BASE}/mp/partner/bookings/{bid}/request-completion", headers=H, timeout=30)
    assert r.status_code == 200
    # we can't read plaintext OTP (hashed) — but admin can mark paid? No, we need to verify.
    # Fetch booking directly from DB to grab OTP hash and brute 6-digit? Instead inject new OTP.
    import hashlib
    code = "123456"
    h = hashlib.sha256(code.encode()).hexdigest()
    mdb.mp_home_bookings.update_one({"booking_id": bid}, {"$set": {
        "otp.hash": h, "otp.attempts": 0, "otp.used": False,
        "otp.expires_at": (dt.datetime.now(dt.timezone.utc) + dt.timedelta(minutes=10)).isoformat()}})
    r = requests.post(f"{BASE}/mp/partner/bookings/{bid}/verify",
                      headers=H, json={"otp": code}, timeout=30)
    assert r.status_code == 200, r.text
    assert r.json()["status"] == "completed"

    # ledger meta has customer_commission + partner_commission
    entry = mdb.mp_wallet_ledger.find_one(
        {"booking_id": bid, "owner_type": "platform"},
        sort=[("at", -1)])
    assert entry, "platform ledger entry missing"
    meta = entry.get("meta") or {}
    assert "customer_commission" in meta
    assert "partner_commission" in meta


# --------------------------------------------------------------- 6. admin platform-wallet summary
def test_admin_platform_wallet(admin_hdr):
    r = requests.get(f"{BASE}/mp/admin/platform-wallet", headers=admin_hdr, timeout=30)
    assert r.status_code == 200, r.text
    body = r.json()
    assert "summary" in body
    for k in ("customer_commission", "partner_commission", "doctor_commission"):
        assert k in body["summary"]


# --------------------------------------------------------------- 7. admin content edit + replace image
def test_admin_edit_service_text_and_replace_image(admin_hdr):
    sid = requests.get(f"{BASE}/mp/services", timeout=30).json()[0]["service_id"]
    new_desc = f"TEST_updated_{secrets.token_hex(3)}"
    r = requests.patch(f"{BASE}/mp/admin/content/service/{sid}",
                       headers=admin_hdr, json={"short_desc": new_desc}, timeout=30)
    assert r.status_code == 200, r.text
    # verify via admin list
    svc = next(s for s in requests.get(f"{BASE}/mp/admin/services", headers=admin_hdr, timeout=30).json()
               if s["service_id"] == sid)
    assert svc["short_desc"] == new_desc

    # replace thumbnail
    png = (b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde"
           b"\x00\x00\x00\x0cIDATx\x9cc\xf8\xcf\xc0\x00\x00\x00\x03\x00\x01\xdd\x8d\xb4\x1c\x00\x00\x00\x00IEND\xaeB`\x82")
    files = {"file": ("t.png", io.BytesIO(png), "image/png")}
    r = requests.post(f"{BASE}/mp/admin/services/{sid}/images?replace=true",
                      headers=admin_hdr, files=files, timeout=60)
    assert r.status_code == 200, r.text


# --------------------------------------------------------------- 8. partner profile staff
def test_partner_profile_staff_update(partner_token):
    H = {"Authorization": f"Bearer {partner_token}"}
    r = requests.put(f"{BASE}/mp/partner/profile", headers=H,
                     json={"staff_total": 5, "staff_female": 3, "staff_male": 2}, timeout=30)
    assert r.status_code == 200, r.text
    p = requests.get(f"{BASE}/mp/partner/profile", headers=H, timeout=30).json()
    assert p["staff"] == {"total": 5, "female": 3, "male": 2}


# --------------------------------------------------------------- 9. provider onboarding stores specialties/staff
def test_provider_doctor_specialties():
    email = f"TEST_doc_{secrets.token_hex(3)}@example.com"
    r = requests.post(f"{BASE}/mp/provider/register",
                      json={"role": "doctor", "name": "Dr. Test", "email": email}, timeout=30)
    assert r.status_code == 200, r.text
    rec = mdb.mp_otps.find_one({"email": email.lower(), "role": "doctor"})
    assert rec
    # inject known otp to verify (we cannot read plaintext from send-mail path)
    import hashlib
    code = "654321"
    mdb.mp_otps.update_one({"_id": rec["_id"]},
                           {"$set": {"otp_hash": hashlib.sha256(code.encode()).hexdigest(),
                                     "attempts": 0,
                                     "expires_at": (dt.datetime.now(dt.timezone.utc) + dt.timedelta(minutes=5)).isoformat()}})
    r = requests.post(f"{BASE}/mp/provider/verify-email",
                      json={"role": "doctor", "email": email, "otp": code}, timeout=30)
    assert r.status_code == 200, r.text
    tok = r.json()["token"]
    H = {"Authorization": f"Bearer {tok}"}
    body = {"specialties": ["Skin", "Hair"], "specialisation": "Skin",
            "registration_number": "TEST-REG-1", "fee": 999, "experience_years": 3,
            "name": "Dr. Test", "mobile": "9000000001", "city": "Bengaluru"}
    r = requests.post(f"{BASE}/mp/provider/apply", headers=H, json=body, timeout=30)
    assert r.status_code == 200, r.text
    did = r.json()["application_id"]
    doc = mdb.mp_doctors.find_one({"doctor_id": did})
    assert doc["professional"]["specialties"] == ["Skin", "Hair"]
    assert (doc["personal"].get("lat") is None) or isinstance(doc["personal"].get("lat"), (int, float))
    # cleanup
    mdb.mp_doctors.delete_one({"doctor_id": did})
    mdb.mp_accounts.delete_many({"email": email.lower()})


def test_provider_partner_staff_and_location():
    email = f"TEST_prt_{secrets.token_hex(3)}@example.com"
    r = requests.post(f"{BASE}/mp/provider/register",
                      json={"role": "partner", "name": "Partner Test", "email": email}, timeout=30)
    assert r.status_code == 200
    rec = mdb.mp_otps.find_one({"email": email.lower(), "role": "partner"})
    import hashlib
    code = "112233"
    mdb.mp_otps.update_one({"_id": rec["_id"]},
                           {"$set": {"otp_hash": hashlib.sha256(code.encode()).hexdigest(),
                                     "attempts": 0,
                                     "expires_at": (dt.datetime.now(dt.timezone.utc) + dt.timedelta(minutes=5)).isoformat()}})
    r = requests.post(f"{BASE}/mp/provider/verify-email",
                      json={"role": "partner", "email": email, "otp": code}, timeout=30)
    tok = r.json()["token"]
    H = {"Authorization": f"Bearer {tok}"}
    sid = requests.get(f"{BASE}/mp/services", timeout=30).json()[0]["service_id"]
    body = {"name": "Partner Test", "mobile": "9000000002",
            "address": "Rd", "city": "Bengaluru", "state": "KA", "pincode": "560001",
            "lat": 12.97, "lng": 77.60,
            "staff_total": 4, "staff_female": 2, "staff_male": 2,
            "services": [{"service_id": sid, "price": 999}]}
    r = requests.post(f"{BASE}/mp/provider/apply", headers=H, json=body, timeout=30)
    assert r.status_code == 200, r.text
    pid = r.json()["application_id"]
    prt = mdb.mp_partners.find_one({"partner_id": pid})
    assert prt["staff"] == {"total": 4, "female": 2, "male": 2}
    assert prt["location"]["lat"] == 12.97 and prt["location"]["lng"] == 77.60
    mdb.mp_partners.delete_one({"partner_id": pid})
    mdb.mp_accounts.delete_many({"email": email.lower()})


# --------------------------------------------------------------- 10. Agora consult room
def test_consult_room_returns_agora():
    """Pick a confirmed consult for sample doctor; if none, create by direct DB insert."""
    doc = mdb.mp_doctors.find_one({"personal.email": "dr.meera@sample.celestaglow.com"})
    assert doc
    did = doc["doctor_id"]
    cust_email = f"test_consult_{secrets.token_hex(3)}@example.com"
    bid = f"CG-C-TEST{secrets.token_hex(3).upper()}"
    mdb.mp_consultations.insert_one({
        "booking_id": bid, "doctor_id": did, "doctor_name": doc["personal"]["name"],
        "customer": {"name": "Test", "email": cust_email, "phone": "9"},
        "date": "2026-02-01", "slot": "10:00",
        "fee": 999, "status": "confirmed", "payment_status": "paid",
        "room_secret": secrets.token_hex(4), "created_at": dt.datetime.now(dt.timezone.utc).isoformat()})
    try:
        r = requests.get(f"{BASE}/mp/consultations/{bid}/room",
                         params={"email": cust_email}, timeout=30)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["provider"] == "agora", body
        assert body.get("app_id") and body.get("channel") and body.get("token") and body.get("uid")
    finally:
        mdb.mp_consultations.delete_one({"booking_id": bid})
