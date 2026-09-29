# RETINOVA — Complete UI/UX Redesign & Real Backend Integration Audit
**Document ID:** `AUDIT-UI-REDESIGN-001`  
**Date:** September 2026  
**Status:** Canonical Reference Architecture Audit  
**Author:** RETINOVA Platform Architecture Team  

---

## 1. Executive Summary

This audit assesses the state of the RETINOVA platform across frontend presentations, mobile edge client architecture, backend API services, multi-tenant isolation mechanisms, AI workflow engines, and design system tokens. 

The primary finding is that while the underlying Express + TypeScript backend, multi-tenancy layer, RBAC, offline SQLite synchronization, and Swin V2 Tiny AI pipeline are solid and verified (22 automated integration tests passing), the current web dashboard (`dashboardHtml.ts`) suffers from an "AI-generated dashboard" presentation—replete with artificial demo buttons, synthetic metrics, vendor superadmin badges, and misleading customer labels. 

This audit establishes the baseline required to unify the web management platform with the existing Figma-crafted, clinical aesthetic of the RETINOVA Android application into **one cohesive, authentic enterprise product family**.

---

## 2. Existing Frontend Presentation Layer

| Frontend Surface | Technology Stack | Location | Status & Current Role |
| :--- | :--- | :--- | :--- |
| **Mobile Edge Client** | React Native 0.86 / Expo 57 / TypeScript | `mobile-app/src` | Primary field screening application for ASHAs and ophthalmologists. Includes on-device Swin V2 Tiny inference, Room/SQLite storage, camera triage, and offline sync queue. |
| **Figma Design Reference** | React 19 / Vite / Tailwind v4 | `figma-source/src` | High-fidelity clinical design implementation with typography tokens (`DM Serif Display`, `Source Sans 3`, `JetBrains Mono`), warm clinical background (`#F4EFE8`), and Figma-grade hierarchy. |
| **Command Center Dashboard** | Server-rendered HTML/JS bundle | `backend/src/dashboard/dashboardHtml.ts` | Accessible at `/dashboard`. Suffers from artificial "Guided Sales Demo" controls, synthetic metrics, and generic dark dashboard styling. **Target for replacement.** |
| **Commercial Landing Page** | Server-rendered HTML/JS | `backend/src/dashboard/landingHtml.ts` | Accessible at `/` and `/landing`. Serves product positioning and platform specifications. |
| **Sideload & APK Portal** | Server-rendered HTML/JS | `backend/src/dashboard/installHtml.ts` | Accessible at `/install`. Provides instant QR code download for `NetraAI_ASHA.apk` and direct web app launch. |
| **Exported Web SPA** | Expo Web Bundle | `mobile-app/dist` | Serves client routes at `/app`. Rebuilt with active LAN IP and Offline Field Mode support. |

---

## 3. Existing Backend Architecture & Services

The backend runs on Node.js / Express with TypeScript, structured around modular controllers, services, and middlewares:

* **Entry Point (`backend/src/index.ts`)**: Initializes database store, seeds sample fundus and Grad-CAM assets, mounts API routers, hosts static uploads, serves dashboard/landing/install portals, and acts as SPA fallback host for `/app`.
* **Database Layer (`backend/src/db/store.ts`)**: In-memory and persisted JSON datastore (`data/db.json`) implementing transactional operations for multi-tenant organizations, users, registered devices, AI workflows, models, screenings, patients, facilities, and audit trails.
* **AWS Cloud Gateway (`backend/src/services/awsService.ts`)**: Real AWS DynamoDB, S3, and SNS synchronization layer with local mock fallback for offline development.
* **AI Workflow Engine (`backend/src/services/aiWorkflowEngine.ts`)**: Pluggable multi-vertical workflow runner supporting `retinal_dr_swinv2` (Healthcare) and `asset_damage_v1` (Insurance).
* **Model Lifecycle Manager (`backend/src/services/modelManager.ts`)**: Version control, OTA updates, and rollback mechanism for edge AI models.

---

## 4. Existing REST API Inventory

All endpoints listed below are active, tested, and ready for frontend integration:

