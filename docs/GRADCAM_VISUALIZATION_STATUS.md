# Swin V1 Explainability Visualization Status Report

**Document Version:** 1.0.0  
**Date:** 2026-09-13  
**Project:** NetraAI (SIH26038) — AI-Assisted Diabetic Retinopathy Screening for Rural Healthcare  
**Target Model:** Frozen Swin V2 Tiny V1 (`swin_v2_t`)  
**Status:** **VERIFIED & OPERATIONAL (VISUALIZATION UPGRADE COMPLETE)**  

---

## 1. Executive Summary

This upgrade resolves the coarse, low-resolution grid artifact previously observed in the Swin V1 explainability output. The visualization has been upgraded from a single, coarse 16×16 spatial feature map to a **Multi-Scale Spatial Grad-CAM with Retinal FOV Attenuation and High-Resolution Translucent Overlay**.

The upgrade is **purely visual and explainability-focused**:
- **Model Checkpoint**: Frozen, untouched (`best_model.pt`)
- **Model Architecture**: Frozen Torchvision Swin V2 Tiny (`swin_v2_t`)
- **Operating Threshold**: Frozen at $\tau^* = 0.2993$
- **Calibration**: Frozen Temperature Scaling ($T = 1.4555$)
- **Prediction / Clinical Decisions**: Unchanged (Zero regression)
- **Calibrated Probability Check for `002c21358ce6.png`**: Verified at **`0.015015`** (1.50%), exactly matching the live reference benchmark to 6 decimal places.

---

## 2. Investigation of Previous Grad-CAM Source & Root Cause

| Aspect | Previous Implementation | Issue / Limitation |
| :--- | :--- | :--- |
| **Hook Target** | `model.backbone.features[-1]` (Stage 4) | $16 \times 16$ spatial grid ($32 \times 32$ patch downsampling). When displayed, individual $32 \times 32$ pixel transformer tokens appeared as blocky, coarse squares. |
| **Upsampling** | Nearest-neighbor or standard bilinear without smoothing | Produced a visible checkerboard grid across the retinal background. |
| **FOV Handling** | Absent | Gradients and attention leaked into the non-retinal black camera border. |
| **Overlay Transparency** | Grayscale or opaque blend | Obscured fine microvascular details, hemorrhages, and optic disc boundaries. |

---

## 3. High-Resolution Multi-Scale Attribution Architecture

### 3.1 Feature Layers & Multi-Scale Fusion
To retain fine spatial localization while honoring deep semantic context, forward and backward gradient hooks are placed on two complementary transformer stages:
1. **Stage 3 (`model.backbone.features[5]`)**:
   - Feature dimensions: $32 \times 32 \times 384$
   - Captures localized micro-structures, microaneurysms, exudate clusters, and vessel arcades.
2. **Stage 4 (`model.backbone.features[7]`)**:
   - Feature dimensions: $16 \times 16 \times 768$
   - Captures global retinal context, disc pathology, and severe proliferative neovascularization.

**Target Signal:** Gradients are backpropagated from the referable logit ($y_{\text{referable}}$, Class 1 in binary projection):
$$\alpha_k^{(s)} = \frac{1}{H_s \times W_s} \sum_{i=1}^{H_s} \sum_{j=1}^{W_s} \frac{\partial y_{\text{referable}}}{\partial A_{i,j,k}^{(s)}}$$

$$\text{CAM}^{(s)} = \text{ReLU}\left(\sum_k \alpha_k^{(s)} A_{:,:,k}^{(s)}\right)$$

**Multi-Scale Fusion:**
$$\text{CAM}_{\text{fused}} = 0.60 \times \text{CAM}^{(3)} + 0.40 \times \text{BicubicUpsample}(\text{CAM}^{(4)}, 32 \times 32)$$

### 3.2 Smooth Interpolation & Anti-Aliasing
- The fused $32 \times 32$ activation matrix is upsampled using **bicubic interpolation** with continuous antialiasing to the full image resolution ($512 \times 512$).
- A Gaussian spatial smoothing filter ($\sigma = 6.0$ px) is applied to remove token boundary discontinuities without blurring focal hot spots.
- Normalized dynamically:
$$\text{CAM}_{\text{norm}} = \frac{\text{CAM} - \min(\text{CAM})}{\max(\text{CAM}) - \min(\text{CAM}) + \epsilon}$$

