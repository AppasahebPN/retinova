# RETINOVA B2B / B2G Business Model & Commercialization Strategy

> **Strict Compliance Notice:** This document explicitly distinguishes between **Validated Engineering Facts** (features built, tested, and demonstrated in this repository) and **Proposed Business Assumptions** (commercial projections, pricing hypotheses, and target go-to-market assumptions requiring commercial market pilot validation). No organization is claimed as a contracted partner or client.

---

## 1. Product Core Positioning

**RETINOVA** is an offline-first Edge AI software platform enabling organizations to deploy, operate, and maintain AI-powered diagnostic and inspection workflows on commodity mobile and edge hardware without requiring continuous network connectivity.

```
BUILD PLATFORM ONCE
  ├── CONFIGURE/CUSTOMIZE AI WORKFLOW
  ├── DEPLOY TO ORGANIZATION
  ├── CHARGE IMPLEMENTATION + PLATFORM LICENSE + MAINTENANCE
  └── PROVIDE CONTINUOUS SOFTWARE / AI / CLOUD SUPPORT
```

---

## 2. Target Customer Segments & Verticals

1. **Healthcare / Public Health Organizations (B2G / B2B):**
   * *Target:* State health missions, rural tele-screening programs, district hospital networks, corporate eye hospital chains.
   * *Use Case:* Large-scale rural Diabetic Retinopathy (DR) tele-triage by frontline workers (e.g., ASHA workers) operating in connectivity-deprived villages.
2. **Insurance Underwriters & TPA Claim Adjusters (B2B):**
   * *Target:* Motor and general property insurance companies, third-party claims administrators (TPAs).
   * *Use Case:* Instant on-device vehicle and structural property damage evaluation, fraud pre-screening, and fast-track claims settlement estimation.
3. **Government & Public Works Authorities (B2G):**
   * *Target:* National / state highway authorities, rural development ministries, municipal road maintenance divisions.
   * *Use Case:* Dashcam and mobile survey of pavement surface distress, cavity detection, and geo-tagged work order generation.
4. **Industrial & Security Organizations (B2B):**
   * *Target:* Critical infrastructure facilities, industrial solar farms, perimeter security providers.
   * *Use Case:* Low-power autonomous edge intrusion surveillance using optical and thermal sensor fusion.

---

## 3. Revenue Architecture (7 Commercial Streams)

The RETINOVA commercial model combines one-time onboarding fees with recurring platform software licenses and annual maintenance contracts:

| Revenue Stream | Nature | Description | Commercial Value Driver |
| :--- | :--- | :--- | :--- |
| **1. Implementation & Setup Fee** | One-Time | Initial cloud deployment, tenant provisioning, edge device onboarding, and security hardening. | Covers engineering onboarding costs and tenant setup. |
| **2. Annual Platform License** | Recurring (Annual) | Per-device or per-seat recurring license granting access to RETINOVA software, local inference engine, and dashboard. | Primary recurring revenue driver (ARR). |
| **3. Annual Maintenance Contract (AMC)** | Recurring (Annual) | Ongoing software updates, security patches, hardware compatibility updates, and clinical/model re-calibration. | High-margin recurring service stream ensuring long-term retention. |
| **4. Cloud Hosting & Ingestion** | Recurring (Usage) | Bandwidth, DynamoDB telemetry storage, and private encrypted S3 evidence vault fees. | Covers AWS infrastructure cost with a margin buffer. |
| **5. Custom AI Workflow Development** | One-Time / Milestones | Training, quantization, and deployment of customer-specific neural architectures or regional datasets. | High-value professional service expanding platform capability. |
| **6. Enterprise Integrations** | One-Time / Retainer | Custom HL7/FHIR EHR connectors, insurance core claims ERP bridges, or government GIS portals. | Deepens platform stickiness in large enterprise accounts. |
| **7. Premium SLA & Dedicated Support** | Recurring (Annual) | 24x7 emergency response, dedicated technical account manager, and rapid hardware replacement triage. | Attracts mission-critical government and enterprise tiers. |

---

## 4. Customer Value Proposition

* **Guaranteed Offline Autonomy:** Inferences, evidence generation, and record logging execute locally on device with zero dependence on cell towers or internet connectivity.
* **Massive Bandwidth & Cloud Savings:** Only high-value metadata and compressed evidence are synchronized when connectivity is present, eliminating massive raw video/image upload costs.
* **Commodity Hardware Compatibility:** Runs on standard Android smartphones ($100–$200) without requiring proprietary multi-thousand-dollar medical or industrial workstations.
* **Centralized Fleet Oversight:** Headquarters maintains real-time oversight over distributed device fleets, screening volumes, model versions, and regional anomaly clusters.
* **Future-Proof Extensibility:** The same platform handles healthcare screening today and can be configured for insurance or infrastructure audits tomorrow via modular configuration.

---

## 5. Separation of Validated Facts vs. Business Assumptions

### 5.1 Validated Engineering Facts (Proven in Codebase)
* ✅ Android APK (`NetraAI_ASHA.apk`, 82.9 MB) runs locally on physical and emulated Android devices.
* ✅ Swin Transformer V2 Tiny model achieves `< 250ms` on-device inference latency.
* ✅ SQLite / Room local database queues detections offline with zero internet access.
* ✅ Decoupled synchronization daemon synchronizes queued records to AWS DynamoDB upon reconnecting.
* ✅ Idempotent sync prevents duplicate entries when network retries occur.
* ✅ Multi-tenant data-access layer strictly isolates organization data (verified via 16 automated integration tests).
* ✅ Model registry verifies SHA-256 integrity and executes safe rollback on corrupted updates.
* ✅ Dual-level Web Command Center displays live telemetry and vertical-tailored widgets.

### 5.2 Business Assumptions (Hypotheses to Validate in Market Pilots)
* ⚠️ *Proposed Pricing:* ₹499/device/month (Basic), ₹1,999/device/month (Pro), ₹4,999/device/month (Enterprise) are provisional hypotheses based on comparable SaaS benchmarks.
* ⚠️ *Implementation Timelines:* Estimated 2 to 4 weeks for initial enterprise deployment; actual cycle depends on organizational procurement and IT compliance procedures.
* ⚠️ *Regulatory Clearance:* Clinical deployment for diagnostic decision-making requires formal regulatory assessment (e.g., CDSCO / CE / FDA clearance) prior to commercial diagnostic claims.
* ⚠️ *Conversion & Churn Rates:* Projected retention and renewal metrics are financial modeling assumptions subject to multi-month pilot results.
