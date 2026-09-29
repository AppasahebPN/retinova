# RETINOVA Enterprise Pilot Evaluation Framework

> **Integrity Notice:** This document establishes the measurement framework, instrumentation metrics, and evaluation gates for a 60-day commercial pilot deployment. No speculative or fabricated field metrics are presented. All evaluations must be recorded from actual pilot instrumentation.

---

## 1. Pilot Program Structure & Timeline

The 60-day pilot is structured to systematically de-risk enterprise edge AI deployment across 4 phases:

| Week | Phase | Milestone & Objectives |
| :---: | :--- | :--- |
| **W1** | **Setup & Provisioning** | Workspace creation via Onboarding Wizard, device flashing, baseline hardware inspection. |
| **W2** | **Operator Training** | SOP training for 5–10 field operators; dry-run screenings with calibration synthetic eyes. |
| **W3–W7** | **Active Field Operation** | Daily field screening under real-world connectivity, ambient lighting, and patient flow. |
| **W8** | **Audit & Expansion Review** | Telemetry extraction, clinical concordance review, and executive commercial decision. |

---

## 2. Technical Evaluation Metrics

Field telemetry is recorded automatically on the edge device SQLite database and synchronized to the cloud dashboard when connected.

| Metric | Target Benchmark | Telemetry Source | Business Significance |
| :--- | :--- | :--- | :--- |
| **On-Device Inference Latency** | $< 250\text{ ms}$ (CPU/NPU) | `screeningService.ts` / Swin V2 timer | Prevents operator fatigue and queuing delays in high-volume rural camps. |
| **Offline Inference Autonomy** | $100\%$ success in Airplane Mode | `localDatabase.ts` offline counter | Eliminates dependency on mobile cell tower coverage. |
| **Synchronization Reliability** | $\ge 99.5\%$ idempotent delivery | `syncManager.ts` ACK tracker | Guarantees zero lost patient records or duplicated cloud events. |
| **Battery Discharge Rate** | $< 4\%$ per 50 inferences | `RegisteredDevice.battery_level` | Ensures full single-charge field operation during all-day mobile camps. |
| **Local Storage Consumption** | $< 500\text{ KB}$ per record + GradCAM | SQLite DB + compressed JPEG evidence | Allows 10,000+ screenings stored locally on 16GB flash storage. |
| **Network Ingestion Bandwidth** | $> 90\%$ reduction vs raw streaming | Payload size comparison | Drastically lowers cellular data costs for customer organizations. |
| **Concordance (Sensitivity / Specificity)** | Evaluated vs reviewing clinician | Reviewer confirmation / override log | Quantifies clinical safety and false referral burden. |

---

## 3. Operational & Business Evaluation Metrics

Evaluated through qualitative operator interviews and administrative dashboard analytics:

| Metric | Measurement Method | Target Goal |
| :--- | :--- | :--- |
| **Operator Adoption Rate** | Active daily screening operators / Enrolled operators | $\ge 85\%$ sustained daily participation |
| **Workflow Completion Time** | Image capture to referral generation (seconds) | $\le 90\text{ seconds}$ per patient screening |
| **Deployment & Onboarding Speed** | Time from contract signature to live field screening | $\le 10\text{ business days}$ |
| **Technical Support Incident Rate** | Support tickets logged per device per month | $\le 0.5$ tickets / device / month |
| **Ophthalmologist Triage Efficiency** | Time spent per remote screening review | $< 45\text{ seconds}$ due to Grad-CAM heatmap guidance |
| **Willingness to Expand (NPS)** | End-of-pilot stakeholder survey (1–10) | $\ge 8 / 10$ approval from Clinical & IT Leadership |

---

## 4. Exit Criteria & Commercial Transition

A pilot is deemed successful and eligible for conversion into a multi-year commercial contract when:
1. Zero critical data-loss incidents occurred during disconnected offline periods.
2. Concordance review demonstrates acceptable sensitivity for sight-threatening pathology triage.
3. Frontline operators report self-sufficient operation without daily engineering intervention.
4. Total cost of pilot operation confirms projected hardware and bandwidth efficiencies.
