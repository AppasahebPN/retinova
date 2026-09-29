# RETINOVA Modular AI Workflow Engine Architecture

---

## 1. Architectural Philosophy

RETINOVA is engineered as a **Pluggable Edge AI Workflow Engine**. The platform core handles offline data persistence, hardware acceleration, camera acquisition, cryptographically verifiable telemetry, and decoupled cloud synchronization. Industry-specific domain logic is encapsulated inside self-contained **AI Workflow Modules**.

```
                           AI WORKFLOW ENGINE (CORE)
                                      │
         ┌────────────────────────────┼────────────────────────────┐
         │                            │                            │
   [HEALTHCARE]                  [INSURANCE]                 [GOVERNMENT]
Retinal DR Screening        Asset Damage Inspection      Road Defect Infrastructure
  (Flagship: Swin V2)         (Quantized ONNX)             (Cavitary Hazard Head)
```

---

## 2. Generic `AIWorkflow` Interface Specification

Every AI workflow module adheres to the uniform interface contract defined in [`backend/src/services/aiWorkflowEngine.ts`](file:///c:/Users/Appasaheb/OneDrive/Desktop/app/backend/src/services/aiWorkflowEngine.ts):

```typescript
export interface AIWorkflow<TInput = any, TOutput = any, TEvent = any> {
  workflowId: string;
  vertical: WorkflowVertical;
  name: string;
  modelVersion: string;

  /** Initializes module dependencies and hyperparameter weights */
  initialize(config?: Record<string, any>): Promise<void>;

  /** Transforms raw edge input (tensors, camera frames, sensor readings) */
  preprocess(input: TInput): Promise<any>;

  /** Executes edge/cloud inference using local neural backbone */
  predict(preprocessed: any): Promise<TOutput>;

  /** Applies clinical/underwriting business logic, calibration & thresholds */
  postprocess(rawOutput: TOutput): Promise<any>;

  /** Generates explainability artifacts (Grad-CAM heatmaps, segmentation masks) */
  generateEvidence(input: TInput, result: any): Promise<any>;

  /** Assembles a standardized organization-scoped event record */
  generateEvent(context: {
    organizationId: string;
    deviceId: string;
    result: any;
    evidence: any;
    metadata?: Record<string, any>;
  }): Promise<TEvent>;

  getModelVersion(): string;
  getConfiguration(): Record<string, any>;
}
```

---

## 3. Implemented Vertical Modules

### 3.1 Healthcare: Retinal Screening (`retinal_dr_swinv2`) — Flagship
* **Input Type:** Fundus optical photography from portable smartphone ophthalmoscopes or desktop fundus cameras.
* **Neural Architecture:** Swin Transformer V2 Tiny with shifted window self-attention and dual prediction heads:
  * Head 1: Binary Referable DR ($G \ge 2$) with temperature scaling ($T = 1.341$).
  * Head 2: 5-Grade ICDR severity classification (R0 No DR to R4 Proliferative DR).
* **Evidence:** High-resolution Grad-CAM spatial attribution heatmaps overlaid on retinal vessel segmentation.
* **Output:** Clinical Dossier with automated Primary Health Centre (PHC) to District Hospital referral urgency.

### 3.2 Insurance: Asset Damage Assessment (`asset_damage_v1`)
* **Input Type:** Multi-angle RGB camera frames of motor vehicles or property exterior walls.
* **Neural Architecture:** Quantized MobileNet-V3 / ONNX multi-class fracture segmenter.
* **Output Classes:** Undamaged, Minor Cosmetic Scratch, Moderate Structural Dent, Severe Component Fracture, Total Loss.
* **Evidence:** Impact vector coordinates and segmented area contours.
* **Output:** Fast-track claims settlement authorization with algorithmic repair estimate range (INR).

### 3.3 Government: Infrastructure Defect Audit (`field_infrastructure_v1`)
* **Input Type:** Forward-facing dashcam video stream or mobile surveyor photos.
* **Neural Architecture:** Pavement surface defect contour classifier.
* **Output Classes:** Sound Pavement, Pothole Hazard, Culvert Blockage, Bridge Spall, Severe Erosion.
* **Evidence:** Estimated pothole depth (cm), surface area ($m^2$), and GPS geo-stamp.
* **Output:** Municipal Public Works Department (PWD) automated priority work order.

### 3.4 Security: Tactical Perimeter Surveillance (`perimeter_security_v1`)
* **Input Type:** Dual optical and long-wave infrared (thermal) sensor streams.
* **Neural Architecture:** Spatio-temporal boundary breach detector.
* **Output Classes:** Clear Zone, Wildlife / False Positive, Authorized Personnel, Fence Breach.
* **Evidence:** Thermal delta signature ($^\circ C$) and intrusion direction vector.
* **Output:** Tactical Security Operations Center (SOC) immediate incident dispatch.

---

## 4. Execution Pipeline & Validation

The pipeline is coordinated via `AIWorkflowEngine.getInstance().executePipeline()`:
1. Validates that the target organization has licensed and enabled the workflow.
2. Runs `preprocess()` -> `predict()` -> `postprocess()`.
3. Synthesizes explainability evidence via `generateEvidence()`.
4. Assembles an immutable event record via `generateEvent()` ready for local offline storage or AWS DynamoDB ingestion.

**Automated verification:** Tested successfully in [`backend/src/test_platform.ts`](file:///c:/Users/Appasaheb/OneDrive/Desktop/app/backend/src/test_platform.ts), executing Healthcare and Insurance pipelines with full evidence generation.
