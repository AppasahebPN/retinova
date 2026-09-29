# RETINOVA Enterprise Edge AI Platform Architecture

> **Core Proposition:** Detect Locally • Store Locally • Sync Intelligently • Monitor Centrally

---

## 1. Executive Summary

**RETINOVA** is an offline-first Edge AI platform that enables organizations to deploy specialized AI-powered workflows on mobile and edge devices, operate autonomously without continuous connectivity, and synchronize securely with centralized cloud infrastructure.

The platform is designed around the commercial philosophy:
```
BUILD PLATFORM ONCE
  ├── CONFIGURE/CUSTOMIZE AI WORKFLOW
  ├── DEPLOY TO ORGANIZATION
  ├── CHARGE IMPLEMENTATION + PLATFORM LICENSE + MAINTENANCE
  └── PROVIDE CONTINUOUS SOFTWARE / AI / CLOUD SUPPORT
```

Rather than building fragmented point-solutions, RETINOVA provides a unified multi-tenant architecture serving diverse industry verticals including Healthcare, Insurance, Government, and Industrial Security.

---

## 2. High-Level System Architecture

```
                             RETINOVA CLOUD COMMAND CENTER
                                (AWS ap-south-1 Gateway)
                                           │
          ┌────────────────────────────────┼────────────────────────────────┐
          │                                │                                │
 ┌─────────────────┐              ┌─────────────────┐              ┌─────────────────┐
 │ API Gateway +   │              │ DynamoDB Store  │              │ S3 Evidence     │
 │ Node.js Express │              │ (Multi-Tenant)  │              │ Vault (Private) │
 └────────┬────────┘              └────────┬────────┘              └────────┬────────┘
          │                                │                                │
          └────────────────────────────────┼────────────────────────────────┘
                                           │
                   ┌───────────────────────┴───────────────────────┐
                   │                                               │
                   ▼                                               ▼
         HTTPS / TLS 1.3 Sync                          HTTPS / TLS 1.3 Sync
       (Decoupled Sync Daemon)                       (Decoupled Sync Daemon)
                   │                                               │
    ┌──────────────┴──────────────┐                 ┌──────────────┴──────────────┐
    │     ORGANIZATION A NODE     │                 │     ORGANIZATION B NODE     │
    │ (Rural Healthcare Screening)│                 │ (Property/Motor Inspection) │
    ├─────────────────────────────┤                 ├─────────────────────────────┤
    │ • Android Smartphone / Tab  │                 │ • Mobile Adjuster Device    │
    │ • Swin V2 Tiny Edge Weights │                 │ • Asset Damage ONNX Model   │
    │ • Local SQLite / Room DB    │                 │ • Local SQLite / Room DB    │
    │ • Pending Sync Queue        │                 │ • Pending Sync Queue        │
    │ • Offline Inference Engine  │                 │ • Offline Inference Engine  │
    └─────────────────────────────┘                 └─────────────────────────────┘
```

---

## 3. Core Architectural Subsystems

### 3.1 Mobile & Edge Application Node
* **Form Factors:** Android smartphones, rugged field tablets, NVIDIA Jetson edge nodes.
* **On-Device Inference:** Local PyTorch / ONNX / TFLite runtime executing models entirely on CPU/NPU with `< 250ms` latency. Zero network round-trips required during edge capture.
* **Local Storage & State:** SQLite / Android Room local database storing patient/inspection records, inference outcomes, and Grad-CAM spatial heatmap evidence locally.
* **Autonomous Pending Queue:** Detections are committed immediately to the local database with `sync_status = 'PENDING'`.

### 3.2 Decoupled Synchronization Daemon
* **Network-Aware Sync:** Listens to system network connectivity changes (Wi-Fi, 4G, 5G).
* **Non-Blocking Operation:** Clinical screening and field inspections proceed uninterrupted even when the device is completely offline or traversing low-bandwidth zones.
* **Idempotent Ingestion:** Re-uploaded events (due to dropped ACKs or network retries) are recognized via immutable `event_id` keys without creating duplicate database records.

### 3.3 Multi-Tenant Cloud Backend
* **Data Access Layer Isolation:** Every API request verifies `user.organization_id` against the target entity. No cross-tenant data leakage is physically possible through API routes.
* **Role-Based Access Control (RBAC):** Hierarchical permissions governing `PLATFORM_ADMIN`, `ORG_ADMIN`, `OPERATOR`, `REVIEWER`, and `VIEWER`.
* **Telemetry & Fleet Management:** Centralized tracking of edge device heartbeat, battery level, free storage, connectivity status, app version, and active AI model.

### 3.4 Dual-Level Web Command Center
* **Level 1 — Platform Admin Console:** Global visibility into cross-organization health, active tenant subscriptions, MRR/ARR projections, AMC contract countdowns, and OTA model releases.
* **Level 2 — Organization Portal:** Scoped strictly to the authenticated organization. Features vertical-specific dynamic widgets (Healthcare DR triage, Insurance claims loss ratios, Government road defect hazard matrices, Security perimeter intrusion maps).

---

## 4. Multi-Vertical Support Matrix

| Vertical | Flagship AI Workflow | Primary Input | Edge Inference Model | Key Output & Evidence | Reporting Standard |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Healthcare** | Retinal DR Screening | Fundus Optical Image | Swin Transformer V2 Tiny | 5-Grade ICDR Severity + GradCAM Saliency | Clinical Dossier / PHC Referral |
| **Insurance** | Asset Damage Inspection | RGB Asset Photo | Quantized ONNX Multi-Head | Severity Index + Repair Cost Estimate | Claims Adjustment Report |
| **Government** | Infrastructure Road Defect | Mobile / Drone Frame | MobileNet Pothole Contour | Depth (cm) + PCI Hazard Reduction | Municipal PWD Work Order |
| **Security** | Tactical Perimeter Defense | Optical / Thermal Fusion | Edge TensorRT Boundary Head | Intrusion Trajectory + Thermal Delta | Tactical Security Incident Dispatch |

---

## 5. Technology Stack

* **Mobile Node:** Android / Kotlin / React Native, SQLite Room DB, TorchScript / ONNX Runtime.
* **Cloud Backend:** Node.js 20 LTS, Express, TypeScript, AWS SDK v3.
* **Persistence & Storage:** AWS DynamoDB (Telemetry & Events), Private AWS S3 (Encrypted Evidence Vault), Local SQLite.
* **Alerting & Push:** AWS SNS, CloudWatch Telemetry Alarms.
* **Web Command Center:** HTML5, Tailwind CSS, Vanilla JS, Responsive Glassmorphism Architecture.
