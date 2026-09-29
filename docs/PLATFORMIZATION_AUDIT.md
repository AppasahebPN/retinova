# RETINOVA Platformization Audit & System Architecture Baseline
## Transition from Single-Purpose Prototype to Scalable Multi-Tenant B2B/B2G Platform

---

## 1. Executive Summary & Audit Mandate

The RETINOVA codebase currently incorporates a functional end-to-end prototype consisting of:
* An installable Android release APK (`mobile-app/NetraAI_ASHA.apk`, 82.9 MB) with on-device Swin Transformer V2 Tiny inference, local Room/SQLite-equivalent persistence, and an autonomous decoupled `SyncManager`.
* A Node.js/Express backend (`backend/`) equipped with an AWS Cloud Gateway bridge (DynamoDB ingestion, S3 evidence handling, SNS escalation) and a real-time Command Center Web Dashboard.
* A deep learning retinal screening pipeline (`ai-pipeline/`) with Image Quality Assessment (IQA), CLAHE enhancement, vessel/lesion segmentation, and Swin V2 Tiny classification weights (`best_model.pt`, 316 MB).
* Comprehensive architecture, unit economics, and 30-hour demonstration documentation.

**Objective**: Transform RETINOVA into a multi-tenant B2B/B2G Edge AI Platform enabling diverse organizations (Healthcare, Insurance, Government, Industrial/Security) to configure custom AI workflows, manage fleets of edge nodes, operate without continuous internet, and synchronize securely with multi-tenant cloud infrastructure—**without breaking or refactoring any existing working functionality**.

---

## 2. Comprehensive Subsystem Audit

### A. Existing Working Features
| Subsystem | Component | Status | Operational Capabilities |
| :--- | :--- | :---: | :--- |
| **Mobile App** | `LoginScreen.tsx` | Working | Role-based authentication (ASHA Worker, Doctor, District Admin) with token handling. |
| **Mobile App** | `HomeScreen.tsx` | Working | Operational metrics, patient queues, and real-time Edge AI & Sync telemetry widget. |
| **Mobile App** | `ImageCaptureScreen.tsx` | Working | Camera integration via `expo-image-picker` with native permissions (`android.permission.CAMERA`). |
| **Mobile App** | `ProcessingScreen.tsx` | Working | On-device Edge AI analysis using `EdgeSwinV2Model` without network calls, saving to local DB. |
| **Mobile App** | `ScreeningResultScreen.tsx` | Working | Renders DR severity, calibrated confidence, risk gauge, and specialist referral recommendations. |
| **Mobile App** | `EvidenceScreen.tsx` | Working | Visual attribution heatmaps (Grad-CAM), vessel density, and candidate lesion overlays. |
| **Mobile App** | `SettingsScreen.tsx` | Working | Device telemetry (`DEV-EDGE-XXX`), model version, sync queue counters, server connectivity. |
| **Edge Engine** | `aiModel.ts` | Working | Modular `AIModelInterface` executing 100% offline Swin V2 Tiny inference in $<250\text{ ms}$. |
| **Local Store** | `localDatabase.ts` | Working | Persistent offline queue (`PENDING`, `SYNCING`, `SYNCED`, `FAILED`) with idempotent deduplication. |
| **Sync Engine** | `syncManager.ts` | Working | Autonomous decoupled background sync thread with network availability detection. |
| **Backend API** | `backend/dist` | Working | Express API daemon active on port `5000` with JWT auth, file uploads, and sample asset generator. |
| **Cloud Bridge**| `awsService.ts` | Working | DynamoDB ingestion store, S3 evidence paths, automated SNS topic alerts for high severity. |
| **Web Console** | `dashboardHtml.ts` | Working | Real-time Tailwind CSS Command Center at `/dashboard` with auto-polling every 4 seconds. |
| **Sideloading** | `installHtml.ts` | Working | Dynamic QR code download and installation manual portal at `/install`. |

---

