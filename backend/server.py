from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import uuid
import bcrypt
import jwt
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Literal
from datetime import datetime, timezone, timedelta
from emergentintegrations.payments.stripe.checkout import (
    StripeCheckout, CheckoutSessionRequest, CheckoutSessionResponse, CheckoutStatusResponse,
)
from emergentintegrations.llm.chat import LlmChat, UserMessage

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_SECRET = os.environ.get('JWT_SECRET', 'change-me')
JWT_ALG = "HS256"
JWT_EXPIRE_DAYS = 30

app = FastAPI()
api_router = APIRouter(prefix="/api")
security = HTTPBearer(auto_error=False)


# ============== Helpers ==============
def now_iso():
    return datetime.now(timezone.utc).isoformat()


def hash_pw(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()


def verify_pw(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode(), hashed.encode())
    except Exception:
        return False


def make_token(user_id: str, role: str) -> str:
    payload = {
        "sub": user_id,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(days=JWT_EXPIRE_DAYS),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)


async def get_current_user(creds: Optional[HTTPAuthorizationCredentials] = Depends(security)):
    if not creds:
        raise HTTPException(401, "Not authenticated")
    try:
        payload = jwt.decode(creds.credentials, JWT_SECRET, algorithms=[JWT_ALG])
    except jwt.PyJWTError:
        raise HTTPException(401, "Invalid token")
    user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password": 0})
    if not user:
        raise HTTPException(401, "User not found")
    return user


async def require_admin(user=Depends(get_current_user)):
    if user.get("role") != "admin":
        raise HTTPException(403, "Admin access required")
    return user


# ============== Models ==============
class RegisterInput(BaseModel):
    name: str
    email: EmailStr
    password: str
    phone: Optional[str] = None


class LoginInput(BaseModel):
    email: EmailStr
    password: str


class Address(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    label: str
    line1: str
    city: str
    state: str
    pincode: str
    phone: str


class ServiceIn(BaseModel):
    name: str
    category: str
    description: str
    price: float
    duration_min: int
    image: str
    popular: bool = False


class CartItemIn(BaseModel):
    service_id: str
    quantity: int = 1


class BookingIn(BaseModel):
    address_id: str
    slot_date: str  # ISO date
    slot_time: str  # e.g. "14:00"
    payment_session_id: Optional[str] = None


class ReviewIn(BaseModel):
    service_id: str
    rating: int
    comment: str


class CheckoutInput(BaseModel):
    origin_url: str
    kind: Literal["cart", "membership"]
    plan_id: Optional[str] = None  # for membership


# ============== Membership Plans (static config) ==============
MEMBERSHIP_PLANS = {
    "basic": {"id": "basic", "name": "Basic", "price": 999.0, "duration_days": 30,
              "perks": ["10% off all services", "1 free consultation", "Priority slots on weekdays"]},
    "advanced": {"id": "advanced", "name": "Advanced", "price": 2499.0, "duration_days": 90,
                 "perks": ["18% off all services", "2 complimentary facials", "Priority slots anytime",
                          "Free at-home service delivery"]},
    "premium": {"id": "premium", "name": "Premium", "price": 5999.0, "duration_days": 180,
                "perks": ["25% off all services", "6 complimentary treatments",
                         "Dedicated beauty concierge", "Free at-home service delivery",
                         "Early access to new services", "Complimentary birthday spa day"]},
}


# ============== Auth Routes ==============
@api_router.post("/auth/register")
async def register(inp: RegisterInput):
    existing = await db.users.find_one({"email": inp.email.lower()})
    if existing:
        raise HTTPException(400, "Email already registered")
    user_id = str(uuid.uuid4())
    is_first = await db.users.count_documents({}) == 0
    role = "admin" if is_first or inp.email.lower() == "admin@dhsalon.com" else "customer"
    doc = {
        "id": user_id,
        "name": inp.name,
        "email": inp.email.lower(),
        "phone": inp.phone,
        "password": hash_pw(inp.password),
        "role": role,
        "addresses": [],
        "membership": None,
        "created_at": now_iso(),
    }
    await db.users.insert_one(doc)
    token = make_token(user_id, role)
    return {"token": token, "user": {"id": user_id, "name": inp.name, "email": inp.email.lower(), "role": role}}


@api_router.post("/auth/login")
async def login(inp: LoginInput):
    user = await db.users.find_one({"email": inp.email.lower()})
    if not user or not verify_pw(inp.password, user["password"]):
        raise HTTPException(401, "Invalid credentials")
    token = make_token(user["id"], user["role"])
    return {"token": token, "user": {"id": user["id"], "name": user["name"], "email": user["email"], "role": user["role"]}}


@api_router.get("/auth/me")
async def me(user=Depends(get_current_user)):
    return user


# ============== Services ==============
@api_router.get("/services")
async def list_services(category: Optional[str] = None):
    q = {"category": category} if category else {}
    docs = await db.services.find(q, {"_id": 0}).to_list(1000)
    return docs


@api_router.get("/services/categories")
async def list_categories():
    cats = await db.services.distinct("category")
    return cats


@api_router.get("/services/{service_id}")
async def get_service(service_id: str):
    doc = await db.services.find_one({"id": service_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Service not found")
    reviews = await db.reviews.find({"service_id": service_id}, {"_id": 0}).sort("created_at", -1).to_list(50)
    doc["reviews"] = reviews
    return doc


@api_router.post("/services")
async def create_service(inp: ServiceIn, admin=Depends(require_admin)):
    doc = inp.model_dump()
    doc["id"] = str(uuid.uuid4())
    doc["rating"] = 0
    doc["review_count"] = 0
    doc["created_at"] = now_iso()
    await db.services.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api_router.put("/services/{service_id}")
async def update_service(service_id: str, inp: ServiceIn, admin=Depends(require_admin)):
    r = await db.services.update_one({"id": service_id}, {"$set": inp.model_dump()})
    if r.matched_count == 0:
        raise HTTPException(404, "Not found")
    return {"ok": True}


@api_router.delete("/services/{service_id}")
async def delete_service(service_id: str, admin=Depends(require_admin)):
    await db.services.delete_one({"id": service_id})
    return {"ok": True}


# ============== Addresses ==============
@api_router.get("/addresses")
async def list_addresses(user=Depends(get_current_user)):
    return user.get("addresses", [])


@api_router.post("/addresses")
async def add_address(addr: Address, user=Depends(get_current_user)):
    await db.users.update_one({"id": user["id"]}, {"$push": {"addresses": addr.model_dump()}})
    return addr


@api_router.delete("/addresses/{addr_id}")
async def del_address(addr_id: str, user=Depends(get_current_user)):
    await db.users.update_one({"id": user["id"]}, {"$pull": {"addresses": {"id": addr_id}}})
    return {"ok": True}


# ============== Cart ==============
@api_router.get("/cart")
async def get_cart(user=Depends(get_current_user)):
    cart = await db.carts.find_one({"user_id": user["id"]}, {"_id": 0})
    if not cart:
        return {"user_id": user["id"], "items": [], "total": 0}
    # attach service details
    service_ids = [i["service_id"] for i in cart.get("items", [])]
    services = await db.services.find({"id": {"$in": service_ids}}, {"_id": 0}).to_list(100)
    smap = {s["id"]: s for s in services}
    items = []
    total = 0
    for it in cart.get("items", []):
        s = smap.get(it["service_id"])
        if not s:
            continue
        item = {**it, "service": s}
        items.append(item)
        total += s["price"] * it["quantity"]
    return {"user_id": user["id"], "items": items, "total": total}


@api_router.post("/cart/add")
async def add_to_cart(item: CartItemIn, user=Depends(get_current_user)):
    cart = await db.carts.find_one({"user_id": user["id"]})
    if not cart:
        await db.carts.insert_one({"user_id": user["id"], "items": [item.model_dump()]})
    else:
        found = False
        items = cart.get("items", [])
        for it in items:
            if it["service_id"] == item.service_id:
                it["quantity"] += item.quantity
                found = True
                break
        if not found:
            items.append(item.model_dump())
        await db.carts.update_one({"user_id": user["id"]}, {"$set": {"items": items}})
    return {"ok": True}


@api_router.post("/cart/remove/{service_id}")
async def remove_from_cart(service_id: str, user=Depends(get_current_user)):
    await db.carts.update_one({"user_id": user["id"]}, {"$pull": {"items": {"service_id": service_id}}})
    return {"ok": True}


@api_router.post("/cart/clear")
async def clear_cart(user=Depends(get_current_user)):
    await db.carts.update_one({"user_id": user["id"]}, {"$set": {"items": []}}, upsert=True)
    return {"ok": True}


# ============== Bookings ==============
@api_router.post("/bookings")
async def create_booking(inp: BookingIn, user=Depends(get_current_user)):
    cart = await db.carts.find_one({"user_id": user["id"]})
    if not cart or not cart.get("items"):
        raise HTTPException(400, "Cart is empty")
    ids = [i["service_id"] for i in cart["items"]]
    services = await db.services.find({"id": {"$in": ids}}, {"_id": 0}).to_list(100)
    smap = {s["id"]: s for s in services}
    items = []
    total = 0
    for it in cart["items"]:
        s = smap.get(it["service_id"])
        if not s:
            continue
        items.append({"service_id": s["id"], "name": s["name"], "price": s["price"], "quantity": it["quantity"]})
        total += s["price"] * it["quantity"]
    # apply membership discount if any
    membership = user.get("membership")
    discount_pct = 0
    if membership and membership.get("expires_at") and membership["expires_at"] > now_iso():
        plan = MEMBERSHIP_PLANS.get(membership["plan_id"])
        if plan:
            discount_pct = {"basic": 10, "advanced": 18, "premium": 25}.get(membership["plan_id"], 0)
    discount = total * discount_pct / 100
    grand = total - discount
    addr = next((a for a in user.get("addresses", []) if a["id"] == inp.address_id), None)
    if not addr:
        raise HTTPException(400, "Address not found")
    booking = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "user_name": user["name"],
        "user_email": user["email"],
        "items": items,
        "subtotal": total,
        "discount_pct": discount_pct,
        "discount": discount,
        "total": grand,
        "address": addr,
        "slot_date": inp.slot_date,
        "slot_time": inp.slot_time,
        "status": "confirmed",
        "payment_session_id": inp.payment_session_id,
        "payment_status": "paid" if inp.payment_session_id else "pending",
        "created_at": now_iso(),
    }
    await db.bookings.insert_one(booking)
    await db.carts.update_one({"user_id": user["id"]}, {"$set": {"items": []}})
    booking.pop("_id", None)
    return booking


@api_router.get("/bookings")
async def my_bookings(user=Depends(get_current_user)):
    docs = await db.bookings.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return docs


# ============== Reviews ==============
@api_router.post("/reviews")
async def add_review(inp: ReviewIn, user=Depends(get_current_user)):
    if inp.rating < 1 or inp.rating > 5:
        raise HTTPException(400, "Rating must be 1-5")
    doc = {
        "id": str(uuid.uuid4()),
        "service_id": inp.service_id,
        "user_id": user["id"],
        "user_name": user["name"],
        "rating": inp.rating,
        "comment": inp.comment,
        "created_at": now_iso(),
    }
    await db.reviews.insert_one(doc)
    # recompute rating
    revs = await db.reviews.find({"service_id": inp.service_id}, {"_id": 0}).to_list(1000)
    if revs:
        avg = sum(r["rating"] for r in revs) / len(revs)
        await db.services.update_one({"id": inp.service_id}, {"$set": {"rating": round(avg, 1), "review_count": len(revs)}})
    doc.pop("_id", None)
    return doc


# ============== Memberships ==============
@api_router.get("/memberships/plans")
async def get_plans():
    return list(MEMBERSHIP_PLANS.values())


# ============== Payments (Stripe) ==============
@api_router.post("/payments/checkout")
async def checkout(inp: CheckoutInput, request: Request, user=Depends(get_current_user)):
    host_url = str(request.base_url).rstrip("/")
    webhook_url = f"{host_url}/api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=os.environ["STRIPE_API_KEY"], webhook_url=webhook_url)

    if inp.kind == "membership":
        plan = MEMBERSHIP_PLANS.get(inp.plan_id or "")
        if not plan:
            raise HTTPException(400, "Invalid plan")
        amount = float(plan["price"])
        meta = {"user_id": user["id"], "kind": "membership", "plan_id": plan["id"]}
    else:
        cart = await db.carts.find_one({"user_id": user["id"]})
        if not cart or not cart.get("items"):
            raise HTTPException(400, "Cart empty")
        ids = [i["service_id"] for i in cart["items"]]
        services = await db.services.find({"id": {"$in": ids}}, {"_id": 0}).to_list(100)
        smap = {s["id"]: s for s in services}
        total = 0.0
        for it in cart["items"]:
            s = smap.get(it["service_id"])
            if s:
                total += s["price"] * it["quantity"]
        # discount if member
        membership = user.get("membership")
        if membership and membership.get("expires_at") and membership["expires_at"] > now_iso():
            pct = {"basic": 10, "advanced": 18, "premium": 25}.get(membership["plan_id"], 0)
            total = total * (1 - pct / 100)
        amount = round(float(total), 2)
        if amount <= 0:
            raise HTTPException(400, "Invalid amount")
        meta = {"user_id": user["id"], "kind": "cart"}

    origin = inp.origin_url.rstrip("/")
    req = CheckoutSessionRequest(
        amount=amount,
        currency="usd",
        success_url=f"{origin}/payment/success?session_id={{CHECKOUT_SESSION_ID}}",
        cancel_url=f"{origin}/payment/cancel",
        metadata=meta,
    )
    session: CheckoutSessionResponse = await stripe_checkout.create_checkout_session(req)
    await db.payment_transactions.insert_one({
        "session_id": session.session_id,
        "user_id": user["id"],
        "amount": amount,
        "currency": "usd",
        "kind": inp.kind,
        "plan_id": inp.plan_id,
        "metadata": meta,
        "status": "initiated",
        "payment_status": "pending",
        "created_at": now_iso(),
        "updated_at": now_iso(),
    })
    return {"checkout_url": session.url, "session_id": session.session_id}


@api_router.get("/payments/status/{session_id}")
async def payment_status(session_id: str, request: Request):
    record = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
    if not record:
        raise HTTPException(404, "Not found")

    if record.get("payment_status") != "paid":
        host_url = str(request.base_url).rstrip("/")
        webhook_url = f"{host_url}/api/webhook/stripe"
        stripe_checkout = StripeCheckout(api_key=os.environ["STRIPE_API_KEY"], webhook_url=webhook_url)
        try:
            status: CheckoutStatusResponse = await stripe_checkout.get_checkout_status(session_id)
            if status.payment_status == "paid" or status.status == "complete":
                await _mark_paid(session_id, record)
                record = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
        except Exception:
            pass

    return {
        "session_id": record["session_id"],
        "status": record["status"],
        "payment_status": record["payment_status"],
    }


async def _mark_paid(session_id: str, record: dict):
    r = await db.payment_transactions.update_one(
        {"session_id": session_id, "payment_status": {"$ne": "paid"}},
        {"$set": {"status": "completed", "payment_status": "paid", "updated_at": now_iso()}},
    )
    if r.modified_count == 0:
        return
    # side effects
    meta = record.get("metadata", {})
    if meta.get("kind") == "membership":
        plan = MEMBERSHIP_PLANS.get(meta.get("plan_id", ""))
        if plan:
            expires = (datetime.now(timezone.utc) + timedelta(days=plan["duration_days"])).isoformat()
            await db.users.update_one(
                {"id": meta["user_id"]},
                {"$set": {"membership": {"plan_id": plan["id"], "started_at": now_iso(), "expires_at": expires}}},
            )


@api_router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    host_url = str(request.base_url).rstrip("/")
    webhook_url = f"{host_url}/api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=os.environ["STRIPE_API_KEY"], webhook_url=webhook_url)
    body = await request.body()
    sig = request.headers.get("Stripe-Signature", "")
    try:
        result = await stripe_checkout.handle_webhook(body, sig)
    except Exception as e:
        logging.exception("Webhook error")
        raise HTTPException(400, str(e))
    if result.payment_status == "paid":
        record = await db.payment_transactions.find_one({"session_id": result.session_id}, {"_id": 0})
        if record:
            await _mark_paid(result.session_id, record)
    return {"ok": True}


# ============== Admin ==============
@api_router.get("/admin/stats")
async def admin_stats(admin=Depends(require_admin)):
    users = await db.users.count_documents({})
    services = await db.services.count_documents({})
    bookings = await db.bookings.count_documents({})
    revenue_docs = await db.bookings.find({"payment_status": "paid"}, {"total": 1, "_id": 0}).to_list(10000)
    revenue = sum(b.get("total", 0) for b in revenue_docs)
    return {"users": users, "services": services, "bookings": bookings, "revenue": round(revenue, 2)}


@api_router.get("/admin/users")
async def admin_users(admin=Depends(require_admin)):
    docs = await db.users.find({}, {"_id": 0, "password": 0}).to_list(1000)
    return docs


@api_router.get("/admin/bookings")
async def admin_bookings(admin=Depends(require_admin)):
    docs = await db.bookings.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return docs


@api_router.put("/admin/bookings/{booking_id}/status")
async def admin_update_booking(booking_id: str, status: str, admin=Depends(require_admin)):
    await db.bookings.update_one({"id": booking_id}, {"$set": {"status": status}})
    return {"ok": True}


# ============== Seed ==============
@api_router.post("/seed")
async def seed():
    # Idempotent seed
    existing = await db.services.count_documents({})
    if existing > 0:
        return {"ok": True, "seeded": False}

    services = [
        {"name": "Signature Facial", "category": "Facial", "description": "Deep-cleansing luxury facial with hydrating serums, extractions and a radiance-boosting mask.", "price": 89.0, "duration_min": 75, "image": "https://images.pexels.com/photos/12115040/pexels-photo-12115040.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940", "popular": True},
        {"name": "Aromatherapy Spa", "category": "Spa", "description": "Full-body relaxation ritual using essential oils, warm stones and gentle Swedish techniques.", "price": 129.0, "duration_min": 90, "image": "https://images.unsplash.com/photo-1720118509152-2df877673bee?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1MDZ8MHwxfHNlYXJjaHwzfHxsdXh1cnklMjBzcGElMjBhZXN0aGV0aWN8ZW58MHx8fHwxNzg0MDE2MDgzfDA&ixlib=rb-4.1.0&q=85", "popular": True},
        {"name": "Full-Body Waxing", "category": "Waxing", "description": "Gentle, low-pain wax treatment with premium botanical wax and post-care soothing lotion.", "price": 69.0, "duration_min": 60, "image": "https://images.unsplash.com/photo-1560750588-73207b1ef5b8?auto=format&fit=crop&w=940&q=80", "popular": False},
        {"name": "Hair Style & Blowout", "category": "Hair Care", "description": "Salon-quality wash, style and blowout by senior stylists tailored to your face shape.", "price": 59.0, "duration_min": 60, "image": "https://images.unsplash.com/photo-1634449571010-02389ed0f9b0?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2Nzd8MHwxfHNlYXJjaHwxfHxzYWxvbiUyMGhhaXIlMjBzdHlsaW5nfGVufDB8fHx8MTc4NDAxNjA4M3ww&ixlib=rb-4.1.0&q=85", "popular": True},
        {"name": "Bridal Makeup", "category": "Makeup", "description": "HD bridal makeup with false lashes, contouring and long-wear finish that photographs beautifully.", "price": 249.0, "duration_min": 120, "image": "https://images.unsplash.com/photo-1613966802194-d46a163af70d?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjY2NzV8MHwxfHNlYXJjaHwyfHxwcm9mZXNzaW9uYWwlMjBtYWtldXAlMjBhcnRpc3R8ZW58MHx8fHwxNzg0MDE2MDgzfDA&ixlib=rb-4.1.0&q=85", "popular": True},
        {"name": "Men's Grooming Kit", "category": "Men's Grooming", "description": "Beard sculpt, hot-towel shave, hair styling and detox facial for the modern gentleman.", "price": 79.0, "duration_min": 75, "image": "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&w=940&q=80", "popular": False},
        {"name": "Manicure & Pedicure", "category": "Salon at Home", "description": "Classic manicure and pedicure with gentle exfoliation, cuticle care and glossy finish.", "price": 49.0, "duration_min": 60, "image": "https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&w=940&q=80", "popular": False},
        {"name": "Detan & Glow", "category": "Facial", "description": "De-tan treatment with vitamin-C infusion to restore even, luminous skin tone.", "price": 65.0, "duration_min": 60, "image": "https://images.unsplash.com/photo-1596178065887-1198b6148b2b?auto=format&fit=crop&w=940&q=80", "popular": False},
    ]
    for s in services:
        s["id"] = str(uuid.uuid4())
        s["rating"] = 4.6
        s["review_count"] = 0
        s["created_at"] = now_iso()
    await db.services.insert_many(services)

    # seed admin if none
    if await db.users.count_documents({"role": "admin"}) == 0:
        await db.users.insert_one({
            "id": str(uuid.uuid4()),
            "name": "Admin",
            "email": "admin@dhsalon.com",
            "phone": "+10000000000",
            "password": hash_pw("Admin@123"),
            "role": "admin",
            "addresses": [],
            "membership": None,
            "created_at": now_iso(),
        })

    return {"ok": True, "seeded": True, "services": len(services)}


@api_router.get("/")
async def root():
    return {"message": "DH Salon API"}


# ============== Professionals (Register-as-a-Professional) ==============
class ProfessionalIn(BaseModel):
    full_name: str
    email: EmailStr
    phone: str
    city: str
    gender: Optional[str] = None
    experience_years: int = 0
    specializations: List[str] = []
    id_proof_type: Optional[str] = None
    id_proof_number: Optional[str] = None
    portfolio_url: Optional[str] = None
    about: Optional[str] = None


@api_router.post("/professionals/register")
async def register_professional(inp: ProfessionalIn):
    existing = await db.professionals.find_one({"email": inp.email.lower()})
    if existing:
        raise HTTPException(400, "Application with this email already exists")
    doc = inp.model_dump()
    doc["email"] = inp.email.lower()
    doc["id"] = str(uuid.uuid4())
    doc["status"] = "pending"  # pending / approved / rejected
    doc["created_at"] = now_iso()
    await db.professionals.insert_one(doc)
    doc.pop("_id", None)
    return {"ok": True, "application_id": doc["id"]}


@api_router.get("/admin/professionals")
async def list_professionals(admin=Depends(require_admin)):
    docs = await db.professionals.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return docs


@api_router.put("/admin/professionals/{pid}/status")
async def update_professional_status(pid: str, status: str, admin=Depends(require_admin)):
    if status not in ("approved", "rejected", "pending"):
        raise HTTPException(400, "Invalid status")
    await db.professionals.update_one({"id": pid}, {"$set": {"status": status, "reviewed_at": now_iso()}})
    return {"ok": True}


# ============== FAQ ==============
FAQ_DATA = [
    {"category": "Booking", "q": "How do I book a service?", "a": "Browse our menu, add a ritual to your bag, choose a date and slot in checkout, and confirm with secure Stripe payment."},
    {"category": "Booking", "q": "Can I book multiple services at once?", "a": "Yes. Add every service you'd like to your bag — our specialists will perform them in one continuous session at your home."},
    {"category": "Cancellation", "q": "What is your cancellation policy?", "a": "Free cancellation more than 12 hours before your slot. Cancel 4–12 hours before to receive a 50% refund. Less than 4 hours before the slot, refunds are unfortunately not possible."},
    {"category": "Cancellation", "q": "How do I reschedule a booking?", "a": "Go to My Account → Bookings → Reschedule, and pick a new slot. Reschedules are free up to 4 hours before your appointment."},
    {"category": "Memberships", "q": "How do membership discounts work?", "a": "Discounts (10% Basic, 18% Advanced, 25% Premium) are auto-applied at checkout while your membership is active."},
    {"category": "Memberships", "q": "Will my membership auto-renew?", "a": "We send you a renewal reminder 7 days before your membership expires so you can choose to renew or upgrade — no silent charges."},
    {"category": "Payments", "q": "Which payments do you accept?", "a": "All major cards via Stripe. Refunds are processed to the same card within 5–7 business days."},
    {"category": "Payments", "q": "Is my payment secure?", "a": "Yes — payments are processed by Stripe. We never store your card details on our servers."},
    {"category": "Services", "q": "Are your specialists trained and verified?", "a": "Every professional is certified, background-verified, and audited on skill + hygiene protocols every quarter."},
    {"category": "Services", "q": "Do you carry your own tools and products?", "a": "Absolutely. Specialists arrive with sealed, sanitised tools and dermatologist-tested products."},
]


@api_router.get("/faq")
async def get_faq():
    return FAQ_DATA


# ============== Careers ==============
CAREERS_DATA = [
    {"id": "sr-therapist", "title": "Senior Beauty Therapist", "location": "Multi-city (Remote-based)", "type": "Full-time", "description": "Lead at-home sessions with our most discerning members. 4+ years experience required."},
    {"id": "concierge", "title": "Beauty Concierge (Chat)", "location": "Remote", "type": "Full-time", "description": "Craft delightful, human replies for our Premium members. Text-first, empathy-heavy."},
    {"id": "ops-lead", "title": "City Operations Lead", "location": "New York / London / Dubai", "type": "Full-time", "description": "Run the day-to-day of a metro market — specialists, slots, quality."},
    {"id": "designer", "title": "Product Designer", "location": "Remote", "type": "Full-time", "description": "Design our web + upcoming iOS/Android app with a sensitivity to quiet luxury."},
]


@api_router.get("/careers")
async def get_careers():
    return CAREERS_DATA


# ============== Cancellation Policy ==============
CANCEL_POLICY = {
    "rules": [
        {"threshold_hours": 12, "refund_pct": 100, "label": "More than 12 hours before slot"},
        {"threshold_hours": 4, "refund_pct": 50, "label": "4 to 12 hours before slot"},
        {"threshold_hours": 0, "refund_pct": 0, "label": "Less than 4 hours before slot"},
    ],
    "summary": "Free cancel > 12h · 50% refund 4–12h · No refund < 4h",
}


@api_router.get("/policy/cancellation")
async def cancellation_policy():
    return CANCEL_POLICY


def compute_refund_pct(slot_dt_iso: str) -> int:
    try:
        # slot_date is ISO date, slot_time is HH:MM
        dt = datetime.fromisoformat(slot_dt_iso)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
    except Exception:
        return 0
    hours_left = (dt - datetime.now(timezone.utc)).total_seconds() / 3600.0
    if hours_left >= 12:
        return 100
    if hours_left >= 4:
        return 50
    return 0


class RescheduleIn(BaseModel):
    slot_date: str
    slot_time: str


@api_router.post("/bookings/{booking_id}/cancel")
async def cancel_booking(booking_id: str, user=Depends(get_current_user)):
    b = await db.bookings.find_one({"id": booking_id, "user_id": user["id"]}, {"_id": 0})
    if not b:
        raise HTTPException(404, "Booking not found")
    if b["status"] in ("cancelled", "completed"):
        raise HTTPException(400, f"Booking already {b['status']}")
    slot_dt = f"{b['slot_date']}T{b['slot_time']}:00+00:00"
    pct = compute_refund_pct(slot_dt)
    refund_amount = round(b["total"] * pct / 100, 2)
    await db.bookings.update_one(
        {"id": booking_id},
        {"$set": {
            "status": "cancelled",
            "cancelled_at": now_iso(),
            "refund_pct": pct,
            "refund_amount": refund_amount,
            "refund_status": "processed" if refund_amount > 0 else "not_applicable",
        }},
    )
    return {"ok": True, "refund_pct": pct, "refund_amount": refund_amount}


@api_router.post("/bookings/{booking_id}/reschedule")
async def reschedule_booking(booking_id: str, inp: RescheduleIn, user=Depends(get_current_user)):
    b = await db.bookings.find_one({"id": booking_id, "user_id": user["id"]}, {"_id": 0})
    if not b:
        raise HTTPException(404, "Booking not found")
    if b["status"] in ("cancelled", "completed"):
        raise HTTPException(400, f"Booking already {b['status']}")
    slot_dt = f"{b['slot_date']}T{b['slot_time']}:00+00:00"
    hours_left = (datetime.fromisoformat(slot_dt) - datetime.now(timezone.utc)).total_seconds() / 3600.0
    if hours_left < 4:
        raise HTTPException(400, "Reschedule not allowed within 4 hours of the slot")
    await db.bookings.update_one(
        {"id": booking_id},
        {"$set": {"slot_date": inp.slot_date, "slot_time": inp.slot_time, "rescheduled_at": now_iso()}},
    )
    return {"ok": True}


# ============== Testimonials (public reviews wall) ==============
@api_router.get("/testimonials")
async def testimonials():
    # Pull top reviews across services
    docs = await db.reviews.find({"rating": {"$gte": 4}}, {"_id": 0}).sort("created_at", -1).to_list(50)
    return docs


# ============== Membership Renewal Reminder ==============
@api_router.get("/memberships/renewal-status")
async def renewal_status(user=Depends(get_current_user)):
    m = user.get("membership")
    if not m or not m.get("expires_at"):
        return {"active": False}
    expires = datetime.fromisoformat(m["expires_at"])
    if expires.tzinfo is None:
        expires = expires.replace(tzinfo=timezone.utc)
    days_left = (expires - datetime.now(timezone.utc)).days
    return {
        "active": days_left >= 0,
        "plan_id": m["plan_id"],
        "expires_at": m["expires_at"],
        "days_left": days_left,
        "needs_renewal_prompt": 0 <= days_left <= 7,
    }


# ============== AI Chat Support (Claude Sonnet 4.5) ==============
CHAT_SYSTEM_PROMPT = """You are Aria, the DH Salon customer support concierge — a warm, calm, professional voice for a luxury at-home salon service.

BRAND VOICE
- Warm, gentle, elegant. Never salesy. Never use emojis.
- Speak like a boutique-hotel concierge.
- Keep replies short (2-4 sentences) unless the question needs detail.

WHAT DH SALON OFFERS
- At-home salon, spa, facial, waxing, hair-care, makeup and men's grooming services.
- 3 memberships: Basic ($999 / 30 days, 10% off), Advanced ($2,499 / 90 days, 18% off), Premium ($5,999 / 180 days, 25% off).
- Cancellation policy: free > 12h before slot, 50% refund 4–12h, no refund < 4h.
- Reschedule: allowed up to 4 hours before the appointment.
- Payments via Stripe; refunds to same card in 5–7 business days.
- Auto-renewal: reminder email 7 days before membership expiry; no silent charges.

WHEN TO ESCALATE
- If a customer needs a manual refund override, a specialist complaint, or something out-of-policy, tell them you'll escalate to a human concierge and to email hello@dhsalon.com or call +1 (555) 123 8899.

Always answer politely. Never invent policies. If you don't know, escalate."""


class ChatIn(BaseModel):
    message: str
    session_id: Optional[str] = None


@api_router.post("/chat/send")
async def chat_send(inp: ChatIn, user=Depends(get_current_user)):
    session_id = inp.session_id or str(uuid.uuid4())

    # Load prior turns for this session
    prior = await db.chat_messages.find(
        {"user_id": user["id"], "session_id": session_id},
        {"_id": 0},
    ).sort("created_at", 1).to_list(50)

    llm = LlmChat(
        api_key=os.environ["EMERGENT_LLM_KEY"],
        session_id=f"{user['id']}::{session_id}",
        system_message=CHAT_SYSTEM_PROMPT,
    ).with_model("anthropic", "claude-sonnet-4-5-20250929")

    # Feed prior context (send_message is used for simple non-streaming flow)
    for m in prior:
        if m["role"] == "user":
            try:
                await llm.send_message(UserMessage(text=m["content"]))
            except Exception:
                pass

    # Save user message
    now = now_iso()
    await db.chat_messages.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "session_id": session_id,
        "role": "user",
        "content": inp.message,
        "created_at": now,
    })

    try:
        answer = await llm.send_message(UserMessage(text=inp.message))
    except Exception as e:
        logging.exception("LLM error")
        raise HTTPException(500, "Support assistant is temporarily unavailable")

    await db.chat_messages.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "session_id": session_id,
        "role": "assistant",
        "content": answer,
        "created_at": now_iso(),
    })

    return {"session_id": session_id, "reply": answer}


