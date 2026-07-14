"""
Backend regression tests for DH Salon iteration 2.
Covers: new endpoints for FAQ, Careers, Cancellation Policy, Professionals,
Testimonials, Membership Renewal, Chat (Claude), Notify, Admin (roles/orders),
plus booking cancel/reschedule flow. Existing endpoints re-verified where useful.
"""
import os
import uuid
import time
import pytest
import requests
from datetime import datetime, timezone, timedelta

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    # Fallback for local run: read frontend .env
    try:
        with open("/app/frontend/.env") as f:
            for ln in f:
                if ln.startswith("REACT_APP_BACKEND_URL"):
                    BASE_URL = ln.strip().split("=", 1)[1].rstrip("/")
    except Exception:
        pass

API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@dhsalon.com"
ADMIN_PW = "Admin@123"


# ---- Fixtures ----
@pytest.fixture(scope="session")
def admin_token():
    r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PW})
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="session")
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}


@pytest.fixture(scope="session")
def customer():
    """Create a fresh customer and return dict with token, headers, id."""
    email = f"TEST_cust_{uuid.uuid4().hex[:8]}@example.com"
    r = requests.post(
        f"{API}/auth/register",
        json={"name": "Test Cust", "email": email, "password": "Passw0rd!"},
    )
    assert r.status_code == 200, r.text
    data = r.json()
    return {
        "token": data["token"],
        "headers": {"Authorization": f"Bearer {data['token']}", "Content-Type": "application/json"},
        "id": data["user"]["id"],
        "email": email,
    }


# ---- Static content endpoints ----
def test_faq_list():
    r = requests.get(f"{API}/faq")
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list) and len(data) >= 5
    cats = {d["category"] for d in data}
    assert {"Booking", "Cancellation", "Payments"}.issubset(cats)
    assert all("q" in d and "a" in d for d in data)


def test_careers_list():
    r = requests.get(f"{API}/careers")
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list) and len(data) >= 4
    assert all("title" in d and "location" in d for d in data)


def test_cancellation_policy():
    r = requests.get(f"{API}/policy/cancellation")
    assert r.status_code == 200
    data = r.json()
    assert "rules" in data and isinstance(data["rules"], list) and len(data["rules"]) == 3
    assert "summary" in data and isinstance(data["summary"], str)
    # sanity: highest tier is 100% refund
    assert any(rule["refund_pct"] == 100 for rule in data["rules"])


# ---- Professionals ----
def test_professional_register_and_admin_approval(admin_headers):
    email = f"TEST_pro_{uuid.uuid4().hex[:8]}@example.com"
    payload = {
        "full_name": "Jane Pro",
        "email": email,
        "phone": "+15550001111",
        "city": "New York",
        "gender": "female",
        "experience_years": 5,
        "specializations": ["Facial", "Waxing"],
        "id_proof_type": "passport",
        "id_proof_number": "X1234567",
        "about": "Certified aesthetician",
    }
    # unauth create
    r = requests.post(f"{API}/professionals/register", json=payload)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body.get("ok") is True and "application_id" in body
    pid = body["application_id"]

    # duplicate email -> 400
    r_dup = requests.post(f"{API}/professionals/register", json=payload)
    assert r_dup.status_code == 400

    # admin list contains this pid with status pending
    r_list = requests.get(f"{API}/admin/professionals", headers=admin_headers)
    assert r_list.status_code == 200
    apps = r_list.json()
    found = next((a for a in apps if a["id"] == pid), None)
    assert found is not None
    assert found["status"] == "pending"

    # approve
    r_upd = requests.put(
        f"{API}/admin/professionals/{pid}/status",
        params={"status": "approved"},
        headers=admin_headers,
    )
    assert r_upd.status_code == 200

    r_list2 = requests.get(f"{API}/admin/professionals", headers=admin_headers)
    found2 = next(a for a in r_list2.json() if a["id"] == pid)
    assert found2["status"] == "approved"


def test_admin_professionals_requires_admin(customer):
    r = requests.get(f"{API}/admin/professionals", headers=customer["headers"])
    assert r.status_code == 403


# ---- Testimonials ----
def test_testimonials_list():
    r = requests.get(f"{API}/testimonials")
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)
    for d in data:
        assert d["rating"] >= 4


# ---- Membership renewal status ----
def test_renewal_status_no_membership(customer):
    r = requests.get(f"{API}/memberships/renewal-status", headers=customer["headers"])
    assert r.status_code == 200
    assert r.json().get("active") is False


