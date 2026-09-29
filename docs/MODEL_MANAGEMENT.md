# RETINOVA AI Model Lifecycle & OTA Update Management

---

## 1. Overview & Operational Principles

Edge devices deployed in remote rural health camps or highway corridors cannot rely on continuous high-speed connectivity to re-train or query centralized AI models.

RETINOVA implements a **Certified Model Registry with Over-The-Air (OTA) Delivery and Safe Fallback Rollback**.

```
                           MODEL REGISTRY (CLOUD)
               Certified Checkpoints (PyTorch / ONNX / TFLite)
                                      │
               ┌──────────────────────┴──────────────────────┐
               ▼                                             ▼
       STAGING / VALIDATION                        ACTIVE PRODUCTION
   (Vessel-Coupled v2.5.0-beta)                  (Swin V2 Tiny v2.4.0)
               │                                             │
               └──────────────────────┬──────────────────────┘
                                      │
                         OTA Download (Background)
                                      │
                                      ▼
                             EDGE DEVICE NODE
                        ┌───────────────────────────┐
                        │ Step 1: Download Weights  │
                        │ Step 2: Verify SHA-256    │
                        │ Step 3: Dry-Run Inference │
                        │ Step 4: Atomic Activation │
                        └─────────────┬─────────────┘
                                      │
                ┌─────────────────────┴─────────────────────┐
                │                                           │
         Verification SUCCESS                        Verification FAILED
                │                                           │
                ▼                                           ▼
      Activate New Model Version                 Revert to Previous Version
  (Seamless operational transition)          (Offline inference never breaks)
```

---

## 2. Model Registry Schema

Defined in [`backend/src/types/platform.ts`](file:///c:/Users/Appasaheb/OneDrive/Desktop/app/backend/src/types/platform.ts):

```typescript
export interface ModelRegistryRecord {
  model_id: string;               // Unique model identifier (e.g. model_swinv2_tiny_dr)
  workflow_id: string;            // Target AI workflow (e.g. retinal_dr_swinv2)
  version: string;                // Semantic version (e.g. 2.4.0)
  name: string;                   // Human readable model name
  format:                         // Weight serialization format
    | 'PYTORCH_PT'
    | 'ONNX'
    | 'TFLITE'
    | 'TORCHSCRIPT';
  size_bytes: number;             // Model file size in bytes
  checksum_sha256: string;        // SHA-256 cryptographic hash
  download_url: string;           // Direct binary download path
  status:                         // Lifecycle status
    | 'ACTIVE'
    | 'DEPRECATED'
    | 'STAGING'
    | 'ARCHIVED';
  min_app_version: string;        // Minimum Android APK version required to run this model
  release_notes: string;          // Clinical / engineering changelog
  created_at: string;             // Registration timestamp
}
```

---

## 3. OTA Update Lifecycle

### Phase 1: Update Check
The edge device checks `GET /api/platform/models/check-update/:deviceId`.
The server compares the device's `model_version` against the latest `ACTIVE` model in the registry for its assigned workflow and checks if the device's `app_version >= min_app_version`.

### Phase 2: Background Download & Checksum Verification
If an update is available, the device downloads the model artifact in the background without interrupting active clinical screenings. Upon download completion:
$$\text{Computed Hash} = \text{SHA-256}(\text{downloaded\_file})$$
The computed hash must match `checksum_sha256` bit-for-bit.

### Phase 3: Edge Dry-Run Validation
Before promoting the new weights into production, the edge engine executes an internal dry-run inference on a cached calibration frame. This ensures tensor operations execute without memory leaks or segmentation faults on the device's specific GPU/NPU/CPU accelerator.

### Phase 4: Atomic Activation or Safe Fallback
* **Success:** If checksum matches and dry-run succeeds, the device activates the new model, updates its local state, and notifies the cloud via `POST /api/platform/models/activate`.
* **Failure (Integrity or Inference Error):** If checksum fails or dry-run fails, the device **immediately discards the corrupted file and retains the previous operational model**. Offline inference capability is never interrupted.

---

## 4. Automated Verification Results

Integration tests executed in [`backend/src/test_platform.ts`](file:///c:/Users/Appasaheb/OneDrive/Desktop/app/backend/src/test_platform.ts):
1. **Corrupted Checksum Injection:** Device attempted activation with invalid hash. Server rejected activation (`HTTP 200`, `success: false`, `status: 'REVERTED_TO_PREVIOUS'`), keeping previous model active and logging security audit event.
2. **Valid Checksum Activation:** Device supplied valid SHA-256 hash (`e3b0c44298fc1c...`). Activation approved (`success: true`, `status: 'ACTIVATED'`).
