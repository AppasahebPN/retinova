# NetraAI — Final Clinical Screening Report Status

**Document Version:** 1.0  
**Date:** September 13, 2026  
**System:** NetraAI AI-Assisted Diabetic Retinopathy Screening  
**Model:** Frozen Swin V2 Tiny V1 (`best_model.pt`, $512 \times 512$ RGB, $T^* = 1.4555$, $\tau^* = 0.2993$)  

---

## 1. Executive Summary

The final clinical screening report system for rural tele-ophthalmology has been implemented and fully verified against live inference results. The report layout strictly prioritizes visual clarity, immediate triage decision dominance, explainable AI attribution, and rural clinic usability while eliminating synthetic demographic data and stale model artifacts.

All three output formats—**Interactive HTML**, **Printable PDF layout (A4 @media print)**, and **1200×750 Clinical PNG Card**—consume identical persisted screening records directly from the live database.

---

## 2. Files Modified & Added

| File | Purpose |
|------|---------|
| [`DR/backend/src/services/reportService.ts`](file:///c:/Users/Appasaheb/OneDrive/Documents/MATLAB/NetraAI/DR/backend/src/services/reportService.ts) | Implements the clinical screening report generator with dominant triage cards, eye separation, Grad-CAM attribution, Module 3 evidence, dynamic clinical explanations, 5-grade severity distributions, compact technical footer, and A4 print styles. Also includes `generateReportCard` calling Python Pillow renderer. |
| [`DR/backend/src/controllers/reportController.ts`](file:///c:/Users/Appasaheb/OneDrive/Documents/MATLAB/NetraAI/DR/backend/src/controllers/reportController.ts) | Added `getReportCard` controller method serving `image/png` clinical triage cards. |
| [`DR/backend/src/routes/reportRoutes.ts`](file:///c:/Users/Appasaheb/OneDrive/Documents/MATLAB/NetraAI/DR/backend/src/routes/reportRoutes.ts) | Exposes `GET /api/reports/:screeningId/card` route for downloading or viewing the 1200×750 PNG card. |
| [`DR/backend/generate_card.py`](file:///c:/Users/Appasaheb/OneDrive/Documents/MATLAB/NetraAI/DR/backend/generate_card.py) | High-performance Pillow script rendering 1200×750 clinical cards with relational entity lookups, high-contrast decision badges, fundus scans, and Grad-CAM overlays. |
| [`DR/frontend/src/pages/ScreeningResultPage.tsx`](file:///c:/Users/Appasaheb/OneDrive/Documents/MATLAB/NetraAI/DR/frontend/src/pages/ScreeningResultPage.tsx) | Added direct action button to download/open the 1200×750 Clinical Card (PNG) alongside the HTML print options. |

---

## 3. Clinical Report Sections & Architecture

The report implements the required clinical priority hierarchy:

1. **Brand Header**:
   - `NETRAAI | AI-ASSISTED DIABETIC RETINOPATHY SCREENING`
   - Unique Report ID (`REP-XXXXXXXX`) and screening timestamp.
2. **Page 1 Dominant Triage Decision Card**:
   - **REFER**: `DIABETIC RETINOPATHY: DETECTED` | `REFERABLE DR (G2+)` | Large Red Badge `REFER` | Calibrated $P(G2+)$ | Predicted Severity.
   - **SCREEN**: `NO REFERABLE DR DETECTED` | `NON-REFERABLE` | Large Green Badge `SCREEN` | Calibrated $P(G2+)$ | Predicted Severity.
   - **RECAPTURE**: `IMAGE QUALITY INSUFFICIENT` | `RECAPTURE REQUIRED` | Large Orange Badge `RECAPTURE` | Quality notice.
3. **Recommended Clinical Action**:
   - REFER: *"Referral recommended for ophthalmic evaluation."*
   - SCREEN: *"Continue routine diabetic-retinopathy screening according to local clinical protocol."*
   - RECAPTURE: *"Recapture the affected eye before screening."*
   *(Zero speculative drug or surgical prescriptions).*
4. **Patient & Encounter Metadata**:
   - Displays real input metadata: Patient ID, Patient Name, Age, Sex, Eye Imaged, Technician, Screening Centre, Camera / Device, Screening Date, Encounter Notes.
   - Strictly defaults to `"Not provided"` when unentered. Zero synthetic patient personas.
5. **Eye Image Section (Left Eye vs. Right Eye)**:
   - Dedicated dual-panel layout for Left Eye (OS) and Right Eye (OD).
   - Prominently displays the acquired fundus scan for the imaged eye.
   - Non-imaged eye explicitly marked `"Not captured"`. Never infers or guesses eye side.
6. **"Why Did NetraAI Give This Result?"**:
   - Dynamic explanation generated from real calibrated probability vs. frozen threshold ($\tau^* = 0.2993$).
7. **Explainable AI (Grad-CAM Attribution)**:
   - Acquired fundus scan side-by-side with Swin V1 Grad-CAM overlay.
   - Standard caption: *"Highlighted retinal regions indicate areas that contributed most strongly to the model's screening prediction."*
   - Explicit disclaimer: *"Attribution is model evidence, not a diagnostic ground-truth mask."*
8. **Key Retinal Evidence (Module 3)**:
   - Retinal Vessel Map: Vessel density / coverage ($6.40\%$ or $7.05\%$).
   - Candidate Morphological Lesion Map: Candidate count and lesion area coverage.
   - For RECAPTURE: explicitly states downstream segmentation was halted at the quality gate.
9. **Predicted Severity (Secondary Classification)**:
   - 5-Grade probability distribution (Grade 0 through Grade 4) with model probabilities and visual distribution bars.
   - Explicit note: *"The 5-grade severity classification is secondary to the primary frozen G2+ referral decision ($\tau^* = 0.2993$)."*
10. **Compact Technical Footer**:
    - `Model: Swin V2 Tiny | Input: 512 × 512 | Model Version: v1.0-frozen | Calibration: Temperature Scaling (T = 1.4555) | Decision Threshold: τ* = 29.9%`.
    - No prominent training metrics clutter (AUROC/AUPRC/sharpness scores omitted from patient report).
11. **Clinical Disclaimer & Signatures**:
    - Tele-ophthalmology regulatory disclaimer and sign-off blocks for Operator and Reviewing Clinician.

---

## 4. Regression Test Verification (3 Live Clinical Cases)

The report endpoints (`/api/reports/:id/html` and `/api/reports/:id/card`) were audited across the three live regression test cases:

### Case 1: `002c21358ce6.png` (Routine Screening)
- **Screening ID**: `069787a5-a851-46ce-af5d-8d94fdf0d057`
- **Triage Result**: `SCREEN` (Green Card, Visually Dominant)
- **Banner Text**: `NO REFERABLE DR DETECTED` / `NON-REFERABLE`
- **Calibrated $P(G2+)$**: `1.5%` ($0.015015 < 0.2993$)
- **Severity**: `Grade 0 — No DR` (Class Probability: $95.4\%$)
- **Eye**: `Left Eye (OS)` (Captured) | `Right Eye (OD)`: `Not captured`
- **Grad-CAM**: Present (focal peripheral attention)
- **Evidence**: Vessel Density $6.40\%$, 345 Morphological Lesion Candidates ($0.33\%$ coverage)
- **Clinical Action**: *"Continue routine diabetic-retinopathy screening according to local clinical protocol."*

### Case 2: `001639a390f0.png` (Referable DR)
- **Screening ID**: `aefeee3d-abe9-4017-b3ed-015fc33f602b`
- **Triage Result**: `REFER` (Red Card, Visually Dominant)
- **Banner Text**: `DIABETIC RETINOPATHY: DETECTED` / `REFERABLE DR (G2+)`
- **Calibrated $P(G2+)$**: `99.7%` ($0.997384 \ge 0.2993$)
- **Severity**: `Grade 4 — Proliferative DR` (Class Probability: $92.5\%$)
- **Eye**: `Right Eye (OD)` (Captured) | `Left Eye (OS)`: `Not captured`
- **Grad-CAM**: Present (diffuse high-intensity vascular attention)
- **Evidence**: Vessel Density $7.05\%$, 2024 Morphological Lesion Candidates ($0.56\%$ coverage: 605 bright, 1420 dark)
- **Clinical Action**: *"Referral recommended for ophthalmic evaluation."*

### Case 3: `10_left.jpeg` (Quality Gate Rejection)
- **Screening ID**: `7aeee7e4-6415-46b3-86e6-8006973783ad`
- **Triage Result**: `RECAPTURE` (Orange/Red Card, Visually Dominant)
- **Banner Text**: `IMAGE QUALITY INSUFFICIENT` / `RECAPTURE REQUIRED`
- **Downstream Screening**: Halted at EyeQ Quality Gate ($53.9\%$ Reject confidence)
- **Calibrated $P(G2+)$**: Halted (`N/A`)
- **Severity**: Halted (`N/A`)
- **Eye**: `Left Eye (OS)` (Captured) | `Right Eye (OD)`: `Not captured`
- **Grad-CAM**: Explicitly marked `Halted at Quality Gate`
- **Evidence**: Explicitly marked `Retinal segmentation was halted at the Image Quality Gate.`
- **Clinical Action**: *"Recapture the affected eye before screening."*

---

## 5. Safety & Integrity Checks

### A. Synthetic Demographics Audit
- **Check**: Scanned all HTML reports and generated PNG cards for fictional names (`Ramesh Patil`, `A. Sharma`, `Baramati PHC`, `Remidio camera`).
- **Result**: **PASS (0 occurrences)**. When metadata is unentered, fields display `"Not provided"`. Real user-entered records display exact database fields (`Kartik`, `Primary Health Centre (PHC-North)`).

### B. Stale Model / Mock Leaks Audit
- **Check**: Scanned for legacy model identifiers (`MobileNetV2`, `MockAIService`, stale `86.5%` mock confidence).
- **Result**: **PASS (0 occurrences)**. All outputs consume the live Swin V2 Tiny model with true calibrated confidence ($1.5\%$, $99.7\%$).

### C. Attribution Diagnostic Claims Audit
- **Check**: Verified explainability wording complies with medical AI standards. Confirmed zero occurrences of `"Grad-CAM detected a lesion"`, `"Grad-CAM proves a microaneurysm"`, or `"Grad-CAM confirms hemorrhage"`.
- **Result**: **PASS**. Standard statement applied across all reports:
  > *"Highlighted retinal regions indicate areas that contributed most strongly to the model's screening prediction."*

### D. Multi-Format Parity Audit
- **Check**: Verified interactive HTML, printable PDF layout, and 1200×750 PNG card consume the exact same underlying live database record and produce identical triage decisions, probabilities, grades, and patient details.
- **Result**: **PASS**. Parity verified across all three cases.

---

## 6. Output Artifacts & Verification Paths

- **Saved HTML Reports**:
  - `DR/backend/uploads/report_002c_screen.html` ($2.71\text{ MB}$)
  - `DR/backend/uploads/report_0016_refer.html` ($6.20\text{ MB}$)
  - `DR/backend/uploads/report_10left_recapture.html` ($4.13\text{ MB}$)
- **1200×750 Clinical PNG Cards**:
  - `DR/backend/test_card_002c.png` ($211\text{ KB}$)
  - `DR/backend/test_card_0016.png` ($160\text{ KB}$)
  - `DR/backend/test_card_10left.png` ($112\text{ KB}$)
- **Live HTTP Endpoints**:
  - `GET http://localhost:5000/api/reports/:id/html` (Interactive HTML & A4 Print)
  - `GET http://localhost:5000/api/reports/:id/card` (1200×750 PNG Clinical Card)
  - `GET http://localhost:5000/api/reports/:id/data` (Structured JSON)
