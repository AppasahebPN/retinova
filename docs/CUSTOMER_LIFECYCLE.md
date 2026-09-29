# RETINOVA Customer Lifecycle & Expansion Model

---

## 1. The B2B / B2G Customer Journey

Deploying an enterprise edge AI platform requires a structured customer lifecycle that bridges technical validation with long-term commercial retention:

```
 LEAD ──► DEMO ──► PILOT ──► IMPLEMENTATION ──► TRAINING ──► GO-LIVE ──► MAINTENANCE ──► RENEWAL ──► EXPANSION
 (Inbound/ (3-5 min (60-day  (Tenant Setup &   (Field Team  (Full Shift (Quarterly AMC (Annual    (Fleet Scale,
  Govt RFP) Hero)   Trial)    Custom Workflow)  SOP Handover) Autonomy)   Telemetry)   Contract)  New Verticals)
```

---

## 2. Phase-by-Phase Operational Execution

### Phase 1: Lead Identification & Qualification
* **Target Stakeholders:** State Health Mission Directors, Chief Medical Officers, Insurance Chief Claims Officers, Public Works Chief Engineers.
* **Qualification Criteria:** High field volume, distributed remote workforce, connectivity-constrained operating environments, manual error or delay bottlenecks.

### Phase 2: Interactive Sales Demo (3–5 Minutes)
* **Objective:** Prove on-device autonomy live in front of decision-makers.
* **Scripted Hero Demonstration:**
  1. Capture sample image on Android device.
  2. Toggle **Airplane Mode ON** (Simulate zero cellular reception).
  3. Execute Swin V2 Tiny AI diagnostic screening locally in $< 250ms$ with Grad-CAM heatmap.
  4. Verify local database persistence with status `PENDING`.
  5. Toggle **Airplane Mode OFF**.
  6. Trigger decoupled sync daemon; verify instantaneous ingestion into AWS Command Center.
* **Commercial Takeaway:** *"Zero reliance on internet connectivity. High-bandwidth cloud streaming costs eliminated."*

### Phase 3: Structured 60-Day Pilot
* **Deployment Scope:** 5 to 10 edge devices in a defined district (e.g., 5 rural PHCs or 1 highway division).
* **Objective:** Validate real-world operator adoption, screening throughput, false positive/negative rates, and network bandwidth savings against baseline.
* **Success Criteria:** Defined mutually in the Pilot Charter prior to hardware handover.

### Phase 4: Implementation & Provisioning
* **Workflow:** Automated via the **Customer Onboarding Wizard** (`POST /api/platform/onboarding/wizard`).
* **Deliverables:**
  * Provisioned customer organization tenant with strict data-access layer isolation.
  * Configured vertical workflow rules (confidence thresholds, triage referral logic).
  * Enrolled edge devices with hardware tokens and production APK sideloading.
  * Generated Organization Admin workspace credentials.

### Phase 5: Frontline Operator Training
* **Duration:** 1 to 2 days on-site or virtual training.
* **Focus:** Non-mydriatic fundus camera alignment, automated Image Quality Assessment (IQA) gate retraining, patient consent entry, and offline queue monitoring.

### Phase 6: Operational Go-Live
* **Milestone:** Frontline workers begin routine daily screening sessions.
* **Oversight:** Organization Admins monitor daily screening volumes, risk distribution, and urgent hospital referrals live on the Organization Portal.

### Phase 7: Continuous Maintenance & Support (AMC)
* **Cadence:** Ongoing background telemetry monitoring.
* **Service Level:** Quarterly certified model drift reviews, OTA firmware security updates, 4-hour or 1-hour SLA incident response, and hardware battery/storage health telemetry.

### Phase 8: Annual Contract Renewal
* **Workflow:** Contract renewal alerts trigger at 60 days and 30 days prior to expiry on both Platform Admin and Tenant consoles.
* **Action:** Executed via `POST /api/platform/organizations/:id/renew-amc`, extending service and model support seamlessly.

### Phase 9: Commercial Account Expansion
* **Expansion Vectors:**
  1. **Device Fleet Scale:** Expanding from 25 pilot tablets to 250+ statewide health sub-centers.
  2. **Multi-Vertical Adoption:** A state health department licensing the platform for eye screening can expand to municipal PWD road monitoring or child nutrition anthropometry.
  3. **Custom Model Training:** Commissioning RETINOVA engineering to train bespoke neural backbones on customer-specific clinical or industrial datasets.
  4. **Enterprise Integration:** Deep HL7/FHIR EHR connectors, insurance core claims ERP bridges, or government GIS mapping integrations.
