// ============================================================
// RETINOVA PLATFORM — Demo Tenant Seed Script
// Explicit Separation of Production and Demonstration Data
// ============================================================
import bcrypt from 'bcryptjs';
import { DatabaseStore } from './store';
import { Organization, PlatformUser, RegisteredDevice } from '../types/platform';
import { Patient, Screening, ImageRecord } from '../types';

export function seedDemoTenants(store?: DatabaseStore) {
  const db = store || DatabaseStore.getInstance();
  const now = new Date().toISOString();
  const passwordHash = bcrypt.hashSync('demo1234', 10);

  console.log('[SEED DEMO] Seeding isolated RETINOVA demonstration tenants...');

  // ------------------------------------------------------------
  // 1. DEMO ORGANIZATIONS (Strictly 2 Demo Tenants)
  // ------------------------------------------------------------
  const healthcareDemo: Organization = {
    organization_id: 'org_retinova_health',
    organization_name: 'RETINOVA Healthcare Demo',
    organization_type: 'HEALTHCARE',
    subscription_plan: 'PRO',
    status: 'ACTIVE',
    isDemo: true,
    created_at: new Date('2026-01-01T00:00:00Z').toISOString(),
    updated_at: now,
    contact_email: 'healthcare.demo@retinova.ai',
    contact_phone: '+91 20 4012 3456',
    country: 'India',
    amc_expiry: '2027-06-30T23:59:59Z',
    configuration: {
      enabledWorkflows: ['retinal_dr_swinv2'],
      confidenceThreshold: 0.75,
      severityEscalationRules: {
        notifySNSOnHigh: true,
        notifySNSOnCritical: true,
        requireReviewForHigh: true,
      },
      evidenceRetentionDays: 365,
      branding: {
        companyName: 'RETINOVA Healthcare Demo',
        dashboardTitle: 'Diabetic Retinopathy Screening Workspace',
        primaryColor: '#0D5E5E',
      },
      limits: {
        maxDevices: 25,
        maxUsers: 50,
        maxMonthlyEvents: 10000,
        storageLimitGb: 50,
      },
    },
  };

  const insuranceDemo: Organization = {
    organization_id: 'org_apex_insurance',
    organization_name: 'RETINOVA Insurance Demo',
    organization_type: 'INSURANCE',
    subscription_plan: 'ENTERPRISE',
    status: 'ACTIVE',
    isDemo: true,
    created_at: new Date('2026-02-15T00:00:00Z').toISOString(),
    updated_at: now,
    contact_email: 'insurance.demo@retinova.ai',
    contact_phone: '+91 22 6789 0123',
    country: 'India',
    amc_expiry: '2027-08-31T23:59:59Z',
    configuration: {
      enabledWorkflows: ['asset_damage_v1'],
      confidenceThreshold: 0.80,
      severityEscalationRules: {
        notifySNSOnHigh: true,
        notifySNSOnCritical: true,
        requireReviewForHigh: true,
      },
      evidenceRetentionDays: 730,
      branding: {
        companyName: 'RETINOVA Insurance Demo',
        dashboardTitle: 'Asset Damage Assessment Workspace',
        primaryColor: '#1A3254',
      },
      limits: {
        maxDevices: 50,
        maxUsers: 100,
        maxMonthlyEvents: 25000,
        storageLimitGb: 150,
      },
    },
  };

  const upsertOrg = (org: Organization) => {
    if (db.getOrganization(org.organization_id)) {
      db.updateOrganization(org.organization_id, org);
    } else {
      db.addOrganization(org);
    }
  };

  upsertOrg(healthcareDemo);
  upsertOrg(insuranceDemo);

  // ------------------------------------------------------------
  // 2. DEMO USERS (RBAC Scoped)
  // ------------------------------------------------------------
  const demoUsers: PlatformUser[] = [
    // Platform Administrator
    {
      id: 'usr_platform_superadmin',
      email: 'superadmin@retinova.ai',
      password_hash: passwordHash,
      full_name: 'Platform Administrator',
      organization_id: 'org_retinova_health',
      role: 'PLATFORM_ADMIN',
      is_active: true,
      isDemo: true,
      created_at: new Date('2026-01-01T00:00:00Z').toISOString(),
      updated_at: now,
    },
    // Healthcare Demo Users
    {
      id: 'usr_health_admin',
      email: 'health.admin@nhm.gov.in',
      password_hash: passwordHash,
      full_name: 'Dr. Demo (Medical Director)',
      organization_id: 'org_retinova_health',
      role: 'ORG_ADMIN',
      is_active: true,
      isDemo: true,
      created_at: new Date('2026-01-10T00:00:00Z').toISOString(),
      updated_at: now,
    },
    {
      id: 'usr_health_doctor',
      email: 'doctor@netra-ai.org',
      password_hash: passwordHash,
      full_name: 'Dr. Demo Reviewing Ophthalmologist',
      organization_id: 'org_retinova_health',
      role: 'REVIEWER',
      is_active: true,
      isDemo: true,
      created_at: new Date('2026-01-10T00:00:00Z').toISOString(),
      updated_at: now,
    },
    {
      id: 'usr_health_operator',
      email: 'screener@nhm.gov.in',
      password_hash: passwordHash,
      full_name: 'Kavitha R. (Primary Screener)',
      organization_id: 'org_retinova_health',
      role: 'OPERATOR',
      is_active: true,
      isDemo: true,
      created_at: new Date('2026-01-10T00:00:00Z').toISOString(),
      updated_at: now,
    },
    {
      id: 'usr_health_asha',
      email: 'asha.worker@netra-ai.org',
      password_hash: passwordHash,
      full_name: 'ASHA Field Worker Demo',
      organization_id: 'org_retinova_health',
      role: 'OPERATOR',
      is_active: true,
      isDemo: true,
      created_at: new Date('2026-01-10T00:00:00Z').toISOString(),
      updated_at: now,
    },
    // Insurance Demo Users
    {
      id: 'usr_insurance_admin',
      email: 'admin@apexinsurance.com',
      password_hash: passwordHash,
      full_name: 'Marcus Vance (Claims Director)',
      organization_id: 'org_apex_insurance',
      role: 'ORG_ADMIN',
      is_active: true,
      isDemo: true,
      created_at: new Date('2026-02-15T00:00:00Z').toISOString(),
      updated_at: now,
    },
    {
      id: 'usr_insurance_reviewer',
      email: 'reviewer@apexinsurance.com',
      password_hash: passwordHash,
      full_name: 'Sarah Jenkins (Senior Claims Specialist)',
      organization_id: 'org_apex_insurance',
      role: 'REVIEWER',
      is_active: true,
      isDemo: true,
      created_at: new Date('2026-02-15T00:00:00Z').toISOString(),
      updated_at: now,
    },
    {
      id: 'usr_insurance_inspector',
      email: 'inspector@apexinsurance.com',
      password_hash: passwordHash,
      full_name: 'Rajesh Kumar (Field Claims Inspector)',
      organization_id: 'org_apex_insurance',
      role: 'OPERATOR',
      is_active: true,
      isDemo: true,
      created_at: new Date('2026-02-15T00:00:00Z').toISOString(),
      updated_at: now,
    },
  ];

  demoUsers.forEach((u) => {
    const existing = db.getPlatformUserByEmail(u.email);
    if (existing) {
      db.updatePlatformUser(existing.id, u);
    } else {
      db.addPlatformUser(u);
    }
  });

  // ------------------------------------------------------------
  // 3. DEMO DEVICES (Real Edge Telemetry)
  // ------------------------------------------------------------
  const demoDevices: RegisteredDevice[] = [
    {
      device_id: 'DEV-EDGE-001',
      organization_id: 'org_retinova_health',
      device_name: 'PHC North Optical Terminal 01',
      device_type: 'ANDROID_PHONE',
      app_version: '2.4.0',
      model_version: 'swinv2-tiny-edge-v1.0.4',
      assigned_workflow_id: 'retinal_dr_swinv2',
      last_seen: now,
      connectivity_status: 'ONLINE',
      status: 'ACTIVE',
      isDemo: true,
      registered_at: new Date('2026-01-15T08:00:00Z').toISOString(),
      location: { name: 'PHC North Clinic', latitude: 19.1383, longitude: 77.3210 },
      battery_level: 89,
      storage_free_mb: 18450,
      total_detections: 142,
      pending_sync_count: 0,
    },
    {
      device_id: 'DEV-EDGE-002',
      organization_id: 'org_retinova_health',
      device_name: 'Sub-District Mobile Eye Van',
      device_type: 'RUGGED_TABLET',
      app_version: '2.4.0',
      model_version: 'swinv2-tiny-edge-v1.0.4',
      assigned_workflow_id: 'retinal_dr_swinv2',
      last_seen: new Date(Date.now() - 5 * 60000).toISOString(),
      connectivity_status: 'ONLINE',
      status: 'ACTIVE',
      isDemo: true,
      registered_at: new Date('2026-01-20T08:00:00Z').toISOString(),
      location: { name: 'Gadag Rural Screening Camp', latitude: 15.4313, longitude: 75.6358 },
      battery_level: 64,
      storage_free_mb: 32100,
      total_detections: 98,
      pending_sync_count: 2,
    },
    {
      device_id: 'DEV-EDGE-003',
      organization_id: 'org_apex_insurance',
      device_name: 'Claims Inspection Terminal 01',
      device_type: 'ANDROID_PHONE',
      app_version: '2.4.0',
      model_version: 'asset-damage-edge-v1.2.0',
      assigned_workflow_id: 'asset_damage_v1',
      last_seen: new Date(Date.now() - 12 * 60000).toISOString(),
      connectivity_status: 'ONLINE',
      status: 'ACTIVE',
      isDemo: true,
      registered_at: new Date('2026-02-18T08:00:00Z').toISOString(),
      location: { name: 'Mumbai Claims Hub', latitude: 19.0760, longitude: 72.8777 },
      battery_level: 78,
      storage_free_mb: 22400,
      total_detections: 76,
      pending_sync_count: 0,
    },
  ];

  demoDevices.forEach((d) => {
    if (db.getRegisteredDevice(d.device_id)) {
      db.updateDevice(d.device_id, d);
    } else {
      db.registerDevice(d);
    }
  });

  // ------------------------------------------------------------
  // 4. DEMO PATIENTS & CLINICAL CASES (Healthcare Demo)
  // ------------------------------------------------------------
  const demoPatients: Patient[] = [
    {
      id: 'pat_demo_001',
      patient_code: 'PAT-001',
      name: 'Sakshi',
      age: 68,
      gender: 'Other',
      location: 'Hubli',
      diabetes_duration_years: 14,
      phone: '+91 98221 00112',
      facility_id: 'f1Id',
      created_at: new Date('2026-09-19T08:30:00Z').toISOString(),
      updated_at: new Date('2026-09-19T08:30:00Z').toISOString(),
      latest_dr_grade: 4,
      latest_referral_status: 'REFER',
    },
    {
      id: 'pat_demo_002',
      patient_code: 'PAT-002',
      name: 'Ramesh Kumar',
      age: 71,
      gender: 'Male',
      location: 'Naregal',
      diabetes_duration_years: 16,
      phone: '+91 94220 33445',
      facility_id: 'f1Id',
      created_at: new Date('2026-09-19T09:15:00Z').toISOString(),
      updated_at: new Date('2026-09-19T09:15:00Z').toISOString(),
      latest_dr_grade: 4,
      latest_referral_status: 'REFER',
    },
    {
      id: 'pat_demo_003',
      patient_code: 'PAT-003',
      name: 'Meena Devi',
      age: 55,
      gender: 'Female',
      location: 'Gadag',
      diabetes_duration_years: 8,
      phone: '+91 97651 88990',
      facility_id: 'f2Id',
      created_at: new Date('2026-09-18T11:00:00Z').toISOString(),
      updated_at: new Date('2026-09-18T11:00:00Z').toISOString(),
      latest_dr_grade: 3,
      latest_referral_status: 'REFER',
    },
    {
      id: 'pat_demo_004',
      patient_code: 'PAT-004',
      name: 'Basavaiah',
      age: 63,
      gender: 'Male',
      location: 'Shirhatti',
      diabetes_duration_years: 10,
      phone: '+91 99231 44556',
      facility_id: 'f1Id',
      created_at: new Date('2026-09-17T14:20:00Z').toISOString(),
      updated_at: new Date('2026-09-17T14:20:00Z').toISOString(),
      latest_dr_grade: 2,
      latest_referral_status: 'SCREEN',
    },
    {
      id: 'pat_demo_005',
      patient_code: 'PAT-005',
      name: 'Lakshmi Bai',
      age: 59,
      gender: 'Female',
      location: 'Lakshmeshwar',
      diabetes_duration_years: 5,
      phone: '+91 98902 66778',
      facility_id: 'f2Id',
      created_at: new Date('2026-09-17T16:00:00Z').toISOString(),
      updated_at: new Date('2026-09-17T16:00:00Z').toISOString(),
      latest_dr_grade: 1,
      latest_referral_status: 'SCREEN',
    },
  ];

  demoPatients.forEach((p) => {
    if (db.getPatientById(p.id)) {
      db.updatePatient(p.id, p);
    } else {
      db.addPatient(p);
    }
  });

  // Demo Clinical Screenings
  const demoScreenings: Screening[] = [
    {
      id: 'scr_demo_001',
      patient_id: 'pat_demo_001',
      facility_id: 'f1Id',
      status: 'completed',
      final_decision: 'REFER',
      created_at: new Date('2026-09-19T08:35:00Z').toISOString(),
      updated_at: new Date('2026-09-19T08:40:00Z').toISOString(),
      reviewed_by: 'usr_health_doctor',
      reviewed_at: new Date('2026-09-19T09:00:00Z').toISOString(),
      notes: 'Proliferative DR signs evident. Priority laser photocoagulation referral issued.',
      device_id: 'DEV-EDGE-001',
      organization_id: 'org_retinova_health',
      isDemo: true,
    } as any,
    {
      id: 'scr_demo_002',
      patient_id: 'pat_demo_002',
      facility_id: 'f1Id',
      status: 'completed',
      final_decision: 'REFER',
      created_at: new Date('2026-09-19T09:20:00Z').toISOString(),
      updated_at: new Date('2026-09-19T09:22:00Z').toISOString(),
      notes: 'Severe neovascularization detected. Pending ophthalmologist clinical sign-off.',
      device_id: 'DEV-EDGE-001',
      organization_id: 'org_retinova_health',
      isDemo: true,
    } as any,
    {
      id: 'scr_demo_003',
      patient_id: 'pat_demo_003',
      facility_id: 'f2Id',
      status: 'completed',
      final_decision: 'REFER',
      created_at: new Date('2026-09-18T11:05:00Z').toISOString(),
      updated_at: new Date('2026-09-18T11:07:00Z').toISOString(),
      notes: 'Grade 3 severe NPDR with significant blot hemorrhages.',
      device_id: 'DEV-EDGE-002',
      organization_id: 'org_retinova_health',
      isDemo: true,
    } as any,
    {
      id: 'scr_demo_004',
      patient_id: 'pat_demo_004',
      facility_id: 'f1Id',
      status: 'completed',
      final_decision: 'SCREEN',
      created_at: new Date('2026-09-17T14:25:00Z').toISOString(),
      updated_at: new Date('2026-09-17T14:26:00Z').toISOString(),
      notes: 'Moderate NPDR changes. Review within 4 weeks recommended.',
      device_id: 'DEV-EDGE-001',
      organization_id: 'org_retinova_health',
      isDemo: true,
    } as any,
    {
      id: 'scr_demo_005',
      patient_id: 'pat_demo_005',
      facility_id: 'f2Id',
      status: 'completed',
      final_decision: 'SCREEN',
      created_at: new Date('2026-09-17T16:05:00Z').toISOString(),
      updated_at: new Date('2026-09-17T16:15:00Z').toISOString(),
      reviewed_by: 'usr_health_doctor',
      reviewed_at: new Date('2026-09-17T16:20:00Z').toISOString(),
      notes: 'Mild background changes only. Routine 12-month follow-up sufficient.',
      device_id: 'DEV-EDGE-002',
      organization_id: 'org_retinova_health',
      isDemo: true,
    } as any,
  ];

  demoScreenings.forEach((s) => {
    if (db.getScreeningById(s.id)) {
      db.updateScreening(s.id, s);
    } else {
      db.addScreening(s);
    }
  });

  console.log('[SEED DEMO] Completed: 2 Demo Organizations, 8 Demo Users, 3 Devices, 5 Clinical Cases.');
}

if (require.main === module) {
  seedDemoTenants();
  console.log('[SEED DEMO] Script executed standalone.');
}
