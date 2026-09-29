# RETINOVA Annual Maintenance Contract (AMC) & Fleet Health Model

---

## 1. Commercial Role of Maintenance (AMC)

In mission-critical B2B and B2G deployments, initial software installation is only the first step. Enterprise customers require:
```
INITIAL DEPLOYMENT + PLATFORM LICENSE + ANNUAL MAINTENANCE + CUSTOM AI DEVELOPMENT
```

The Annual Maintenance Contract (AMC) provides organizations with predictable operational continuity, regulatory compliance, hardware compatibility upgrades, and model drift re-calibration.

---

## 2. Maintenance Tracking Parameters

The platform tracks 8 vital maintenance dimensions across all deployed tenant fleets:

1. **Installed Software Version:** Current Android APK version active on edge devices (e.g., `2.4.0`).
2. **Latest Available Software Version:** Newest production APK release published on the download portal.
3. **Active Model Version:** On-device neural weight version (e.g., `swinv2-tiny-edge-v1.0.4`).
4. **Certified Model Release:** Latest certified model checkpoint in the Model Registry.
5. **Edge Hardware Health:** Battery state of charge, free flash storage, CPU/NPU inference latency.
6. **Synchronization Freshness:** Timestamp of last successful decoupled synchronization.
7. **Unhandled Application Exceptions:** Device-level error counts and crashlytics telemetry.
8. **AMC Contract Expiration Countdown:** Remaining days until annual service contract renewal.

---

## 3. Maintenance Overview Data Structure

Located in [`backend/src/types/platform.ts`](file:///c:/Users/Appasaheb/OneDrive/Desktop/app/backend/src/types/platform.ts):

```typescript
export interface OrgMaintenanceStatus {
  organization_id: string;
  organization_name: string;
  amc_status: 'ACTIVE' | 'EXPIRING_SOON' | 'EXPIRED';
  amc_expires_at: string;
  devices_total: number;
  devices_online: number;
  devices_requiring_app_update: number;
  devices_requiring_model_update: number;
  last_sync_failures_24h: number;
  support_sla_tier: string;
}
```

---

## 4. Platform Admin Maintenance Console

Accessible via the Command Center (`GET /api/platform/maintenance/overview`):

* **Expiring Maintenance Alerts:** Identifies customer organizations whose contracts expire within 60 days to initiate renewal negotiations.
* **Firmware Update Queue:** Aggregates devices running outdated APK builds ($< 2.4.0$) requiring field operator update.
* **Model Upgrade Targets:** Flags devices running legacy model weights that can be safely upgraded via over-the-air (OTA) activation.
* **Offline Anomaly Detection:** Devices that have not checked in for $> 7$ days are flagged for field team contact.

---

## 5. Service Level Agreement (SLA) Tiers

| Support Level | Response Time Window | Resolution Target | Model Re-calibration Frequency | Hardware Replacement Triage |
| :--- | :--- | :--- | :--- | :--- |
| **Standard Business** | $< 4$ Business Hours | Within 24 Hours | Annual Baseline Review | Standard Depo Service |
| **Dedicated 24x7 Enterprise** | $< 1$ Hour (Critical Severity) | Within 4 Hours | Bi-Annual Retraining on Regional Data | 48-Hour Advance Swap Unit |
