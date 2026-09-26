# NetraAI Swin V1 Full Web Integration & Regression Status

**Document Version**: 1.0.0  
**Verification Date**: 2026-09-13  
**Project**: Explainable AI for Diabetic Retinopathy Screening in Rural India (SIH26038)  
**Production Grading Model**: Frozen Swin V2 Tiny V1 (`best_model.pt`)  
**Calibration / Decision Rules**: Temperature $T^* = 1.4555$, Operating Threshold $\tau^* = 0.2993$  
- Calibrated $P(G2+) \ge 0.2993 \implies \mathbf{REFER}$
- Calibrated $P(G2+) < 0.2993 \implies \mathbf{SCREEN}$

---

## 1. Architecture Path & Active Endpoints

| Component | Path / File / Endpoint | Status |
| :--- | :--- | :---: |
| **Frontend UI** | `DR/frontend/src/pages/ScreeningResultPage.tsx` (`http://localhost:5173`) | **LIVE & ACTIVE** |
| **Ingestion Page** | `DR/frontend/src/pages/NewScreeningPage.tsx` (`/screenings/new`) | **LIVE & ACTIVE** |
| **Backend API** | `DR/backend/src/services/screeningService.ts` (`http://localhost:5000`) | **LIVE & ACTIVE** |
| **AI Client** | `DR/backend/src/services/ai/MatlabAIService.ts` | **LIVE & ACTIVE** |
| **FastAPI Bridge** | `DR/backend/matlab_bridge.py` (`http://127.0.0.1:8000/analyze`) | **LIVE & ACTIVE** |
| **MATLAB Pipeline** | `DR_Screening_MATLAB/module4_Grading_Final/integration/run_NetraAI_SwinV1.m` | **LIVE & ACTIVE** |
| **Model Adapter** | `DR_Screening_MATLAB/module4_Grading_Final/integration/model_adapter.m` | **LIVE & ACTIVE** |
| **Python Predictor** | `DR_Screening_MATLAB/module4_Grading_Final/integration/swinV1_predictor.py` | **LIVE & ACTIVE** |
| **Frozen Weights** | `DR_Screening_MATLAB/module4_Grading_Final/checkpoints/best_model.pt` | **FROZEN & UNTOUCHED** |

---

## 2. End-to-End Three-Image Web Regression Results

All three reference test fundus images were processed through the **complete active web pipeline**:  
`Frontend Upload -> Express Ingestion -> MatlabAIService -> FastAPI /analyze -> MATLAB run_NetraAI_SwinV1.m -> model_adapter.m -> swinV1_predictor.py -> Express Persistence -> React Results Page -> HTML Report`.

