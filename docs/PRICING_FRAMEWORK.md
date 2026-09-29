# RETINOVA Commercial Pricing Framework

> **Status Notice:** ALL PRICING FIGURES AND TIERS LISTED IN THIS DOCUMENT ARE **PROPOSED HYPOTHESES TO BE VALIDATED** IN PILOT DEPLOYMENTS. THEY DO NOT REPRESENT FINAL COMMERCIAL CONTRACTS OR CONFIRMED MARKET COMMITMENTS.

---

## 1. Commercial Philosophy & Packaging

RETINOVA offers a 3-tier subscription licensing architecture designed to scale from small pilot deployments (e.g., a single primary health centre or claims depot) to state-wide government and enterprise rollouts.

All plans are configurable dynamically through the Platform Administration Console and stored in the database registry.

---

## 2. Subscription Tiers Specification (Proposed / To Be Validated)

| Plan Feature / Quota | **BASIC TIER (Starter Pilot)** | **PRO TIER (Regional Deployment)** | **ENTERPRISE TIER (Nationwide / Sovereign)** |
| :--- | :--- | :--- | :--- |
| **Target Profile** | Small clinics, single pilot camps, proof-of-concept trials. | District health networks, mid-sized insurers, municipal PWD divisions. | State Health Missions, national insurance carriers, defense/security organizations. |
| **Indicative Price (INR)** | *₹499 / device / month* *(Hypothesis)* | *₹1,999 / device / month* *(Hypothesis)* | *Custom / Annual Contract* *(Hypothesis)* |
| **Billing Period** | Monthly / Quarterly | Annual (with multi-year discounts) | Multi-Year Milestone Agreement |
| **Device Allowance** | Up to 5 Devices | Up to 25 Devices | 100+ Devices (Custom Quotas) |
| **User Seats** | Up to 5 Users | Up to 30 Users | Unlimited (Role-based) |
| **Monthly Event Limit** | 1,000 Detections / Month | 10,000 Detections / Month | 50,000+ Detections / Month |
| **Cloud Storage Vault** | 10 GB Encrypted S3 | 50 GB Encrypted S3 | 250 GB+ Dedicated Bucket |
| **AI Workflows Enabled** | Single Flagship Workflow | Up to 2 Configurable Workflows | All Platform Modules + Custom Training |
| **OTA Model Updates** | Community Scheduled | Quarterly Certified Releases | Dedicated Staging & Custom Weights |
| **Support SLA** | Standard Business Hours (Next Day) | Priority Email & Chat (4-Hour Response) | Dedicated 24x7 Account Engineer (1-Hour SLA) |
| **Deployment Mode** | Shared Multi-Tenant AWS Cloud | Dedicated Multi-Tenant Partition | Virtual Private Cloud (VPC) / Sovereign On-Premise |

---

## 3. Dynamic Quota & Usage Metering

The platform actively meters resource consumption against licensed plan quotas via `DatabaseStore.getTenantUsage(orgId)`:

```typescript
export interface TenantUsageSummary {
  organization_id: string;
  subscription_plan: 'BASIC' | 'PRO' | 'ENTERPRISE';
  devices: {
    current: number;
    limit: number;
    percent: number;
  };
  users: {
    current: number;
    limit: number;
    percent: number;
  };
  events: {
    currentMonthly: number;
    limitMonthly: number;
    percent: number;
  };
  storage: {
    currentMb: number;
    limitMb: number;
    percent: number;
  };
}
```

* When an organization approaches $80\%$ of its device or monthly event allowance, visual alerts appear on the Organization Dashboard.
* Device registrations beyond licensed quotas are blocked by the API (`HTTP 403 Forbidden`) prompting a tier upgrade.

---

## 4. Professional Implementation & AMC Fees (Indicative / Unvalidated)

1. **Platform Implementation Fee (One-Time):**
   * Covers tenant provisioning, custom branding, device flashing, and training.
   * *Proposed Range:* ₹50,000 (Small Clinic / Pilot) to ₹5,00,000+ (State Department / Enterprise).
2. **Annual Maintenance Contract (AMC):**
   * Billed annually at $15\%$ to $20\%$ of total software licensing contract value.
   * Covers continuous firmware compatibility, model drift re-calibration, clinical audit logs, and security patches.
3. **Custom Model Fine-Tuning:**
   * Milestone-based pricing depending on dataset availability and annotation requirements.