# ---- Notify subscribe (MOCKED) ----
def test_notify_subscribe():
    email = f"TEST_notify_{uuid.uuid4().hex[:6]}@example.com"
    r = requests.post(f"{API}/notify/subscribe", json={"email": email, "channel": "app_launch"})
    assert r.status_code == 200
    body = r.json()
    assert body.get("ok") is True
    assert body.get("mock") is True


# ---- Admin roles + orders ----
def test_admin_change_role_and_revert(admin_headers, customer):
    uid = customer["id"]
    r = requests.put(f"{API}/admin/users/{uid}/role", json={"role": "staff"}, headers=admin_headers)
    assert r.status_code == 200
    # verify persisted
    r_list = requests.get(f"{API}/admin/users", headers=admin_headers)
    u = next(x for x in r_list.json() if x["id"] == uid)
    assert u["role"] == "staff"
    # invalid role
    r_bad = requests.put(f"{API}/admin/users/{uid}/role", json={"role": "bogus"}, headers=admin_headers)
    assert r_bad.status_code == 400
    # revert
    r2 = requests.put(f"{API}/admin/users/{uid}/role", json={"role": "customer"}, headers=admin_headers)
    assert r2.status_code == 200


def test_admin_orders_list(admin_headers):
    r = requests.get(f"{API}/admin/orders", headers=admin_headers)
    assert r.status_code == 200
    assert isinstance(r.json(), list)


# ---- Booking cancel/reschedule flow ----
def _seed_booking_for(customer, days_from_now=5):
    """Add address + cart item, then create booking with slot in the future."""
    # add service to cart
    services = requests.get(f"{API}/services").json()
    sid = services[0]["id"]
    requests.post(f"{API}/cart/clear", headers=customer["headers"])
    requests.post(f"{API}/cart/add", json={"service_id": sid, "quantity": 1}, headers=customer["headers"])
    # add address
    addr = {
        "label": "Home",
        "line1": "1 Test St",
        "city": "NYC",
        "state": "NY",
        "pincode": "10001",
        "phone": "5551234567",
    }
    r_addr = requests.post(f"{API}/addresses", json=addr, headers=customer["headers"])
    assert r_addr.status_code == 200
    addr_id = r_addr.json()["id"]
    slot_date = (datetime.now(timezone.utc) + timedelta(days=days_from_now)).date().isoformat()
    r_b = requests.post(
        f"{API}/bookings",
        json={"address_id": addr_id, "slot_date": slot_date, "slot_time": "14:00"},
        headers=customer["headers"],
    )
    assert r_b.status_code == 200, r_b.text
    return r_b.json()


def test_booking_cancel_full_refund(customer):
    booking = _seed_booking_for(customer, days_from_now=5)
    bid = booking["id"]
    r = requests.post(f"{API}/bookings/{bid}/cancel", headers=customer["headers"])
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["refund_pct"] == 100
    assert body["refund_amount"] == round(booking["total"] * 1.0, 2)

    # cancel again -> 400
    r2 = requests.post(f"{API}/bookings/{bid}/cancel", headers=customer["headers"])
    assert r2.status_code == 400


def test_booking_reschedule(customer):
    booking = _seed_booking_for(customer, days_from_now=7)
    bid = booking["id"]
    new_date = (datetime.now(timezone.utc) + timedelta(days=10)).date().isoformat()
    r = requests.post(
        f"{API}/bookings/{bid}/reschedule",
        json={"slot_date": new_date, "slot_time": "16:00"},
        headers=customer["headers"],
    )
    assert r.status_code == 200
    # verify persisted
    r_list = requests.get(f"{API}/bookings", headers=customer["headers"])
    b = next(x for x in r_list.json() if x["id"] == bid)
    assert b["slot_date"] == new_date
    assert b["slot_time"] == "16:00"


# ---- Chat (Claude Sonnet 4.5) ----
def test_chat_send_and_history(customer):
    r = requests.post(
        f"{API}/chat/send",
        json={"message": "What is your cancellation policy?"},
        headers=customer["headers"],
        timeout=60,
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert "reply" in body and isinstance(body["reply"], str) and len(body["reply"]) > 0
    assert "session_id" in body

    # history should contain at least user + assistant
    r_h = requests.get(f"{API}/chat/history", params={"session_id": body["session_id"]}, headers=customer["headers"])
    assert r_h.status_code == 200
    hist = r_h.json()
    assert len(hist) >= 2
    roles = [m["role"] for m in hist]
    assert "user" in roles and "assistant" in roles


def test_chat_requires_auth():
    r = requests.post(f"{API}/chat/send", json={"message": "hi"})
    assert r.status_code == 401
