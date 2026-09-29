# RETINOVA Edge AI Surveillance & Diagnostic Platform
## Business Model, Commercialization Strategy & Unit Economics

---

## 1. Executive Summary & Value Proposition

Traditional cloud-dependent AI surveillance and diagnostic screening models suffer from a fatal flaw: **they cease functioning the moment network connectivity drops or bandwidth degrades**. Furthermore, streaming continuous high-resolution feeds or raw image bursts to centralized cloud servers incurs unsustainable bandwidth expenses and high cloud compute bills.

RETINOVA resolves this challenge through a **Hybrid Edge-Cloud Architecture**:
* **Local Inference**: AI executes on-device ($<250\text{ ms}$ latency), guaranteeing $100\%$ uptime during complete network blackouts.
* **Intelligent Event-Driven Ingestion**: Only actionable detections, clinical biomarkers, and compressed evidence packages are queued and transmitted when connectivity is detected.
* **$92\%$ Cloud Cost Reduction**: Avoids 24/7 cloud GPU hosting and excessive data egress fees.
* **Hardware Agnostic**: Turns any standard Android smartphone into an autonomous edge surveillance and triage sensor ($₹0$ hardware capex for BYOD).

---

## 2. Target Customer Segments

*Note: In compliance with commercial rigor, all institutional and governmental sectors represent target customer segments requiring procurement, security clearance, and pilot validation.*

### Primary Segments (High-Value / High-Mission Criticality)
1. **Public Health Screening Missions & Government Agencies**:
   - Rural Tele-Ophthalmology & Diabetic Retinopathy screening across Primary Health Centers (PHCs) under the National Health Mission (NHM).
   - Frontline health workers (e.g., ASHA cadre) performing door-to-door diagnostic surveys.
2. **Critical Infrastructure & Industrial Perimeters**:
   - Energy grids, water treatment facilities, oil/gas refineries, and remote solar farms requiring automated perimeter intrusion detection without internet dependency.
3. **Defense & Border Security Remote Outposts**:
   - Remote observation posts with denied or jammed satellite/cellular communications.
4. **Large Commercial Security Contractors**:
   - Patrol guards and physical security operators equipped with mobile devices for rapid anomaly logging.

### Secondary Segments
5. **Mining & Heavy Industrial Sites**: High-dust, low-connectivity subterranean or open-pit operations.
6. **Logistics Hubs & Warehouses**: Loading dock monitoring and cargo tampering detection.
7. **Educational & Healthcare Campuses**: Large distributed physical security fleets.

---

## 3. Business Model Canvas (BMC)

| Canvas Dimension | Specification |
| :--- | :--- |
| **Customer Segments** | • Public health agencies (NHM / PHCs)<br>• Industrial security & critical infrastructure operators<br>• Defense remote observation posts<br>• Commercial private security contractors |
| **Value Propositions** | • **Zero-Connectivity Guarantee**: AI runs locally on Android hardware.<br>• **Low Bandwidth Overhead**: $>92\%$ lower data transfer vs cloud streaming.<br>• **Low Capex**: Operates on existing Android phones ($₹0$ capex).<br>• **Centralized Visibility**: Real-time AWS Command Center dashboard. |
| **Channels** | • Institutional pilot programs & state health tenders<br>• Security system integrators & defense distributors<br>• Direct B2B enterprise sales team<br>• Academic & hospital partnership networks |
| **Customer Relationships** | • High-touch pilot deployment & on-site field training<br>• Dedicated enterprise SLAs ($99.9\%$ sync availability)<br>• Continuous model accuracy updates & regulatory compliance audits |
| **Revenue Streams** | • Per-device monthly/annual SaaS subscription<br>• One-time enterprise deployment & systems integration fees<br>• Custom AI model fine-tuning & explainability extensions<br>• Turnkey ruggedized hardware bundles (optional) |
| **Key Resources** | • Swin Transformer V2 Tiny edge-optimized models<br>• Offline-first Android application codebase<br>• Serverless AWS infrastructure (API Gateway, DynamoDB, S3, SNS)<br>• Medical dataset annotations & clinical validation partnerships |
| **Key Activities** | • Edge AI quantization & inference optimization<br>• Android client maintenance & Room database hardening<br>• Cloud dashboard development & multi-tenant AWS operations<br>• Field validation & institutional stakeholder reviews |
| **Key Partners** | • Cloud infrastructure providers (AWS Partner Network)<br>• Non-mydriatic fundus camera & optics manufacturers<br>• Rural health organizations & state health directorates<br>• Hardware OEM manufacturers (ruggedized Android tablets/terminals) |
| **Cost Structure** | • AI research, engineering & mobile software development<br>• Serverless AWS cloud operations (DynamoDB, S3, Lambda, SNS)<br>• Field testing, training & clinical trial compliance<br>• Enterprise sales, customer support & field engineering |

