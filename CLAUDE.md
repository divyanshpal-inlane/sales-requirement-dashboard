# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**InLane Web App** is a comprehensive driving school management platform built with React, TypeScript, and Vite. It supports multiple user roles (learners, instructors, admins) with role-based routing, real-time scheduling, payments via Razorpay, Google Calendar integration, and learning analytics.

### Tech Stack
- **Frontend**: React 18, TypeScript 5.5, Vite 5.2
- **Styling**: Tailwind CSS with custom Radix UI components
- **State Management**: React Context (auth, phone visibility), TanStack Query for server state
- **Backend**: Go service (via `/go-api` proxy), Supabase (PostgRES, edge functions)
- **Payment**: Razorpay integration
- **Maps/Calendar**: Google Maps API, Google Calendar API integration
- **Package Manager**: pnpm 11.8.0, Node.js 22.x

## Development Setup

### Installation
```bash
pnpm install
```

### Environment
Create a `.env` file from `.env.example`:
```
VITE_SUPABASE_KEY="<anon_key>"
```
Environment variables are loaded as `import.meta.env.VITE_*` in the app.

### Common Commands
- **Dev server**: `pnpm run dev` (starts Vite with proxy to `http://localhost:8080` for Go backend)
- **Build**: `pnpm run build` (produces `dist/` directory)
- **Preview**: `pnpm run serve` (preview production build locally)
- **Linting**: `pnpm run lint` (formats and fixes both Prettier and ESLint)
  - `pnpm run lint:format` — Prettier only
  - `pnpm run lint:fix` — ESLint only
- **Type check**: `pnpm run type-check` (runs TypeScript compiler without emit)

## Architecture

### Project Structure
```
src/
  app/          # Feature-specific pages (instructor, learner flows)
  components/   # Reusable UI components (ui/, layout/, lesson/, etc.)
  routes/       # Route definitions for admin, learner, instructor paths
  pages/        # Legacy page components (being migrated)
  services/     # Feature flags via featureFlagService.ts
  context/      # React Context providers (auth, phone visibility)
  hooks/        # Custom React hooks
  queries/      # TanStack Query hooks (organized by domain)
  lib/          # Utilities (supabaseClient, calendarUtils, geoUtils, etc.)
  types/        # TypeScript type definitions
  constants/    # App-wide constants
  utils/        # Shared utility functions
  assets/       # Static images, icons
```

### Key Patterns

**Routing & Auth**
- `<BrowserRouter>` with protected routes: `ProtectedLearnerRoute`, `ProtectedInstructorRoute`, `ProtectedAdminRoute` in `context/auth-context.tsx`
- Three separate role trees; auth context holds role and user state
- Role detection happens at app load; routing enforces access control

**Data Fetching**
- TanStack Query hooks in `src/queries/*` (organized by domain: `instructor.ts`, `learner.ts`, etc.)
- Go backend API at `http://localhost:8080/v1/*` (proxied as `/go-api` in dev, real URL set via `VITE_BACKEND_API` in prod)
- Internal endpoints at `/go-api/internal/*` (e.g., feature flags) bypass the `/v1` rewrite

**Supabase Integration**
- Client initialized in `src/lib/supabaseClient.ts`
- Anon key stored in `.env` as `VITE_SUPABASE_KEY`
- Edge functions deployed manually via `supabase functions deploy` (not CI/CD)

**Component Patterns**
- UI components use Radix primitives + Tailwind (no shadcn pre-built, custom components in `src/components/ui/`)
- Lesson flows, scheduling, and payment components modular and feature-specific
- Layout wrapper in `src/components/layout/main-layout.tsx`

**Styling**
- Tailwind CSS with Prettier plugin for class sorting
- Configured with safe-area insets and animation plugins
- Custom Radix UI component library in `src/components/ui/`

### Env Variables
- **Dev**: Vite proxy remaps `/go-api` → `http://localhost:8080/v1`, `/go-api/internal` → `http://localhost:8080/internal`
- **Prod**: `VITE_BACKEND_API` env var sets real Go service URL (e.g., `https://api.inlane.in/v1`); no proxy used
- Supabase key: `VITE_SUPABASE_KEY` (anon, safe to commit if scoped to frontend)

## Deployment

