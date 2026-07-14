# DH Salon — PRD

## Original problem statement
Build DH Salon web and mobile application just like YesMadam.com and different UI/UX design which looks more professional. Also including basic, advance, premium plan for regular customer service.

## User choices
- Core features: services catalog + booking, memberships (Basic/Advanced/Premium), cart & checkout, reviews & ratings, addresses + at-home booking
- Payments: Stripe (Flow B via emergentintegrations — India country not supported by claimable sandbox, using shared test key)
- Auth: JWT-based custom auth
- Admin panel: yes
- Design: Professional light aesthetic (Soft Luxury / Organic & Earthy)

## User personas
1. Customer — books beauty & wellness services at home, subscribes to memberships for discounts.
2. Admin — manages services, monitors bookings, users and revenue.

## Architecture
- **Backend**: FastAPI + Motor/MongoDB. JWT (HS256) auth via `PyJWT` + bcrypt. Stripe via `emergentintegrations.payments.stripe.checkout`.
- **Frontend**: React 19 + React Router 7 + Tailwind + shadcn/ui + @phosphor-icons/react + framer-motion + sonner.
- **Persistence**: MongoDB collections — users, services, carts, bookings, reviews, payment_transactions.
- **Payments**: Stripe checkout session via emergentintegrations. Webhook: `/api/webhook/stripe`. Status polling on `/payment/success` with inline sync fallback.

## Implemented (Feb 2026)
- Auth: register, login, `/auth/me`, admin auto-seed
- Services: list, filter by category, detail with reviews; admin CRUD
- Addresses: add/list/delete
- Cart: add/remove/clear/get with joined service data
- Bookings: create with slot + address + Stripe session; auto-apply membership discount; list mine + admin list
- Reviews: submit + rating aggregate
- Memberships: 3 static plans (Basic $999/30d, Advanced $2,499/90d, Premium $5,999/180d) with perks
- Payments: cart + membership checkout via Stripe, webhook + polling status resolver
- Admin: stats KPIs, users, bookings, service manager (create/delete)
- UI: Home (hero, bento service grid, membership CTA), Services (filters), Service Detail (reviews), Cart, Checkout (calendar + slot), Memberships (tiered visual), Login/Register (split-image), Account (bookings/addresses/membership tabs), Payment Success/Cancel, Admin dashboard, About page, sticky glass nav, footer

## Backlog
- P1: Real slot conflict/availability checking; therapist assignment; SMS/email booking confirmations
- P1: Add-to-cart from home/service list without navigating
- P2: Coupon / promo codes
- P2: Recurring subscription billing (currently one-time charge for X days)
- P2: Multi-city selector on landing; delivery serviceability check by pincode
- P2: Ratings-based sort/filter on Services page
- P2: Cancellation & reschedule flow with refund
- P2: Admin analytics charts (recharts already installed)
- P2: Wishlist/favorites, referral program

## Next tasks
- Wire up SMS/email confirmation
- Slot availability engine
- Coupons / referrals for growth
