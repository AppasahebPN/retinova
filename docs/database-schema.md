# Database Schema Specification

The database uses a clean relational structure implemented in PostgreSQL and persisted with UUID keys.

## Relational Entity Map
```
  +-------------+
  |  FACILITIES |
  +------+------+
         |
         +--------------------+
         |                    |
         v                    v
  +-------------+      +-------------+
  |    USERS    |      |  PATIENTS   |
  +-------------+      +------+------+
                              |
                              v
                       +-------------+
                       | SCREENINGS  |
                       +------+------+
                              |
     +-----------------+------+-----------------+-----------------+
     |                 |                        |                 |
     v                 v                        v                 v
+---------+   +------------------+   +--------------------+   +-----------+
| IMAGES  |   |  CLASSIFICATION  |   |   EXPLAINABILITY   |   | REFERRALS |
+----+----+   +------------------+   +--------------------+   +-----------+
     |
     +------------+------------+
     |            |            |
     v            v            v
+---------+ +------------+ +--------------+
| QUALITY | |ENHANCEMENTS| | SEGMENTATION |
+---------+ +------------+ +--------------+
```

### Main Tables:
- `facilities`: Primary health centers & mobile camps.
- `users`: Healthcare workers, doctors, managers, admins.
- `patients`: Rural patient demographics with `patient_code` (e.g. `DR-MH-2026-0101`).
- `screenings`: Individual screening encounters and timestamps.
- `images`: Acquired retinal fundus image metadata.
- `image_quality`: Sharpness, illumination, FOV, artifacts, accepted/rejected.
- `enhancements`: Illumination correction & CLAHE execution.
- `segmentation_results`: Vessel coverage, lesion candidate count, mask URLs.
- `classification_results`: Grade 0–4, raw softmax probability, calibrated confidence.
- `explainability_results`: Grad-CAM URL, evidence summary, bounding regions.
- `referrals`: Referral recommendation status, priority, and clinical action logs.
- `screening_events`: Full workflow timeline and audit trail.
- `simulation_runs` & `simulation_results`: Simulink district capacity benchmarks.
- `audit_logs`: User activity and change history.
