# RETINOVA Multi-Tenant Architecture & Data Isolation

---

## 1. Overview & Architectural Principles

RETINOVA employs a **Logical Multi-Tenancy Architecture with Enforced Data-Access Layer Isolation**. Every tenant operates as an isolated organizational entity within the shared cloud backend and AWS infrastructure.

```
                            RETINOVA CLOUD PLATFORM
                                       │
     ┌─────────────────────────────────┼─────────────────────────────────┐
     │                                 │                                 │
ORGANIZATION: NHM HEALTH          ORGANIZATION: APEX INSURANCE     ORGANIZATION: STATE PWD
(org_retinova_health)             (org_apex_insurance)             (org_state_infrastructure)
 ├── Admins / Screeners            ├── Admins / Adjusters           ├── Admins / Surveyors
 ├── Registered Phones / Tablets   ├── Registered Inspection Units  ├── Mobile Survey Rigs
 ├── Retinal DR AI Model           ├── Asset Damage ONNX Model      ├── Road Defect Model
 └── Clinical Screening Records    └── Motor Claims Evidence        └── Infrastructure Events
```

---

## 2. Hard Isolation Rules

1. **No Shared Data Scope:** Organization A can **NEVER** view, mutate, or query Organization B's:
   * Users & Credentials
   * Deployed Edge Devices & Telemetry
   * Detection Events & Evidence Images
   * Workflow Configurations & Thresholds
   * AMC Contracts & Billing Plans
2. **Backend Enforcement:** Tenant boundaries are strictly validated at the **Data Access Layer / Middleware**, never relying solely on client-side or frontend filtering.
3. **Immutability of Tenant Ownership:** An edge device registered to Organization A cannot transmit telemetry or events under Organization B's ID.

---

## 3. Data Schema & Scoping Mechanism

Every operational entity in RETINOVA carries a mandatory foreign key referencing its parent organization:

```typescript
export interface OrganizationScopedEntity {
  organization_id: string; // Immutable UUID / Slug
}
```

### Key Scoped Entities:
* **`PlatformUser`**: `organization_id` bound to JWT claims upon authentication.
* **`RegisteredDevice`**: `organization_id` bound during device provisioning.
* **`DynamoDBDetectionRecord`**: `organization_id` stored alongside detection metadata in DynamoDB.
* **`S3 Evidence Object Key`**: Key partitioned as `evidence/{organization_id}/{device_id}/{event_id}.jpg`.

---

## 4. Enforcement Implementation: `enforceTenantIsolation` Middleware

Located in [`backend/src/middleware/tenantIsolation.ts`](file:///c:/Users/Appasaheb/OneDrive/Desktop/app/backend/src/middleware/tenantIsolation.ts):

```typescript
export function enforceTenantIsolation(req: PlatformAuthenticatedRequest, res: Response, next: NextFunction) {
  const user = req.platformUser!;
  const targetOrgId = req.params.organizationId || req.query.organization_id || req.body.organization_id || user.organization_id;

  // 1. Superadmin has global visibility
  if (user.role === 'PLATFORM_ADMIN') {
    return next();
  }

  // 2. Reject any cross-tenant access attempt
  if (targetOrgId && targetOrgId !== user.organization_id) {
    // Record security audit event
    store.addPlatformAuditEvent({
      actor_id: user.id,
      actor_role: user.role,
      organization_id: user.organization_id,
      action: 'ORG_CONFIG_UPDATED',
      target_type: 'ORGANIZATION',
      target_id: targetOrgId,
      metadata: { violation: 'CROSS_TENANT_ACCESS_DENIED' }
    });

    return res.status(403).json({
      error: 'Tenant isolation violation: Access denied.',
      details: `Your account belongs to organization '${user.organization_id}'. You cannot access resources for organization '${targetOrgId}'.`
    });
  }

  // 3. Force body organization_id to user's org
  if (req.body && typeof req.body === 'object') {
    req.body.organization_id = user.organization_id;
  }

  next();
}
```

---

## 5. Automated Verification Results

Integration tests executed in [`backend/src/test_platform.ts`](file:///c:/Users/Appasaheb/OneDrive/Desktop/app/backend/src/test_platform.ts):

* **Cross-Tenant Probe:** Healthcare Admin (`health.admin@nhm.gov.in`) attempted to access `GET /api/platform/organizations/org_apex_insurance`.
  * **Result:** `HTTP 403 Forbidden` returned immediately. Security violation recorded in `platformAuditEvents`.
* **Scoped Device Listing:** Healthcare Admin queried `GET /api/platform/devices`.
  * **Result:** Exactly 2 devices returned (all with `organization_id == 'org_retinova_health'`). Zero insurance or government devices leaked.
* **Superadmin Global Audit:** Superadmin (`superadmin@retinova.ai`) queried `GET /api/platform/organizations`.
  * **Result:** All 4 registered enterprise organizations returned with system telemetry.
