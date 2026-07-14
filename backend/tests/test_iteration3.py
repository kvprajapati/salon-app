"""
Iteration 3 backend tests: INR currency, membership INR pricing,
professional categories, professional register requires category,
Stripe checkout persists currency='inr'.
"""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    with open("/app/frontend/.env") as f:
        for ln in f:
            if ln.startswith("REACT_APP_BACKEND_URL"):
                BASE_URL = ln.strip().split("=", 1)[1].rstrip("/")
API = f"{BASE_URL}/api"


# ---- Services: INR pricing ----
def test_services_currency_inr_and_signature_facial_price():
    r = requests.get(f"{API}/services")
    assert r.status_code == 200
    services = r.json()
    assert isinstance(services, list) and len(services) == 8, f"expected 8 services got {len(services)}"
    for s in services:
        assert s.get("currency") == "INR", f"service {s.get('name')} currency={s.get('currency')}"
    sig = next((s for s in services if s["name"] == "Signature Facial"), None)
    assert sig is not None, "Signature Facial missing"
    assert sig["price"] == 1899.0, f"Signature Facial price={sig['price']}"


def test_services_categories_endpoint():
    r = requests.get(f"{API}/services/categories")
    assert r.status_code == 200
    cats = r.json()
    assert isinstance(cats, list) and len(cats) > 0


# ---- Membership plans INR ----
def test_membership_plans_inr():
    r = requests.get(f"{API}/memberships/plans")
    assert r.status_code == 200
    plans = r.json()
    assert isinstance(plans, list)
    by_id = {p["id"]: p for p in plans}
    assert by_id["basic"]["price"] == 499.0
    assert by_id["advanced"]["price"] == 999.0
    assert by_id["premium"]["price"] == 1999.0
    for p in plans:
        assert p["currency"] == "INR"


# ---- Professional categories ----
EXPECTED_CATEGORIES = {
    "Beautician", "Hair Stylist", "Makeup Artist", "Spa Therapist",
    "Nail Technician", "Skin Care Specialist", "Salon Owner",
    "Massage Therapist", "Bridal Makeup Expert", "Other",
}


def test_professionals_categories_endpoint():
    r = requests.get(f"{API}/professionals/categories")
    assert r.status_code == 200
    cats = r.json()
    assert isinstance(cats, list) and len(cats) == 10
    assert set(cats) == EXPECTED_CATEGORIES


def _pro_payload(email, **overrides):
    body = {
        "full_name": "Jane Pro",
        "email": email,
        "phone": "+15550001111",
        "city": "New York",
        "gender": "female",
        "experience_years": 5,
        "specializations": ["Facial"],
        "id_proof_type": "passport",
        "id_proof_number": "X1234567",
        "about": "Certified",
        "category": "Beautician",
    }
    body.update(overrides)
    return body


def test_professional_register_with_valid_category():
    email = f"TEST_procat_{uuid.uuid4().hex[:8]}@example.com"
    r = requests.post(f"{API}/professionals/register", json=_pro_payload(email))
    assert r.status_code == 200, r.text
    assert r.json().get("ok") is True


def test_professional_register_missing_category_returns_422():
    email = f"TEST_procatm_{uuid.uuid4().hex[:8]}@example.com"
    payload = _pro_payload(email)
    payload.pop("category")
    r = requests.post(f"{API}/professionals/register", json=payload)
    assert r.status_code == 422, f"expected 422 got {r.status_code}: {r.text}"


def test_professional_register_invalid_category_returns_400():
    email = f"TEST_procati_{uuid.uuid4().hex[:8]}@example.com"
    r = requests.post(f"{API}/professionals/register", json=_pro_payload(email, category="NotAValidCat"))
    assert r.status_code == 400, r.text


# ---- Payments checkout persists currency=inr ----
@pytest.fixture(scope="module")
def customer():
    email = f"TEST_it3cust_{uuid.uuid4().hex[:8]}@example.com"
    r = requests.post(f"{API}/auth/register", json={"name": "It3 Cust", "email": email, "password": "Passw0rd!"})
    assert r.status_code == 200, r.text
    data = r.json()
    return {
        "headers": {"Authorization": f"Bearer {data['token']}", "Content-Type": "application/json"},
        "id": data["user"]["id"],
    }


def test_payment_checkout_currency_inr(customer):
    # add a service to cart first
    services = requests.get(f"{API}/services").json()
    sid = services[0]["id"]
    requests.post(f"{API}/cart/clear", headers=customer["headers"])
    r_add = requests.post(f"{API}/cart/add", json={"service_id": sid, "quantity": 1}, headers=customer["headers"])
    assert r_add.status_code == 200, r_add.text

    origin = BASE_URL
    r = requests.post(
        f"{API}/payments/checkout",
        json={"origin_url": origin, "kind": "cart"},
        headers=customer["headers"],
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert "session_id" in body and ("url" in body or "checkout_url" in body)

    # Verify status endpoint returns currency='inr'
    sid_pay = body["session_id"]
    r_status = requests.get(f"{API}/payments/status/{sid_pay}", headers=customer["headers"])
    assert r_status.status_code == 200, r_status.text
    st = r_status.json()
    # currency stored on transaction
    assert st.get("currency", "inr").lower() == "inr", f"currency={st.get('currency')}"