### 3.3 Retinal Field-of-View (FOV) Isolation
To ensure zero attribution is attributed to the non-retinal imaging mask:
1. A binary mask of the retinal disc is computed from the fundus image via thresholding and morphological closing.
2. An interior boundary erosion ($3 \times 3$ kernel, 4 iterations) eliminates lens boundary reflections.
3. The boundary is softly feathered using Gaussian attenuation ($\sigma = 3.0$ px).
4. The normalized CAM is strictly masked:
$$\text{CAM}_{\text{FOV}} = \text{CAM}_{\text{norm}} \odot \text{Mask}_{\text{retinal}}$$

### 3.4 Perceptually Clear Medical Color Mapping & Translucent Overlay
- **Colormap**: Medical Jet progression (Deep Blue $\rightarrow$ Cyan $\rightarrow$ Green $\rightarrow$ Yellow $\rightarrow$ Orange $\rightarrow$ Bright Red).
- **Underlying Structure Preservation**: Instead of an opaque overlay, a non-linear attribution-weighted alpha blending formula is applied:
$$\alpha(x, y) = \left[\text{CAM}_{\text{FOV}}(x, y)\right]^{1.2} \times 0.45$$
$$I_{\text{overlay}}(x, y) = (1 - \alpha(x, y)) \cdot I_{\text{fundus}}(x, y) + \alpha(x, y) \cdot C_{\text{jet}}\left(\text{CAM}_{\text{FOV}}(x, y)\right)$$
- Regions with low/baseline attribution remain virtually transparent, displaying true retinal anatomy (macula, vessels, disc).
- Regions with high model attribution reveal warm yellow/orange/red highlights while preserving underlying vessel paths and lesions.

---

## 4. Output Specifications & Artifact Dimensions

| Artifact | File Name | Format | Dimensions | Channels / Data Type | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Model Attribution Overlay** | `gradcam_overlay.png` | PNG | $512 \times 512$ | 3-Channel RGB (uint8) | **Primary report image**: Semi-transparent medical Jet heatmap overlaid on original fundus scan. |
| **Raw Heatmap Visualization** | `gradcam_raw.png` | PNG | $512 \times 512$ | 3-Channel RGB (uint8) | High-resolution Jet heatmap showing model activation landscape within retinal FOV. |
| **Attribution Matrix** | `attribution_matrix.mat` | MAT (v7) | $512 \times 512$ | Float32 Single-precision | Raw normalized matrix for scientific reproducibility and clinical audit. |

### Output File Locations
1. **Workspace Root**:
   - `c:\Users\Appasaheb\OneDrive\Documents\MATLAB\NetraAI\gradcam_overlay.png`
   - `c:\Users\Appasaheb\OneDrive\Documents\MATLAB\NetraAI\gradcam_raw.png`
   - `c:\Users\Appasaheb\OneDrive\Documents\MATLAB\NetraAI\attribution_matrix.mat`
2. **Backend Uploads Directory**:
   - `DR/backend/uploads/gradcam_overlay_{run_id}.png`
   - `DR/backend/uploads/gradcam_raw_{run_id}.png`
   - `DR/backend/uploads/attribution_matrix_{run_id}.mat`

---

## 5. Clinical Report Compliance

The clinical screening report (`reportService.ts`, HTML view, and `generate_card.py` PNG card) displays:
1. **Left Panel**: Original Fundus image
2. **Right Panel**: Model Attribution Overlay (`gradcam_overlay.png`)

### Clinical Explanation & Governance Text
The report includes the required clinical AI disclaimers:
- **Primary Explanation**:
  > *"Highlighted retinal regions indicate areas that contributed most strongly to the model's screening prediction."*
- **Clinical Governance Caveat**:
  > *\* Attribution is model evidence, not a diagnostic ground-truth mask.*

---

## 6. Regression Verification Results

