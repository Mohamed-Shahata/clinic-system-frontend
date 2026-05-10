# Clinic CMS — Frontend

> A production-ready multi-tenant SaaS dashboard for managing medical clinics, built with Next.js 15 App Router, TypeScript, and Tailwind CSS — with full Arabic/English bilingual support and RTL layout.

---

## Table of Contents

- [Project Overview](#project-overview)
- [Key Features](#key-features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Routing & Role-based Access](#routing--role-based-access)
- [Pages Reference](#pages-reference)
- [Component Architecture](#component-architecture)
- [Internationalization (i18n)](#internationalization-i18n)
- [Authentication Flow](#authentication-flow)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Demo Credentials](#demo-credentials)

---

## Project Overview

Clinic CMS Frontend is a **role-based multi-tenant dashboard** built on top of Next.js 15 App Router. It serves three distinct user personas — Doctor Admin, Receptionist, and Super Admin — each seeing a fully different UI tailored to their workflow.

The app is fully bilingual (Arabic / English) with automatic RTL switching, and uses server components for data fetching combined with client components for interactivity — following the modern Next.js hybrid rendering model.

---

## Key Features

- **Multi-role UI** — three completely separate dashboard layouts driven by the authenticated user's role and clinic context
- **Server + Client hybrid rendering** — pages fetch data server-side for instant load; interactive sections are client components with optimistic updates
- **Bilingual (AR / EN) with RTL** — `next-intl` handles routing, translations, and automatic `dir="rtl"` switching per locale
- **Live appointment queue** — the Workspace page polls the queue at a set interval, giving the doctor a real-time view of who's next
- **Prescription builder** — a rich form for writing prescriptions against the doctor's personal medication and imaging catalogs, with instant search
- **Patient file** — a unified view of a patient's full history: all visits, prescriptions (expandable), invoices, and file attachments
- **Subscription flow UI** — full payment-proof submission form, status tracking, and super-admin review dashboard
- **Doctor earnings dashboard** — monthly stats with revenue, patient counts, per-doctor earnings breakdown, and deduction details
- **Audit-safe invoice management** — invoices can only be edited/deleted by their issuer; the UI enforces this visually
- **Route-level access control** — Next.js middleware redirects unauthenticated users and enforces role-based route access before the page renders
- **Responsive design** — fully usable on desktop and tablet screen sizes

---

## Tech Stack

| Technology | Version | Purpose |
|-----------|---------|---------|
| **Next.js** | 15.x | Framework — App Router, Server Components, middleware |
| **React** | 18.x | UI library — hooks, context, client components |
| **TypeScript** | 5.x | End-to-end type safety |
| **Tailwind CSS** | 3.x | Utility-first styling with custom design tokens |
| **next-intl** | 3.x | Internationalization, locale routing, RTL support |

---

## Architecture

### Rendering Strategy

The app uses Next.js App Router's hybrid model deliberately:

```
Page (Server Component)
  │
  ├── Fetches initial data from the backend API using the server-side JWT cookie
  │   → No loading flash, data is ready on first paint
  │
  └── Passes data as props to a Client Component (*-client-page.tsx)
        │
        ├── Owns all interactive state (filters, modals, forms, search)
        ├── Issues client-side fetch calls for mutations and refetches
        └── Renders child UI components
```

This keeps pages fast (no client-side waterfall for initial data) while keeping interactivity clean (no prop-drilling through server components).

### Data Flow

```
Browser
  │
  ├── Server Component (page.tsx)
  │     reads cookies → calls backend API → passes data down
  │
  └── Client Component (*-client-page.tsx)
        user action → fetch('/api/...') → re-render
```

API calls from client components hit Next.js route handlers (`/app/api/`) which proxy to the NestJS backend, forwarding the JWT cookie. This keeps the backend URL private and centralizes auth token forwarding.

### Middleware

`middleware.ts` runs before every request and handles:

1. **Locale detection** — redirects `/` to `/ar` or `/en` based on the `Accept-Language` header
2. **Auth guard** — reads the JWT cookie; redirects unauthenticated users to `/[locale]/login`
3. **Role routing** — after login, redirects each role to its correct dashboard entry point
4. **Public routes** — `/login` and `/forgot-password` are explicitly whitelisted

---

## Project Structure

```
src/
├── app/
│   ├── [locale]/                          # Locale-prefixed routes (ar | en)
│   │   ├── layout.tsx                     # Root layout — sets lang, dir, font
│   │   │
│   │   ├── login/
│   │   │   └── page.tsx                   # Login page (public)
│   │   │
│   │   ├── forgot-password/
│   │   │   └── page.tsx                   # OTP password reset (public)
│   │   │
│   │   └── (dashboard)/
│   │       ├── layout.tsx                 # Dashboard shell — sidebar, topbar, auth check
│   │       └── dashboard/
│   │           │
│   │           ├── doctor-admin/          # DOCTOR_ADMIN role routes
│   │           │   ├── workspace/         # Live examination room
│   │           │   ├── appointments/      # Appointment management
│   │           │   ├── patients/          # Patient list
│   │           │   │   └── [id]/          # Individual patient file
│   │           │   ├── billing/           # Invoices + earnings
│   │           │   ├── reports/           # Clinic analytics
│   │           │   ├── medications/       # Medication catalog management
│   │           │   ├── imaging/           # Imaging catalog management
│   │           │   ├── receptionists/     # Staff management
│   │           │   ├── subscription/      # Subscription status + renewal
│   │           │   └── settings/          # Clinic settings
│   │           │
│   │           ├── receptionist/          # RECEPTIONIST role routes
│   │           │   ├── appointments/      # Schedule management
│   │           │   ├── patients/          # Patient registration + search
│   │           │   ├── billing/           # Invoice issuance
│   │           │   └── settings/          # Account settings
│   │           │
│   │           └── super-admin/           # SUPER_ADMIN role routes
│   │               ├── clinics/           # All clinics overview
│   │               │   └── create/        # New clinic creation wizard
│   │               ├── directory/         # Platform user directory
│   │               ├── subscription-requests/  # Review payment requests
│   │               └── extend-subscription/    # Manual extension tool
│   │
│   └── api/                               # Next.js Route Handlers (API proxy)
│       ├── auth/                          # Login, logout, OTP endpoints
│       ├── appointments/                  # Appointment CRUD proxy
│       ├── patients/                      # Patient CRUD proxy
│       ├── prescriptions/                 # Prescription + catalog proxy
│       ├── billing/                       # Invoice + earnings proxy
│       ├── clinics/                       # Clinic management proxy
│       ├── notifications/                 # Notification proxy
│       └── users/                         # User + staff proxy
│
├── components/
│   ├── dashboard/                         # Feature-specific components
│   │   ├── workspace-client-page.tsx      # Live queue + prescription + invoice
│   │   ├── appointments-client-page.tsx   # Full appointment manager
│   │   ├── patient-search-list.tsx        # Searchable patient list → patient file
│   │   ├── patient-detail-client.tsx      # Full patient file (visits, Rx, invoices)
│   │   ├── prescription-form.tsx          # Prescription writing form
│   │   ├── billing-client-page.tsx        # Invoices table + earnings stats
│   │   ├── clinic-settings-client-page.tsx # Settings + working hours editor
│   │   ├── subscription-client-page.tsx   # Subscription status + request form
│   │   ├── super-admin-*.tsx              # Super-admin specific components
│   │   └── ...                            # Other feature components
│   │
│   ├── layout/
│   │   ├── sidebar.tsx                    # Role-aware navigation sidebar
│   │   ├── dashboard-shell.tsx            # Layout wrapper with topbar
│   │   └── notification-bell.tsx          # Unread count + dropdown
│   │
│   └── ui/                                # Shared design system primitives
│       ├── button.tsx
│       ├── input.tsx
│       ├── card.tsx
│       ├── modal.tsx
│       ├── badge.tsx
│       ├── select.tsx
│       ├── table.tsx
│       └── ...
│
├── lib/
│   ├── auth.ts                            # JWT cookie read/write, session helpers
│   ├── api.ts                             # Typed fetch wrapper with auth header injection
│   └── utils.ts                           # Date formatting, cn(), locale helpers
│
├── messages/
│   ├── ar.json                            # Arabic translations (full coverage)
│   └── en.json                            # English translations (full coverage)
│
├── types/
│   └── index.ts                           # Shared TypeScript types and interfaces
│
└── middleware.ts                          # Auth guard + locale redirect + role routing
```

---

## Routing & Role-based Access

### URL Structure

All routes are prefixed with the active locale:

```
/ar/dashboard/doctor-admin/workspace
/en/dashboard/receptionist/appointments
/ar/dashboard/super-admin/clinics
```

### Access Control Matrix

| Route Prefix | Allowed Roles | Redirect if unauthorized |
|-------------|--------------|--------------------------|
| `/dashboard/doctor-admin/*` | `DOCTOR_ADMIN` | `/login` |
| `/dashboard/receptionist/*` | `RECEPTIONIST` | `/login` |
| `/dashboard/super-admin/*` | `SUPER_ADMIN` | `/login` |
| `/login`, `/forgot-password` | Public (redirect if logged in) | Role's dashboard |

Role enforcement happens in two places:

1. **`middleware.ts`** — first line of defense; redirects before the page renders
2. **Dashboard shell layout** — verifies the decoded token role matches the route prefix; renders an access-denied state if not

---

## Pages Reference

### Doctor Admin

#### Workspace — `/dashboard/doctor-admin/workspace`

The core of the doctor's daily flow. Everything needed for a patient encounter is in one place:

- **Live queue panel** — polls the API every N seconds; shows all patients currently IN_QUEUE or IN_PROGRESS with their status badge and wait time
- **Patient encounter panel** — activates when the doctor calls a patient (sets status to IN_PROGRESS); shows patient info, medical notes, and visit history inline
- **Prescription form** — search the personal medication catalog, add medications with dose/frequency/duration, add lab test requests, add imaging orders, write diagnosis and notes
- **Invoice form** — issue the visit invoice (cash/card/insurance) with line items; auto-calculates total
- **Complete encounter** — marks appointment as COMPLETED, locks the prescription, finalizes the invoice

#### Appointments — `/dashboard/doctor-admin/appointments`

- Full calendar-style list of appointments filterable by date, status, and doctor
- Inline status transitions (BOOKED → CHECKED_IN → IN_QUEUE)
- Create appointment modal with patient search, time slot, visit type, and notes
- Edit and cancel existing appointments
- Color-coded status badges for instant visual scanning

#### Patients — `/dashboard/doctor-admin/patients`

- Searchable patient list with instant client-side filtering (name, code, phone)
- Each row links directly to the patient's full file — no modal, full-page navigation

#### Patient File — `/dashboard/doctor-admin/patients/[id]`

A complete longitudinal patient record:

- **Header** — name, code, DOB, phone, medical notes (editable inline)
- **Visits tab** — all appointments with status, date, and visit type
- **Prescriptions tab** — all prescriptions in reverse-chronological order; each expands to show full medications list, requested tests, imaging, and diagnosis
- **Invoices tab** — all invoices with services breakdown and payment method
- **Attachments tab** — uploaded files (PDFs, images) with preview links and delete option

#### Billing — `/dashboard/doctor-admin/billing`

- **Invoices table** — all clinic invoices filterable by date range, payment method, and doctor
- **Earnings panel** — per-doctor breakdown of gross revenue, platform deduction (percentage or rent), and net earnings
- **Monthly stats** — total revenue, total patients, and daily bar chart for the selected month

#### Reports — `/dashboard/doctor-admin/reports`

- Clinic performance overview with date range selector
- Appointment completion rate, cancellation rate, no-show rate
- Revenue trend chart

#### Medications — `/dashboard/doctor-admin/medications`

- Doctor's personal medication catalog — name, dose, default frequency, duration, notes
- Add, edit, and soft-delete (deactivate) entries
- Active entries appear as quick-select options in the prescription form

#### Imaging — `/dashboard/doctor-admin/imaging`

- Doctor's personal imaging and radiology catalog — name, category (X-Ray, CT, MRI, Ultrasound, etc.), notes
- Add, edit, and delete entries
- Active entries appear as quick-select options in the prescription form

#### Receptionists — `/dashboard/doctor-admin/receptionists`

- List of all clinic staff with active/inactive status
- Create new receptionist account (name, email, phone, temporary password)
- Activate or deactivate existing staff members
- Shows last login and role badge

#### Subscription — `/dashboard/doctor-admin/subscription`

- Current plan details: name, start date, expiry date, days remaining
- Status indicator: ACTIVE (green) / EXPIRING SOON (yellow) / EXPIRED (red)
- Payment request form: select plan, enter transfer phone, upload payment screenshot
- History of past payment requests with their review status and any rejection reason

#### Settings — `/dashboard/doctor-admin/settings`

- Clinic name and slug (read-only after creation)
- Logo upload
- Working hours editor — toggle each day on/off, set open and close time per day
- Default locale selector (Arabic / English)

---

### Receptionist

#### Appointments — `/dashboard/receptionist/appointments`

- Same appointment list as the doctor's view — filtered to the receptionist's clinic
- Can create, edit, and cancel appointments
- Can advance status to CHECKED_IN (marks patient as physically arrived)
- Cannot access prescription or earnings sections

#### Patients — `/dashboard/receptionist/patients`

- Register new patients and search existing ones
- Can view and edit basic patient info (no access to medical notes)
- Links to patient file (visits and invoices visible; prescription content hidden)

#### Billing — `/dashboard/receptionist/billing`

- Issue invoices for patient visits
- View invoices they issued
- Cannot view the doctor earnings breakdown

#### Settings — `/dashboard/receptionist/settings`

- Update own display name, avatar, and contact info
- Change own password

---

### Super Admin

#### Clinics — `/dashboard/super-admin/clinics`

- Grid/list of all registered clinics with subscription status badge, expiry date, and active user count
- Quick-access links to extend subscription or deactivate a clinic

#### Create Clinic — `/dashboard/super-admin/clinics/create`

A multi-step wizard:
1. Clinic details (name, slug, locale, timezone)
2. Doctor admin account (name, email, phone, specialty, payment mode)
3. Subscription plan selection and initial activation

All three steps commit in a single backend transaction — either everything is created or nothing is.

#### Directory — `/dashboard/super-admin/directory`

- Searchable table of all users across all clinics
- Shows name, email, phone, role, clinic, and last login
- Filter by role or clinic

#### Subscription Requests — `/dashboard/super-admin/subscription-requests`

- All pending, approved, and rejected payment requests across all clinics
- Each request shows clinic name, plan, submission date, and payment screenshot
- Approve button → instantly activates/extends subscription + notifies doctor
- Reject button → opens modal for rejection reason → notifies doctor

#### Extend Subscription — `/dashboard/super-admin/extend-subscription`

- Select one clinic or all clinics
- Enter number of days to add
- Confirmation modal before applying
- Useful for trials, support credits, and bulk operations

---

## Component Architecture

Components are split into two categories:

### Page-level Client Components (`*-client-page.tsx`)

Each dashboard page has a corresponding client component that:
- Receives initial data as props from the server component
- Owns all local state (filters, modal visibility, selected records)
- Issues `fetch` calls for mutations and triggers re-fetches
- Is the single source of truth for the page's UI state

### Shared UI Primitives (`/components/ui/`)

A small internal design system with consistent props and styling:

| Component | Description |
|-----------|-------------|
| `Button` | Variants: primary, secondary, ghost, danger — with loading state |
| `Input` | Labeled input with error state and RTL-aware padding |
| `Select` | Dropdown with searchable option list |
| `Card` / `CardHeader` / `CardBody` | Consistent container with border and shadow |
| `Modal` | Accessible dialog with backdrop, close on Escape/click-outside |
| `Badge` | Status badges with semantic color mapping |
| `Table` | Responsive table with sortable columns |
| `Spinner` | Loading indicator used in async states |

---

## Internationalization (i18n)

The app uses **`next-intl`** for full bilingual support:

### Locale Routing

```
/ar/dashboard/...   → Arabic UI, dir="rtl"
/en/dashboard/...   → English UI, dir="ltr"
```

The `[locale]` segment in the App Router tree makes this automatic. The root layout reads the locale param and sets `<html lang={locale} dir={locale === 'ar' ? 'rtl' : 'ltr'}>`.

### Translation Files

All UI strings live in `messages/ar.json` and `messages/en.json`. Components use the `useTranslations()` hook:

```tsx
const t = useTranslations('appointments');
<h1>{t('title')}</h1>  // "المواعيد" in AR, "Appointments" in EN
```

### RTL Handling

Tailwind's `rtl:` variant is used for directional overrides (padding, margins, icon flipping). The sidebar, input icons, and table layouts all adapt automatically based on the document direction.

---

## Authentication Flow

### Login

```
User submits credentials
        │
        ▼
POST /api/auth/login  (Next.js Route Handler)
        │
        ▼
Proxy to NestJS backend → validate → return JWT
        │
        ▼
Route Handler sets HttpOnly cookie: "token"
        │
        ▼
Client redirected to role's dashboard entry point
```

### Session Persistence

The JWT is stored in an **HttpOnly cookie** — inaccessible to JavaScript, protecting against XSS. Every server component reads the cookie server-side. Every client-side fetch goes through Next.js Route Handlers which forward the cookie to the backend automatically.

### Logout

Clears the `token` cookie and redirects to `/[locale]/login`.

### Route Protection

```
Request to any /dashboard/* route
        │
        ▼
middleware.ts reads "token" cookie
        │
        ├── No token → redirect to /[locale]/login
        │
        └── Token present → decode (no verify, stateless check)
              │
              └── Role doesn't match route prefix → redirect to correct dashboard
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- The backend API running at `http://localhost:3001`

### Installation

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.local.example .env.local
# Set NEXT_PUBLIC_BACKEND_URL

# 3. Start development server
npm run dev
# → http://localhost:3000
```

### Available Scripts

```bash
npm run dev        # Start development server with hot-reload
npm run build      # Production build
npm run start      # Serve production build
npm run lint       # ESLint check
```

---

## Environment Variables

```env
# URL of the NestJS backend API
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001
```

---

## Demo Credentials

Start the backend, run `npx prisma db seed`, then log in with any of these accounts.
All accounts use the password: **`Password123!`**

| Name | Email | Role | Entry Point |
|------|-------|------|-------------|
| Platform Super Admin | `super@demo.test` | Super Admin | `/dashboard/super-admin/clinics` |
| Dr. Ahmed Salem | `dr.alpha@demo.test` | Doctor Admin | `/dashboard/doctor-admin/workspace` |
| Mai Abdullah | `rec.alpha@demo.test` | Receptionist | `/dashboard/receptionist/appointments` |
| Dr. Mona Khaled | `dr.beta@demo.test` | Doctor Admin | `/dashboard/doctor-admin/workspace` |
