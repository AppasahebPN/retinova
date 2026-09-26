# MATLAB Simulink / SimEvents Operational Simulation Integration

## 1. Operational Purpose
The Simulink / SimEvents engine simulates the physical screening workflow in a rural district before deploying medical staff and hardware.

### Workflow Stages:
1. **Patient Arrival** (Modeled via non-homogeneous Poisson process)
2. **Fundus Image Acquisition** (Queuing at camera hardware stations)
3. **Automated IQA Validation** (Rejection feedback loop requiring immediate re-scan)
4. **AI Inference Server Execution** (Server queue & compute resource scaling)
5. **Doctor Review & Referral Triage** (Ophthalmologist consultation queue for Grade 1–4 cases)
6. **Patient Care Exit / Hospital Referral**

---

## 2. API Contract: Operational Simulation

### Request: `POST /simulate`
```json
{
  "patientArrivalRate": 120,
  "cameras": 2,
  "imageAcquisitionTime": 3.0,
  "qualityRejectionRate": 0.22,
  "aiProcessingTime": 1.5,
  "aiResources": 1,
  "doctorReviewTime": 6.0,
  "doctors": 2,
  "workingHours": 8,
  "simulationDuration": 30
}
```

### Response: `200 OK`
```json
{
  "totalPatients": 3600,
  "patientsProcessed": 3340,
  "patientsWaiting": 260,
  "throughput": 111.3,
  "averageWaitingTime": 28.5,
  "maxWaitingTime": 64.0,
  "cameraUtilization": 78.4,
  "aiUtilization": 34.2,
  "doctorUtilization": 89.6,
  "rejectedImages": 792,
  "referralLoad": 1135,
  "bottleneck": "Doctor Review",
  "additionalResources": {
    "recommendedCameras": 0,
    "recommendedAiWorkers": 0,
    "recommendedDoctors": 1,
    "bandwidthSuggestionMbps": 4.0,
    "notes": "Doctor review queue is reaching 89.6% capacity. Adding 1 visiting ophthalmologist will reduce wait time to under 12 min."
  }
}
```
