# RETINOVA — AI Pipeline Architecture & Modules

The RETINOVA AI pipeline is a multi-stage, human-in-the-loop clinical screening and explainability system designed for Diabetic Retinopathy (DR) triage in resource-constrained rural health settings.

---

## 1. Pipeline Execution Flow

```
Input Retinal Image (512x512)
        │
        ▼
[Module 1] EyeQ Image Quality Assessment (IQA Gate)
        │
        ├── Quality: Reject ──► Flag for Re-capture (ASHA notification)
        │
        ▼ Quality: Acceptable / Good
[Module 2] CLAHE Contrast Enhancement
        │
        ├────────────────────────────────┬───────────────────────────────┐
        ▼                                ▼                               ▼
[Module 3] Retinal Evidence      [Module 4] Swin V2 Tiny          [Module 5] Grad-CAM
Pathology Analysis (MATLAB)     DR Classification (PyTorch)       Visual Attribution
  - Vessel Density & Tortuosity    - 5-Grade (G0 - G4)               - Attribution Heatmap
  - Hemorrhage / Exudate Masks     - Calibrated Probabilities        - Lesion Spatial Overlay
  - Support Visual Biomarkers      - Referable DR Threshold
        │                                │                               │
        └────────────────────────────────┴───────────────────────────────┘
                                         │
                                         ▼
                            [Evidence Fusion & Report]
                                         │
                                         ▼
                               [Clinician Review Queue]
```

---

## 2. Pipeline Modules

### Module 1 — EyeQ Image Quality Assessment (IQA Gate)
- **Directory**: `module1_IQA/`
- **Role**: Automated quality gate ensuring only diagnostic-quality fundus scans enter deep learning classification.
- **Components**:
  - `checkFOV.m`: Field-of-view segmentation and pupil centering verification.
  - `calculateIllumination.m`: Exposure, non-uniform lighting, and contrast metrics.
  - `calculateSharpness.m`: Edge frequency gradient analysis.
  - `calibrateIQA_EyeQ.m`: Trained thresholds against the EyeQ benchmark.
  - `analyzeIQA.m`: Unified quality verdict (`Good`, `Usable`, `Reject`).

### Module 2 — CLAHE Image Enhancement
- **Directory**: `module2_Enhancement/`
- **Role**: Normalizes illumination variance, compensates for cataracts or media opacities, and enhances subtle microvascular details without introducing artificial structural artifacts.
- **Components**:
  - `enhanceFundusImage.m`: Contrast-Limited Adaptive Histogram Equalization in Lab color space.
  - `compare_enhancement.m`: PSNR and SSIM validation against raw input.

### Module 3 — Retinal Evidence & Pathology Analysis
- **Directories**: `module3_Segmentation/`, `module3_Supervised_Final/`
- **Role**: Extracts supportive morphological biomarkers to accompany the deep learning classification with observable clinical features.
- **Components**:
  - `extract_retinal_evidence.m`: Extracts candidate vessel topology, tortuosity metrics, and candidate lesion clusters.
  - `generate_evidence_panels.m`: Produces visual evidence overlays for clinical audit.
  - `validate_retinal_evidence.m`: Metric consistency checks across screening cohorts.
  - *Clinical Note*: Candidate lesion overlays represent supportive visual evidence for clinician review, not an independent diagnostic ground truth.

### Module 4 — Swin V2 Tiny DR Grading
- **Directory**: `module4_Grading_Final/`
- **Role**: Primary 5-grade Diabetic Retinopathy classifier trained on 512×512 fundus imagery.
- **Model**: Swin Transformer V2 Tiny (`models/swinv2_tiny.py`)
- **Grading Scale**:
  - `G0`: No Apparent Retinopathy
  - `G1`: Mild Non-Proliferative DR (NPDR)
  - `G2`: Moderate NPDR
  - `G3`: Severe NPDR
  - `G4`: Proliferative DR (PDR)
- **Calibration**: Temperature scaling applied (`calibration/temperature_scaling.py`, `calibration_params.json`).
- **Operating Threshold**: Referable DR cutoff optimized for rural screening sensitivity (`optimization/frozen_threshold.json`).

### Module 5 — Grad-CAM Explainability
- **Script**: `run_GradCAM.m`, `module4_Grading_Final/integration/swinV1_predictor.py`
- **Role**: Computes gradient-weighted class activation mappings highlighting the spatial regions of the fundus image that contributed most heavily to the predicted DR grade.
- **Attribution Matrix**: `attribution_matrix.mat` (calibrated layer weights for Swin V2 window attention blocks).

---

## 3. MATLAB / Python Bridge

- **Script**: `backend/matlab_bridge.py`
- **Architecture**: A high-performance FastAPI service coordinating the persistent MATLAB Engine session and PyTorch GPU inference in a single process.
- **Endpoints**:
  - `POST /api/screen`: Executes the complete multi-module screening pipeline on an uploaded fundus image.
  - `GET /api/health`: Real-time healthcheck for MATLAB Engine and Swin V2 Tiny model readiness.
  - `GET /api/simulink/run`: Runs the SimEvents resource planner simulation.