### Frontend (Vercel)
- **Auto-deploy** on commits to `main`
- Production: `inlane-web-app.vercel.app`
- Build: `pnpm install --frozen-lockfile` → `vite build`
- **⚠️ Important**: Vercel gates deploys on git commit author being a team member
  - If deploy fails with "Git author must have access," merge with an authorized account or use Vercel's **Redeploy** button
  - Details in `DEPLOYMENT.md`

### Supabase Edge Functions (Manual)
- **No CI/CD pipeline** deploys edge functions
- After changes to `supabase/functions/*`, manually run:
  ```bash
  supabase functions deploy        # all
  supabase functions deploy <name> # single function, e.g., process-payment
  ```
- Deploy from up-to-date `main` checkout (bundles from local working directory)

### pnpm Build Script Gate
- pnpm 10/11 blocks dependency build scripts by default
- `pnpm-workspace.yaml` → `allowBuilds` controls which deps build (only `esbuild` for Vite)
- Add new entries if a dependency with a build script is introduced (Vercel will error with `ERR_PNPM_IGNORED_BUILDS`)

## API Integration

### Go Backend Service
- **Base URL**: `VITE_BACKEND_API || "/go-api"` (dev proxy to `http://localhost:8080/v1`)
- **Auth endpoints**: `/auth/login`, `/auth/signup`, `/auth/otp/request`, `/auth/otp/verify`, `/auth/reset-password`, `/auth/change-password`
- **Feature flags**: `GET /internal/feature-flags` (gated by `x-internal-key`)
- **Migration**: App is mid-transition from Supabase auth to Go auth; gate: `use_go_auth` feature flag

### Supabase Edge Functions (40+ functions)
Core flows executed server-side:
- **Payments**: `create-razorpay-order`, `verify-razorpay-payment`, `process-payment` (Orange PG), `payment-callback`, `recover-razorpay-payment`
- **Messaging**: `send-message` (WhatsApp dispatcher), `send-schedule-emails` (ICS attachments), `send-payment-link-email`, `send-admin-email`, `send-course-feedback-email`
- **Reminders**: `learner-daily-schedule`, `instructor-daily-schedule`, `send-signup-reminders`, `ll-flow-reminders` (cron jobs)
- **User/Auth**: `create-user`, `create-admin-user`, `delete-user`, `get-current-user`, `password-reset-otp`
- **Calls**: `masked-call` (Exotel learner↔instructor), `msg91-masked-call` (instructor↔KAM)
- **Calendar**: `fetch-calendar-events`, `sync-google-calendar`, `remove-google-calendar-sync`
- **Direct Booking** (new): `get-booking-config`, `get-booking-slots`, `create-booking`, `change-booking-slot`, `confirm-booking`

Deployed manually: `supabase functions deploy <name>`

### Third-Party Integrations (24 services)
| Service | Purpose | Auth Method |
|---------|---------|---|
| **Razorpay** | Payment gateway | API key + webhook signature |
| **ICICI Orange PG** | Payment gateway (v2 HMAC-SHA256 signed) | MERCHANT_ID + SECRET_KEY |
| **Heltar** | WhatsApp messaging (40+ templates) | Bearer token |
| **Exotel** | Learner↔Instructor masked calls | Basic auth |
| **MSG91** | Instructor↔KAM click-to-call | authkey header |
| **Google Calendar API** | Instructor calendar sync | OAuth2 + bearer token |
| **Google Maps** | Address autocomplete + geocoding | API key |
| **Google Analytics 4** | Event tracking (signups) | Measurement Protocol |
| **OpenAI** | Chatbot (gpt-4o-mini) | Bearer token |
| **Cratio CRM** | Lead ingestion | Webhook URLs |
| **Cal.com** | Booking appointments | Bearer token |
| **Gmail SMTP** | Transactional email | Username/password TLS |

## Core Features & Flows

### Learner Journey
1. **Onboarding**: Birthday → Car intent → DL status → Address → Preferences → LL upload
2. **Scheduling**: Book demo/course via price comparison → Razorpay/Orange PG payment → Instructor assignment → Lesson prep
3. **Lessons**: View upcoming lessons → Receive OTP via WhatsApp → Instructor starts/ends lesson → Reschedule (₹300 fee if <10h notice)
4. **LL Flow**: App guides learner through licence application (doc upload → RTO submission → test → DL booking)
5. **Payments**: Two-gateway support (Razorpay or Orange PG); installment splits; demo credit application to course upgrade

