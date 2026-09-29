# RETINOVA Role-Based Access Control (RBAC) Specification

---

## 1. Role Hierarchy & Definitions

The RETINOVA platform defines 5 distinct security roles to enforce the principle of least privilege:

```
                    PLATFORM_ADMIN
                          │
                      ORG_ADMIN
                          │
             ┌────────────┴────────────┐
             │                         │
          OPERATOR                  REVIEWER
             │                         │
             └────────────┬────────────┘
                          │
                        VIEWER
```

### 1.1 `PLATFORM_ADMIN` (Platform Chief Technical Architect / Vendor Superadmin)
* **Scope:** Global platform-wide visibility across all tenants.
* **Capabilities:**
  * Provision and decommission customer organizations.
  * Assign and modify subscription tiers (BASIC, PRO, ENTERPRISE).
  * Register new AI workflow modules and upload OTA model weights.
  * Monitor global device fleet, cloud hosting costs, and AMC expiration dates.
  * View system-wide security audit trails.

### 1.2 `ORG_ADMIN` (State Nodal Officer / VP Operations / Organization Lead)
* **Scope:** Restricted strictly to their own organization tenant.
* **Capabilities:**
  * Provision and manage tenant users (Operators, Reviewers, Viewers).
  * Register, rename, and disable edge devices.
  * Configure organization thresholds (confidence cutoff, SNS escalation rules, branding).
  * Inspect organization-level telemetry, usage quotas, and AMC support status.

### 1.3 `OPERATOR` (ASHA Worker / Field Screener / Insurance Adjuster / Highway Surveyor)
* **Scope:** Operational edge capture and ingestion.
* **Capabilities:**
  * Authenticate on the mobile Android app.
  * Run offline edge AI inferences on camera/sensor inputs.
  * Synchronize pending detections to the cloud when online.
  * View personal/device screening logs.

### 1.4 `REVIEWER` (Ophthalmologist / Senior Medical Officer / Claims Auditor)
* **Scope:** Secondary review and clinical/operational verification.
* **Capabilities:**
  * Review AI-generated grades, Grad-CAM saliency heatmaps, and lesion overlays.
  * Confirm, adjust, or reject AI diagnostic recommendations.
  * Issue secondary referrals to tertiary hospitals or authorize insurance payouts.

### 1.5 `VIEWER` (Executive Observer / Government Auditor)
* **Scope:** Read-only observational access.
* **Capabilities:**
  * View aggregated dashboard metrics, charts, and screening volumes.
  * Export compliance dossiers and periodic summary reports.
  * **Cannot** register devices, edit configurations, or modify screening records.

---

## 2. Granular Permissions Matrix

| Platform Capability | `PLATFORM_ADMIN` | `ORG_ADMIN` | `OPERATOR` | `REVIEWER` | `VIEWER` |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Create New Organization Tenant** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Assign / Upgrade Subscription Plan** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Upload Global AI Model Checkpoint** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Manage Tenant Users** | ✅ | ✅ (Own Org) | ❌ | ❌ | ❌ |
| **Register / Disable Edge Devices** | ✅ | ✅ (Own Org) | ❌ | ❌ | ❌ |
| **Configure Org Escalation / Branding** | ✅ | ✅ (Own Org) | ❌ | ❌ | ❌ |
| **Trigger Edge Model OTA Update** | ✅ | ✅ (Own Org) | ✅ (Assigned) | ❌ | ❌ |
| **Execute Edge AI Workflows** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Approve / Overrule AI Decisions** | ✅ | ✅ | ❌ | ✅ | ❌ |
| **View Tenant Dashboard Analytics** | ✅ (All) | ✅ (Own Org) | ✅ (Limited) | ✅ (Own Org) | ✅ (Own Org) |
| **Inspect System-Wide Audit Logs** | ✅ (Global) | ✅ (Tenant) | ❌ | ❌ | ❌ |

---

## 3. Enforcement Implementation

Located in [`backend/src/middleware/tenantIsolation.ts`](file:///c:/Users/Appasaheb/OneDrive/Desktop/app/backend/src/middleware/tenantIsolation.ts):

```typescript
export function requirePlatformRoles(...allowedRoles: PlatformRole[]) {
  return (req: PlatformAuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.platformUser) {
      return res.status(401).json({ error: 'Platform authentication required' });
    }

    if (!allowedRoles.includes(req.platformUser.role)) {
      return res.status(403).json({
        error: `Permission Denied. Role '${req.platformUser.role}' is not authorized for this operation.`,
        required_roles: allowedRoles,
        user_role: req.platformUser.role
      });
    }

    next();
  };
}
```

---

## 4. Verification & Automated Test Scenarios

Tested in [`backend/src/test_platform.ts`](file:///c:/Users/Appasaheb/OneDrive/Desktop/app/backend/src/test_platform.ts):
1. **Operator creates Organization:** Operator token sent to `POST /api/platform/organizations`. Rejected with `HTTP 403 Forbidden`.
2. **Operator modifies Plan:** Operator token sent to `POST /api/platform/organizations/org_retinova_health/plan`. Rejected with `HTTP 403 Forbidden`.
3. **Superadmin access:** Superadmin performs both actions successfully (`HTTP 200/201`).
