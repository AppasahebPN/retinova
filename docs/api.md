# RETINOVA Enterprise Platform REST API Reference

---

## 1. Authentication & Headers

All platform API requests require one of the following authentication mechanisms:
* **Production:** `Authorization: Bearer <JWT_TOKEN>`
* **Development / Testing Fallbacks:**
  * `x-platform-user-id: usr_platform_superadmin`
  * `x-platform-role: PLATFORM_ADMIN`
  * `x-organization-id: org_retinova_health`

---

## 2. Authentication Endpoints

### 2.1 Login
```http
POST /api/platform/auth/login
```
* **Request Body:**
```json
{
  "email": "health.admin@nhm.gov.in",
  "password": "password"
}
```
* **Response (200 OK):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "usr_health_admin",
    "email": "health.admin@nhm.gov.in",
    "full_name": "Dr. Ananya Rao (State Nodal Officer)",
    "role": "ORG_ADMIN",
    "organization_id": "org_retinova_health",
    "organization_name": "National Rural Health Mission (NHM) - Tele-Screening Directorate",
    "organization_type": "HEALTHCARE"
  }
}
```

### 2.2 Current User Profile
```http
GET /api/platform/auth/me
```
* **Response (200 OK):** Returns authenticated user entity and parent organization.

### 2.3 Demo Users Directory
```http
GET /api/platform/auth/demo-users
```
* **Response (200 OK):** Returns pre-seeded demo user accounts across Healthcare, Insurance, Government, and Security verticals for evaluation.

---

## 3. Organization Management Endpoints

### 3.1 List Organizations
```http
GET /api/platform/organizations
```
* **Access:** `PLATFORM_ADMIN` receives all tenants. Other roles receive only their assigned organization.

### 3.2 Get Organization Details
```http
GET /api/platform/organizations/:orgId
```
* **Access:** Validates tenant isolation. Attempting to query another tenant returns `HTTP 403 Forbidden`.

### 3.3 Create Organization Tenant
```http
POST /api/platform/organizations
```
* **Access:** `PLATFORM_ADMIN` only.
* **Request Body:**
```json
{
  "organization_name": "Karnataka Rural Eye Screening Initiative",
  "organization_type": "HEALTHCARE",
  "subscription_plan": "PRO",
  "contact_email": "nodal.karnataka@health.gov.in",
  "country": "India"
}
```
* **Response (201 Created):** Returns created `Organization` entity with default quotas and workflow configuration.

### 3.4 Get Tenant Resource Usage & Quota
```http
GET /api/platform/organizations/:orgId/usage
```
* **Response (200 OK):**
```json
{
  "usage": {
    "organization_id": "org_retinova_health",
    "subscription_plan": "PRO",
    "devices": { "current": 2, "limit": 25, "percent": 8 },
    "users": { "current": 3, "limit": 30, "percent": 10 },
    "events": { "currentMonthly": 124, "limitMonthly": 10000, "percent": 1 },
    "storage": { "currentMb": 280, "limitMb": 51200, "percent": 1 }
  }
}
```

---

## 4. Device Management Endpoints

### 4.1 List Tenant Edge Devices
```http
GET /api/platform/devices
```
* **Response (200 OK):** Array of `RegisteredDevice` objects scoped to the user's organization.

### 4.2 Register Edge Device
```http
POST /api/platform/devices/register
```
* **Request Body:**
```json
{
  "device_id": "DEV-EDGE-012",
  "device_name": "PHC-Gadag-Screening-Tablet-03",
  "device_type": "ANDROID_PHONE",
  "app_version": "2.4.0",
  "model_version": "v2.4.0",
  "assigned_workflow_id": "retinal_dr_swinv2"
}
```
* **Response (201 Created):** Returns registered device entity.

### 4.3 Device Telemetry Heartbeat
```http
POST /api/platform/devices/:deviceId/heartbeat
```
* **Request Body:**
```json
{
  "connectivity_status": "ONLINE",
  "battery_level": 88,
  "storage_free_mb": 14200,
  "pending_sync_count": 0
}
```

---

## 5. AI Workflow Endpoints

### 5.1 List AI Workflows
```http
GET /api/platform/workflows
```
* **Response (200 OK):** Lists all registered workflow modules and indicates whether each is enabled for the caller's organization.

### 5.2 Execute Workflow Pipeline
```http
POST /api/platform/workflows/:workflowId/execute
```
* **Request Body:**
```json
{
  "input": { "eyeSide": "RIGHT" },
  "deviceId": "DEV-EDGE-001"
}
```
* **Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "result": {
      "primaryFinding": "Moderate NPDR (R2)",
      "confidence": 0.942,
      "severity": "HIGH",
      "urgency": "PRIORITY",
      "recommendedAction": "Refer to Ophthalmologist at District Hospital within 14 days"
    },
    "evidence": {
      "evidenceType": "GRADCAM_SALIENCY_HEATMAP",
      "overlayType": "RETINAL_VESSEL_SEGMENTATION"
    },
    "event": {
      "eventId": "evt_hlth_1774864120",
      "organizationId": "org_retinova_health",
      "severity": "HIGH"
    }
  }
}
```

---

## 6. Model Registry & OTA Endpoints

### 6.1 Check for OTA Update
```http
GET /api/platform/models/check-update/:deviceId
```
* **Response (200 OK):**
```json
{
  "updateAvailable": true,
  "currentVersion": "swinv2-tiny-edge-v1.0.4",
  "latestVersion": "2.4.0",
  "requiresAppUpgrade": false,
  "message": "Newer model 2.4.0 available for download.",
  "modelRecord": {
    "model_id": "model_swinv2_tiny_dr",
    "version": "2.4.0",
    "checksum_sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "download_url": "/api/platform/models/download/model_swinv2_tiny_dr"
  }
}
```

