"""Backend tests for celesta glow marketplace admin + public endpoints."""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL") or open("/app/frontend/.env").read().split("REACT_APP_BACKEND_URL=")[1].split("\n")[0].strip()
BASE_URL = BASE_URL.rstrip("/")
ADMIN_PASSWORD = "celestaglow2024"


@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(f"{BASE_URL}/api/admin/login", json={"password": ADMIN_PASSWORD}, timeout=15)
    assert r.status_code == 200, f"admin login failed: {r.status_code} {r.text}"
    data = r.json()
    tok = data.get("token") or data.get("admin_token") or data.get("access_token")
    assert tok, f"no token in resp: {data}"
    return tok


@pytest.fixture(scope="module")
def admin_headers(admin_token):
    return {"X-Admin-Token": admin_token, "Content-Type": "application/json"}


# -- Admin login --
def test_admin_login_wrong_password():
    r = requests.post(f"{BASE_URL}/api/admin/login", json={"password": "wrong"}, timeout=10)
    assert r.status_code in (400, 401, 403)


def test_admin_login_ok(admin_token):
    assert isinstance(admin_token, str) and len(admin_token) > 5


# -- Config: payments / agora --
def test_mp_config_payments_configured():
    r = requests.get(f"{BASE_URL}/api/mp/config", timeout=10)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data.get("payments_configured") is True, f"payments_configured not true: {data}"


# -- Doctors public endpoint: expect 3 with https photos --
def test_mp_doctors_list_photos():
    r = requests.get(f"{BASE_URL}/api/mp/doctors", timeout=15)
    assert r.status_code == 200, r.text
    doctors = r.json()
    assert isinstance(doctors, list)
    assert len(doctors) >= 3, f"expected >=3 doctors, got {len(doctors)}"
    for d in doctors[:3]:
        photo = d.get("photo_url") or d.get("photo") or d.get("image_url")
        assert photo and str(photo).startswith("https://"), f"doctor {d.get('name')} missing https photo: {photo}"


# -- Services list for /services/<id> test --
@pytest.fixture(scope="module")
def sample_service_id():
    r = requests.get(f"{BASE_URL}/api/mp/services", timeout=15)
    if r.status_code != 200:
        pytest.skip(f"/api/mp/services returned {r.status_code}")
    arr = r.json()
    if not arr:
        pytest.skip("no services returned")
    sid = arr[0].get("id") or arr[0].get("_id") or arr[0].get("service_id")
    assert sid, f"no id field in {arr[0]}"
    return sid


def test_services_list_ok(sample_service_id):
    assert sample_service_id


# -- Admin withdrawals (doctor + partner) --
def test_admin_withdrawals_doctor(admin_headers):
    r = requests.get(f"{BASE_URL}/api/mp/admin/withdrawals?owner_type=doctor", headers=admin_headers, timeout=15)
    assert r.status_code == 200, r.text
    data = r.json()
    assert isinstance(data, list)
    for row in data:
        assert "owner_name" in row, f"row missing owner_name: {row}"
        assert "owner_balance" in row, f"row missing owner_balance: {row}"


def test_admin_withdrawals_partner(admin_headers):
    r = requests.get(f"{BASE_URL}/api/mp/admin/withdrawals?owner_type=partner", headers=admin_headers, timeout=15)
    assert r.status_code == 200, r.text
    data = r.json()
    assert isinstance(data, list)
    for row in data:
        assert "owner_name" in row
        assert "owner_balance" in row


def test_admin_withdrawals_requires_auth():
    r = requests.get(f"{BASE_URL}/api/mp/admin/withdrawals?owner_type=doctor", timeout=10)
    assert r.status_code in (401, 403)


# -- Admin support --
def test_admin_support_ok(admin_headers):
    r = requests.get(f"{BASE_URL}/api/mp/admin/support", headers=admin_headers, timeout=15)
    assert r.status_code == 200, r.text
    assert isinstance(r.json(), list)


# -- Agora consultation room should not 500 for bogus id --
def test_consultation_room_no_500():
    r = requests.get(f"{BASE_URL}/api/mp/consultations/not-a-real-id/room", timeout=15)
    assert r.status_code != 500, f"500 on consultation room: {r.text}"
    # expected 401/403/404
    assert r.status_code in (400, 401, 403, 404, 422), f"unexpected {r.status_code} {r.text}"
