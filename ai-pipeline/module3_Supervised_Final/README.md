# NetraAI Retinal Evidence Subsystem (Module 3 Supervised Final)

## Clinical Evidence Scope & Boundary

This subsystem extracts anatomical landmarks and candidate retinal lesion evidence for clinician review and explainability in diabetic retinopathy tele-screening.

### 1. Locked Test Set Compliance
- **Official IDRiD Test Sets**:
  - Part A (Segmentation Test Set: 27 images)
  - Part B (Optic Disc / Fovea Test Set: 103 images)
  - Part C (Disease Grading Test Set: 103 images)
- **Status**: **PERMANENTLY LOCKED & UNTOUCHED**.
- **Compliance Policy**: In strict adherence to scientific rigor, the official test sets were **never** accessed, evaluated, tuned against, or peeked at during thresholding, feature design, or hyperparameter selection.

### 2. Development Validation Protocol
- **Data Source**: 54 official Part A training images partitioned at the image level into:
  - **43 Images**: Train-development subset
  - **11 Images**: Validation-development holdout subset (`IDRiD_03`, `10`, `15`, `20`, `23`, `25`, `31`, `34`, `39`, `40`, `53`)
- **Distinction**: All reported development validation metrics represent internal holdout performance on this 11-image split and must be strictly distinguished from official independent test set benchmarks.

### 3. Retinal Evidence Categories & Validation State
| Category | Modality / Source | Validation Status | Clinical Label |
| :--- | :--- | :--- | :--- |
| **Optic Disc (OD)** | Multi-scale circularity & vessel convergence | Validated on Development Split | Anatomical Landmark |
| **Fovea** | Anatomical distance prior + intensity valley | Validated on Development Split | Anatomical Landmark |
| **Retinal Vessels** | Morphological matched filtering | Heuristic (No IDRiD vessel GT) | *Heuristic vessel extraction — not clinically validated* |
| **Microaneurysms (MA)** | Punctate green-channel contrast filter | Candidate Lesion Detection | *Candidate lesions — evidence only* |
| **Haemorrhages (HE)** | Dark blot & flame morphological detector | Candidate Lesion Detection | *Candidate lesions — evidence only* |
| **Hard Exudates (EX)** | Bright reflective deposit detector | Candidate Lesion Detection | *Candidate lesions — evidence only* |
| **Soft Exudates (SE)** | Fluffy cotton-wool spot detector | Candidate Lesion Detection | *Candidate lesions — evidence only* |
| **Neovascularization (NV)**| N/A (No IDRiD pixel ground truth) | **Not Validated / Unavailable** | *Neovascularization not validated — unavailable* |

### 4. Absence of Fabricated Evidence
- **Zero Synthetic Masks**: No artificial or synthetic ground truth masks are fabricated for Neovascularization or any unvalidated pathology.
- **Model Attribution**: Attribution overlays (Grad-CAM) depict the spatial attention of the Swin V1 neural network; they are qualitative evidence maps, not diagnostic ground-truth segmentations.