### 6.2 Report Model Activation & Validation
```http
POST /api/platform/models/activate
```
* **Request Body:**
```json
{
  "deviceId": "DEV-EDGE-001",
  "targetModelId": "model_swinv2_tiny_dr",
  "targetVersion": "2.4.0",
  "computedChecksum": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  "dryRunInferenceSuccess": true
}
```
* **Response (200 OK):** Returns activation confirmation or fallback status if checksum verification fails.

---

## 7. Detection & AWS Synchronization Gateway

### 7.1 Synchronize Detection Event (Idempotent)
```http
POST /api/detections/sync
```
* **Request Body:**
```json
{
  "event_id": "evt_edge_98412",
  "device_id": "DEV-EDGE-001",
  "organization_id": "org_retinova_health",
  "timestamp": "2026-09-29T09:30:00.000Z",
  "detection_type": "Moderate NPDR (R2)",
  "confidence": 0.942,
  "severity": "HIGH",
  "latitude": 12.9716,
  "longitude": 77.5946,
  "model_version": "v2.4.0"
}
```
* **Response (200 OK):**
```json
{
  "status": "SYNCED",
  "event_id": "evt_edge_98412",
  "organization_id": "org_retinova_health",
  "sync_timestamp": "2026-09-29T09:30:02.124Z"
}
```

### 7.2 Generate Presigned S3 Evidence Upload URL
```http
POST /api/detections/presigned-url
```
* **Request Body:** `{ "deviceId": "DEV-EDGE-001", "filename": "gradcam_evidence.jpg" }`
* **Response (200 OK):** `{ "uploadUrl": "https://...", "s3ObjectKey": "evidence/DEV-EDGE-001/..." }`

---

## 8. Customer Onboarding Pipeline

### 8.1 Automated Onboarding Wizard
```http
POST /api/platform/onboarding/wizard
```
* **Authentication:** `PLATFORM_ADMIN`
* **Request Body:**
```json
{
  "organization_name": "Apollo Rural Eye Screening Mission",
  "organization_type": "HEALTHCARE",
  "subscription_plan": "PRO",
  "admin_email": "director@apollorural.org",
  "admin_name": "Dr. Rajesh Kumar",
  "admin_password": "password123",
  "initial_device_name": "Apollo-PHC-Unit-01"
}
```
* **Response (201 Created):**
```json
{
  "success": true,
  "message": "Organization 'Apollo Rural Eye Screening Mission' successfully onboarded and provisioned.",
  "workspace": {
    "organization_id": "org_apollo_rural_eye_48b1",
    "organization_name": "Apollo Rural Eye Screening Mission",
    "organization_type": "HEALTHCARE",
    "subscription_plan": "PRO",
    "amc_expiry": "2027-09-29T09:40:00.000Z",
    "dashboard_url": "/dashboard",
    "admin_credentials": {
      "email": "director@apollorural.org",
      "temporary_password": "password123",
      "role": "ORG_ADMIN"
    },
    "initial_device": {
      "device_id": "DEV-HEA-8A9F",
      "device_name": "Apollo-PHC-Unit-01",
      "device_token": "dvt_49f8a1bc72e0_1790674800000",
      "assigned_workflow": "retinal_dr_swinv2",
      "apk_download_url": "/download/apk",
      "install_portal_url": "/install"
    }
  }
}
```

---

## 9. Customer Reporting & Compliance Export

### 9.1 Generate Tenant-Scoped Report
```http
GET /api/platform/reports/generate?type=DEVICES&format=CSV
```
* **Query Parameters:**
  * `type`: `DEVICES` | `USAGE` | `MAINTENANCE` | `AUDIT`
  * `format`: `JSON` | `CSV`
  * `organization_id` (optional, for `PLATFORM_ADMIN`)
* **Headers:** `Authorization: Bearer <TOKEN>` (Enforces tenant isolation)
* **Response:** Returns either downloadable CSV with `Content-Type: text/csv` and filename header, or structured JSON summary.

---

## 10. Annual Maintenance Contract (AMC) Renewal

### 10.1 Renew AMC Contract
```http
POST /api/platform/organizations/:orgId/renew-amc
```
* **Authentication:** `PLATFORM_ADMIN`
* **Request Body:** `{ "extension_years": 1 }`
* **Response (200 OK):**
```json
{
  "success": true,
  "message": "AMC contract for 'National Rural Health Mission' renewed for 1 year(s).",
  "organization": {
    "organization_id": "org_retinova_health",
    "amc_expiry": "2028-03-31T23:59:59.000Z",
    "status": "ACTIVE"
  }
}
```

---

## 11. Software & App Version Management

### 11.1 Fleet Version Telemetry
```http
GET /api/platform/app-versions
```
* **Response (200 OK):**
```json
{
  "latest_release": {
    "version": "2.4.0",
    "release_date": "2026-09-29",
    "file_size_bytes": 82961834,
    "download_url": "/download/apk",
    "min_android_sdk": 24,
    "target_android_sdk": 34
  },
  "fleet_summary": {
    "total_devices": 5,
    "up_to_date": 4,
    "pending_update": 1
  }
}
```

---

## 12. Demonstration Baseline Reset

### 12.1 Reset Demo Data
```http
POST /api/platform/demo/reset
```
* **Authentication:** `PLATFORM_ADMIN`
* **Response (200 OK):** Restores clean demo state for presentations.