### B. Existing APIs
| Method | Endpoint | Handler | Purpose |
| :--- | :--- | :--- | :--- |
| `GET` | `/health` | `index.ts` | Instant network availability check for `SyncManager`. |
| `GET` | `/dashboard` | `index.ts` | Live Command Center Web Dashboard. |
| `GET` | `/install` | `index.ts` | Scannable QR code portal for mobile APK sideloading. |
| `GET` | `/download/apk` | `index.ts` | High-speed binary distribution of `NetraAI_ASHA.apk`. |
| `POST` | `/api/detections/sync` | `detectionRoutes.ts` | Ingestion of edge detection events into DynamoDB with idempotent check. |
| `GET` | `/api/detections` | `detectionRoutes.ts` | Detection event stream with filtering by device and severity. |
| `GET` | `/api/detections/overview` | `detectionRoutes.ts` | Platform KPI aggregation (devices online/offline, today's detections, alerts). |
| `GET` | `/api/devices` | `detectionRoutes.ts` | Live edge device registry and health status. |
| `POST` | `/api/detections/presigned-url`| `detectionRoutes.ts` | Secure S3 presigned PUT URL generation for evidence upload. |
| `GET` | `/api/alerts` | `detectionRoutes.ts` | High/Critical severity notification feed. |
| `POST` | `/api/auth/login` | `authRoutes.ts` | User login and JWT session generation. |
| `GET` | `/api/screenings` | `screeningRoutes.ts` | Historical screening records listing. |
| `GET` | `/api/screenings/:id` | `screeningRoutes.ts` | Detailed screening dossier with explainability evidence. |

---

### C. Existing AWS Resources
* **Amazon DynamoDB**: `RetinovaDetectionEvents` table tracking `event_id`, `device_id`, `timestamp`, `detection_type`, `confidence`, `severity`, `latitude`, `longitude`, `model_version`, `s3_object_key`.
* **Amazon S3**: Private `retinova-evidence-vault` bucket configured with AES-256 server-side encryption, public access block, and 90-day Glacier lifecycle.
* **Amazon SNS**: `RetinovaCriticalAlerts` topic triggering urgent notifications on `HIGH` or `CRITICAL` findings.
* **Amazon API Gateway**: Serverless HTTP API specification defined in [aws/template.yaml](file:///c:/Users/Appasaheb/OneDrive/Desktop/app/aws/template.yaml).
* **AWS Lambda**: [syncHandler.ts](file:///c:/Users/Appasaheb/OneDrive/Desktop/app/aws/lambda/syncHandler.ts) and [eventsHandler.ts](file:///c:/Users/Appasaheb/OneDrive/Desktop/app/aws/lambda/eventsHandler.ts).

---

### D. Existing Database Schema
The database currently operates with an in-memory/file-backed persistent JSON store (`data/db.json` via `DatabaseStore` in `backend/src/db/store.ts`):
* `users`: `id`, `email`, `password_hash`, `full_name`, `role` (`admin`, `healthcare_worker`, `doctor`, `district_manager`), `facility_id`, `is_active`, timestamps.
* `facilities`: `id`, `name`, `district`, `state`, `type`, `latitude`, `longitude`, `active_cameras`, `contact_phone`.
* `patients`: `id`, `patient_code`, `name`, `age`, `gender`, `phone`, `location`, `diabetes_duration_years`, `facility_id`.
* `screenings`: `id`, `patient_id`, `facility_id`, `eye`, `status`, `classification`, `quality`, `segmentation`, `explainability`, `referral`.
* `auditLogs`: `id`, `user_id`, `action`, `entity`, `entity_id`, `timestamp`, `metadata`.

---

### E. Existing Authentication
* **JWT Token Authentication**: Session tokens generated with `jsonwebtoken` using `config.jwtSecret`, expired in 7 days.
* **Role Verification Middleware**: `authenticateToken` and `authorizeRoles(...allowedRoles)` in `backend/src/middleware/auth.ts`.
* **Demo Bypasses**: `x-demo-role` header supported for rapid hackathon testing.

---

### F. Existing AI Model
* **Model**: Swin Transformer V2 Tiny (`SwinV2TinyDR`).
* **Input**: $512 \times 512$ RGB, normalized with ImageNet mean `[0.485, 0.456, 0.406]` and std `[0.229, 0.224, 0.225]`.
* **Checkpoint**: `ai-pipeline/module4_Grading_Final/checkpoints/best_model.pt` (316 MB).
* **Dual Heads**: Binary referable DR logit ($G \ge 2$) + 5-grade ICDR severity logits.
* **On-Device Edge Engine**: `mobile-app/src/services/aiModel.ts` implementing `AIModelInterface` with temperature calibration ($T = 1.341$).

---

### G. Existing Offline Functionality
* Full offline triage in `ProcessingScreen.tsx`: AI executes locally without network access.
* Local persistent SQLite queue in `localDatabase.ts`: Records stored with `syncStatus: "PENDING"`.
* Decoupled `SyncManager`: Continuously watches network state, performs batch synchronization upon reconnection, and updates status to `"SYNCED"` without dropping any records.

---

### H. Existing Dashboard
* Real-time HTML5 / Tailwind CSS Command Center at `/dashboard`.
* Top KPI metrics: Devices Online, Devices Offline, Today's Detections, Pending Sync, Critical Alerts.
* Live events table auto-refreshing every 4 seconds.
* Device fleet status list and geographical coordinate nodes.

---

### I. Existing Deployment Mechanism
* Standalone Android APK (`NetraAI_ASHA.apk`, 82.9 MB) with Hermes bytecode runtime.
* Automated local Wi-Fi hosting via Express `/download/apk` and `/install`.
* EAS configuration in `mobile-app/eas.json` for cloud builds.

---

## 3. Platformization Gap Analysis: Prototype vs Enterprise B2B Platform

| Architecture Area | Prototype State | Enterprise Multi-Tenant Platform Required |
| :--- | :--- | :--- |
| **Multi-Tenancy** | Single implicit tenant (Public Healthcare / NetraAI). No `organization_id` partitioning. | Strict tenant isolation. Every user, device, event, and configuration belongs to an `organization_id`. Cross-tenant access blocked at data-access layer. |
| **Organization Management**| None. Facilities are hardcoded rural PHCs. | Dedicated Organization model (`organization_id`, `organization_name`, `organization_type`, `subscription_plan`, `status`, `configuration`). Admin CRUD APIs. |
| **Role-Based Access Control**| 4 roles: `admin`, `healthcare_worker`, `doctor`, `district_manager`. | 5 standard platform roles: `PLATFORM_ADMIN`, `ORG_ADMIN`, `OPERATOR`, `REVIEWER`, `VIEWER` with granular permission checks. |
| **Device Fleet Management**| Implicit discovery on event sync. | Formal Device Registration (`device_id`, `organization_id`, `device_name`, `device_type`, `status`, `app_version`, `model_version`, `last_seen`). Remote disable/enable. |
| **AI Workflow Extensibility**| Hardcoded to Retinal Diabetic Retinopathy screening. | Modular `AIWorkflow` engine supporting multiple verticals: Healthcare (Retinal DR), Insurance (Asset/Damage), Government (Field Monitoring), Security (Perimeter Detection). |
| **Configuration & White-Label**| Hardcoded UI titles and thresholds. | Tenant-specific config: enabled workflows, confidence thresholds, severity escalation rules, custom logo/branding. |
| **Subscription & Licensing**| Theoretical pricing framework only. | Plan metadata (`BASIC`, `PRO`, `ENTERPRISE`), device limits, storage limits, and real-time usage tracking. |
| **Maintenance / AMC**| No version tracking or update lifecycle. | Maintenance module tracking software versions, model versions, update requirements, device health, and AMC expiration dates. |
| **Model Version Management**| Single static model version string. | Model registry (`model_id`, `version`, `workflow`, `checksum`, `status`, `release_notes`) with client update & rollback safety. |
| **Dashboard Structure**| Single unified command center. | Dual-level dashboards: 1) System-wide **Platform Admin Console**, 2) Tenant-isolated **Organization Workspace** tailored by vertical. |
| **Audit Logging**| Basic internal audit log array. | Structured audit event stream tracking actor, organization, action, timestamp, target, and metadata. |

---

## 4. Platformization Architecture & Implementation Strategy

To ensure zero downtime and 100% backward compatibility:
1. **Preserve Legacy APIs**: Existing routes (`/api/detections/sync`, `/api/detections`, `/api/screenings`) will continue functioning without breaking existing mobile clients. If no `organization_id` is passed, the system defaults to the pre-seeded flagship healthcare organization (`org_retinova_health`).
2. **Upgrade Data Store**: Expand `DatabaseStore` to support `organizations`, `devices`, `aiWorkflows`, `modelRegistry`, `subscriptionPlans`, and `tenantConfigs`.
3. **Data-Access Layer Isolation**: Enforce tenant boundaries in `DatabaseStore` and `AWSService` so that any query without `PLATFORM_ADMIN` permissions is strictly scoped to `WHERE organization_id = req.user.organization_id`.
4. **Modular Workflow Registry**: Formalize the `AIWorkflow` interface in TypeScript with pluggable handlers for Healthcare, Insurance, Government, and Security.
5. **Unified Web Console**: Upgrade `/dashboard` to include a tenant selector and role toggle, allowing instant inspection of both the Global Platform Admin view and isolated Organization Workspaces.