---

## 4. Revenue Model & Proposed Pricing Framework

*Disclaimer: All pricing figures represent proposed modeling assumptions for economic viability analysis.*

### Revenue Stream 1: Per-Device Platform Subscription (SaaS)

```
┌───────────────────────────────┬───────────────────────────────┬───────────────────────────────┐
│          BASIC TIER           │           PRO TIER            │        ENTERPRISE TIER        │
│        ₹499 / mo / dev        │       ₹1,499 / mo / dev       │       Custom Quotation        │
├───────────────────────────────┼───────────────────────────────┼───────────────────────────────┤
│ • Offline Edge AI Inference   │ • Offline Edge AI Inference   │ • Unlimited Edge AI Fleet     │
│ • Local Database (Room)       │ • Priority AWS Cloud Sync     │ • Dedicated AWS Cloud VPC     │
│ • 1,000 Cloud Sync Events/mo  │ • 10,000 Cloud Sync Events/mo │ • Custom Model Training       │
│ • Standard Cloud Dashboard    │ • S3 Evidence Vault (Glacier) │ • Multi-Tenant Administration │
│ • Community Support           │ • Real-Time SMS/SNS Alerts    │ • 24/7 Dedicated SLA (99.9%)  │
│                               │ • Standard Business SLA       │ • On-Premises Air-Gapped Hub  │
└───────────────────────────────┴───────────────────────────────┴───────────────────────────────┘
```

### Revenue Stream 2: Hardware Provisioning (Optional)
* **Option A (BYOD)**: Customer utilizes existing Android smartphones (Android 9.0+). **Hardware Capex: ₹0**.
* **Option B (Turnkey Ruggedized Mobile Terminal)**: Drop-tested, dustproof Android 13 device equipped with 40-degree field-of-view macro/fundus optical adapter. **One-Time Cost: ₹14,999 – ₹18,500**.

### Revenue Stream 3: Custom Engineering & System Integration
* Custom biomarker or anomaly detection model training: **₹3,00,000 – ₹10,00,000 per project**.
* Integration with existing Hospital Information Systems (HIS) or Central Command & Control Centers (ICCC): **Quotation-based**.

---

## 5. Cost Model & Unit Economics

### Workload Assumptions per Deployed Device (Pro Tier)
* **Screenings/Detections**: 50 detection events per day = **1,500 events / month / device**.
* **Cloud Uploads**: Only actionable/abnormal events and daily telemetry = ~400 events uploaded / month.
* **Evidence Storage**: 400 compressed JPEG evidence images $\times$ 500 KB = **200 MB new storage / month** (~2.4 GB / year).
* **AWS Region**: `ap-south-1` (Mumbai).

### Monthly AWS Operational Cost per Deployed Device (Validated Pricing)

| AWS Service | Workload / Month | Validated AWS Cost (USD) | Equivalent INR (₹) |
| :--- | :--- | :--- | :--- |
| **AWS DynamoDB** | 1,500 Writes + 3,000 Reads (Pay-Per-Request) | $0.002 | ₹0.17 |
| **AWS S3 Standard** | 200 MB storage + 400 PUT requests | $0.006 | ₹0.50 |
| **AWS Lambda** | 1,500 invocations $\times$ 256MB $\times$ 300ms | $0.001 | ₹0.08 |
| **AWS API Gateway** | 1,500 HTTP API calls | $0.002 | ₹0.17 |
| **AWS SNS** | 100 SMS / Push critical alerts | $0.050 | ₹4.15 |
| **Data Egress** | ~200 MB egress to dashboard | $0.018 | ₹1.50 |
| **Buffer / CloudWatch** | Logs & metrics retention | $0.020 | ₹1.66 |
| **Total Cloud Cost / Device**| — | **$0.099 / mo** | **~₹8.23 / month** |

### Fully Loaded Unit Economics (Per Device / Month)