### 4.1 Authentication & Multi-Tenant Platform APIs (`/api/platform/*`)
* `POST /api/platform/auth/login`: Real JWT login returning organization scope and RBAC role.
* `GET /api/platform/auth/me`: Validates session token and returns active user and tenant configuration.
* `GET /api/platform/auth/demo-users`: Returns list of seeded demo users across roles for fast switching.
* `GET /api/platform/organizations`: Returns all organizations for `PLATFORM_ADMIN`, or scoped organization for tenant users.
* `GET /api/platform/organizations/:orgId`: Scoped organization metadata and configuration.
* `POST /api/platform/organizations`: Creates new tenant organization (`PLATFORM_ADMIN` only).
* `PATCH /api/platform/organizations/:orgId`: Updates organization settings, workflows, and quotas.
* `GET /api/platform/organizations/:orgId/usage`: Quota utilization (devices, users, events, storage).
* `GET /api/platform/organizations/:orgId/users`: Lists organization personnel.
* `POST /api/platform/organizations/:orgId/users`: Provisions user into an organization.
* `GET /api/platform/devices`: Fleet device inventory (scoped by organization).
* `GET /api/platform/devices/:deviceId`: Device telemetry, model version, and heartbeat status.
* `POST /api/platform/devices/register`: Provisions a new edge device.
* `PATCH /api/platform/devices/:deviceId`: Updates device status, assigned facility, or active model.
* `POST /api/platform/devices/:deviceId/heartbeat`: Ingests device heartbeat and connectivity state.
* `GET /api/platform/workflows`: Returns registered AI workflows (`retinal_dr_swinv2`, `asset_damage_v1`, etc.).
* `POST /api/platform/workflows/:workflowId/execute`: Executes vertical workflow on uploaded payload.
* `GET /api/platform/models`: Model registry with deployment status, accuracy, and rollback targets.
* `POST /api/platform/models/activate`: Deploys model version globally or per tenant.
* `GET /api/platform/plans`: Lists subscription plans (`BASIC`, `PRO`, `ENTERPRISE`).
* `POST /api/platform/organizations/:orgId/plan`: Updates tenant subscription tier.
* `GET /api/platform/maintenance/overview`: AMC tracking, calibration alerts, and warranty status.
* `POST /api/platform/organizations/:orgId/renew-amc`: Extends annual maintenance contract.
* `GET /api/platform/audit-logs`: Immutable system audit trail.
* `GET /api/platform/reports/generate`: Generates executive compliance and screening summary reports.

### 4.2 Edge Detection & AWS Sync APIs (`/api/detections/*`)
* `POST /api/detections/sync`: Idempotent edge detection synchronization. Updates device telemetry and dispatches critical SNS alerts.
* `GET /api/detections`: Retrieves paginated detection history with severity, device, and tenant filtering.
* `GET /api/detections/overview`: Real-time KPI summary computed directly from active detection records.

### 4.3 Clinical Screening APIs (`/api/*`)
* `POST /api/screen`: Multipart fundus upload and AI inference execution.
* `GET /api/screenings`: Lists patient screening history.
* `GET /api/screenings/:id`: Detailed screening record with Grad-CAM and diagnostic evidence.
* `POST /api/screenings/:id/referral`: Submits reviewing doctor clinical disposition.
* `GET /api/patients`: Lists patient registry.
* `POST /api/patients`: Registers new screening patient.
* `GET /api/reports/:screeningId/html`: Clinical diagnostic report in HTML format.
* `GET /api/facilities`: Lists rural Primary Health Centres (PHCs).

---

## 5. Existing Security, RBAC & Tenant Isolation

* **JWT Bearer Authentication**: Signed tokens containing `id`, `email`, `role`, and `organization_id`. Expiration: 7 days.
* **Role Hierarchy**:
  * `PLATFORM_ADMIN`: Vendor platform administrator with global visibility across all tenants.
  * `ORG_ADMIN`: Organization administrator managing local devices, personnel, and billing.
  * `DOCTOR` / `REVIEWER`: Clinical reviewing ophthalmologist or claims specialist.
  * `OPERATOR` / `HEALTHCARE_WORKER`: Field screener or claims inspector capturing edge data.
  * `VIEWER`: Read-only operational stakeholder.
* **Server-Enforced Tenant Isolation**: `enforceTenantIsolation` middleware strictly checks `req.platformUser.organization_id === target_organization_id` on all organization routes. Cross-tenant leakage is blocked at HTTP layer.

---

## 6. Existing Mobile App Design Language & Reusable Tokens

Inspection of `figma-source/src/index.css` and `mobile-app/src/utils/constants.ts` reveals the unified RETINOVA visual identity:

