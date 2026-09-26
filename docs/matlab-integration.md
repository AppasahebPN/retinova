# MATLAB AI Model Integration Guide (SIH26038)

## 1. Integration Paradigm
The NetraAI Node.js backend communicates with the MATLAB AI Inference Pipeline using a clean REST API interface. This allows the MATLAB algorithms to be hosted on:
1. **MATLAB Production Server (MPS)**
2. **MATLAB Web App Server**
3. **MATLAB Python Engine microservice** (FastAPI / Flask wrapper calling `.m` scripts)

---

## 2. API Contract: Retinal Image Analysis

### Request: `POST /analyze`
```json
{
  "screeningId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "imageId": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "patientId": "8f3d1b62-4217-4901-b203-99df8546b812",
  "eye": "left",
  "imageUrl": "/uploads/fundus_raw_left.jpg"
}
```

### Response: `200 OK`
```json
{
  "quality": {
    "score": 92.5,
    "status": "accepted",
    "sharpness": 90.0,
    "illumination": 94.0,
    "fovCoverage": 95.0,
    "artifactArea": 2.1,
    "rejectionReason": null
  },
  "enhancement": {
    "status": "completed",
    "enhancedImageUrl": "/uploads/fundus_enhanced.svg",
    "method": "Illumination Correction & Controlled CLAHE"
  },
  "segmentation": {
    "vesselCoverage": 14.8,
    "lesionCoverage": 1.85,
    "candidateCount": 8,
    "vesselMaskUrl": "/uploads/fundus_vessels.svg",
    "lesionMaskUrl": "/uploads/fundus_lesions.svg"
  },
  "classification": {
    "grade": 2,
    "rawProbability": 0.895,
    "calibratedConfidence": 0.864,
    "confidenceMethod": "Temperature Scaling + Platt Calibration (MATLAB)",
    "modelName": "MATLAB-MobileNetV2-DR-Ordinal",
    "modelVersion": "v1.4-rural-calibrated"
  },
  "explainability": {
    "gradcamUrl": "/uploads/fundus_gradcam.svg",
    "evidenceSummary": "Multiple microaneurysms and hard exudates detected in inferior/superior quadrants.",
    "regions": [
      {
        "x": 240,
        "y": 300,
        "radius": 40,
        "importance": "high",
        "featureType": "lesion_candidate",
        "description": "High gradient focus on micro-vascular lesion cluster"
      }
    ]
  },
  "referral": {
    "status": "Routine Referral",
    "priority": "routine",
    "reason": "Moderate non-proliferative DR. Consultation recommended with ophthalmologist within 4-6 weeks."
  }
}
```

---

## 3. Sample MATLAB Service Wrapper Script (`matlab_inference_service.m`)

```matlab
function response = matlab_inference_service(request)
    % Read input fundus image
    img = imread(request.imageUrl);
    
    % Module 1: Image Quality Assessment
    [qScore, sharpness, illum, fov, artifacts, status] = assessQuality(img);
    
    % Module 2: CLAHE Enhancement
    enhancedImg = enhanceFundus(img);
    
    % Module 3: Vessel & Lesion Segmentation
    [vessels, lesionCandidates] = segmentRetina(enhancedImg);
    
    % Module 4: MobileNetV2 Grading & Platt Calibration
    [predGrade, rawProb, calibConf] = classifyDR(enhancedImg);
    
    % Module 5: Grad-CAM Activation Map
    gradcamMap = computeGradCAM(enhancedImg, predGrade);
    
    % Build structured response
    response.quality.score = qScore;
    response.quality.status = status;
    response.classification.grade = predGrade;
    response.classification.calibratedConfidence = calibConf;
end
```
