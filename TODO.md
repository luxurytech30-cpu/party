# TODO — Event Marketplace Platform

Status legend: `[x]` done & verified · `[~]` in progress / partial · `[ ]` not started

**Current position:** Phase 4 core done — quotes & negotiation, reviews, event planner, in-app notifications (49 API tests). **Next: Phase 4 remainder — subscription plans, discounts, analytics, messaging; then Phase 5 hardening.**

**Run locally:** `npm run dev` → web http://localhost:3000 · api http://localhost:4001 · dev admin `admin@party.local` / `Admin12345` (from apps/api/.env).

Architecture & design decisions: see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

---

## PHASE 1 — Architecture & Planning

- [x] Review repository (empty — greenfield project)
- [x] Define MVP scope
- [x] System architecture (monorepo: `apps/api`, `apps/web`, `packages/shared`)
- [x] MongoDB data model (collections, relations, indexes)
- [x] Roles & permissions model (platform roles + per-business membership roles)
- [x] Dynamic dashboard / capability system design
- [x] Tenant isolation strategy
- [x] Availability & booking engine design (incl. concurrency)
- [x] Edge-case list
- [x] Implementation roadmap (this file)

## PHASE 2 — Project Foundation

### 2.1 Monorepo & tooling
- [x] npm workspaces (`apps/*`, `packages/*`)
- [x] Root TypeScript base config (strict)
- [x] `.gitignore`, `.env.example` files, `.editorconfig`
- [x] git init
- [ ] ESLint + Prettier
- [ ] CI workflow (typecheck + tests)

### 2.2 Shared package (`packages/shared`)
- [x] Capability keys + types
- [x] Platform roles, business roles, permission matrix
- [x] Locales (`ar` default, `he`, `en`) + direction helper
- [x] Zod schemas: auth, business, pricing
- [ ] Zod schemas for every API DTO (grows per feature)
- [ ] Unit tests inside the shared package (currently covered from api tests)
- [ ] Unit tests inside the shared package (currently covered from api tests)

### 2.3 API foundation (`apps/api`)
- [x] Express app factory (testable, no listen in tests)
- [x] Env config validated with Zod
- [x] MongoDB connection (Mongoose)
- [x] Centralized error handling (`AppError`, Zod → 400, Mongo dup → 409)
- [x] Request validation middleware
- [x] Security middleware: helmet, CORS allow-list, rate limiting, body size limit
- [~] Structured logging (pino logger in place; request logging middleware + request IDs pending)
- [x] Health endpoint
- [x] Test harness: vitest + supertest + mongodb-memory-server (replica set)

### 2.4 Authentication
- [x] User model (bcrypt password hash, platform roles)
- [x] Register / login / logout / me
- [x] JWT access token (short-lived) + rotating refresh token (httpOnly cookie, hashed in DB)
- [x] Auth rate limiting on login/register
- [ ] Email verification
- [ ] Password reset
- [ ] Phone/OTP login (common in IL market) — provider TBD
- [ ] Invite flow for not-yet-registered team members (needs email service)
- [ ] Invite flow for not-yet-registered team members (needs email service)

### 2.5 Multi-tenant access control
- [x] Business + BusinessMembership models
- [x] `requireAuth`, `requirePlatformRole` middleware
- [x] `requireBusinessPermission(perm)` — resolves membership from URL `:businessId`, never from body
- [x] `tenantScope` helper — every tenant query includes `businessId`
- [x] Tenant-isolation tests (user of business A cannot read/modify business B)
- [x] Audit log model + helper for sensitive actions

### 2.6 Web foundation (`apps/web`)
- [x] Next.js 16 (App Router) + TypeScript + Tailwind 4
- [x] i18n routing `/[locale]/...` with `dir="rtl"` for ar/he (dictionaries in `apps/web/lib/i18n.ts`)
- [x] Fonts (IBM Plex Sans Arabic + Heebo)
- [x] Design tokens (colors, radius, shadows) in `app/globals.css` @theme
- [~] Core UI kit: Button, Input, Textarea, Field, Card, Badge, Alert, Spinner done · Modal/Sheet, Tabs, Toast, Skeleton, Avatar pending
- [x] API client (same-origin proxy via Next rewrites, auto refresh-token, single-flight refresh)
- [x] Auth pages (login / register) + session context
- [~] App shell: responsive header + mobile quick links · bottom nav pending
- [ ] Rate limiting behind the web proxy: verify client IP forwarding (X-Forwarded-For) so users don't share one bucket

## PHASE 3 — Marketplace MVP

### 3.1 Categories & dynamic schema
- [ ] Category model (tree, multilingual names, icon, ordering, active flag)
- [ ] CategorySchema (versioned custom field definitions: type, validation, i18n labels, filterable, visibility)
- [ ] Custom-field validator (server) driven by schema
- [x] Category capability config (allowed / default capabilities)
- [x] Seed script: 12 initial categories + dev admin (`npm run seed`; auto on startup with MONGODB_URI=memory)
- [x] Public categories endpoint `GET /api/v1/categories`
- [ ] Admin CRUD for categories & schemas