### 6.1 Typography
* **Display Font**: `'DM Serif Display', Georgia, serif` — Used for headings, clinical grades, and institutional titles.
* **Body Font**: `'Source Sans 3', system-ui, sans-serif` — Used for labels, body copy, and UI controls.
* **Monospace Font**: `'JetBrains Mono', monospace` — Used for IDs, timestamps, model versions, and latency.

### 6.2 Color Palette
* **Backgrounds**: Base canvas `#F4EFE8` (warm linen), Surface `#FFFFFF` (crisp white card), Raised `#FDFAF7`.
* **Primary Navy**: `#0F1E36` (navy-900), `#152845` (navy-800 — primary text), `#1A3254` (navy-700), `#1E3A63` (navy-600).
* **Accent Teal**: `#0D5E5E` (teal-800 — primary action button), `#0F7070` (teal-700), `#D4EEEE` (teal-100), `#EAF6F6` (teal-50).
* **Clinical Severity / Status**:
  * Urgent / Referral / High: `#8B1A2B` (maroon-700) on `#FDF0F2` (maroon-50) / `#F5D5DA` (maroon-100).
  * Warning / Moderate: `#B45309` (amber-700) on `#FFFBEB` (amber-50) / `#FEF3C7` (amber-100).
  * Normal / Low / Success: `#15653A` (green-700) on `#ECFDF5` (green-50) / `#D1FAE5` (green-100).
  * Slate Muted: `#334155` (slate-700), `#64748B` (slate-500), `#94A3B8` (slate-400), `#E2E8F0` (slate-200).
* **Borders**: `#DDD5C8` (standard border), `#EDE8E0` (subtle inner divider).

### 6.3 Spacing & Radius
* **Base Unit**: 8px grid (4px, 8px, 12px, 16px, 20px, 24px, 32px, 48px).
* **Radius Tokens**: `radius-sm` (4px), `radius-md` (8px), `radius-lg` (12px), `radius-xl` (16px), `radius-full` (9999px).
* **Shadows**: Restrained and subtle: `0 1px 3px rgba(15,30,54,0.06), 0 1px 2px rgba(15,30,54,0.04)`.

---

## 7. Redesign Strategy & Implementation Plan

### 7.1 What Must Be Removed
1. ❌ "GUIDED SALES DEMO" bar and synthetic simulation speed toggles.
2. ❌ "Reset Demo Baseline" in customer UI.
3. ❌ Fake enterprise customer names (`National Rural Health Mission`, `Apex Casualty Underwriters`, etc.) that misrepresent demo records as production contracts.
4. ❌ Artificial business metrics (e.g. "₹18.4 Lakh savings", "99.8% fleet health") not backed by real API queries.
5. ❌ Dense spreadsheets and technical debug labels ("Decoupled AWS Sync", "OTA Model Lifecycle").

### 7.2 What Must Be Built
1. ✅ **Unified Application Shell**:
   * Fixed clean left sidebar with RETINOVA logo, section links, help, user profile, and tenant switch.
   * Top bar with organization context, workspace switcher, and user avatar.
2. ✅ **Platform Admin Workspace**:
   * Real operational summary from backend (`/api/platform/organizations`, `/api/platform/devices`, `/api/platform/maintenance/overview`).
   * Clean card-based organization directory.
3. ✅ **Dedicated Demo Organizations (Explicitly Labelled)**:
   * `RETINOVA Healthcare Demo` (Diabetic Retinopathy Screening — `retinal_dr_swinv2`).
   * `RETINOVA Insurance Demo` (Asset Damage Assessment — `asset_damage_v1`).
   * Clearly marked with `DEMO WORKSPACE` badges.
4. ✅ **Doctor Clinical Review Experience**:
   * Interactive case queue, image viewer, Swin V2 inference trigger, Grad-CAM heatmap visualization, clinical disposition input, and PDF/HTML report download.
5. ✅ **Insurance Claims Inspection Experience**:
   * Interactive claims queue, damage assessment evidence, reviewer determination, and repair cost estimation.
6. ✅ **Frontend Service Layer**:
   * Modular API client with authentication, token refresh, error interceptors, and strict typing.
7. ✅ **Demo Seed Architecture**:
   * Dedicated `seed/demoTenants.ts` seeding demo data marked with `isDemo: true`, callable via `npm run seed:demo`.

---
*Audit approved for immediate execution.*