$$\begin{aligned}
\text{Gross Monthly Subscription Revenue (Pro Tier)} &= ₹1,499.00 \\
\text{AWS Cloud Infrastructure Cost (Calculated)} &= -₹8.23 \\
\text{Customer Support & Field Maintenance Allocation} &= -₹45.00 \\
\text{Payment Gateway & Merchant Charges (2\%)} &= -₹29.98 \\
\hline
\mathbf{\text{Gross Contribution Margin per Device}} &= \mathbf{₹1,415.79} \\
\mathbf{\text{Gross Margin Percentage}} &= \mathbf{94.4\%}
\end{aligned}$$

---

## 6. Three-Stage Go-To-Market (GTM) Strategy

```
STAGE 1: PILOT DEPLOYMENT (Months 1–4)
Target: 5–20 Devices | Single District Health Mission / Industrial Facility
├── Validate field inference latency under harsh environmental conditions
├── Measure false-positive rate and clinical concordance with ophthalmologist panel
├── Verify zero data loss during simulated 72-hour network outages
└── Output: Validated Clinical & Technical Performance Whitepaper

STAGE 2: INSTITUTIONAL DEPLOYMENT (Months 5–12)
Target: 50–200 Devices | Regional Health Directorate or Security Perimeter
├── Expand to full district health network across 20+ Primary Health Centers
├── Onboard multi-tenant RBAC (ASHA, Medical Officer, District Health Manager)
├── Integrate automated SMS/SNS referral workflows with Tertiary Eye Hospitals
└── Output: Repeatable SaaS revenue & government procurement certification

STAGE 3: ENTERPRISE & NATIONAL SCALE (Months 13–24)
Target: 1,000–5,000+ Devices | Multi-State Health Missions / Critical Infrastructure
├── Deploy dedicated private cloud VPCs and on-premise air-gapped hubs
├── Roll out custom fine-tuned AI pipelines for additional ocular and perimeter pathologies
└── Formalize OEM bundling partnerships with Android hardware manufacturers
```

---

## 7. Competitive Differentiation Matrix

| Evaluation Criteria | Traditional CCTV / Manual Screening | Cloud-Only AI Surveillance | Edge-Only Embedded Systems | **RETINOVA Hybrid Edge-Cloud** |
| :--- | :--- | :--- | :--- | :--- |
| **Internet Dependency** | High (Requires dedicated lines) | Total (Fails if internet cuts) | None | **Zero for AI; Opportunistic for Sync** |
| **AI Inference Location** | None (Human review only) | Remote Cloud GPU Server | Embedded NPU (e.g. Jetson) | **On-Device Mobile Hardware (Android)** |
| **Bandwidth Consumption**| Continuous High Stream ($>2\text{ Mbps}$) | Continuous Streaming ($>1\text{ Mbps}$) | Zero | **Extremely Low ($<5\text{ KB/event}$ metadata)** |
| **Hardware Capex** | High ($₹30,000 - ₹80,000$) | Medium ($₹15,000 - ₹40,000$) | Very High ($₹45,000 - ₹1,20,000$) | **Lowest ($₹0$ with existing smartphones)** |
| **Offline Resilience** | Local DVR only (No AI triage) | Zero (Total downtime) | High | **Total: Full AI triage + Local Queue** |
| **Centralized Command** | Limited / Fragmented | Centralized | None (Siloed devices) | **Centralized AWS Command Center** |

---

## 8. Business & Technical KPIs

### Technical Performance KPIs
* **Edge Inference Latency**: $<250\text{ ms}$ on standard Android mobile chipsets.
* **Sensitivity & Specificity**: Sensitivity $\ge 93\%$, Specificity $\ge 88\%$ for referable pathology ($G \ge 2$).
* **Offline Availability**: $100\%$ uptime during network blackout.
* **Data Loss Rate**: $0.00\%$ guaranteed by persistent Room SQLite event queue.
* **Cloud Sync Latency**: $<1.5\text{ seconds}$ per event upon network restoration.

### Commercial & Operational KPIs
* **Monthly Recurring Revenue (MRR)**: Tracked per active device cohort.
* **Customer Acquisition Cost (CAC)**: Target payback period $< 3.5$ months.
* **Gross Margin**: Sustained at $\ge 90\%$ due to edge computation model.
* **Device Churn Rate**: Target $< 1\%$ monthly attrition in institutional contracts.