### Regression Case 1: `002c21358ce6.png` (Non-Referable / Normal Fundus)
| Parameter | Reference Value | Verified Live Value | Status |
| :--- | :--- | :--- | :--- |
| **Quality Gate (IQA)** | ACCEPT (Good, 100%) | ACCEPT (Good, 100%) | **PASS** |
| **Predicted Grade** | Grade 0 (No DR) | Grade 0 (No DR) | **PASS** |
| **Raw P(G2+)** | $0.002262$ | $0.002262$ | **PASS** |
| **Temperature $T$** | $1.4555$ | $1.4555$ | **PASS** |
| **Calibrated P(G2+)** | **`0.015015`** (1.50%) | **`0.015015`** (1.50%) | **CRITICAL PASS** ($\Delta < 10^{-7}$) |
| **Decision Threshold** | $\tau^* = 0.2993$ | $\tau^* = 0.2993$ | **PASS** |
| **Screening Decision** | **SCREEN** | **SCREEN** | **PASS** |
| **Visual Attribution** | Smooth overlay, no grid | Smooth overlay, no grid | **PASS** |
| **Underlying Retina** | Vessels & fovea intact | Vessels & fovea intact | **PASS** |

### Regression Case 2: `001639a390f0.png` (Referable DR / Severe Proliferative DR)
| Parameter | Reference Value | Verified Live Value | Status |
| :--- | :--- | :--- | :--- |
| **Quality Gate (IQA)** | ACCEPT (Good, 52.5%) | ACCEPT (Good, 52.5%) | **PASS** |
| **Predicted Grade** | Grade 4 (Proliferative DR) | Grade 4 (Proliferative DR) | **PASS** |
| **Raw P(G2+)** | $0.999825$ | $0.999825$ | **PASS** |
| **Calibrated P(G2+)** | **`0.9974`** (99.7%) | **`0.997384`** (99.7%) | **PASS** |
| **Screening Decision** | **REFER** | **REFER** | **PASS** |
| **Visual Attribution** | Focal warm highlights | Focal warm highlights at disc & lesion zones | **PASS** |
| **Underlying Retina** | Retinal structures preserved | Retinal structures preserved | **PASS** |

---

## 7. Pipeline Files Modified

1. **`DR_Screening_MATLAB/module4_Grading_Final/integration/swinV1_predictor.py`**:
   - Implemented `MultiScaleGradCAM` registering hooks on Stage 3 (`features[5]`) and Stage 4 (`features[7]`).
   - Added `compute_retinal_fov_mask()` for automated boundary detection and edge attenuation.
   - Added `get_medical_jet_lut()` and non-linear alpha overlay compositing.
   - Exports `gradcam_heatmap` (float32 array), `gradcam_overlay` (uint8 RGB array), and `gradcam_raw` (uint8 RGB array).
2. **`DR_Screening_MATLAB/module4_Grading_Final/integration/run_SwinV1.m`**:
   - Added extraction and typing of `gradcam_overlay` and `gradcam_raw` from JSON payload.
3. **`DR_Screening_MATLAB/module4_Grading_Final/integration/model_adapter.m`**:
   - Propagates `gradcam_overlay` and `gradcam_raw` into MATLAB `gradeResult` struct.
4. **`DR_Screening_MATLAB/module4_Grading_Final/integration/run_NetraAI_SwinV1.m`**:
   - Bundles `overlayRGB` and `rawRGB` into `result.explainability`.
5. **`DR/backend/matlab_bridge.py`**:
   - Saves `gradcam_overlay.png`, `gradcam_raw.png`, and `attribution_matrix.mat` to both `uploads/` and repository root.
   - Routes `overlay_url` as primary `gradcam_url`.
6. **`DR/backend/generate_card.py`**:
   - Updated disclaimer text to exact required clinical wording: `* Attribution is model evidence, not a diagnostic ground-truth mask.`

---

## 8. Conclusion

The explainability visualization for the frozen Swin V1 model is verified, clinically readable, and mathematically faithful to the underlying Vision Transformer feature representations. All probabilities, screening decisions, and clinical parameters remain strictly identical.
