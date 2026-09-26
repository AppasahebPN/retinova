# RETINOVA

**Explainable AI for Diabetic Retinopathy Screening in Rural India**

**Problem Statement / Project Code**: SIH26038  
**Team**: Career Crafters  
**Institution**: Presidency University, Bengaluru  

[![Status: Working Prototype](https://img.shields.io/badge/Status-Working%20Prototype-success.svg)](https://github.com/AppasahebPN/retinova)
[![Architecture: Swin V2 Tiny + MATLAB Engine](https://img.shields.io/badge/Architecture-Swin%20V2%20Tiny%20%2B%20MATLAB-blue.svg)](https://github.com/AppasahebPN/retinova)
[![Simulation: Simulink / SimEvents](https://img.shields.io/badge/Simulation-Simulink%20%2F%20SimEvents-orange.svg)](https://github.com/AppasahebPN/retinova)
[![License: MIT](https://img.shields.io/badge/License-MIT-lightgrey.svg)](LICENSE)

---

## Project Overview

**RETINOVA** is an end-to-end, clinically centered tele-ophthalmology screening platform engineered to address the critical shortage of eye care specialists in rural India. Operating on a **human-in-the-loop** paradigm, the system empowers frontline **ASHA (Accredited Social Health Activist) workers** at Primary Health Centers (PHCs) to acquire retinal fundus images with portable non-mydriatic cameras, automatically gates capture quality through an EyeQ-calibrated Image Quality Assessment (IQA) module, and executes deep-learning-based Diabetic Retinopathy (DR) grading powered by a **Swin Transformer V2 Tiny** model. 

Crucially, RETINOVA rejects black-box triage by fusing the classification output with **Grad-CAM visual attribution heatmaps**, **microvascular tortuosity metrics**, and **candidate lesion overlays**. This evidence package is presented directly to remote reviewing ophthalmologists, who retain final clinical authority for disposition and referral to tertiary eye hospitals, while district health officers monitor population health and simulate workforce capacity with integrated **Simulink / SimEvents** discrete-event resource planning models.

---

## Table of Contents

1. [Problem Statement](#1-problem-statement)
2. [Solution & Clinical Workflow](#2-solution--clinical-workflow)
3. [System Architecture](#3-system-architecture)
4. [AI Pipeline & Explainability](#4-ai-pipeline--explainability)
5. [User Roles & Functional Workflows](#5-user-roles--functional-workflows)
6. [Technology Stack](#6-technology-stack)
7. [Simulink & SimEvents Resource Planning](#7-simulink--simevents-resource-planning)
8. [Data Flow & Lifecycle](#8-data-flow--lifecycle)
9. [Local Environment Setup](#9-local-environment-setup)
10. [One-Command Pipeline Startup](#10-one-command-pipeline-startup)
11. [Deployment Architecture](#11-deployment-architecture)
12. [Deployment Estimates](#12-deployment-estimates)
13. [Limitations & Ethical Boundaries](#13-limitations--ethical-boundaries)
14. [Project Status & Roadmap](#14-project-status--roadmap)
15. [Project Links](#15-project-links)

---

## 1. Problem Statement

Diabetic Retinopathy (DR) is one of the leading causes of preventable blindness in India, affecting approximately 18%–22% of the country's 100+ million diabetic patients. Early detection through periodic fundus screening reduces the risk of severe vision loss by over 90%. However, widespread screening in rural and peri-urban India faces systemic barriers:

1. **Severe Specialist Deficit**: Over 70% of India's population resides in rural areas, yet more than 75% of ophthalmologists are concentrated in tier-1/tier-2 metropolitan centers. The ratio of ophthalmologists to the rural population is estimated at less than 1 : 100,000.
2. **Poor Image Quality in Field Settings**: Handheld, non-mydriatic fundus cameras deployed in field clinics frequently produce under-exposed, blurry, or miscentered images due to small pupil diameters, operator inexperience, or ocular media opacities (e.g., early cataracts). Blindly submitting degraded scans to an AI model causes misclassifications and diagnostic errors.
3. **Black-Box AI Trust Deficit**: Clinicians understandably resist adopting automated models that output a standalone severity score without transparent anatomical or visual justification.
4. **Disjointed Referral & Planning Networks**: When referrals are recommended in rural camps, patients often fail to reach tertiary care due to lack of longitudinal tracking, while district administrators lack operational visibility into backlog queues and capacity constraints.

---

## 2. Solution & Clinical Workflow

RETINOVA resolves these barriers through an integrated **human-in-the-loop** workflow:

```
[ Rural Patient ]
       │
       ▼
[ ASHA Worker ] ──► Portable Non-Mydriatic Fundus Capture
       │
       ▼
[ Automated IQA Gate ]
       ├── If Rejected ──► Immediate Guidance & On-site Recapture
       │
       ▼ If Diagnostic Quality
[ AI Pipeline Execution ]
       ├── Enhancement (CLAHE in Lab Color Space)
       ├── Pathology Extraction (Vessel Topology & Candidate Lesions)
       ├── DR Classification (Swin V2 Tiny: G0 - G4 + Calibrated Probabilities)
       └── Visual Explainability (Grad-CAM Spatial Attribution)
       │
       ▼
[ Clinical Evidence Fusion ] ──► Structured Digital Screening Dossier
       │
       ▼
[ Remote Reviewing Ophthalmologist ]
       ├── Inspects Raw Scan, Contrast-Enhanced Scan, Grad-CAM & Lesion Panels
       ├── Evaluates AI Calibrated Confidence & Biomarkers
       └── Enters Clinician Disposition (Confirm / Override / Refer / Discharge)
       │
       ▼
[ Automated Clinical Report & Referral ] ──► Delivered to Patient & PHC
       │
       ▼
[ District Health Manager ] ──► Monitors Cohort Analytics & Simulates Capacity
```

By ensuring that **every AI inference is accompanied by visual evidence** and that **no patient is triaged without ophthalmologist review**, RETINOVA acts as a diagnostic force-multiplier rather than an autonomous replacement.

---

## 3. System Architecture

The RETINOVA platform connects frontline devices, high-throughput AI services, relational database storage, and role-tailored user interfaces.

```mermaid
graph TD
    subgraph ClientLayer ["Client / Field Layer"]
        A[ASHA Worker Tablet / Browser]
        B[Doctor Clinical Review Workstation]
        C[District Manager Monitoring Dashboard]
    end

    subgraph APILayer ["Backend API Gateway (:5000)"]
        D[Node.js / Express API]
        D1[JWT Authentication & RBAC]
        D2[Patient & Screening Controllers]
        D3[Clinical Report Engine]
        D4[Static Web Dist Server]
    end

    subgraph AIEngine ["AI & Simulation Service (:8000)"]
        E[FastAPI Python/MATLAB Bridge]
        F[MATLAB Engine Session R2026a]
        G[PyTorch GPU Worker]
        H[SimEvents / Simulink Engine]
    end

    subgraph AIPipeline ["RETINOVA AI Pipeline"]
        I1[Module 1: EyeQ IQA Gate]
        I2[Module 2: CLAHE Enhancement]
        I3[Module 3: Retinal Evidence Analysis]
        I4[Module 4: Swin V2 Tiny Classifier]
        I5[Module 5: Grad-CAM Explainability]
    end

    subgraph StorageLayer ["Persistence Layer"]
        J[(PostgreSQL Database :5432)]
        K[Encrypted Local File Storage /uploads]
    end

    A -->|HTTPS / REST| D
    B -->|HTTPS / REST| D
    C -->|HTTPS / REST| D

    D --> D1
    D --> D2
    D --> D3
    D --> D4

    D -->|PostgreSQL Wire Protocol| J
    D -->|File Storage| K

    D2 -->|POST /api/screen| E
    D2 -->|GET /api/simulink/run| E

    E --> F
    E --> G
    E --> H

    F --> I1
    F --> I2
    F --> I3
    G --> I4
    G --> I5
```

---

## 4. AI Pipeline & Explainability

The AI pipeline is structured into five distinct, specialized modules:

```
Raw Retinal Image (512×512 RGB)
            │
            ▼
┌───────────────────────────────────────────────────────────┐
│ Module 1 — EyeQ Image Quality Assessment (IQA Gate)       │
│ Sharpness, illumination uniformity, FOV coverage verification │
└───────────────────────────┬───────────────────────────────┘
                            │
            ┌───────────────┴───────────────┐
      [Quality: Fail]                 [Quality: Pass]
            │                               │
            ▼                               ▼
Immediate Recapture Guidance       ┌──────────────────────────────────────┐
                                   │ Module 2 — CLAHE Image Enhancement   │
                                   │ Lab color space contrast correction  │
                                   └──────────────────┬───────────────────┘
                                                      │
                    ┌─────────────────────────────────┼────────────────────────────────┐
                    │                                 │                                │
                    ▼                                 ▼                                ▼
┌──────────────────────────────────────┐ ┌───────────────────────────┐ ┌──────────────────────────────────────┐
│ Module 3 — Retinal Evidence Analysis │ │ Module 4 — Swin V2 Tiny   │ │ Module 5 — Grad-CAM Explainability   │
│ Vessel density, tortuosity &         │ │ 5-Grade DR Classification │ │ Gradient-weighted spatial activation │
│ supportive candidate lesion overlays │ │ Calibrated probabilities  │ │ attribution heatmap overlay          │
└──────────────────┬───────────────────┘ └─────────────┬─────────────┘ └──────────────────┬───────────────────┘
                    │                                 │                                  │
                    └─────────────────────────────────┼──────────────────────────────────┘
                                                      │
                                                      ▼
                                       ┌─────────────────────────────┐
                                       │    Clinical Evidence Fusion │
                                       │ Multi-modal dossier preview │
                                       └─────────────────────────────┘
```

### Module 1 — EyeQ Image Quality Assessment (IQA Gate)
- **Implementation**: MATLAB (`ai-pipeline/module1_IQA/`)
- **Key Functions**: `checkFOV.m`, `calculateIllumination.m`, `calculateSharpness.m`, `analyzeIQA.m`
- **Clinical Role**: Serves as the first gatekeeper. Quantifies circular field-of-view coverage, illumination variance, and edge-gradient sharpness against the calibrated EyeQ dataset.
- **Outcome**: Scans falling below the diagnostic threshold are rejected on-site, immediately prompting the ASHA worker to adjust distance or lighting, avoiding downstream false negatives.

### Module 2 — CLAHE / Image Enhancement
- **Implementation**: MATLAB (`ai-pipeline/module2_Enhancement/`)
- **Key Functions**: `enhanceFundusImage.m`, `compare_enhancement.m`
- **Clinical Role**: Performs Contrast-Limited Adaptive Histogram Equalization (CLAHE) on the Luminance (L*) channel in CIELAB color space. Normalizes non-uniform illumination across the retinal periphery and enhances visibility of faint microvascular structures without introducing unnatural pixel saturation.

### Module 3 — Retinal Evidence & Pathology Analysis
- **Implementation**: MATLAB (`ai-pipeline/module3_Segmentation/`, `ai-pipeline/module3_Supervised_Final/`)
- **Key Functions**: `extract_retinal_evidence.m`, `generate_evidence_panels.m`, `validate_retinal_evidence.m`
- **Clinical Role**: Identifies morphologic vascular patterns, vessel tortuosity, and candidate lesion clusters (microaneurysms, hemorrhages, hard exudates).
- > **Important Clarification**: Candidate lesion regions serve as **supportive visual evidence** to direct clinician attention during tele-review. They do **not** constitute an autonomous standalone diagnosis. RETINOVA does not claim a dedicated validated neovascularization (NV) detector.

### Module 4 — Swin Transformer V2 Tiny DR Grading
- **Implementation**: PyTorch (`ai-pipeline/module4_Grading_Final/models/swinv2_tiny.py`, `integration/swinV1_predictor.py`)
- **Architecture**: Swin Transformer V2 Tiny operating on 512 × 512 fundus imagery.
- **Classification Task**: 5-grade International Clinical Diabetic Retinopathy scale:
  - **Grade 0 (G0)**: No Apparent DR
  - **Grade 1 (G1)**: Mild Non-Proliferative DR (NPDR)
  - **Grade 2 (G2)**: Moderate NPDR
  - **Grade 3 (G3)**: Severe NPDR
  - **Grade 4 (G4)**: Proliferative DR (PDR)
- **Calibration**: Temperature scaling applied (`calibration/temperature_scaling.py`, `calibration_params.json`) ensuring output probabilities correspond to empirical diagnostic confidence.
- **Sensitivity Threshold**: Referable DR cutoff optimized for screening sensitivity (`optimization/frozen_threshold.json`).

### Module 5 — Grad-CAM Explainability
- **Implementation**: PyTorch / MATLAB bridge (`run_GradCAM.m`, `ai-pipeline/attribution_matrix.mat`)
- **Clinical Role**: Generates 2D spatial attribution maps showing the precise receptive fields in the retinal image that drove the transformer's classification, highlighting pathological clusters for clinical verification.

### Evidence Fusion
The visual and numerical findings are fused into a synchronized diagnostic card:
1. Side-by-side comparison of raw vs. enhanced retinal fundus images.
2. High-resolution Grad-CAM spatial heatmap overlay.
3. Candidate lesion and vessel evidence panel.
4. Calibrated primary referral probability gauge and 5-class distribution bar.

---

## 5. User Roles & Functional Workflows

RETINOVA provides strict Role-Based Access Control (RBAC) across three distinct healthcare personas:

| Feature / Capability | ASHA Worker | Reviewing Ophthalmologist | District Manager |
|:---|:---:|:---:|:---:|
| Patient Registration & Demographics | Yes | View Only | View Aggregates |
| Fundus Image Capture & Upload | Yes | No | No |
| Instant IQA Quality Feedback | Yes | Yes | Audit Log |
| Clinical Review Queue | No | Yes | No |
| Visual Evidence & Grad-CAM Inspection | No | Yes | Case Audit |
| Clinician Diagnostic Disposition (Confirm / Override) | No | Yes | No |
| Clinical PDF / HTML Report Issuance | View / Print | Generate / Sign | View Archive |
| Referral Tracking & Hospital Routing | Track Assigned | Initiate | District Audit |
| Population Analytics & Coverage Heatmaps | Sub-center View | No | Full District |
| Simulink Resource & Workforce Planning | No | No | Interactive Sim |

### ASHA Worker Workflow
1. Registers rural patient with ABHA / National Health ID, age, diabetes duration, and contact details.
2. Selects eye examination (Left / Right eye).
3. Captures fundus image using handheld camera attachment.
4. Receives real-time IQA verdict (`Acceptable` or `Retake required`).
5. Submits screening package to regional ophthalmologist review queue.

### Reviewing Ophthalmologist Workflow
1. Accesses authenticated tele-ophthalmology queue sorted by urgency (referable DR prioritized).
2. Inspects multi-modal clinical dossier: raw scan, CLAHE scan, Grad-CAM attribution, candidate lesions, and calibrated class probabilities.
3. Selects clinical disposition: **Confirm DR Grade**, **Override Grade**, or **Order In-Person Slit-Lamp Examination**.
4. Adds diagnostic notes, specifies follow-up timeline (e.g., 3 months, 6 months, immediate laser/anti-VEGF referral), and signs the digital clinical report.

### District Manager Workflow
1. Monitors district screening velocity, prevalence statistics, and geographic coverage across Primary Health Centers.
2. Tracks referral completion rates (percentage of referred patients attending tertiary hospitals).
3. Evaluates ASHA worker screening volume and quality gate compliance.
4. Accesses the **Simulink Resource Planning interface** to simulate staffing, equipment needs, and queue delays under scaled workload scenarios.

---

## 6. Technology Stack

RETINOVA is built with proven, production-tested technologies across its application, AI, and simulation layers:

```
┌────────────────────────────────────────────────────────────────────────┐
│                          RETINOVA TECH STACK                           │
├──────────────────────┬─────────────────────────────────────────────────┤
│ Core AI & Algorithms │ MATLAB R2026a, Python 3.11+, PyTorch,           │
│                      │ Swin Transformer V2 Tiny, Grad-CAM              │
├──────────────────────┼─────────────────────────────────────────────────┤
│ AI Bridge & Service  │ FastAPI, Uvicorn, MATLAB Engine for Python      │
├──────────────────────┼─────────────────────────────────────────────────┤
│ Application Backend  │ Node.js, Express, TypeScript, Multer,           │
│                      │ JSON Web Tokens (JWT), bcryptjs                 │
├──────────────────────┼─────────────────────────────────────────────────┤
│ Database & Storage   │ PostgreSQL 16 (Relational Schema & JSONB Store) │
├──────────────────────┼─────────────────────────────────────────────────┤
│ Frontend Web / App   │ React Native Web, Expo, TypeScript,             │
│                      │ React Navigation, Lucide Icons                  │
├──────────────────────┼─────────────────────────────────────────────────┤
│ Simulation & Planning│ MATLAB Simulink, SimEvents Discrete-Event Engine│
├──────────────────────┼─────────────────────────────────────────────────┤
│ Orchestration        │ PowerShell Core, Bash, npm                      │
└──────────────────────┴─────────────────────────────────────────────────┘
```

---

## 7. Simulink & SimEvents Resource Planning

To evaluate operational feasibility prior to physical deployment in district health networks, RETINOVA incorporates discrete-event simulation models developed in **MATLAB Simulink and SimEvents** (`simulation/`):

```
[Rural Screening Centers] (PHCs & Sub-centers)
             │
             ▼ Arrival Poisson Process: λ(t)
     [Screening Queue] (Network transmission & ingestion)
             │
             ▼ Server: μ_AI
      [AI Processing Engine] (IQA + Swin V2 + Grad-CAM)
             │
             ├── Low Risk (G0/G1) ──► Routine Follow-up Schedule
             │
             ▼ High Risk (G2/G3/G4) or Marginal Confidence
[Tele-Ophthalmologist Review Queue]
             │
             ▼ Server: μ_Doctor (Review time distribution)
  [Specialist Disposition & Referral Generation]
             │
             ▼
[District Capacity & Backlog Monitoring]
```

### Modeled Operational Parameters
- **Screening Arrival / Workload**: Models time-varying patient arrival distributions (seasonal peaks, diagnostic camp days).
- **Network Uplink Constraints**: Simulates variable 3G/4G bandwidth latency for high-resolution fundus transmissions.
- **AI Processing Latency**: Real benchmarked execution times for automated IQA, classification, and Grad-CAM generation.
- **Clinician Review Capacity**: Evaluates queue lengths and clinician utilization rates (targeting <80% to avoid burnout).
- **Scenario Comparison**: Simulates the effect of adding tele-ophthalmologists, upgrading server GPUs, or optimizing triage thresholds.

> **Operational Notice**: This module serves as an **in silico planning and capacity-estimation tool** for healthcare administrators. It represents computational simulation models rather than telemetry from physical district-wide deployment.

---

## 8. Data Flow & Lifecycle

RETINOVA maintains end-to-end data integrity across every screening encounter:

```
[Patient Registration]
          │
          ▼
   Assigns Unique
   Patient ID & Screening ID (e.g. NETRA-20260926-XXXX)
          │
          ▼
[Retinal Image Ingestion] ──► Uploaded to Encrypted Storage
          │
          ▼
[Module 1 Quality Audit]
          ├── If Fails: Marked REJECTED, Audit Logged, Recapture Prompted
          │
          ▼ If Passes: Marked ACCEPTED
[Multi-Module AI Inference]
          ├── CLAHE Enhanced Image Generated
          ├── Retinal Evidence JSON & Vessel Overlay Stored
          ├── Swin V2 Tiny Prediction & Temperature-Scaled Logits Computed
          └── Grad-CAM Spatial Overlay PNG Rendered
          │
          ▼
[Database Persistence] ──► Associated with Screening ID in PostgreSQL
          │
          ▼
[Ophthalmologist Review] ──► Clinician Disposition Recorded
          │
          ▼
[Clinical Report Generation] ──► Digital Signed HTML / PDF
          │
          ▼
[District Registry Update] ──► Longitudinal Patient History Maintained
```

**Screening ID Association**: Every diagnostic image, enhancement artifact, Grad-CAM overlay, classification log, clinician signature, and referral letter is strictly bound to a permanent, cryptographically indexed **Screening ID** to guarantee chain-of-custody and prevent sample misattribution.

---

## 9. Local Environment Setup

### Prerequisites

| Component | Minimum Version | Notes |
|:---|:---|:---|
| **Operating System** | Windows 10/11, Ubuntu 22.04 LTS, or macOS | Windows recommended for MATLAB Engine integration |
| **Node.js** | v18.x or v20.x LTS | Active LTS version required |
| **Python** | 3.10.x – 3.13.x | 64-bit Python |
| **MATLAB** | R2024b or R2026a | Requires Image Processing Toolbox, Deep Learning Toolbox, Simulink, SimEvents |
| **PostgreSQL** | v14.x – v16.x | Running on port 5432 |
| **Git & Git LFS** | Git 2.30+, Git LFS 3.x | Required for Swin V2 Tiny checkpoint |

---

### Step-by-Step Installation

#### 1. Clone Repository & Initialize Git LFS
```bash
git clone https://github.com/AppasahebPN/retinova.git
cd retinova
git lfs install
git lfs pull
```

#### 2. Configure Database
Ensure PostgreSQL is active on port 5432, then initialize the database schema:
```bash
psql -U postgres -h localhost -c "CREATE DATABASE netra_ai;"
psql -U postgres -h localhost -d netra_ai -f database/schema.sql
```

#### 3. Setup Python Dependencies & MATLAB Engine
```bash
# Install core Python dependencies
pip install torch torchvision fastapi uvicorn pydantic numpy pillow opencv-python matplotlib scipy

# Install MATLAB Engine for Python (execute from your MATLAB installation path)
cd "C:\Program Files\MATLAB\R2026a\extern\engines\python"
python -m pip install .
cd -
```

#### 4. Setup Backend API
```bash
cd backend
npm install
npm run build
cp .env.example .env
cd ..
```

#### 5. Setup Frontend Application
```bash
cd mobile-app
npm install
npm run build
cd ..
```

#### 6. Configure Environment
Review and adjust `.env` files in both root and `backend/`:
```bash
# Verify backend/.env contains:
AI_SERVICE_TYPE=matlab
MATLAB_SERVICE_URL=http://localhost:8000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/netra_ai
```

---

## 10. One-Command Pipeline Startup

For local evaluation, demonstrations, and development, RETINOVA provides a unified one-command orchestration script:

```bash
npm run start:retinova
```

*Or directly via PowerShell:*
```powershell
powershell -ExecutionPolicy Bypass -File scripts/start-retinova.ps1
```

### What the Startup System Executes:
```
[1/7] PostgreSQL connectivity check (:5432)
[2/7] Port conflict scan (:5000 Express API, :8000 AI Bridge)
[3/7] Frontend production build verification (mobile-app/dist)
[4/7] Launches MATLAB Engine + PyTorch Swin V2 Tiny Bridge (:8000)
[5/7] Health poll: verifies MATLAB Engine connection and GPU model loading
[6/7] Launches Node.js / Express API (:5000) with integrated static frontend serving
[7/7] Verifies end-to-end API health and launches browser at:
      http://localhost:5000
```

To stop all services cleanly:
```bash
npm run stop:retinova
```

To check service status:
```bash
npm run status:retinova
```

---

## 11. Deployment Architecture

For real-world hosting and institutional evaluation, RETINOVA employs an isolated multi-tier security architecture:

```
[ User Browser / ASHA Tablet / Clinician Station ]
                       │
                       ▼ HTTPS (Port 443)
       ┌───────────────────────────────┐
       │   Reverse Proxy / Web Server  │
       │    (Nginx / Caddy / Cloudflare)│
       └───────────────┬───────────────┘
                       │
                       ▼ Internal Proxy
       ┌───────────────────────────────┐
       │     Node / Express API Server │
       │     (Port 5000 - Protected)   │
       └───────┬───────────────┬───────┘
               │               │
        Internal REST     SQL Wire Protocol
               │               │
               ▼               ▼
┌────────────────────────────┐ ┌────────────────────────────┐
│ MATLAB / Python AI Bridge  │ │ PostgreSQL Database Server │
│ (Port 8000 - Localhost Only│ │ (Port 5432 - Localhost Only│
│  Not Exposed to Internet)  │ │  Not Exposed to Internet)  │
└──────────────┬─────────────┘ └────────────────────────────┘
               │
               ▼
┌────────────────────────────┐
│ Dedicated GPU Inference    │
│ Swin V2 Tiny + Grad-CAM    │
└────────────────────────────┘
```

**Security Hardening Rules**:
- The **PostgreSQL database (port 5432)** and **MATLAB AI bridge (port 8000)** MUST remain strictly bound to loopback (`127.0.0.1`) or private virtual network interfaces. They must never be publicly exposed.
- All public ingress terminates at the HTTPS reverse proxy, with JWT signature verification and CORS whitelisting enforced on every API route.

---

## 12. Deployment Estimates

> **Notice**: The following timelines are **engineering estimates** based on the current prototype architecture. They represent realistic setup durations and do **not** constitute commercial service-level agreements.

| Deployment Target | Estimated Duration | Scope & Requirements |
|:---|:---|:---|
| **Local Demonstration** | **1 – 3 Hours** | Once prerequisites (MATLAB, Python, PostgreSQL, Node) are installed on a developer workstation or GPU laptop. Involves database seeding, dependency building, and launching `npm run start:retinova`. |
| **Public Prototype Demonstration** | **1 – 3 Days** | Hosting web frontend and Express API on a public cloud instance (AWS EC2 / DigitalOcean) connected via secure tunnel or VPN to a GPU-enabled inference host running MATLAB Engine and PyTorch. Includes TLS setup, domain mapping, and CORS configuration. |
| **Production-Grade Healthcare Deployment** | **Multiple Weeks / Months** | Requires prospective clinical validation across diverse patient cohorts, multi-centric trials, CDSCO/regulatory compliance, HIPAA/DISHA patient data privacy certifications, hospital EHR integration (HL7/FHIR), automated failover, and hardware hardening. |

---

## 13. Limitations & Ethical Boundaries

Transparency and safety are foundational to the RETINOVA project:

1. **Research & Screening Prototype**: RETINOVA is an engineering research prototype designed to assist healthcare personnel. It is not currently certified as a medical device (SaMD) by CDSCO or the FDA.
2. **Supportive Biomarkers, Not Standalone Diagnosis**: Candidate lesion masks and vascular density metrics generated by Module 3 are auxiliary visual guides to highlight suspicious retinal regions. They must not be interpreted as definitive lesion segmentations without clinical confirmation.
3. **No Dedicated Neovascularization Detector**: The current pipeline does not contain an independent, validated pixel-level detector for retinal neovascularization (NV). Proliferative Diabetic Retinopathy (PDR) is classified by the global Swin V2 Tiny transformer backbone supported by clinician review.
4. **Explainability Represents Model Attribution**: Grad-CAM heatmaps illustrate the mathematical gradient attribution of the neural network layers; they do not represent pathological ground-truth annotations.
5. **Human-in-the-Loop Imperative**: No screening decision, referral, or discharge may be finalized autonomously by the software without explicit review and approval by an authorized ophthalmologist.

---

## 14. Project Status & Roadmap

**Current State**: Working Research & Engineering Prototype

### Implemented Features
- [x] Multi-tier Role-Based Access Control (ASHA Worker, Ophthalmologist, District Manager)
- [x] Automated Image Quality Assessment gate (EyeQ-calibrated)
- [x] CLAHE image contrast enhancement in CIELAB color space
- [x] Retinal vascular morphology and candidate lesion extraction (Module 3)
- [x] 5-grade DR classification using Swin Transformer V2 Tiny with temperature scaling calibration
- [x] High-resolution Grad-CAM visual attribution heatmaps
- [x] Synchronized clinical evidence fusion and responsive tele-ophthalmology review queue
- [x] Clinician-signed digital screening report generation
- [x] District Manager population dashboard with referral tracking
- [x] Discrete-event resource planning simulation using MATLAB Simulink and SimEvents
- [x] Unified one-command local startup script (`npm run start:retinova`)

### Future Work & Roadmap
- [ ] Prospective multi-center clinical validation across district hospitals in Karnataka
- [ ] Integration of dedicated, validated microaneurysm and neovascularization pixel-segmentation models
- [ ] Direct DICOM and HL7 / FHIR protocol interoperability for hospital EHR integration
- [ ] On-device edge inference optimization (TensorRT / ONNX Runtime) for ultra-portable, low-power screening hubs
- [ ] Multilingual voice and text prompts in regional languages (Kannada, Hindi, Telugu, Tamil) for frontline ASHA usability

---

## 15. Project Links

- **GitHub Repository**: [https://github.com/AppasahebPN/retinova](https://github.com/AppasahebPN/retinova)
- **Problem Statement**: SIH26038 — Smart India Hackathon
- **Institution**: Presidency University, Bengaluru
- **Team**: Career Crafters

```
GitHub Repository for IISc Presentation:
https://github.com/AppasahebPN/retinova
```

---

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
