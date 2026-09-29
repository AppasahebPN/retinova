# RETINOVA — Retinal Screening Pipeline Audit

> **Audited**: 2026-09-29
> **Auditor**: System Architecture Review
> **Scope**: End-to-end fundus image → AI inference → evidence → display pipeline

---

## A. Where the Fundus Image Enters the System

### Mobile App (Web / Android)
- **ImageCaptureScreen.tsx** — Camera or gallery picker acquires image
- Image URI is a `blob:` URL (web) or `file://` URI (native)
- Passed as `imageUri` route param to `ProcessingScreen.tsx`

### ProcessingScreen.tsx (Mobile Edge Path)
- Receives `imageUri` from navigation params
- Uses **on-device** `aiModel.ts` (EdgeSwinV2Model) for local inference
- Does NOT upload to backend for AI processing

### Web Dashboard (Backend Path)
- `screeningController.uploadImage()` receives multipart form upload
- Saved via `multer` to `backend/uploads/` directory
- Returns `storageUrl: "/uploads/{filename}"`

---

## B. Where It Is Temporarily Stored

- **Web browser**: `blob:` URL in browser memory (garbage collected on page unload)
- **Android native**: `file://` URI from Expo ImagePicker (temporary cache)
- **Backend**: Written to `backend/uploads/` via multer

---

## C. Where It Is Permanently Stored Locally

- **Mobile (Web/Android)**: `localDatabase.ts` stores the `imageUri` as `localImagePath` in an AsyncStorage-backed `DetectionEvent` record
- **Backend**: `backend/uploads/` directory (configured via `STORAGE_PATH` env var)

---

## D. Where the Image Is Passed to the AI Model

### Path 1: Mobile Edge AI (ProcessingScreen.tsx → aiModel.ts)
- `aiModel.ts` receives the raw image URI string
- **CRITICAL**: `EdgeSwinV2Model.predict()` does NOT load image pixels
- It hashes the URI string to produce a deterministic seed, then generates synthetic logits
- This is a **simulation**, not real inference

### Path 2: Backend Server AI (screeningService.ts → ai/index.ts)
- Backend config `AI_SERVICE_TYPE=matlab` → uses `MatlabAIService.ts`
- `MatlabAIService.analyzeImage()` sends HTTP POST to `http://127.0.0.1:8000/analyze`
- If MATLAB service is offline, this throws an error
- Backend config `AI_SERVICE_TYPE=mock` → uses `MockAIService.ts` (synthetic results)

---

## E-F. Where Swin V2 Tiny Is Loaded and Inference Occurs

### Mobile Edge
- `aiModel.ts`: `load()` simulates 80ms delay. **No actual model weights loaded.**
- `predict()`: Hash-based grade selection with synthetic softmax probabilities

### Backend (MATLAB Path)
- Actual Swin V2 Tiny in `ai-pipeline/module4_Grading_Final/checkpoints/`
- Delegates to `http://127.0.0.1:8000/analyze` bridge

### Backend (Mock Path)
- `MockAIService.ts`: Hash-based deterministic simulation

---

## G-H. Where Grad-CAM and Vessel Segmentation Are Generated

### Mobile Edge: **Not generated at all**
- `screeningService.ts getById()` reuses `found.localImagePath` for both `gradcam_url` and `vessel_mask_url`

### Backend MATLAB: Real generation via MATLAB bridge
### Backend Mock: Returns pre-generated SVG file paths

---

## I-J. Evidence Files and Backend Response

- Backend `uploads/` directory contains SVG, PNG, MAT, and JSON files
- Backend returns server-relative paths like `/uploads/fundus_g2_left_gradcam.svg`

---

## K. The Malformed URL Bug

### `screeningService.fullImageUrl()` Logic
1. `blob:`, `data:`, `file:`, `http://`, `https://` → return as-is
2. Server-relative `/uploads/...` → prepend API base URL

### BUG: `http://localhost:5000blob:http://10.63.162.244:5000/uuid`
This occurs when a `blob:` URL is stored as `storage_url` then later processed by code
that doesn't go through `fullImageUrl()`. The fix: never persist `blob:` URIs as permanent
storage URLs — always use the server-relative path from upload response.