### 3.2 Business registration & onboarding
- [x] Create business (status `pending_review`), owner membership auto-created (API + UI)
- [~] Onboarding: single-page create form done · multi-step wizard with first offering pending
- [~] Business profile edit (multilingual name/description, contacts, cities) done · social links pending
- [x] Capability resolution: category ∩ plan ∩ owner toggles (+ Features UI)
- [x] Admin approve / reject / suspend (audit-logged, API + UI)

### 3.3 Offerings
- [x] Services / packages / products — one `offerings` collection (kind discriminator), generic dashboard module
- [x] Packages (includes list, pricing)
- [~] Products with stock count · variants pending
- [x] Unified `PricingModel` (fixed / starting / range / hourly / per-person / package / quote-only, negotiable flag) + denormalized `startingPrice`
- [ ] Category custom fields on offerings (CategorySchema)

### 3.4 Media
- [x] Cloudinary signed upload endpoint (server signs; folder scoped per business; asset ownership verified on register)
- [~] Upload validation (formats, 10MB client check, 60 items/business) · per-plan limits pending · delete from Cloudinary on remove pending
- [~] Portfolio grid (first image = cover) · albums & reordering pending

### 3.5 Search & discovery
- [x] Public business listing endpoint (only `active` businesses, field allow-list)
- [~] Filters: category, city, max price done · custom fields, rating pending
- [~] Text search: escaped regex over names/descriptions (MVP) · Atlas Search later
- [x] Availability filter by date (reported availability, labelled as such)
- [~] Sort: featured → rating → newest · user-selectable sort pending
- [x] Customer UI: home/category discovery, search results, business page
- [x] Home redesign: "what is the party?" picker → sticky bar with all categories → one horizontal row per category with arrows (Wolt/Haat style); `GET /public/home?type=` orders rows by the party checklist
- [x] "My package": checklist per party type (picked vendor / arranged myself / not needed / missing), estimated total, works logged-out (localStorage), saves as an event plan
- [ ] Package: "request quotes from all picked vendors" in one step
- [x] Premium glassmorphism design system (glass / glass-strong / glass-dark utilities, ambient gradient background, photo heroes)
- [x] Demo data: 24 fictional vendors across all categories with photos (`npm run seed:demo`, removable, flagged `demo: true`)
- [ ] Show a visible "demo data" notice while demo vendors exist
- [ ] Dark mode

### 3.6 Basic availability & booking requests
- [x] BookingResource model (default resource per business)
- [x] Availability: open weekdays + blocked dates + daily capacity (stored on resource for MVP)
- [x] Availability query endpoint (available / pending / booked / unavailable)
- [x] Booking request flow (customer → `requested`; business confirm/decline/cancel/complete; customer cancel)
- [x] Concurrency-safe confirmation (transaction + resource lock) + tests
- [x] Manual bookings by business

### 3.7 Dashboards
- [x] Business dashboard shell driven by module registry + resolved capabilities
- [~] Modules done: Overview, Profile, Features, Team, Services, Packages, Products, Portfolio, Calendar, Bookings · pending ("Soon"): Quotes, Discounts, Reviews, Analytics
- [x] Business switcher (multi-business users) — "My businesses" list
- [x] Team members & roles (add registered user, change role, remove; last-owner protection)
- [~] Admin dashboard: businesses approval queue done · users, categories, capabilities management pending

### 3.8 Customer basics
- [x] Favorites
- [x] My bookings list + status tracking

## PHASE 4 — Advanced Marketplace

- [x] Quote requests + negotiation (versioned immutable offers, accept / reject / counter, CAS on current offer, race-tested) · offer expiry pending
- [x] Accepted quote → booking request (never auto-confirmed, double-submit safe)
- [ ] Conversations & messages (per customer↔business, linked to quote/booking) — offers carry terms text for now
- [ ] Advanced booking: time slots, multi-day, capacity-based, multiple resources, buffers
- [ ] Seasonal / date-dependent pricing rules
- [ ] Rentals: start/end dates, deposits, return tracking
- [x] Event planner: events from templates, checklist items, shortlisted vendors, budget tracking, status derived from real bookings
- [~] Vendor comparison: candidates per checklist item with prices · side-by-side compare view pending
- [x] Reviews (only after completed booking = verified), business reply, admin moderation, rating recompute
- [x] Notifications in-app (bell, 60s polling, localized by type) · email/SMS/WhatsApp later
- [ ] Discounts & promotions
- [ ] Business analytics (views, inquiries, conversion)
- [ ] Subscription plans (admin-configurable limits & features, trial, status) — no payments
- [ ] Featured / promoted listings
- [ ] Reports & complaints, content moderation
- [ ] Marketplace analytics for admins

## PHASE 5 — Production Readiness

- [ ] Full permission matrix tests
- [ ] Tenant-isolation test suite for every tenant route
- [ ] Booking concurrency stress tests
- [ ] OpenAPI documentation
- [ ] Performance: indexes review, pagination everywhere, caching for public listings
- [ ] Observability: request IDs, error tracking (Sentry or similar)
- [ ] Deployment docs: Vercel (web), Render (api), Atlas (db), Cloudinary
- [ ] Security review (OWASP checklist, dependency audit, secrets)
- [ ] Backups & data retention, privacy policy / PII handling
- [ ] Expo mobile client (consumes same REST API)