@api_router.get("/chat/history")
async def chat_history(session_id: Optional[str] = None, user=Depends(get_current_user)):
    q = {"user_id": user["id"]}
    if session_id:
        q["session_id"] = session_id
    docs = await db.chat_messages.find(q, {"_id": 0}).sort("created_at", 1).to_list(500)
    return docs


# ============== Notify (mock email/push waitlist) ==============
class NotifyIn(BaseModel):
    email: EmailStr
    channel: str = "app_launch"


@api_router.post("/notify/subscribe")
async def notify_subscribe(inp: NotifyIn):
    # MOCKED: no real email/SMS provider connected — we only store the record.
    await db.notify_list.insert_one({
        "id": str(uuid.uuid4()),
        "email": inp.email.lower(),
        "channel": inp.channel,
        "created_at": now_iso(),
    })
    return {"ok": True, "mock": True, "message": "You're on the list — we'll email you when we launch."}


# ============== Admin: roles + orders ==============
class RoleIn(BaseModel):
    role: str  # admin | customer | staff


@api_router.put("/admin/users/{user_id}/role")
async def admin_set_role(user_id: str, inp: RoleIn, admin=Depends(require_admin)):
    if inp.role not in ("admin", "customer", "staff"):
        raise HTTPException(400, "Invalid role")
    await db.users.update_one({"id": user_id}, {"$set": {"role": inp.role}})
    return {"ok": True}


@api_router.get("/admin/orders")
async def admin_orders(admin=Depends(require_admin)):
    docs = await db.payment_transactions.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return docs


@api_router.get("/admin/professionals-count")
async def admin_prof_count(admin=Depends(require_admin)):
    pending = await db.professionals.count_documents({"status": "pending"})
    return {"pending": pending}


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


@app.on_event("startup")
async def startup():
    # auto-seed on first boot
    try:
        if await db.services.count_documents({}) == 0:
            await seed()
    except Exception as e:
        logger.exception("Seed on startup failed: %s", e)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