### Instructor Journey
1. **Onboarding**: Name → DL/ID docs → Vehicle → Service area (with Google Maps) → Unavailability blocks → ICS import → Contract
2. **Daily**: Calendar (Day/Week/Month) → OTP verification for lesson start/end → GPS tracking → Lesson status updates
3. **Earnings**: Per-class rate (₹425 default) → Monthly target (30 classes) → Leaderboard bonus → KAM contact
4. **Management**: Leave requests → No-show reporting → Safety incidents (SOS) → Support tickets

### Admin Features
- Learner/instructor management + bulk operations
- Schedule creation and replacement (leave cover-ups)
- Payment recovery (Razorpay wedged payments)
- Earnings config and payout generation (Sat–Fri window)
- Notification management (30+ WhatsApp templates)
- No-show fee management + appeals
- LL/DL document verification + status transitions

## Sales Requirement Dashboard (Incoming Feature)

**Status**: New feature repo at `D:\KodeLand\LANE\Lane-sales-requirement` — to be integrated into main app.

### Overview
A **read-only instructor availability dashboard** (React 19 + TypeScript + Vite) that displays real-time instructor free/busy slots in a Google Calendar-like grid interface. Fetches live `Schedule` + `Instructor` data from Supabase and renders 30-minute slot granularity with search, location filtering, and expandable full-schedule views.

**Tech Stack:**
- **Framework**: React 19, TypeScript 5.x, Vite 5.x
- **Styling**: CSS + theme variables (dark/light toggle, localStorage persistence)
- **Maps**: Google Maps JS API (Places autocomplete + geocoding, optional; location search degrades gracefully without it)
- **Geospatial**: KML polygon/point matching via ray-casting + Haversine distance
- **Build/Deploy**: GitHub Pages via `.github/workflows/deploy.yml` + Vercel variables

**Key Features:**
- **Live availability grid**: Color-coded free (green) / booked (other) slots in 30-min increments
- **Search & compare**: Multi-select instructor comparison mode; toggle "Add" / "Compare" buttons
- **Location-based filtering**: Manual lat/lng input or Google Places autocomplete; geospatial zone matching via KML
- **Expandable detail rows**: Click instructor name or "Schedule" button → full timetable across all dates
- **Month navigation**: Date tabs with free-slot count summaries
- **Configurable**: All grid settings (slot start/end, grid minutes, gap, excluded statuses) live in `app_settings` table
- **Responsive**: Sticky header, sticky instructor column, theme persistence

### Architecture & Data Flow

**Fast startup (~450–900 ms):**
- Page load fetches only `app_settings` config (key = `booking_flow`) + light instructor index (`id, name, status, enabled`)
- **No schedule queries on startup** — performance-first design
- Clicking a search suggestion or entering location coordinates triggers on-demand `loadInstructors(ids)` to fetch full Instructor rows + Schedule rows

**Core hook: `useSalesData()`** (`src/hooks/useSalesData.ts`)
- Returns `SalesData` object: `phase` (loading/error/ready), `config`, `dates`, `timeStarts`, `allInstructors`, `instructors`, `loading` (skeleton rows), `errors`, `freeGrid`, `blocks`, `reload()`, `loadInstructors()`, `removeInstructor()`
- Computes `freeGrid: Map<instructorId, Map<date, number[]>>` of free minutes via `buildInstructorFreeGrid()`
- Paginated queries (1000-row chunks), chunked by instructor ID (60 per batch) to respect Supabase limits

**Slot computation: `src/lib/availability.ts`**
- `buildInstructorFreeGrid()`: intersects unavailability, Schedule statuses, booked classes, travel gaps
- `candidateStartMinutes()`: generates time grid (e.g., 06:00–22:00 in 30-min increments)
- `isTimeUnavailable()`: point-in-time query for instructor unavailability rules
- Excludes statuses in `excluded_schedule_statuses` from free-slot calc (e.g., `cancelled`, `rejected`)

