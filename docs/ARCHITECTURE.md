# Architecture — Event Marketplace Platform

## 1. Overview

One shared platform, many independent businesses (tenants). Customers discover, compare,
negotiate with and book event vendors. Arabic (RTL) first, Hebrew (RTL) and English (LTR).

```
apps/
  api/        Node.js + TypeScript + Express + Mongoose   → Render
  web/        Next.js (App Router) + Tailwind             → Vercel
packages/
  shared/     Types, Zod schemas, capability keys, permissions, locales
              (consumed by api, web and the future Expo app)
docs/
```

**Modular monolith**, not microservices. The API is split into feature modules with explicit
boundaries (`auth`, `users`, `businesses`, `memberships`, `categories`, `offerings`, `media`,
`availability`, `bookings`, `quotes`, `messaging`, `events`, `reviews`, `notifications`,
`subscriptions`, `admin`, `audit`). Each module owns its models, service layer and routes.
Modules call each other through service functions, never through each other's models directly
where a service exists. This can be split later if load demands it.

Request flow: `route → validate (Zod) → auth → authorize (platform role / business permission)
→ service (business rules, tenant-scoped queries) → model`.

## 2. MVP scope

**In MVP (Phase 2–3):** auth, multi-business membership, categories with custom field schemas,
business onboarding + admin approval, capability-driven dashboard, services / packages /
basic products, Cloudinary portfolio, public search & filters, basic availability (date /
full-day on a default resource), booking requests with concurrency-safe confirmation,
favorites, admin dashboard.

**Deferred (Phase 4):** quote negotiation, messaging, time-slot / multi-day / capacity booking,
rentals, event planner, reviews, notifications, discounts, analytics, subscription plans.

**Explicitly not built:** payment processing, commissions (data model leaves room for both).

## 3. Roles & permissions

Two independent layers:

**Platform roles** (on `User.platformRoles`): `customer` (default), `admin`, `super_admin`.
Admin routes require `admin`/`super_admin`. Platform admins do **not** implicitly get business
member permissions; admin actions on businesses go through `/admin/*` routes and are audit-logged.

**Business membership roles** (`BusinessMembership.role`): `owner`, `manager`, `staff`, `viewer`.
Roles map to permissions in `packages/shared/src/permissions.ts`, e.g.

| permission              | owner | manager | staff | viewer |
|-------------------------|:-----:|:-------:|:-----:|:------:|
| business.read           | ✓ | ✓ | ✓ | ✓ |
| business.update         | ✓ | ✓ |   |   |
| business.delete         | ✓ |   |   |   |
| team.manage             | ✓ |   |   |   |
| offerings.manage        | ✓ | ✓ | ✓ |   |
| bookings.read           | ✓ | ✓ | ✓ | ✓ |
| bookings.manage         | ✓ | ✓ | ✓ |   |
| quotes.manage           | ✓ | ✓ | ✓ |   |
| capabilities.manage     | ✓ | ✓ |   |   |
| analytics.read          | ✓ | ✓ |   | ✓ |
| subscription.manage     | ✓ |   |   |   |

A user may hold memberships in many businesses (one membership per user×business, unique index).

## 4. Tenant isolation

Rules enforced on the server:

1. Every tenant-owned document has a required, indexed `businessId`.
2. Business-scoped routes are mounted under `/api/v1/businesses/:businessId/...`.
   `requireBusinessPermission(perm)` loads the caller's **active** membership for that
   `businessId` (from the URL only — never from the body) and rejects with 404 when there is
   no membership (no existence leak) and 403 when the role lacks the permission.
