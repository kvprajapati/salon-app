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
from fastapi import File, UploadFile, Response
import requests as pyrequests
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail

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
    "basic": {"id": "basic", "name": "Basic", "price": 499.0, "duration_days": 30, "currency": "INR",
              "perks": ["10% off all services", "1 free consultation", "Priority slots on weekdays"]},
    "advanced": {"id": "advanced", "name": "Advanced", "price": 999.0, "duration_days": 90, "currency": "INR",
                 "perks": ["18% off all services", "2 complimentary facials", "Priority slots anytime",
                          "Free at-home service delivery"]},
    "premium": {"id": "premium", "name": "Premium", "price": 1999.0, "duration_days": 180, "currency": "INR",
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
    # transactional notifications (SendGrid + MSG91) — no-op if not configured
    try:
        notify_booking(user, booking)
    except Exception:
        logger.exception("Booking notification failed (non-blocking)")
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
    docs = await db.plans.find({"is_active": True}, {"_id": 0}).to_list(100)
    if docs:
        return docs
    return list(MEMBERSHIP_PLANS.values())


# ============== Payments (Stripe) ==============
@api_router.post("/payments/checkout")
async def checkout(inp: CheckoutInput, request: Request, user=Depends(get_current_user)):
    host_url = str(request.base_url).rstrip("/")
    webhook_url = f"{host_url}/api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=os.environ["STRIPE_API_KEY"], webhook_url=webhook_url)

    if inp.kind == "membership":
        plan = await _get_plan(inp.plan_id or "")
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
            pct = await _plan_discount_pct(membership["plan_id"])
            total = total * (1 - pct / 100)
        amount = round(float(total), 2)
        if amount <= 0:
            raise HTTPException(400, "Invalid amount")
        meta = {"user_id": user["id"], "kind": "cart"}

    origin = inp.origin_url.rstrip("/")
    req = CheckoutSessionRequest(
        amount=amount,
        currency="inr",
        success_url=f"{origin}/payment/success?session_id={{CHECKOUT_SESSION_ID}}",
        cancel_url=f"{origin}/payment/cancel",
        metadata=meta,
    )
    session: CheckoutSessionResponse = await stripe_checkout.create_checkout_session(req)
    await db.payment_transactions.insert_one({
        "session_id": session.session_id,
        "user_id": user["id"],
        "amount": amount,
        "currency": "inr",
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
        plan = await _get_plan(meta.get("plan_id", ""))
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
        {"name": "Signature Facial", "name_hi": "सिग्नेचर फेशियल", "category": "Facial", "category_hi": "फेशियल", "description": "Deep-cleansing luxury facial with hydrating serums, extractions and a radiance-boosting mask.", "description_hi": "हाइड्रेटिंग सीरम, एक्सट्रैक्शन और चमक बढ़ाने वाले मास्क के साथ डीप-क्लींजिंग लक्ज़री फेशियल।", "price": 1899.0, "currency": "INR", "duration_min": 75, "image": "https://images.pexels.com/photos/12115040/pexels-photo-12115040.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940", "popular": True},
        {"name": "Aromatherapy Spa", "name_hi": "एरोमाथेरेपी स्पा", "category": "Spa", "category_hi": "स्पा", "description": "Full-body relaxation ritual using essential oils, warm stones and gentle Swedish techniques.", "description_hi": "एसेंशियल ऑयल, गर्म पत्थरों और स्वीडिश तकनीक के साथ पूरे शरीर की रिलैक्सेशन थेरेपी।", "price": 2499.0, "currency": "INR", "duration_min": 90, "image": "https://images.unsplash.com/photo-1720118509152-2df877673bee?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1MDZ8MHwxfHNlYXJjaHwzfHxsdXh1cnklMjBzcGElMjBhZXN0aGV0aWN8ZW58MHx8fHwxNzg0MDE2MDgzfDA&ixlib=rb-4.1.0&q=85", "popular": True},
        {"name": "Full-Body Waxing", "name_hi": "फुल-बॉडी वैक्सिंग", "category": "Waxing", "category_hi": "वैक्सिंग", "description": "Gentle, low-pain wax treatment with premium botanical wax and post-care soothing lotion.", "description_hi": "प्रीमियम बोटैनिकल वैक्स और सुखदायक लोशन के साथ कोमल, कम दर्द वाला वैक्स उपचार।", "price": 1299.0, "currency": "INR", "duration_min": 60, "image": "https://images.unsplash.com/photo-1560750588-73207b1ef5b8?auto=format&fit=crop&w=940&q=80", "popular": False},
        {"name": "Hair Style & Blowout", "name_hi": "हेयर स्टाइल और ब्लोआउट", "category": "Hair Care", "category_hi": "हेयर केयर", "description": "Salon-quality wash, style and blowout by senior stylists tailored to your face shape.", "description_hi": "सीनियर स्टाइलिस्ट द्वारा आपके चेहरे के अनुरूप सैलून-गुणवत्ता वाला वॉश, स्टाइल और ब्लोआउट।", "price": 999.0, "currency": "INR", "duration_min": 60, "image": "https://images.unsplash.com/photo-1634449571010-02389ed0f9b0?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2Nzd8MHwxfHNlYXJjaHwxfHxzYWxvbiUyMGhhaXIlMjBzdHlsaW5nfGVufDB8fHx8MTc4NDAxNjA4M3ww&ixlib=rb-4.1.0&q=85", "popular": True},
        {"name": "Bridal Makeup", "name_hi": "ब्राइडल मेकअप", "category": "Makeup", "category_hi": "मेकअप", "description": "HD bridal makeup with false lashes, contouring and long-wear finish that photographs beautifully.", "description_hi": "फॉल्स लैशेज़, कंटूरिंग और लंबे समय तक टिकने वाले फिनिश के साथ HD ब्राइडल मेकअप।", "price": 8999.0, "currency": "INR", "duration_min": 120, "image": "https://images.unsplash.com/photo-1613966802194-d46a163af70d?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjY2NzV8MHwxfHNlYXJjaHwyfHxwcm9mZXNzaW9uYWwlMjBtYWtldXAlMjBhcnRpc3R8ZW58MHx8fHwxNzg0MDE2MDgzfDA&ixlib=rb-4.1.0&q=85", "popular": True},
        {"name": "Men's Grooming Kit", "name_hi": "मेन्स ग्रूमिंग किट", "category": "Men's Grooming", "category_hi": "पुरुष ग्रूमिंग", "description": "Beard sculpt, hot-towel shave, hair styling and detox facial for the modern gentleman.", "description_hi": "आधुनिक पुरुषों के लिए बीयर्ड स्कल्प्ट, हॉट-टॉवल शेव, हेयर स्टाइलिंग और डिटॉक्स फेशियल।", "price": 1499.0, "currency": "INR", "duration_min": 75, "image": "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&w=940&q=80", "popular": False},
        {"name": "Manicure & Pedicure", "name_hi": "मेनीक्योर और पेडीक्योर", "category": "Salon at Home", "category_hi": "होम सैलून", "description": "Classic manicure and pedicure with gentle exfoliation, cuticle care and glossy finish.", "description_hi": "क्लासिक मेनीक्योर और पेडीक्योर, कोमल एक्सफोलिएशन, क्यूटिकल केयर और चमकदार फिनिश।", "price": 899.0, "currency": "INR", "duration_min": 60, "image": "https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&w=940&q=80", "popular": False},
        {"name": "Detan & Glow", "name_hi": "डी-टैन और ग्लो", "category": "Facial", "category_hi": "फेशियल", "description": "De-tan treatment with vitamin-C infusion to restore even, luminous skin tone.", "description_hi": "समान, चमकदार त्वचा टोन बहाल करने के लिए विटामिन-C इन्फ्यूजन के साथ डी-टैन उपचार।", "price": 1199.0, "currency": "INR", "duration_min": 60, "image": "https://images.unsplash.com/photo-1596178065887-1198b6148b2b?auto=format&fit=crop&w=940&q=80", "popular": False},
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
    category: str  # Beautician / Hair Stylist / Makeup Artist / Spa Therapist / Nail Technician / Skin Care Specialist / Salon Owner / Massage Therapist / Bridal Makeup Expert / Other
    gender: Optional[str] = None
    experience_years: int = 0
    specializations: List[str] = []
    id_proof_type: Optional[str] = None
    id_proof_number: Optional[str] = None
    portfolio_url: Optional[str] = None
    about: Optional[str] = None


VALID_PRO_CATEGORIES = {
    "Beautician", "Hair Stylist", "Makeup Artist", "Spa Therapist",
    "Nail Technician", "Skin Care Specialist", "Salon Owner",
    "Massage Therapist", "Bridal Makeup Expert", "Other",
}


@api_router.post("/professionals/register")
async def register_professional(inp: ProfessionalIn):
    if inp.category not in VALID_PRO_CATEGORIES:
        raise HTTPException(400, "Invalid professional category")
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


@api_router.get("/professionals/categories")
async def pro_categories():
    return sorted(list(VALID_PRO_CATEGORIES))


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
    try:
        notify_refund(user, b, refund_amount, pct)
    except Exception:
        logger.exception("Refund notification failed (non-blocking)")
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


# ============== Notifications (SendGrid + MSG91) — env-gated ==============
STORAGE_URL = "https://integrations.emergentagent.com/objstore/api/v1/storage"
APP_STORAGE_PREFIX = "dh-salon"
_storage_key = None


def _sendgrid_ready():
    return bool(os.environ.get("SENDGRID_API_KEY") and os.environ.get("SENDGRID_FROM_EMAIL"))


def _msg91_ready(template_env: str):
    return bool(os.environ.get("MSG91_AUTHKEY") and os.environ.get("MSG91_SENDER_ID") and os.environ.get(template_env))


def send_email(to_email: str, subject: str, html: str, kind: str = "generic"):
    """Send transactional email via SendGrid. No-op if env not configured."""
    if not _sendgrid_ready() or not to_email:
        logger.info(f"[email:{kind}] SKIPPED (sendgrid not configured) to={to_email}")
        return {"skipped": True, "reason": "sendgrid_not_configured"}
    try:
        msg = Mail(
            from_email=os.environ["SENDGRID_FROM_EMAIL"],
            to_emails=to_email,
            subject=subject,
            html_content=html,
        )
        sg = SendGridAPIClient(os.environ["SENDGRID_API_KEY"])
        resp = sg.send(msg)
        return {"skipped": False, "status_code": resp.status_code}
    except Exception as e:
        logger.exception(f"[email:{kind}] failed")
        return {"skipped": False, "error": str(e)}


def send_sms(mobile: str, template_env: str, variables: dict, kind: str = "generic"):
    """Send transactional SMS via MSG91 flow API. No-op if env not configured."""
    if not _msg91_ready(template_env) or not mobile:
        logger.info(f"[sms:{kind}] SKIPPED (msg91 not configured) mobile={mobile}")
        return {"skipped": True, "reason": "msg91_not_configured"}
    try:
        payload = {
            "flow_id": os.environ[template_env],
            "sender": os.environ["MSG91_SENDER_ID"],
            "route": "4",
            "recipients": [{"mobiles": mobile, **variables}],
        }
        r = pyrequests.post(
            "https://api.msg91.com/api/v5/flow/",
            json=payload,
            headers={"authkey": os.environ["MSG91_AUTHKEY"], "Content-Type": "application/json"},
            timeout=15,
        )
        return {"skipped": False, "status_code": r.status_code}
    except Exception as e:
        logger.exception(f"[sms:{kind}] failed")
        return {"skipped": False, "error": str(e)}


def notify_booking(user: dict, booking: dict):
    salon = "DH Salon"
    booking_no = booking["id"][:8].upper()
    items = ", ".join(i["name"] for i in booking.get("items", []))
    total = booking.get("total", 0)
    html = f"""
    <div style="font-family:Inter,Arial,sans-serif;background:#FDFBF7;padding:24px;color:#1A1A1A">
      <h2 style="font-family:'Cormorant Garamond',serif;color:#1A1A1A">Your booking is confirmed.</h2>
      <p>Hi {user.get('name','')} — thank you for booking with {salon}.</p>
      <p><b>Reference:</b> {booking_no}<br/>
         <b>Services:</b> {items}<br/>
         <b>Slot:</b> {booking.get('slot_date')} at {booking.get('slot_time')}<br/>
         <b>Total:</b> ₹{total:,.0f}</p>
      <p>Our specialist will arrive on time. Please prepare a well-lit spot.</p>
      <p style="color:#4A4A4A;font-size:12px">Need help? Reply to this email or chat with Aria in the app.</p>
    </div>"""
    send_email(user.get("email"), f"Booking confirmed · {booking_no}", html, kind="booking")
    send_sms(user.get("phone", ""), "MSG91_TPL_BOOKING",
             {"booking_no": booking_no, "slot": f"{booking.get('slot_date')} {booking.get('slot_time')}"},
             kind="booking")


def notify_refund(user: dict, booking: dict, refund_amount: float, refund_pct: int):
    booking_no = booking["id"][:8].upper()
    html = f"""
    <div style="font-family:Inter,Arial,sans-serif;background:#FDFBF7;padding:24px;color:#1A1A1A">
      <h2 style="font-family:'Cormorant Garamond',serif">Refund processed.</h2>
      <p>Hi {user.get('name','')} — your booking <b>{booking_no}</b> has been cancelled.</p>
      <p><b>Refund:</b> ₹{refund_amount:,.0f} ({refund_pct}% as per policy)<br/>
         Funds will reflect in your card in 5–7 business days.</p>
    </div>"""
    send_email(user.get("email"), f"Refund processed · {booking_no}", html, kind="refund")
    send_sms(user.get("phone", ""), "MSG91_TPL_REFUND",
             {"booking_no": booking_no, "amount": f"{refund_amount:,.0f}"}, kind="refund")


def notify_renewal(user: dict, plan_id: str, days_left: int):
    html = f"""
    <div style="font-family:Inter,Arial,sans-serif;background:#FDFBF7;padding:24px;color:#1A1A1A">
      <h2 style="font-family:'Cormorant Garamond',serif">Your membership expires in {days_left} days.</h2>
      <p>Hi {user.get('name','')} — renew your <b>{plan_id.title()}</b> plan and keep your discounts, priority slots and complimentary treatments.</p>
      <p><a href="{os.environ.get('APP_PUBLIC_URL','')}/memberships"
            style="display:inline-block;background:#1A1A1A;color:#F4EFE6;padding:12px 24px;border-radius:999px;text-decoration:none;font-weight:600">Renew now</a></p>
    </div>"""
    send_email(user.get("email"), f"Membership renewal reminder · {plan_id.title()}", html, kind="renewal")
    send_sms(user.get("phone", ""), "MSG91_TPL_RENEWAL",
             {"plan": plan_id, "days_left": str(days_left)}, kind="renewal")


# ============== Object Storage (built-in) ==============
def init_storage():
    global _storage_key
    if _storage_key:
        return _storage_key
    key = os.environ.get("EMERGENT_LLM_KEY")
    if not key:
        raise RuntimeError("EMERGENT_LLM_KEY missing")
    resp = pyrequests.post(f"{STORAGE_URL}/init", json={"emergent_key": key}, timeout=30)
    resp.raise_for_status()
    _storage_key = resp.json()["storage_key"]
    return _storage_key


def put_object(path: str, data: bytes, content_type: str) -> dict:
    sk = init_storage()
    resp = pyrequests.put(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": sk, "Content-Type": content_type},
        data=data, timeout=60,
    )
    resp.raise_for_status()
    return resp.json()


def get_object(path: str):
    sk = init_storage()
    resp = pyrequests.get(f"{STORAGE_URL}/objects/{path}",
                         headers={"X-Storage-Key": sk}, timeout=30)
    resp.raise_for_status()
    return resp.content, resp.headers.get("Content-Type", "application/octet-stream")


# ============== Dynamic Membership Plans (DB-backed) ==============
async def _seed_plans_if_empty():
    if await db.plans.count_documents({}) == 0:
        for p in MEMBERSHIP_PLANS.values():
            doc = {**p, "discount_pct": {"basic": 10, "advanced": 18, "premium": 25}.get(p["id"], 0),
                   "created_at": now_iso(), "is_active": True}
            await db.plans.insert_one(doc)


async def _get_plan(plan_id: str):
    p = await db.plans.find_one({"id": plan_id, "is_active": True}, {"_id": 0})
    return p or MEMBERSHIP_PLANS.get(plan_id)


async def _plan_discount_pct(plan_id: str) -> int:
    p = await _get_plan(plan_id)
    return int((p or {}).get("discount_pct", 0))


class PlanIn(BaseModel):
    id: Optional[str] = None
    name: str
    price: float
    duration_days: int
    discount_pct: int = 0
    perks: List[str] = []
    is_active: bool = True


@api_router.post("/admin/plans")
async def admin_create_plan(inp: PlanIn, admin=Depends(require_admin)):
    plan_id = inp.id or inp.name.lower().replace(" ", "-")
    doc = {**inp.model_dump(), "id": plan_id, "currency": "INR", "created_at": now_iso()}
    await db.plans.update_one({"id": plan_id}, {"$set": doc}, upsert=True)
    return {"ok": True, "id": plan_id}


@api_router.delete("/admin/plans/{plan_id}")
async def admin_delete_plan(plan_id: str, admin=Depends(require_admin)):
    await db.plans.update_one({"id": plan_id}, {"$set": {"is_active": False}})
    return {"ok": True}


# ============== About Us CMS ==============
DEFAULT_ABOUT = {
    "id": "about",
    "eyebrow": "Our story",
    "headline": "A quieter, kinder kind of luxury.",
    "subhead": "DH Salon began in 2022 as a whisper — the belief that beauty rituals should feel like slow evenings, not rushed appointments.",
    "story": "Today we bring our specialists to 40+ neighbourhoods, carrying with them the calm of a boutique spa. Every service is co-designed with wellness architects and every product is dermatologist-tested.",
    "hero_image": "https://images.pexels.com/photos/12115040/pexels-photo-12115040.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
    "values": [
        {"title": "Curated rituals", "body": "Every service is co-designed with a wellness architect and refined every quarter."},
        {"title": "Clean-first products", "body": "Only dermatologist-tested, cruelty-free brands touch our members' skin."},
        {"title": "Cared-for specialists", "body": "Our team is trained, insured, salaried and shares in the company's success."},
    ],
    "stats": [
        {"value": "200k+", "label": "Happy members"},
        {"value": "40+", "label": "Cities served"},
        {"value": "5,000+", "label": "Verified specialists"},
        {"value": "4.9", "label": "Avg. rating"},
    ],
    "quote": "The best beauty experience I've had — and I've stopped visiting salons entirely.",
    "quote_author": "Priya R., Premium member",
    "updated_at": now_iso(),
}


class AboutIn(BaseModel):
    eyebrow: str
    headline: str
    subhead: str
    story: str
    hero_image: str
    values: List[dict]
    stats: List[dict]
    quote: str
    quote_author: str


@api_router.get("/cms/about")
async def get_about():
    doc = await db.cms.find_one({"id": "about"}, {"_id": 0})
    return doc or DEFAULT_ABOUT


@api_router.put("/admin/cms/about")
async def update_about(inp: AboutIn, admin=Depends(require_admin)):
    doc = {**inp.model_dump(), "id": "about", "updated_at": now_iso()}
    await db.cms.update_one({"id": "about"}, {"$set": doc}, upsert=True)
    return {"ok": True}


# ============== Salon Settings (logo) ==============
@api_router.get("/cms/settings")
async def get_settings():
    doc = await db.cms.find_one({"id": "settings"}, {"_id": 0})
    return doc or {"id": "settings", "logo_url": None, "brand_name": "DH Salon", "tagline": "Beauty · Delivered"}


class SettingsIn(BaseModel):
    brand_name: Optional[str] = None
    tagline: Optional[str] = None
    logo_url: Optional[str] = None


@api_router.put("/admin/cms/settings")
async def update_settings(inp: SettingsIn, admin=Depends(require_admin)):
    update = {k: v for k, v in inp.model_dump().items() if v is not None}
    update["id"] = "settings"
    update["updated_at"] = now_iso()
    await db.cms.update_one({"id": "settings"}, {"$set": update}, upsert=True)
    return {"ok": True}


@api_router.post("/admin/upload/logo")
async def upload_logo(file: UploadFile = File(...), admin=Depends(require_admin)):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(400, "Only image files allowed")
    ext = (file.filename.rsplit(".", 1)[-1] if "." in (file.filename or "") else "png").lower()
    if ext not in {"png", "jpg", "jpeg", "webp", "svg"}:
        ext = "png"
    path = f"{APP_STORAGE_PREFIX}/logos/{uuid.uuid4()}.{ext}"
    data = await file.read()
    if len(data) > 5 * 1024 * 1024:
        raise HTTPException(400, "Logo must be under 5 MB")
    try:
        result = put_object(path, data, file.content_type)
    except Exception as e:
        logger.exception("Storage upload failed")
        raise HTTPException(500, f"Upload failed: {e}")
    public_url = f"{os.environ.get('APP_PUBLIC_URL','').rstrip('/')}/api/files/{result['path']}"
    await db.cms.update_one({"id": "settings"}, {"$set": {"logo_url": public_url, "logo_path": result["path"], "updated_at": now_iso()}}, upsert=True)
    return {"logo_url": public_url, "path": result["path"]}


@api_router.get("/files/{path:path}")
async def serve_file(path: str):
    try:
        data, ct = get_object(path)
    except Exception:
        raise HTTPException(404, "Not found")
    return Response(content=data, media_type=ct)


# ============== Admin CRUD extras ==============
@api_router.get("/admin/customers")
async def admin_customers(admin=Depends(require_admin)):
    docs = await db.users.find({"role": {"$ne": "admin"}}, {"_id": 0, "password": 0}).to_list(1000)
    # add booking counts
    for u in docs:
        u["bookings_count"] = await db.bookings.count_documents({"user_id": u["id"]})
    return docs


@api_router.get("/admin/beauticians")
async def admin_beauticians(status: Optional[str] = None, admin=Depends(require_admin)):
    q = {"status": status} if status else {}
    docs = await db.professionals.find(q, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return docs


@api_router.get("/admin/reviews")
async def admin_reviews(admin=Depends(require_admin)):
    docs = await db.reviews.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    # attach service names
    ids = list({r["service_id"] for r in docs})
    services = await db.services.find({"id": {"$in": ids}}, {"_id": 0, "id": 1, "name": 1}).to_list(1000)
    smap = {s["id"]: s["name"] for s in services}
    for r in docs:
        r["service_name"] = smap.get(r["service_id"], "Unknown")
    return docs


class ReviewUpdate(BaseModel):
    rating: Optional[int] = None
    comment: Optional[str] = None


@api_router.put("/admin/reviews/{review_id}")
async def admin_update_review(review_id: str, inp: ReviewUpdate, admin=Depends(require_admin)):
    update = {k: v for k, v in inp.model_dump().items() if v is not None}
    if not update:
        raise HTTPException(400, "No fields to update")
    r = await db.reviews.update_one({"id": review_id}, {"$set": update})
    if r.matched_count == 0:
        raise HTTPException(404, "Review not found")
    return {"ok": True}


@api_router.delete("/admin/reviews/{review_id}")
async def admin_delete_review(review_id: str, admin=Depends(require_admin)):
    doc = await db.reviews.find_one({"id": review_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Not found")
    await db.reviews.delete_one({"id": review_id})
    # recompute service rating
    revs = await db.reviews.find({"service_id": doc["service_id"]}, {"_id": 0}).to_list(1000)
    if revs:
        avg = sum(r["rating"] for r in revs) / len(revs)
        await db.services.update_one({"id": doc["service_id"]}, {"$set": {"rating": round(avg, 1), "review_count": len(revs)}})
    else:
        await db.services.update_one({"id": doc["service_id"]}, {"$set": {"rating": 0, "review_count": 0}})
    return {"ok": True}


# ============== Renewal reminder cron endpoint (idempotent daily task) ==============
@api_router.post("/tasks/send-renewal-reminders")
async def send_renewal_reminders(admin=Depends(require_admin)):
    """Admin-triggered idempotent job. Send to users whose membership expires in 7 days and haven't been reminded."""
    now = datetime.now(timezone.utc)
    users = await db.users.find({"membership.expires_at": {"$exists": True}}, {"_id": 0, "password": 0}).to_list(10000)
    sent = 0
    for u in users:
        m = u.get("membership") or {}
        exp = m.get("expires_at")
        if not exp:
            continue
        try:
            exp_dt = datetime.fromisoformat(exp)
            if exp_dt.tzinfo is None:
                exp_dt = exp_dt.replace(tzinfo=timezone.utc)
        except Exception:
            continue
        days_left = (exp_dt - now).days
        if not (0 <= days_left <= 7):
            continue
        # dedupe by user+week
        marker = f"renewal:{u['id']}:{exp_dt.date().isoformat()}"
        if await db.notifications_sent.find_one({"id": marker}):
            continue
        notify_renewal(u, m.get("plan_id", "premium"), days_left)
        await db.notifications_sent.insert_one({"id": marker, "user_id": u["id"], "kind": "renewal", "created_at": now_iso()})
        sent += 1
    return {"ok": True, "sent": sent}


# ============== SEO: sitemap + robots ==============
@api_router.get("/seo/sitemap.xml", include_in_schema=False)
async def sitemap():
    base = os.environ.get("APP_PUBLIC_URL", "").rstrip("/")
    static_paths = [
        "", "/services", "/memberships", "/reviews", "/about", "/faq",
        "/careers", "/register-professional", "/login", "/register",
    ]
    urls = "".join(f"<url><loc>{base}{p}</loc><changefreq>weekly</changefreq><priority>0.8</priority></url>" for p in static_paths)
    services = await db.services.find({}, {"_id": 0, "id": 1}).to_list(1000)
    urls += "".join(f"<url><loc>{base}/services/{s['id']}</loc><changefreq>weekly</changefreq><priority>0.6</priority></url>" for s in services)
    xml = f'<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">{urls}</urlset>'
    return Response(content=xml, media_type="application/xml")


@api_router.get("/seo/robots.txt", include_in_schema=False)
async def robots():
    base = os.environ.get("APP_PUBLIC_URL", "").rstrip("/")
    return Response(content=f"User-agent: *\nAllow: /\nSitemap: {base}/api/seo/sitemap.xml\n", media_type="text/plain")


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
    # auto-seed on first boot; reseed if legacy USD services present
    try:
        first = await db.services.find_one({}, {"_id": 0})
        if first is None:
            await seed()
        elif first.get("currency") != "INR":
            await db.services.delete_many({})
            await seed()
        # seed dynamic plans
        await _seed_plans_if_empty()
        # init object storage (non-fatal)
        try:
            init_storage()
            logger.info("Object storage initialized")
        except Exception as e:
            logger.warning(f"Object storage init failed (non-fatal): {e}")
    except Exception as e:
        logger.exception("Seed on startup failed: %s", e)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