---

## L-M. Android Storage and AWS Sync

- `localDatabase.ts` stores `DetectionEvent` with `localImagePath`
- `syncManager.ts` POSTs to `/api/detections/sync` when online
- **Actual S3 upload is not implemented** — placeholder paths only

---

## Critical Issues & Resolution Status

| # | Issue | Severity | Status | Resolution |
|---|-------|----------|--------|------------|
| 1 | Mobile AI was hash-simulation | HIGH | RESOLVED | Connected `ProcessingScreen.tsx` to server upload & real Swin V2 Tiny AI execution. |
| 2 | `blob:` URLs persisted as storage URLs | CRITICAL | RESOLVED | Upload response gives server-relative `/uploads/...` paths; blobs never stored as permanent server storage URLs. |
| 3 | Malformed URL: `baseUrl + blob:` | CRITICAL | RESOLVED | `fullImageUrl` checks `blob:`, `data:`, `file:`, `http://`, `https://` first and returns as-is. |
| 4 | No Grad-CAM on edge / fake Grad-CAM | MEDIUM | RESOLVED | Swin V2 Tiny GPU pipeline generates real Grad-CAM overlay and raw heatmap PNGs (`/uploads/gradcam_overlay_{id}.png`). Fake mapping in `getById` removed. |
| 5 | No vessel segmentation | MEDIUM | RESOLVED | Real MATLAB Module 3 vascular segmentation generates real vessel mask PNGs (`/uploads/vessels_{id}.png`) & composite evidence. |
| 6 | Landing page showed non-healthcare verticals | LOW | RESOLVED | Redesigned landing page to 100% Healthcare/Diabetic Retinopathy focus. Zero non-healthcare mentions. |
| 7 | MATLAB bridge was not running | HIGH | RESOLVED | Fixed port conflict and relative path resolution in `swinV1_predictor.py`. Bridge is live on port 8000 with persistent GPU Swin V2 Tiny model & MATLAB Engine. |
| 8 | S3 upload placeholder | LOW | DOCUMENTED | Local file storage implemented in `backend/uploads/` with secure static serving; syncManager queued for network upload. |

---

## Verified End-to-End Pipeline Execution

- **Image Ingestion**: Fundus image received via camera/picker -> uploaded via `/api/screenings/upload` -> saved as `backend/uploads/fundus_upload_{uuid}.jpeg`.
- **Screening Entity**: Created via `/api/screenings` with `imageStorageUrl: "/uploads/..."`.
- **Inference Execution**: Triggered via `/api/screenings/:id/analyze` -> calls `MatlabAIService.analyzeImage` -> calls `http://127.0.0.1:8000/analyze`.
- **AI Processing**:
  - Module 1 (EyeQ Quality Gate): GPU classification (Accepted / Usable / Reject).
  - Module 2 (Enhancement): CLAHE green-channel normalization.
  - Module 3 (Retinal Evidence): Vessel segmentation mask + candidate lesion extraction + composite retinal evidence map.
  - Module 4 (Swin V2 Tiny): GPU forward pass with calibrated probability $P(G2+)$ (threshold $\tau = 0.2993$).
  - Module 5 (Grad-CAM): Multi-scale stage 3 + stage 4 backward activation attribution with Medical Jet LUT overlay.
- **Evidence Output**: Real PNG artifacts saved in `backend/uploads/` and served via HTTP 200:
  - `fundus_upload_{uuid}.jpeg` (Original fundus)
  - `gradcam_overlay_{id}.png` (Grad-CAM saliency map)
  - `vessels_{id}.png` (Segmented retinal vascular tree)
  - `retinal_evidence_{id}.png` (Multi-layer composite evidence)
- **Clinical Triage**: Grade 0-4 classification, calibrated confidence percentage, and referral status (REFER / SCREEN / RECAPTURE).
- **Offline Reliability**: Gracefully falls back to local storage queue with `syncStatus: "PENDING"` when offline, syncing automatically when connectivity returns.
