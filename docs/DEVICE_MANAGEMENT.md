# RETINOVA Edge Device Fleet Management

---

## 1. Overview

RETINOVA provides enterprise fleet management for distributed edge nodes running Android mobile applications, rugged industrial tablets, and autonomous edge boxes.

Each device operates autonomously at the edge and periodically transmits lightweight telemetry heartbeats whenever cellular (4G/5G) or Wi-Fi connectivity is detected.

---

## 2. Device Entity Model

```typescript
export interface RegisteredDevice {
  device_id: string;               // Unique hardware fingerprint (e.g., DEV-EDGE-001)
  organization_id: string;         // Scoped tenant ID
  device_name: string;             // Human-readable asset name (e.g., Gadag PHC Tablet 01)
  device_type:                     // Hardware form factor
    | 'ANDROID_PHONE'
    | 'RUGGED_TABLET'
    | 'EDGE_GATEWAY'
    | 'JETSON_NODE';
  app_version: string;             // Installed Android APK version (e.g., 2.4.0)
  model_version: string;           // Active on-device neural weight version (e.g., v2.4.0)
  assigned_workflow_id: string;    // Associated AI workflow (e.g., retinal_dr_swinv2)
  last_seen: string;               // ISO-8601 timestamp of last telemetry ping
  connectivity_status:             // Fleet connectivity state
    | 'ONLINE'
    | 'OFFLINE'
    | 'SYNCING'
    | 'ERROR';
  status:                          // Administrative lifecycle status
    | 'ACTIVE'
    | 'DISABLED'
    | 'DECOMMISSIONED';
  registered_at: string;           // Provisioning timestamp
  location?: {                     // Optional GPS location
    name?: string;
    latitude: number;
    longitude: number;
  };
  battery_level?: number;          // Battery state of charge (0 - 100%)
  storage_free_mb?: number;        // Available edge flash storage
  total_detections: number;        // Lifetime AI inferences performed
  pending_sync_count: number;      // Unsynchronized offline records currently queued
}
```

---

## 3. Connectivity States & Health Transitions

* **`ONLINE` (Green):** Telemetry received within the last 5 minutes. Ready for direct over-the-air queries.
* **`OFFLINE` (Amber):** No heartbeat received in $> 5$ minutes. Operating in autonomous disconnected edge mode. On-device camera, AI inference, and SQLite storage remain 100% operational.
* **`SYNCING` (Teal):** The decoupled synchronization daemon is actively streaming queued offline detections to the AWS cloud gateway.
* **`ERROR` (Red):** Device reported an unhandled exception, model checksum mismatch, or critical hardware error.

---

## 4. Administrative Capabilities for Organization Admins

Via the Web Command Center or REST APIs (`/api/platform/devices`):
1. **Device Provisioning & Registration:** Enforce maximum device limits defined by the organization's subscription tier.
2. **Device Disabling:** Instantly revoke sync authorization if a device is reported lost or stolen.
3. **Asset Renaming & Location Assignment:** Assign devices to specific Primary Health Centres, field survey corridors, or claims inspection depots.
4. **Firmware & Model Telemetry:** View current APK version and active model version.
5. **OTA Trigger:** Check if a newer certified AI model is available for download.

---

## 5. REST API Endpoints

* `GET /api/platform/devices` — List devices (strictly scoped to caller's tenant).
* `GET /api/platform/devices/:deviceId` — Inspect detailed device telemetry.
* `POST /api/platform/devices/register` — Provision a new edge device.
* `PATCH /api/platform/devices/:deviceId` — Rename, disable, or reassign device.
* `POST /api/platform/devices/:deviceId/heartbeat` — Ingest edge battery, sync queue, and storage stats.
