# micro-hub 🎓

**Micro Hub** — the student-first micro-commerce platform. Order stationery, snacks, electronics and hostel essentials from campus micro-vendors, pay online with Razorpay, and track your courier live on a map.

Built with: **Next.js 16 · TypeScript · tRPC · Prisma · PostgreSQL · Razorpay · Leaflet · Tailwind CSS**

---

## ✨ Why Micro Hub is unique (vs Swiggy / Zomato)

| Feature | Swiggy / Zomato | **Micro Hub** |
| --- | --- | --- |
| Scope | Restaurant food only | **Any campus item** — stationery, snacks, electronics, merch, hostel essentials |
| Vendors | Big chains | **Student-run micro-vendors** (canteens, stalls, room businesses) |
| Delivery zones | City-wide | **Campus zones** (hostel blocks, academic block) |
| Scheduling | "Fastest delivery" only | **Slots that fit your timetable** (between lectures) |
| Bills | One person pays | **Split bills with roommates** via a shareable link |
| Identity | Phone number | **Verified student email** badge + student pricing |
| Tracking | ETA text only | **Live courier on a campus map** + full status timeline |

---

## 🚀 Quick start

### 1. Prerequisites

- Node.js 20+
- PostgreSQL running locally (defaults to `postgres:root@localhost:5432`)

### 2. Install & setup

```bash
npm install

# 1. Point DATABASE_URL at your Postgres in .env
cp .env.example .env

# 2. Create & migrate the database
npm run db:migrate

# 3. Seed categories, products, zones & a demo admin
npm run db:seed

# 4. Run
npm run dev
```

Open **http://localhost:3000**

**Demo admin:** `admin@microhub.in` / `student123`

### 3. Razorpay sandbox (optional)

The app runs with **demo payment mode** out of the box — checkout succeeds without a real charge so you can try everything instantly.

To test the real Razorpay flow with test cards:

1. Create a [Razorpay account](https://dashboard.razorpay.com), switch to **Test Mode**, copy keys.
2. Fill `.env`:
   ```
   RAZORPAY_KEY_ID=rzp_test_xxxx
   RAZORPAY_KEY_SECRET=xxxx
   NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_xxxx
   ```
3. Restart the dev server. Use test card `4111 1111 1111 1111`, any future expiry, any CVV + OTP `1234`.

> ⚠️ Never use live keys for development.

### 4. Try the demo flow

1. Sign in (or sign up with a `@college.edu` email to get the student badge).
2. Add items to cart → checkout → pay (demo mode just works).
3. Open the order from **My Orders**. Tracking starts **automatically**:
   - ~4s after payment → **Confirmed** · ~10s → **Packed** · ~18s → **Out for delivery**
   - The courier then **moves across the live map** every few seconds with an ETA countdown, until delivered.
4. No manual steps needed — the status timeline and map self-advance. Open the order page and watch.
5. Create a **split bill** and open `/split/<code>` in another browser / incognito to join as a second friend.

---

## 🗂️ Project structure

```
src/
  app/                  # Next.js App Router (pages + tRPC route handler)
    api/trpc/[trpc]/    # tRPC HTTP endpoint
  components/           # Navbar, ProductCard, TrackingMap
  lib/                  # Razorpay client types
  server/
    auth.ts             # JWT cookie sessions (jose)
    db.ts               # Prisma singleton
    razorpay.ts         # Razorpay order creation + signature verify
    tracking.ts         # Courier position simulation + status timeline
    trpc.ts             # tRPC init, context, protected procedures
    routers/            # auth, product, cart, order, payment, group
prisma/
  schema.prisma
  seed.ts
```

## 📡 tRPC API surface

- `auth.signup` · `auth.login` · `auth.logout` · `auth.me`
- `product.list` · `product.bySlug` · `product.related` · `product.categories` · `product.zones`
- `cart.get` · `cart.add` · `cart.updateQty` · `cart.remove` · `cart.clear`
- `order.create` · `order.mine` · `order.byId` · `order.cancel`
- `payment.createOrder` · `payment.verify` · `payment.track` · `payment.dispatch` (manual courier kick, optional)
- `group.create` · `group.byCode` · `group.join` · `group.markPaid` · `group.mine`

## 🔐 Notes for production

- Replace `AUTH_SECRET` with a strong random value.
- Real courier assignment replaces the time-based simulation (`tracking.ts`) with a background worker / webhooks from your delivery partner.
- Move `TRACKING_SIMULATION` to a cron / worker instead of on-demand simulation.
- Enforce server-side stock locking and idempotent payment verification.