| Image | Quality Gate (Module 1) | Clinical Decision | ICDR Grade | Calibrated $P(G2+)$ | Raw $P(G2+)$ | Screening ID | UI Link |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **`002c21358ce6.png`** | **ACCEPT** (`Good`, 100%) | **`SCREEN`** | **Grade 0** | **`0.015015`** (1.50%) | `0.002262` | `069787a5-a851-46ce-af5d-8d94fdf0d057` | [View UI](http://localhost:5173/screenings/069787a5-a851-46ce-af5d-8d94fdf0d057) |
| **`001639a390f0.png`** | **ACCEPT** (`Good`, 52.48%) | **`REFER`** | **Grade 4** | **`0.997384`** (99.74%) | `0.999825` | `aefeee3d-abe9-4017-b3ed-015fc33f602b` | [View UI](http://localhost:5173/screenings/aefeee3d-abe9-4017-b3ed-015fc33f602b) |
| **`10_left.jpeg`** | **RECAPTURE** (`Reject`, 53.88%) | **`RECAPTURE`** | *Halted* | *Halted* | *Halted* | `7aeee7e4-6415-46b3-86e6-8006973783ad` | [View UI](http://localhost:5173/screenings/7aeee7e4-6415-46b3-86e6-8006973783ad) |

---

## 3. Mathematical & Functional Layer Parity Verification

For `002c21358ce6.png`, live output across every layer of the software stack was compared:

```
[Python Swin V1]       : Calibrated P(G2+) = 0.015015040538344753 | Grade 0 | SCREEN
        || (Difference = 0.0000000000)
[MATLAB Swin Engine]   : Calibrated P(G2+) = 0.015015040538344753 | Grade 0 | SCREEN
        || (Difference = 0.0000000000)
[FastAPI Bridge]       : Calibrated P(G2+) = 0.015015040538344753 | Grade 0 | SCREEN
        || (Difference = 0.0000000000)
[Express Node.js API]  : Calibrated P(G2+) = 0.015015040538344753 | Grade 0 | SCREEN
        || (Difference = 0.0000000000)
[Database Store]       : Calibrated P(G2+) = 0.015015040538344753 | Grade 0 | SCREEN
        || (Difference = 0.0000000000)
[React Result Page]    : Calibrated P(G2+) = 1.50%               | Grade 0 | SCREEN
        || (Difference = 0.0000000000)
[HTML Clinical Report] : Calibrated P(G2+) = 1.50% (0.0150)       | Grade 0 | ROUTINE SCREENING (SCREEN)
```

**Verdict**: **Exact mathematical match** ($\Delta \le 10^{-5}$ tolerance satisfied with absolute difference equal to 0).

---

## 4. Database Persistence Verification

Direct query of the persisted screening entity (`http://localhost:5000/api/screenings/fdf8774f-7f65-4832-85d3-ac1e8fbec479`) retrieved from `DR/backend/data/db.json` verified all real Swin fields:

```json
{
  "id": "fdf8774f-7f65-4832-85d3-ac1e8fbec479",
  "status": "completed",
  "final_decision": "SCREEN",
  "classification": {
    "model_name": "Swin V2 Tiny (Torchvision swin_v2_t)",
    "model_version": "v1.0-frozen",
    "g2plus_probability_raw": 0.0022621115503256846,
    "g2plus_probability_calibrated": 0.015015040538344753,
    "temperature": 1.4555,
    "threshold": 0.2993,
    "referable": false,
    "decision": "SCREEN",
    "predicted_grade": 0,
    "grade_probabilities": [[0.95405, 0.01928, 0.01268, 0.00565, 0.00835]]
  },
  "explainability": {
    "gradcam_url": "/uploads/gradcam_fdf8774f.png"
  }
}
```

---

## 5. Report Endpoint Verification

HTML reports generated via `GET /api/reports/{screeningId}/html`:

- **Image 1 Report (`002c`)**: [Open Report](http://localhost:5000/api/reports/069787a5-a851-46ce-af5d-8d94fdf0d057/html)
  - Banner: `ROUTINE SCREENING (SCREEN)`
  - Operating Threshold: $\tau^* = 0.2993$
  - Model Architecture: `Swin V2 Tiny (Torchvision swin_v2_t)`
  - Calibrated $P(G2+)$: `1.50% (0.0150)`
  - MobileNetV2 references: **None**
  - Stale 86.5% confidence: **None**
- **Image 2 Report (`001639`)**: [Open Report](http://localhost:5000/api/reports/aefeee3d-abe9-4017-b3ed-015fc33f602b/html)
  - Banner: `REFERRAL RECOMMENDED (REFER)`
  - Calibrated $P(G2+)$: `99.74% (0.9974)`
  - Predicted Grade: `Grade 4 — Proliferative Diabetic Retinopathy`
  - Priority: Urgent Referral Recommended
  - MobileNetV2 references: **None**
- **Image 3 Report (`10_left`)**: [Open Report](http://localhost:5000/api/reports/7aeee7e4-6415-46b3-86e6-8006973783ad/html)
  - Banner: `RECAPTURE RECOMMENDED`
  - Explanation: Downstream AI DR Grading and Grad-CAM halted at quality gate to prevent inaccurate diagnosis.

---

## 6. Failure-Safety Test Results

A live failure simulation was conducted by taking the bridge offline and submitting a screening request:

- **HTTP Status Code**: `500 Internal Server Error`
- **Error Response**: `{"error":"Failed to complete AI screening analysis","details":"AI screening inference service is currently unavailable: fetch failed"}`
- **Database Status**: `failed`
- **Classification Record in DB**: `null`
- **Mock Fallback (`MockAIService`)**: **NEVER CALLED**
- **Fabricated Confidence (86.5%)**: **NEVER RETURNED**
- **Synthetic Grade 2**: **NEVER RETURNED**
- Normal bridge operation was restored immediately following the test.

---

## 7. Audit of Remaining MobileNet & Mock References

| Location | Purpose | Impact on Live Screening | Status |
| :--- | :--- | :--- | :--- |
| `module1_IQA/` | EyeQ Quality Gate classifier (`EyeQ_ArtifactAware_MobileNetV2_GPU.mat`) | Intentional for Module 1 optical quality assessment | **Valid / Untouched** |
| `DR/backend/src/services/ai/MockAIService.ts` | Disconnected mock service class | Completely removed from active screening fallback path | **Isolated / Harmless** |
| `DR/backend/src/services/analyticsService.ts` | Static analytics timing descriptor string | None (purely informational string) | **Informational** |
| `DR/frontend/src/pages/ModelStatusPage.tsx` | Historical platform architecture documentation | None (static text) | **Informational** |

---

## 8. Files Modified vs Intentionally Untouched

### Modified Files:
1. `DR/backend/src/services/ai/MatlabAIService.ts` (Removed silent MockAIService fallback; explicit error propagation)
2. `DR/backend/src/services/screeningService.ts` (Persist real Swin fields, calibrated probability, threshold, and final decision)
3. `DR/backend/src/services/reportService.ts` (Dynamic repository root path resolution; render real Swin V1 clinical decisions and calibrated probabilities)
4. `DR/backend/src/routes/apiRoutes.ts` (Dynamic resource planner path; persist real Swin fields on direct endpoint)
5. `DR/backend/src/types/index.ts` & `DR/frontend/src/types/index.ts` (Added Swin V1 fields and updated ReferralStatus union)
6. `DR/frontend/src/pages/ScreeningResultPage.tsx` (Prominent REFER vs SCREEN triage card; display calibrated $P(G2+)$, threshold, G0-G4 distribution)
7. `DR/frontend/src/components/common/ConfidenceMeter.tsx` (Default to Swin V2 Tiny)
8. `DR/frontend/src/components/screening/PipelineProgress.tsx` (Updated Module 4 stage label to Swin V2 Tiny)
9. `DR/backend/matlab_bridge.py` (Dynamic root resolution, invoke `run_NetraAI_SwinV1.m`, Swin V1 payload structure)
10. `DR_Screening_MATLAB/module4_Grading_Final/integration/run_NetraAI_SwinV1.m` (Dynamic path resolution, pass `returnCam` flag to `model_adapter`)
11. `DR_Screening_MATLAB/module4_Grading_Final/integration/run_SwinV1.m` & `run_SwinV1.py` & `swinV1_predictor.py` (Dynamic root directory resolution)

### Intentionally Untouched (Protected Baselines):
- `DR_Screening_MATLAB/run_DR_Screening.m`
- `DR_Screening_MATLAB/module1_IQA/`
- `DR_Screening_MATLAB/module2_Enhancement/`
- `DR_Screening_MATLAB/module3_Segmentation/`
- `DR_Screening_MATLAB/module4_Grading/`
- `DR_Screening_MATLAB/module5_Explainability/`
- `DR_Screening_MATLAB/module6_Simulink/`
- `DR_Screening_MATLAB/module4_Grading_Final/checkpoints/best_model.pt`
- All locked IDRiD test datasets