**KML & geospatial: `src/lib/kml.ts`**
- `public/instructors.kml` is the single source of truth for service zones (polygons) + point markers
- `matchLocation(zones, point)`: point-in-polygon (ray-casting) for polygons, Haversine proximity (3 km) fallback for points
- Instructor names matched via `KML_ALIASES` + fuzzy normalization (DB has 120 instructors, KML may have spelling variants)
- **Quirk**: On-break instructors (`status: on_break/paused/disabled`) are normally excluded from default roster, but if matched by KML location, they appear with real free-slot counts and no break badge
- DB `Instructor.areas` field is **not used**; KML is the authoritative geo-filter

**Configuration: Supabase `app_settings`**
```json
{
  "key": "booking_flow",
  "value": {
    "booking_days_ahead": 14,
    "view_days_ahead": 400,
    "slotStart": "06:00",
    "slotEnd": "22:00",
    "gridMinutes": 30,
    "instructor_gap_minutes": 15,
    "excluded_schedule_statuses": ["cancelled", "rejected"]
  }
}
```

### Integration Points with Main App

**Data dependencies:**
- `Instructor` table: `id, name, areas, gender, status, enabled, unavailability` (JSON)
- `Schedule` table: `instructor_id, learner_id, course_id, lesson_id, date, start_time, end_time, status, isTentative, tentative_details`
- `Learner` table: `id, name, phone` (for slot detail popovers)
- `Courses` table: `id, name` (for slot detail popovers)
- `app_settings` table: row with `key = 'booking_flow'` (config JSON)

**UI/UX alignment:**
- Styling mirrors existing app theme (Tailwind-inspired, dark/light toggle)
- Phone masking uses same `maskPhoneNumber()` utility and respects `view_unmasked_phone_numbers` permission
- Location search uses same Google Maps integration pattern as main app

**Deployment:**
- Will be a separate route in the main app (e.g., `/sales-dashboard` or similar)
- Same Supabase project, same Vercel environment variables
- GitHub Pages deployment via same workflow pattern (inject `VITE_SUPABASE_*`, `VITE_GOOGLE_MAPS_API_KEY`)

### Key Implementation Details

**Grid rendering: `src/components/AvailabilityGrid.tsx`**
- Memoized component; header row (times), body rows per instructor
- Expandable rows (`.row`, `.row-selected`, `.row-loading`, `.row-gap`) → nested `.detail-row` with mini full-schedule grid
- Cell states: `.cell-free` (green), `.cell-band` (alternating bg), `.cell-selected` (popover open)
- Sticky `thead`, sticky `.instructor-cell` (left column) for horizontal scroll with popovers above

**Slot detail closure: `resolveInfo(instructorId, date, minute, isFree)`**
- Centralizes all slot-detail logic (free time label, booked classes, paused, unavailability reasons)
- O(1) lookups via `instructorsById`, `blocksIndex`, `config` closures

**Search & suggestions:**
- `.suggest-row` with two buttons: `.suggest-main` (toggle Add/Added/Loading) and `.suggest-compare` (toggle Compare)
- Compare mode shows "Comparing N instructors · X free slots · Clear selection" bar
- Pressing Enter on search adds top result

**Theme & localStorage:**
- `data-theme` attribute on `<html>` (`"light"` or `"dark"`)
- Theme persists to `localStorage["lane-theme"]`
- CSS variables swap under `:root[data-theme="dark"]`

### Common Integration Tasks

**Wiring into main app:**
1. Copy repo contents to a new directory (e.g., `src/routes/sales-dashboard/` or as a separate integrated module)
2. Update routing in `src/App.tsx` to mount the dashboard at a new path (likely protected via `ProtectedAdminRoute` or similar)
3. Ensure `.env` includes `VITE_GOOGLE_MAPS_API_KEY` if location search is enabled
4. Verify `app_settings` row exists in Supabase with `key = 'booking_flow'` and a populated JSON `value`
5. Test on-break instructor behavior with location search (should show real free slots, no break badge)

**Updating configuration at runtime:**
```sql
UPDATE app_settings
SET value = jsonb_set(value, '{gridMinutes}', to_jsonb(15))
WHERE key = 'booking_flow';
```

### Testing & Verification

**Manual E2E flow:**
1. Start dev server; load dashboard
2. Type instructor name → suggestions appear; click `＋ Add` → loads full instructor with real free counts
3. Click `＋ Compare` on another instructor; summary updates to "Comparing N instructors · X free slots"
4. Test location: enter lat/lng or use Places autocomplete; KML zones match and auto-load instructors
5. Expand instructor row; full timetable opens/closes
6. Toggle theme; dark theme persists to localStorage

