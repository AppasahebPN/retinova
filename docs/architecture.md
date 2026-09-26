# System Architecture: NetraAI DR Screening Platform (SIH26038)

## 1. Overview
NetraAI is an explainable AI-assisted Diabetic Retinopathy (DR) screening and clinical decision support system designed specifically for Primary Health Centres (PHCs) and Community Health Centres (CHCs) in rural India.

The architecture strictly decouples the Web Interface and REST Backend from the computational AI and Simulation engines (developed in MATLAB), ensuring zero friction when substituting mock engines with production MATLAB deployments.

---

## 2. Decoupled Service Boundary

```
+-------------------------------------------------------------------------+
|                              REACT FRONTEND                             |
|   - Guided 4-Step Screening Workflow                                    |
|   - Interactive Pan/Zoom Fundus Viewer with Layer Overlays               |
|   - Grad-CAM Attention Heatmap & Lesion Candidate Inspector             |
|   - SimEvents Operational Capacity Simulator UI                         |
+-------------------------------------------------------------------------+
                                    | REST (JSON / JWT / CORS)
                                    v
+-------------------------------------------------------------------------+
|                        NODE.JS / TYPESCRIPT BACKEND                     |
|   - Authentication & Role-Based Access Control                          |
|   - Relational Database Persistence (PostgreSQL / SQLite fallback)      |
|   - File Upload & Local/S3 Asset Storage                                |
|   - Service Adapters (AI & Simulation Factories)                        |
+-----------------------------------+-------------------------------------+
                                    |
            +-----------------------+-----------------------+
            |                                               |
            v                                               v
+-----------------------+                       +-----------------------+
|  AI INFERENCE SERVICE |                       |  SIMULATION SERVICE   |
|  (IAIInferenceService)|                       |  (ISimulationService) |
+-----------+-----------+                       +-----------+-----------+
            |                                               |
     +------+------+                                 +------+------+
     |             |                                 |             |
     v             v                                 v             v
+----------+ +-----------+                      +----------+ +-----------+
|   Mock   | |  MATLAB   |                      |   Mock   | |  MATLAB   |
| Heuristic| | Production|                      | Queueing | | Simulink/ |
|  Engine  | |   Server  |                      |  Engine  | | SimEvents |
+----------+ +-----------+                      +----------+ +-----------+
```

---

## 3. The 6 MATLAB Pipeline Modules

1. **Module 1 — Image Quality Assessment (IQA)**
   - Computes Sharpness index, Illumination homogeneity, Field of View (FOV) coverage, and flash/dust artifact area.
   - Categorizes scan as `ACCEPTED` or `REJECTED` with specific re-capture guidance.

2. **Module 2 — Image Enhancement**
   - Applies illumination normalization and Controlled Contrast-Limited Adaptive Histogram Equalization (CLAHE).
   - Enhances vascular definition without introducing artificial micro-lesions.

3. **Module 3 — Retinal Vessel & Lesion Candidate Segmentation**
   - Extracts binary vessel arborization map (calculating vessel coverage %).
   - Identifies candidate microaneurysms, hemorrhages, and exudates (candidate count & area %).

4. **Module 4 — DR Classification & Confidence Calibration**
   - Grades severity on the International Clinical Diabetic Retinopathy (ICDR) scale:
     - Grade 0: No DR
     - Grade 1: Mild Non-Proliferative DR
     - Grade 2: Moderate Non-Proliferative DR
     - Grade 3: Severe Non-Proliferative DR
     - Grade 4: Proliferative DR
   - Applies Platt Calibration & Temperature Scaling to raw softmax outputs to guarantee clinical reliability.

5. **Module 5 — Explainability Engine (Grad-CAM)**
   - Computes Gradient-weighted Class Activation Maps across the final convolutional layer.
   - Generates pixel-aligned jet heatmaps and bounding attention regions.

6. **Module 6 — Simulink / SimEvents Operational Simulation**
   - Models rural clinic queuing dynamics: patient Poisson arrival $\rightarrow$ camera station $\rightarrow$ IQA loop $\rightarrow$ AI server $\rightarrow$ ophthalmologist review.
   - Identifies bottlenecks and recommends resource scaling before physical camp deployments.
