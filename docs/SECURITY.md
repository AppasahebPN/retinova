# RETINOVA Platform Security & Regulatory Architecture

---

## 1. Security Architecture Principles

RETINOVA is built with a **Defense-in-Depth** security philosophy designed to protect sensitive clinical imagery, biometric records, and enterprise telemetry across distributed edge nodes and cloud infrastructure.

```
                   CLIENT / EDGE DEVICES (Android Nodes)
           AES-256 Room DB • Hardware Keystore • Scoped Tokens
                                    │
                         TLS 1.3 Encrypted Transit
                                    │
                                    ▼
                     AWS API GATEWAY & LOAD BALANCER
                 DDoS Shield • WAF • Rate Limiting
                                    │
                                    ▼
                  EXPRESS MIDDLEWARE ENFORCEMENT
            JWT Verification • Tenant Isolation • Strict RBAC
                                    │
                    ┌───────────────┴───────────────┐
                    ▼                               ▼
          AWS DYNAMODB ENCRYPTED           AWS PRIVATE S3 VAULT
         Tenant-Partitioned Tables      KMS-Managed Server-Side Enc
```

---

## 2. Core Security Controls

### 2.1 Authentication & Session Management
* **Cryptographic Tokens:** Sessions use signed JSON Web Tokens (JWT) using `HS256`/`RS256` containing cryptographically verified user claims: `id`, `email`, `role`, and `organization_id`.
* **Password Hashing:** Stored user passwords use bcrypt with salt rounds $\ge 10$.
* **Session Expiry:** Default token lifetime of 7 days with automated renewal.

### 2.2 Strict Data Access Layer Tenant Isolation
* **Zero Cross-Tenant Leakage:** As verified in automated integration tests, all resource queries and mutations strictly validate `user.organization_id == target_entity.organization_id`.
* **Tenant Isolation Enforcement:** Implemented in [`backend/src/middleware/tenantIsolation.ts`](file:///c:/Users/Appasaheb/OneDrive/Desktop/app/backend/src/middleware/tenantIsolation.ts). Cross-tenant queries are rejected with `HTTP 403 Forbidden` and flagged in the security audit trail.

### 2.3 Cloud Infrastructure Hardening
* **Private S3 Evidence Vault:** Evidence imagery is stored in a private S3 bucket with public access completely blocked. Edge devices upload evidence using short-lived pre-signed URLs generated on-demand by the backend (`POST /api/detections/presigned-url`).
* **IAM Least Privilege:** Server instances only possess IAM permissions strictly required for DynamoDB put/query and S3 PutObject operations.
* **Zero Hardcoded Credentials:** All database connection strings, JWT secrets, and AWS credentials are read exclusively from environment variables or AWS Secrets Manager.

### 2.4 Comprehensive Platform Audit Trail
Every critical operational event is recorded immutably in the platform audit log:

```typescript
export interface PlatformAuditEvent {
  id: string;                      // Audit record UUID
  actor_id: string;                // User or device ID initiating the action
  actor_email: string;             // Email address of actor
  actor_role: PlatformRole;        // Role at time of action
  organization_id: string;         // Tenant scope
  action:                          // Operational event type
    | 'LOGIN'
    | 'LOGOUT'
    | 'USER_CREATED'
    | 'USER_DELETED'
    | 'DEVICE_REGISTERED'
    | 'DEVICE_DISABLED'
    | 'WORKFLOW_CONFIG_CHANGED'
    | 'MODEL_UPDATED'
    | 'EVENT_REVIEWED'
    | 'ORG_CONFIG_UPDATED'
    | 'PLAN_CHANGED';
  target_type: string;             // Entity type modified
  target_id: string;               // Entity identifier
  timestamp: string;               // ISO-8601 timestamp
  metadata?: Record<string, any>;  // Contextual payload
}
```

---

## 3. Regulatory & Clinical Validation Disclaimer

> **IMPORTANT REGULATORY NOTICE:**
> 
> RETINOVA is currently an advanced research and engineering prototype. 
> 
> * Do **NOT** claim formal certification or full regulatory compliance with specific standards (such as **HIPAA**, **GDPR**, **DISHA**, **FDA 510(k)**, or **CE Mark MDR Class IIa**) until formal third-party audit and regulatory clearances are conducted.
> * For healthcare and clinical screening deployments, formal local regulatory approvals, clinical ethics committee clearance, and prospective clinical validation trials must be completed before the platform can be deployed for autonomous diagnostic decision-making.
> * In the current phase, RETINOVA operates strictly as a clinical decision-support and tele-triage triage assistance tool under qualified medical practitioner supervision.
