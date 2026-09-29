# RETINOVA Commercial Pricing Assumptions & Validation Plan

> **Compliance Status:** The figures and tiers described herein represent **Preliminary Working Hypotheses** designed for financial modeling and pilot packaging. They have **NOT** been validated through closed commercial contracts. Every assumption in this document must be tested and refined through structured customer discovery and pilot negotiations.

---

## 1. Baseline Pricing Hypotheses (Proposed / To Be Validated)

| Subscription Plan | Proposed Price (INR) | Device Quota | Included Monthly Events | Support Tier | Primary Commercial Target |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **BASIC (Starter)** | *₹499 / device / month* | Up to 5 Devices | 1,000 Events / Month | Standard Business | Single rural clinic, academic research team, initial evaluation trial. |
| **PRO (Regional)** | *₹1,999 / device / month* | Up to 25 Devices | 10,000 Events / Month | Priority (4-Hour SLA) | District health society, mid-sized insurer, regional hospital network. |
| **ENTERPRISE (Custom)** | *Negotiated Annual Contract* | 100+ Devices | 50,000+ Events / Month | Dedicated 24x7 (1-Hour SLA) | State Health Mission, nationwide insurer, defense/security department. |

---

## 2. Key Hypotheses Requiring Validation

### 2.1 Willingness to Pay by Customer Segment
* **Government Public Health (NHM / State MOH):** State programs typically budget under specific operational scheme line-items (e.g., NPCDCS tele-ophthalmology). In India, public health procurements favor tender-based per-screening or capital expenditure models rather than monthly recurring SaaS fees.
  * *Validation Goal:* Determine whether government buyers can procure via annual software licenses on the Government e-Marketplace (GeM) or require bundled per-screening service models.
* **Corporate Hospital Chains & Diagnostic Labs:** Highly receptive to per-device or per-seat recurring subscriptions if the software increases patient referral volume to tertiary surgical centers.
  * *Validation Goal:* Measure hospital willingness to pay ₹1,500–₹2,500/device/month against ophthalmologist staffing costs.
* **Insurance Companies & TPAs:** Value loss-ratio reduction and inspection cycle acceleration. High willingness to pay if fraud detection or claim cycle reduction saves $> ₹5,000$ per claim.
  * *Validation Goal:* Validate whether insurers prefer per-inspection transaction fees (e.g., ₹50–₹100 per claim photo inspection) over flat device licenses.

### 2.2 Pricing Model Preference (Per-Device vs. Per-Event vs. Enterprise Flat Fee)
* *Hypothesis:* Small clinics prefer per-device licensing; large government programs prefer statewide enterprise licenses with unlimited screenings.
* *Validation Metric:* Survey 10 healthcare directors and 5 insurance claims VPs during pilot discussions.

### 2.3 Implementation & Onboarding Fee Sensitivity
* *Proposed Baseline:* ₹50,000 (Basic) to ₹5,00,000 (State Department).
* *Risk:* If setup fees are perceived as prohibitive, pilots stall before hardware handoff.
* *Validation Approach:* Test waiving or rebating implementation fees against 2-year annual software commitments.

### 2.4 Annual Maintenance Contract (AMC) Expectations
* *Proposed Baseline:* $15\%$ to $20\%$ of annual license value for software maintenance, model retraining, and SLA uptime.
* *Government Context:* Public sector IT standard in India typically expects $10\%$ to $15\%$ AMC with comprehensive hardware/software support.
* *Validation Approach:* Align AMC percentage with standard government tender guidelines.

### 2.5 Cloud Ingestion & Storage Cost Tolerance
* *Proposed Baseline:* 10 GB (Basic), 50 GB (Pro), 250 GB+ (Enterprise) included in base license, with overages charged at cost + $25\%$ margin.
* *Validation Approach:* Verify whether enterprise customers demand private VPC deployment (customer AWS account) to absorb cloud costs directly.

---

## 3. Customer Discovery Interview Guide

During customer discovery sessions and pilot debriefs, the commercial team must specifically test:
1. *"How does your organization currently budget for diagnostic software — capital expenditure, annual license, or per-case operational cost?"*
2. *"What internal procurement thresholds exist before a tender / RFP process is legally triggered?"*
3. *"Does your compliance policy permit multi-tenant cloud storage on AWS ap-south-1, or is an isolated VPC / on-premise gateway mandatory?"*
4. *"What clinical or financial metrics would your leadership require to justify converting a pilot into a multi-year software agreement?"*