3. Services receive a `TenantContext { businessId, userId, role, permissions }` and build every
   query through `tenantFilter(ctx, extra)` → `{ ...extra, businessId: ctx.businessId }`.
   Lookups by `_id` always include `businessId` (prevents IDOR: guessing an id of another
   tenant's document returns 404).
4. Writes strip `businessId` from client payloads and set it from the context.
5. Customer-owned resources (favorites, events, own bookings/quotes) are filtered by
   `customerId = req.user.id` the same way.
6. Public endpoints use explicit projection allow-lists (no private fields leak).
7. Isolation is covered by automated tests per tenant route.

## 5. Dynamic business dashboard

No per-category dashboard code. Three inputs produce the **effective capabilities**:

```
effective = category.allowedCapabilities (union over business categories)
          ∩ plan.capabilities              (subscription tier; Phase 4, MVP = all)
          ∩ business.enabledCapabilities   (owner toggles)
```

Capability keys (`packages/shared/src/capabilities.ts`): `services`, `packages`, `products`,
`inventory`, `booking`, `calendar`, `timeSlots`, `multiDay`, `capacity`, `rentals`,
`negotiation`, `quotes`, `discounts`, `portfolio`, `reviews`, `team`, `analytics`.

- **API** exposes `GET /businesses/:id/capabilities` (effective set + why each is on/off) and
  every capability-gated route uses `requireCapability('products')` so disabled features are
  also blocked server-side.
- **Web** has a single **module registry**: `{ key, capability?, permission?, route, icon,
  label }[]`. The sidebar / mobile nav renders the modules the user's role allows and the
  business's effective capabilities enable. Adding a category = data only.

**Custom fields:** `CategorySchema` holds versioned field definitions
(`key, type: text|number|boolean|select|multiselect|date|range, i18n labels, required,
min/max/options, filterable, visibility: public|private, appliesTo: business|service|product`).
Values are stored in `attributes: Record<string, unknown>` on the owning doc **plus**
`attributesIndex: [{ k, v }]` (attribute pattern) with a compound index `{ 'attributesIndex.k',
'attributesIndex.v' }` so filterable attributes are searchable without unbounded indexes.
All values are validated server-side against the schema (built into a Zod schema at runtime).

## 6. Data model (MongoDB / Mongoose)

All collections have `createdAt/updatedAt`. `→` = reference.

| Collection | Key fields | Indexes |
|---|---|---|
| users | email (lowercase), phone, passwordHash, name, locale, platformRoles[], status | email unique, phone unique sparse |
| refreshTokens | userId→, tokenHash, family, expiresAt, revokedAt | tokenHash unique, TTL expiresAt |
| businesses | slug, name{ar,he,en}, description{…}, categoryIds[], status(pending_review/active/rejected/suspended), cities[], serviceAreas[], contact, enabledCapabilities[], attributes, attributesIndex, rating{avg,count}, startingPrice, featuredUntil, planId | slug unique, status+categoryIds, cities, attributesIndex |
| businessMemberships | businessId→, userId→, role, status(active/invited/removed), invitedBy | (businessId,userId) unique, userId |
| categories | slug, name{…}, parentId→, icon, order, active, allowedCapabilities[], defaultCapabilities[] | slug unique, parentId |
| categorySchemas | categoryId→, version, fields[] , active | (categoryId,version) unique |
| services | businessId→, categoryId→, title{…}, pricing{model,amount,min,max,currency,unit,negotiable}, durationMinutes, attributes, active | businessId+active |
| packages | businessId→, title{…}, items[], pricing, active | businessId |
| products | businessId→, title{…}, pricing, attributes, active | businessId |
| productVariants | businessId→, productId→, sku, options{}, price, stock | productId, (businessId,sku) unique |
| bookingResources | businessId→, name, kind(venue_space/staff/equipment/default), capacity, concurrency(1 = exclusive), lockVersion | businessId |
| availabilityRules | businessId→, resourceId→, weekly[{day, start, end}], slotMinutes, bookingMode(full_day/time_slot/multi_day/capacity) | resourceId |
| availabilityExceptions | businessId→, resourceId→, start, end, type(blocked/open), reason | resourceId+start |
| bookings | businessId→, customerId→, resourceIds[], serviceId/packageId, start, end, status(requested/confirmed/declined/cancelled_by_customer/cancelled_by_business/completed), source(customer/manual/quote), quoteId→, agreedPrice, guestCount, history[] | businessId+status+start, customerId, resourceIds+start+end |
| quoteRequests | businessId→, customerId→, eventId→, requirements, status, currentOfferId→, expiresAt | businessId+status, customerId |
| quoteOffers | quoteRequestId→, businessId→, version, fromSide(business/customer), price, terms, status, createdBy | (quoteRequestId,version) unique |
| conversations / messages | businessId→, customerId→, linked quote/booking; messages: conversationId→, senderId, body, readAt | (businessId,customerId), conversationId+createdAt |
| reviews | businessId→, customerId→, bookingId→ (verified), rating, text, status, reply | bookingId unique, businessId+status |
| favorites | customerId→, businessId→ | (customerId,businessId) unique |
| customerEvents / eventChecklistItems | customerId→, type, date, location, guestCount, budget; items: eventId→, categoryId→, candidates[{businessId, estPrice, note}], selectedBookingId→, status | customerId, eventId |
| subscriptionPlans / subscriptions | plans: key, name, priceConfig (admin-set, not hardcoded), limits{}, capabilities[]; subs: businessId→, planId→, status(trial/active/past_due/cancelled), trialEndsAt | businessId unique |
| notifications | userId→, type, payload, readAt | userId+readAt+createdAt |
| auditLogs | actorId→, businessId?, action, targetType, targetId, meta, ip | businessId+createdAt, actorId+createdAt |

## 7. Availability & booking engine

**Resources.** Every booking occupies one or more `bookingResources` (a hall, a photographer,
a limousine, a pool of 50 chairs). Every business gets a `default` resource on creation, so
simple vendors never see the concept.

**Booking modes** (per availability rule): `full_day`, `time_slot`, `multi_day` (start/end dates,
used by rentals) and `capacity` (resource has `capacity` N; bookings consume units).
Internally all modes are a half-open interval `[start, end)` + `units`.

**Availability states shown to customers:**
`available` (inside rules, no blocks, no conflicts) · `pending` (has unconfirmed requests —
still requestable) · `booked` (confirmed bookings fill concurrency/capacity) · `unavailable`
(outside rules / blocked). UI labels availability as *reported by the business*; only a
**confirmed** booking is a guarantee.

**Concurrency-safe confirmation.** Confirming a booking (or creating a manual one) runs in a
MongoDB transaction:
1. `findOneAndUpdate` each resource `{ $inc: { lockVersion: 1 } }` inside the transaction —
   this takes a document-level write lock, so two concurrent transactions on the same resource
   conflict and one is aborted (`WriteConflict` → retried by `withTransaction`).
2. Re-check overlap: count confirmed bookings on the resource where
   `start < new.end && end > new.start` (sum units for capacity resources).
3. If free → set status `confirmed`; else → `409 BOOKING_CONFLICT`.

Requests (`requested`) never block; only confirmation does. Atlas runs replica sets, so
transactions are available in production; tests use `mongodb-memory-server` replica set.

**Quote → booking.** An accepted quote creates a booking *request* with `source: quote` and
the agreed price. The business must still confirm availability. Never auto-confirmed.

### MVP implementation notes

- Services, packages and products share one `offerings` collection with a `kind` field (capability per kind: services / packages / products). Variants and inventory get their own collections when needed.
- MVP availability (open weekdays, blocked dates, daily capacity) is stored on the default `bookingResources` document; bookings are full-day (`date` = YYYY-MM-DD in the business timezone). Separate rule/exception collections and time slots come in Phase 4.

## 8. Edge cases to handle

- Customer requests a date that is confirmed for someone else between page load and submit → request allowed? No: request creation rejects if the slot is already *fully confirmed*; confirmation re-checks under lock.
- Two staff confirm two overlapping requests at the same time → lock + transaction (tested).
- Business owner removes themselves → forbidden if they are the last owner.
- User belongs to several businesses with different roles → membership resolved per request.
- Category schema changes after businesses filled attributes → schemas are versioned; old values stay readable, validation uses current version on next edit.
- Business disables a capability that has live data (e.g. products) → data kept, module hidden, public endpoints stop exposing it.
- Business suspended → hidden from public, pending requests stay visible to customer with status.
- Time zones → all dates stored UTC; business timezone `Asia/Jerusalem` default; full-day bookings computed in business timezone.
- Shabbat / holidays → expressed as weekly rules/exceptions, not hardcoded.
- Quote offer race (customer accepts while business sends a new version) → accept requires `offerId` = current offer, compare-and-set on `currentOfferId`.
- Reviews only from customers with a `completed` booking; one review per booking.
- Plan downgrade over limits → existing data kept read-only above limit, creation blocked.

## 9. Security

bcrypt (cost 12) passwords; short-lived JWT access token (15 min, `Authorization: Bearer`) +
rotating refresh token (httpOnly, `SameSite`, `Secure` in prod, hashed in DB, reuse detection
revokes the whole family). helmet, CORS allow-list, global + auth-specific rate limits, JSON
body limit, Zod validation on every input, Mongo operator injection prevented by strict schemas
(`strict` Zod objects, `sanitizeFilter`), Cloudinary uploads via server-signed params with a
per-business folder and allowed formats/size, audit logs for approvals, role changes,
booking confirmations/cancellations, capability changes.

## 10. Deployment

- **web** → Vercel (`NEXT_PUBLIC_API_URL`).
- **api** → Render web service (`npm run build -w @party/api && npm start -w @party/api`).
- **db** → MongoDB Atlas (replica set; transactions enabled).
- **media** → Cloudinary (signed uploads).
- All config through environment variables, validated at boot.