**Performance baseline:**
- Startup should be ~450–900 ms (config + light index only, no Schedule queries)
- First instructor load should be ~1–2 s depending on Schedule volume
- Subsequent loads cached by TanStack Query (not currently used in sales-dashboard, but compatible)

## Supabase Tables (Core Schema)

| Table | Purpose | Key Columns |
|-------|---------|---|
| `Learner` | Student profile | phone, name, email, address, lat/lng, LL status fields |
| `Instructor` | Driving instructor | phone, DL_number, car_make/mode, experience, radius, service areas, unavailability JSON, Google Calendar sync |
| `Schedule` | Lessons | instructor_id, learner_id, course_id, lesson_id, date, start/end times, status (booked/ongoing/completed/paused), otp, started_at, ended_at |
| `enrollment` | Course progress | learner_id, course_id, progress (type: course/demo/topup/custom), payment_status, unlocked_lessons |
| `payment` | Payment records | learner_id, amount, payment_type (course/demo/topup/reschedule/custom), status, gateway (icici/razorpay), gateway_reference |
| `lesson_tracking` | GPS tracking | schedule_id, latitude, longitude, type (start/tracking/end) |
| `reschedule_requests` | Reschedule bookings | learner_id, lesson_ids, payment_id, type, status |
| `ll_applications` | LL journey tracking | learner_id, status (payment_received → ... → dl_delivered/closed), docs, RTO data |
| `no_show_fee` / `no_show_appeal` | No-show penalties | learner_id, amount (₹300), fee_type, status, appeal_reason |
| `instructor_earning_adjustment` | Bonuses/corrections | instructor_id, type (adjustment/bonus/referral), amount (±), reason, effective_date |
| `app_settings` | Feature flags + config | key (booking_flow, payment_gateway_mode), value JSON |

## Code Quality

### Linting & Formatting
- ESLint: TypeScript + React rules (see `.eslintrc.js`), uses `simple-import-sort` for import ordering
- Prettier: 80-char print width, trailing commas, double quotes
- Pre-commit hooks enforce linting (run `pnpm lint` before committing)

### Import Order
- Enforced by `simple-import-sort` ESLint plugin
- External deps → relative imports → side-effect imports
- Violations auto-fixed by `pnpm lint:fix`

### Path Aliases
- `@/*` resolves to `./src/*` (configured in `tsconfig.json` and `vite.config.ts`)
- Use `@/` imports for all local code

## Important Gotchas

1. **Vercel deploy author gate**: See `DEPLOYMENT.md` — redeploy or merge with authorized account
2. **Edge function deploys are manual**: `supabase functions deploy` needed after changes; no CI pipeline
3. **Dev server proxy**: The Vite dev server proxies `/go-api` requests to `http://localhost:8080`. The Go backend must be running locally for API calls to work in dev
4. **Env vars are baked at build time**: `VITE_*` vars are injected at build, not runtime — redeploy to change them
5. **Phone visibility context**: Phone numbers have a shared visibility toggle via `PhoneVisibilityProvider` — check context if adding phone display
6. **pnpm strict mode**: Some deps won't build on Vercel unless explicitly allowed in `pnpm-workspace.yaml`
7. **Dual auth stack**: Auth flows support both Go and Supabase (feature-gated); new flows use Go, fallback to Supabase
8. **Completion logic duplication**: Payment completion pipeline exists in 3 places (`payment-callback`, `_shared/complete-payment.ts`, `src/constants/courses.ts`) — keep in sync
9. **Phone normalization inconsistency**: DB stores phones in 4 variants (raw 10-digit, `+91…`, etc.); queries match on all formats
10. **No-show fee policy**: ₹300 charged if rescheduling <10 hours before; appeals allow waiver/reversal by admin

## Testing

No test framework is currently set up. To add tests, consider:
- **Unit/Integration**: Vitest (lightweight, Vite-native)
- **Component**: React Testing Library (already in React ecosystem)
- **E2E**: Playwright or Cypress

## Debugging & Troubleshooting

- **Payment stuck**: Use `recover-razorpay-payment` edge function in admin LearnerIssueFixer page
- **Edge function not deployed**: Always run `supabase functions deploy` after `supabase/functions/*` changes
- **Feature flag not applying**: Check `isFeatureEnabled()` cache (2-min TTL) and backend flag config
- **Go auth failing**: Backend must be running locally (`http://localhost:8080`); check env `VITE_BACKEND_API`
- **Phone masking not working**: Verify `PhoneVisibilityProvider` is in app tree and permission `view_unmasked_phone_numbers` is set

## Sales Dashboard Slot Booking Feature

**Status**: ✅ IMPLEMENTED & PRODUCTION-READY

### Overview
The Sales Dashboard now includes integrated tentative slot booking functionality. Sales agents can search for instructors by location, view their availability calendar, and create provisional (tentative) lesson blocks directly from the dashboard.

### Key Components
- **TentativeBookingModal** (`src/components/admin/sales-dashboard/TentativeBookingModal.tsx`): Form for collecting customer and booking details
- **SlotCell Double-Click Handler** (`src/routes/admin/SalesDashboard.tsx`): Triggers tentative booking flow on double-click
- **1-Hour Block Validator** (`src/lib/sales-dashboard/availability.ts::validateOneHourBlock()`): Ensures full 1-hour slot availability before allowing booking

### How It Works
1. **Single-click** on a 30-minute slot → Shows slot info popup (existing behavior)
2. **Double-click** on a FREE 30-minute slot → Opens TentativeBookingModal
3. Modal validates 1-hour block availability and collects:
   - Customer name, phone (auto-normalized)
   - Sales agent name
   - Payment status (unpaid/half paid/full paid)
   - Customer address
   - Course selection (7 options: demo, 4-6-10-15-20 class courses)
4. On submit → Creates `Schedule` row with:
   - `isTentative = true`
   - `status = 'hold'`
   - `tentative_details` JSON with all customer info
5. Calendar refreshes; slot now shows as tentative/orange
6. Users can create multiple tentative blocks per customer

### Database Integration
- Uses existing `Schedule` table
- Leverages `isTentative` boolean flag and `tentative_details` JSON column
- No new tables required
- Reuses tentative_details schema for consistency with existing Admin Tentative Management flow

### Important Notes
- **Sales-only creation**: This dashboard creates TENTATIVE blocks only, never confirmed bookings
- **Operations approval required**: Tentative blocks become confirmed/booked only after Operations team verifies customer (LL/DL, location match, onboarding) via existing workflows
- **Multiple slots supported**: One customer can have 4-5+ tentative slots across different dates/instructors
- **Reuses existing patterns**: All validation, availability calculation, and database interactions follow established app conventions

### Architecture
```
Sales Dashboard Grid (30-min slots)
  ↓ double-click FREE slot
  → validateOneHourBlock() checks if [start, start+30] both free
  ↓ if available
  → TentativeBookingModal opens
  → User fills form + submits
  ↓
  → Creates Schedule{isTentative:true, tentative_details:{...}}
  ↓
  → Dashboard reloads via reload() callback
  → Slot displays as tentative (existing CSS)
```

### Performance Considerations
- Modal renders only when open
- Double-click handler uses useCallback to prevent re-renders
- Validator runs in O(1) via freeGrid Map lookup
- No new API calls or edge functions needed (uses existing Supabase insert)

### Files Involved
- `src/components/admin/sales-dashboard/TentativeBookingModal.tsx` (370 lines, new)
- `src/lib/sales-dashboard/availability.ts` (+30 lines, new validateOneHourBlock function)
- `src/routes/admin/SalesDashboard.tsx` (+60 lines, modal state + handler)
- All changes maintain backward compatibility with existing Sales Dashboard features

### Testing Notes
- Build succeeds with no new TypeScript errors
- ESLint passes (zero errors)
- Phone normalization uses existing `normalizePhone()` utility
- Form validation prevents empty/invalid submissions
- Success toast auto-closes after 1.5s
- Grid refresh ensures UI stays in sync with database

## Additional Resources

- `README.md` — Quick start
- `DEPLOYMENT.md` — Deployment specifics and gotchas
- `ADMIN_FLOW_ANALYSIS.md` — Admin feature documentation
- `docs/Game_Analytics.md` — Learning analytics system
- `API_Documentation/` — API call map, edge function report, learner/instructor deep-dives
