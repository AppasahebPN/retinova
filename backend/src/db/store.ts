import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import {
  User, Facility, Patient, Screening, ImageRecord,
  ImageQualityResult, EnhancementResult, SegmentationResult,
  ClassificationResult, ExplainabilityResult, ReferralResult,
  ScreeningEvent, SimulationParameters, SimulationResultData, ModuleStatus
} from '../types';
import {
  Organization, PlatformUser, RegisteredDevice,
  AIWorkflowDefinition, ModelRegistryRecord, SubscriptionPlan,
  PlatformAuditEvent, OrgMaintenanceStatus
} from '../types/platform';

export interface AuditLog {
  id: string;
  user_id?: string;
  action: string;
  entity: string;
  entity_id?: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface SimulationRun {
  id: string;
  facility_id?: string;
  title: string;
  parameters: SimulationParameters;
  status: 'queued' | 'running' | 'completed' | 'failed';
  created_by?: string;
  created_at: string;
  completed_at?: string;
  result?: SimulationResultData;
}

export interface DbData {
  users: User[];
  facilities: Facility[];
  patients: Patient[];
  screenings: Screening[];
  images: ImageRecord[];
  imageQuality: ImageQualityResult[];
  enhancements: EnhancementResult[];
  segmentations: SegmentationResult[];
  classifications: ClassificationResult[];
  explainability: ExplainabilityResult[];
  referrals: ReferralResult[];
  screeningEvents: ScreeningEvent[];
  simulationRuns: SimulationRun[];
  auditLogs: AuditLog[];
  // Platform multi-tenant collections
  organizations: Organization[];
  platformUsers: PlatformUser[];
  registeredDevices: RegisteredDevice[];
  aiWorkflows: AIWorkflowDefinition[];
  modelRegistry: ModelRegistryRecord[];
  subscriptionPlans: SubscriptionPlan[];
  platformAuditEvents: PlatformAuditEvent[];
}

export class DatabaseStore {
  private static instance: DatabaseStore;
  private dbFilePath: string;
  private data: DbData;

  private constructor() {
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    this.dbFilePath = path.join(dataDir, 'db.json');
    this.data = this.loadData();
  }

  public static getInstance(): DatabaseStore {
    if (!DatabaseStore.instance) {
      DatabaseStore.instance = new DatabaseStore();
    }
    return DatabaseStore.instance;
  }

  private getInitialData(): DbData {
    return {
      users: [],
      facilities: [],
      patients: [],
      screenings: [],
      images: [],
      imageQuality: [],
      enhancements: [],
      segmentations: [],
      classifications: [],
      explainability: [],
      referrals: [],
      screeningEvents: [],
      simulationRuns: [],
      auditLogs: [],
      organizations: [
        {
          organization_id: "org_retinova_health",
          organization_name: "RETINOVA Healthcare Demo",
          organization_type: "HEALTHCARE",
          subscription_plan: "PRO",
          status: "ACTIVE",
          isDemo: true,
          created_at: new Date("2026-01-01T00:00:00Z").toISOString(),
          updated_at: new Date().toISOString(),
          contact_email: "healthcare.demo@retinova.ai",
          contact_phone: "+91 20 4012 3456",
          country: "India",
          amc_expiry: "2027-06-30T23:59:59Z",
          configuration: {
            enabledWorkflows: ["retinal_dr_swinv2"],
            confidenceThreshold: 0.75,
            severityEscalationRules: {
              notifySNSOnHigh: true,
              notifySNSOnCritical: true,
              requireReviewForHigh: true,
            },
            evidenceRetentionDays: 365,
            branding: {
              companyName: "RETINOVA Healthcare Demo",
              dashboardTitle: "Diabetic Retinopathy Screening Workspace",
              primaryColor: "#0D5E5E",
            },
            limits: {
              maxDevices: 25,
              maxUsers: 50,
              maxMonthlyEvents: 10000,
              storageLimitGb: 50,
            },
          },
        },
        {
          organization_id: "org_apex_insurance",
          organization_name: "RETINOVA Insurance Demo",
          organization_type: "INSURANCE",
          subscription_plan: "ENTERPRISE",
          status: "ACTIVE",
          isDemo: true,
          created_at: new Date("2026-02-15T00:00:00Z").toISOString(),
          updated_at: new Date().toISOString(),
          contact_email: "insurance.demo@retinova.ai",
          contact_phone: "+91 22 6789 0123",
          country: "India",
          amc_expiry: "2027-08-31T23:59:59Z",
          configuration: {
            enabledWorkflows: ["asset_damage_v1"],
            confidenceThreshold: 0.80,
            severityEscalationRules: {
              notifySNSOnHigh: true,
              notifySNSOnCritical: true,
              requireReviewForHigh: true,
            },
            evidenceRetentionDays: 730,
            branding: {
              companyName: "RETINOVA Insurance Demo",
              dashboardTitle: "Asset Damage Assessment Workspace",
              primaryColor: "#152845",
            },
            limits: {
              maxDevices: 50,
              maxUsers: 100,
              maxMonthlyEvents: 25000,
              storageLimitGb: 150,
            },
          },
        },
      ],
      platformUsers: [
        {
          id: "usr_platform_superadmin",
          email: "superadmin@retinova.ai",
          password_hash: "$2a$10$wT80W3b4n7p5a7Z4l2o5EuB4s1Wp8Y0y0X/M9Z4r0v1Wp8Y0y0X/M", // demo1234
          full_name: "Platform Chief Technical Architect",
          organization_id: "org_retinova_health",
          role: "PLATFORM_ADMIN",
          is_active: true,
          created_at: new Date("2026-01-01T00:00:00Z").toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: "usr_health_admin",
          email: "health.admin@nhm.gov.in",
          password_hash: "$2a$10$wT80W3b4n7p5a7Z4l2o5EuB4s1Wp8Y0y0X/M9Z4r0v1Wp8Y0y0X/M",
          full_name: "Dr. Ananya Rao (State Nodal Officer)",
          organization_id: "org_retinova_health",
          role: "ORG_ADMIN",
          is_active: true,
          created_at: new Date("2026-01-10T00:00:00Z").toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: "usr_health_operator",
          email: "screener@nhm.gov.in",
          password_hash: "$2a$10$wT80W3b4n7p5a7Z4l2o5EuB4s1Wp8Y0y0X/M9Z4r0v1Wp8Y0y0X/M",
          full_name: "Kavitha R. (Lead Screener)",
          organization_id: "org_retinova_health",
          role: "OPERATOR",
          is_active: true,
          created_at: new Date("2026-01-10T00:00:00Z").toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: "usr_insurance_admin",
          email: "admin@apexinsurance.com",
          password_hash: "$2a$10$wT80W3b4n7p5a7Z4l2o5EuB4s1Wp8Y0y0X/M9Z4r0v1Wp8Y0y0X/M",
          full_name: "Marcus Vance (VP Claims)",
          organization_id: "org_apex_insurance",
          role: "ORG_ADMIN",
          is_active: true,
          created_at: new Date("2026-02-15T00:00:00Z").toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: "usr_gov_admin",
          email: "admin@pwd.gov.in",
          password_hash: "$2a$10$wT80W3b4n7p5a7Z4l2o5EuB4s1Wp8Y0y0X/M9Z4r0v1Wp8Y0y0X/M",
          full_name: "Er. Ramesh Kulkarni (Chief Engineer)",
          organization_id: "org_state_infrastructure",
          role: "ORG_ADMIN",
          is_active: true,
          created_at: new Date("2026-03-01T00:00:00Z").toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: "usr_security_admin",
          email: "admin@shieldguard.com",
          password_hash: "$2a$10$wT80W3b4n7p5a7Z4l2o5EuB4s1Wp8Y0y0X/M9Z4r0v1Wp8Y0y0X/M",
          full_name: "Col. Vikram Mehta (Retd.)",
          organization_id: "org_shield_security",
          role: "ORG_ADMIN",
          is_active: true,
          created_at: new Date("2026-03-10T00:00:00Z").toISOString(),
          updated_at: new Date().toISOString(),
        },
      ],
      registeredDevices: [
        {
          device_id: "DEV-EDGE-001",
          organization_id: "org_retinova_health",
          device_name: "PHC North Field Terminal 01",
          device_type: "ANDROID_PHONE",
          app_version: "2.4.0",
          model_version: "swinv2-tiny-edge-v1.0.4",
          assigned_workflow_id: "retinal_dr_swinv2",
          last_seen: new Date().toISOString(),
          connectivity_status: "ONLINE",
          status: "ACTIVE",
          registered_at: new Date("2026-01-15T08:00:00Z").toISOString(),
          location: { name: "PHC North Clinic", latitude: 13.0827, longitude: 80.2707 },
          battery_level: 89,
          storage_free_mb: 18450,
          total_detections: 142,
          pending_sync_count: 0,
        },
        {
          device_id: "DEV-EDGE-002",
          organization_id: "org_retinova_health",
          device_name: "Sub-District Mobile Eye Van",
          device_type: "RUGGED_TABLET",
          app_version: "2.4.0",
          model_version: "swinv2-tiny-edge-v1.0.4",
          assigned_workflow_id: "retinal_dr_swinv2",
          last_seen: new Date(Date.now() - 5 * 60000).toISOString(),
          connectivity_status: "ONLINE",
          status: "ACTIVE",
          registered_at: new Date("2026-01-20T08:00:00Z").toISOString(),
          location: { name: "Gadag Rural Camp", latitude: 12.9716, longitude: 77.5946 },
          battery_level: 64,
          storage_free_mb: 32100,
          total_detections: 98,
          pending_sync_count: 2,
        },
        {
          device_id: "DEV-EDGE-003",
          organization_id: "org_apex_insurance",
          device_name: "Claims Inspection Unit 01",
          device_type: "ANDROID_PHONE",
          app_version: "2.4.0",
          model_version: "asset-damage-edge-v1.2.0",
          assigned_workflow_id: "asset_damage_v1",
          last_seen: new Date(Date.now() - 12 * 60000).toISOString(),
          connectivity_status: "ONLINE",
          status: "ACTIVE",
          registered_at: new Date("2026-02-18T08:00:00Z").toISOString(),
          location: { name: "Mumbai Metro Claims Hub", latitude: 19.0760, longitude: 72.8777 },
          battery_level: 78,
          storage_free_mb: 22400,
          total_detections: 76,
          pending_sync_count: 0,
        },
        {
          device_id: "DEV-EDGE-004",
          organization_id: "org_state_infrastructure",
          device_name: "Highway Survey Rig 04",
          device_type: "EDGE_GATEWAY",
          app_version: "2.3.8",
          model_version: "field-infra-edge-v1.0.1",
          assigned_workflow_id: "field_infrastructure_v1",
          last_seen: new Date(Date.now() - 48 * 60000).toISOString(),
          connectivity_status: "OFFLINE",
          status: "ACTIVE",
          registered_at: new Date("2026-03-05T08:00:00Z").toISOString(),
          location: { name: "NH-48 Sector 12", latitude: 18.5204, longitude: 73.8567 },
          battery_level: 42,
          storage_free_mb: 8500,
          total_detections: 215,
          pending_sync_count: 7,
        },
        {
          device_id: "DEV-EDGE-005",
          organization_id: "org_shield_security",
          device_name: "Perimeter Perimeter Camera Node 09",
          device_type: "JETSON_NODE",
          app_version: "2.4.0",
          model_version: "perimeter-security-edge-v1.1.0",
          assigned_workflow_id: "perimeter_security_v1",
          last_seen: new Date(Date.now() - 1 * 60000).toISOString(),
          connectivity_status: "ONLINE",
          status: "ACTIVE",
          registered_at: new Date("2026-03-12T08:00:00Z").toISOString(),
          location: { name: "West Perimeter Watchtower", latitude: 28.6139, longitude: 77.2090 },
          battery_level: 95,
          storage_free_mb: 58000,
          total_detections: 320,
          pending_sync_count: 0,
        },
      ],
      aiWorkflows: [
        {
          workflow_id: "retinal_dr_swinv2",
          vertical: "HEALTHCARE",
          name: "Diabetic Retinopathy Screening & Triage",
          description: "Swin Transformer V2 Tiny classification with CLAHE enhancement and Grad-CAM spatial attribution.",
          version: "2.4.0",
          model_id: "model_swinv2_tiny_dr",
          input_type: "FUNDUS_IMAGE",
          output_classes: ["Normal (No DR)", "Mild NPDR", "Moderate NPDR", "Severe NPDR", "Proliferative DR"],
          confidence_threshold: 0.75,
          severity_mapping: {
            "Normal (No DR)": "LOW",
            "Mild NPDR": "MEDIUM",
            "Moderate NPDR": "HIGH",
            "Severe NPDR": "CRITICAL",
            "Proliferative DR": "CRITICAL",
          },
          evidence_requirements: ["gradcam_heatmap", "vessel_density", "lesion_mask"],
          reporting_format: "CLINICAL_DOSSIER",
          is_active: true,
        },
        {
          workflow_id: "asset_damage_v1",
          vertical: "INSURANCE",
          name: "Property & Vehicle Asset Damage Assessment",
          description: "Multi-point defect and impact crack detection for automated field underwriting and claims adjustment.",
          version: "1.2.0",
          model_id: "model_asset_damage_v1",
          input_type: "RGB_IMAGE",
          output_classes: ["Undamaged Surface", "Minor Cosmetic Scratch", "Moderate Structural Crack", "Severe Component Fracture", "Total Loss Rupture"],
          confidence_threshold: 0.80,
          severity_mapping: {
            "Undamaged Surface": "LOW",
            "Minor Cosmetic Scratch": "LOW",
            "Moderate Structural Crack": "MEDIUM",
            "Severe Component Fracture": "HIGH",
            "Total Loss Rupture": "CRITICAL",
          },
          evidence_requirements: ["crack_dimension_overlay", "surface_texture_map"],
          reporting_format: "CLAIMS_REPORT",
          is_active: true,
        },
        {
          workflow_id: "field_infrastructure_v1",
          vertical: "GOVERNMENT",
          name: "Public Works & Civil Infrastructure Inspection",
          description: "Automated road distress, pavement degradation, and culvert structural integrity classification.",
          version: "1.0.1",
          model_id: "model_field_infra_v1",
          input_type: "RGB_IMAGE",
          output_classes: ["Pavement Sound", "Pothole Hazard", "Culvert Blockage", "Bridge Joint Spall", "Critical Scour"],
          confidence_threshold: 0.70,
          severity_mapping: {
            "Pavement Sound": "LOW",
            "Pothole Hazard": "MEDIUM",
            "Culvert Blockage": "HIGH",
            "Bridge Joint Spall": "HIGH",
            "Critical Scour": "CRITICAL",
          },
          evidence_requirements: ["gps_gis_stamp", "defect_bounding_polygon"],
          reporting_format: "INFRASTRUCTURE_AUDIT",
          is_active: true,
        },
        {
          workflow_id: "perimeter_security_v1",
          vertical: "SECURITY",
          name: "Critical Perimeter Intrusion & Anomaly Surveillance",
          description: "Real-time edge surveillance detecting perimeter breaching, unattended objects, and trespassers.",
          version: "1.1.0",
          model_id: "model_perimeter_v1",
          input_type: "RGB_IMAGE",
          output_classes: ["Perimeter Clear", "Vehicle Loitering", "Unattended Object", "Perimeter Fence Breach", "Hostile Intrusion"],
          confidence_threshold: 0.85,
          severity_mapping: {
            "Perimeter Clear": "LOW",
            "Vehicle Loitering": "MEDIUM",
            "Unattended Object": "HIGH",
            "Perimeter Fence Breach": "CRITICAL",
            "Hostile Intrusion": "CRITICAL",
          },
          evidence_requirements: ["intrusion_bounding_box", "optical_flow_vector"],
          reporting_format: "SURVEILLANCE_DISPATCH",
          is_active: true,
        },
      ],
      modelRegistry: [
        {
          model_id: "model_swinv2_tiny_dr",
          workflow_id: "retinal_dr_swinv2",
          version: "2.4.0",
          name: "Swin Transformer V2 Tiny (RetinaScreen)",
          format: "PYTORCH_PT",
          size_bytes: 331729506,
          checksum_sha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
          download_url: "/api/platform/models/download/model_swinv2_tiny_dr",
          status: "ACTIVE",
          min_app_version: "2.3.0",
          release_notes: "Swin V2 Tiny backbone with dual head (binary G2+ referable + 5-grade ICDR severity). Optimized with temperature calibration (T=1.341).",
          created_at: new Date("2026-01-10T00:00:00Z").toISOString(),
        },
        {
          model_id: "model_swinv2_tiny_dr_v25",
          workflow_id: "retinal_dr_swinv2",
          version: "2.5.0-beta",
          name: "Swin Transformer V2 Tiny (Vessel-Coupled)",
          format: "PYTORCH_PT",
          size_bytes: 332100000,
          checksum_sha256: "f4c1d2e3b4a598fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852",
          download_url: "/api/platform/models/download/model_swinv2_tiny_dr_v25",
          status: "STAGING",
          min_app_version: "2.4.0",
          release_notes: "Staged update candidate incorporating tortuosity feature concatenation for higher sensitivity on early microaneurysms.",
          created_at: new Date("2026-03-20T00:00:00Z").toISOString(),
        },
        {
          model_id: "model_asset_damage_v1",
          workflow_id: "asset_damage_v1",
          version: "1.2.0",
          name: "Apex Damage Inspector V1",
          format: "ONNX",
          size_bytes: 48500000,
          checksum_sha256: "a1b2c3d4e5f698fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852",
          download_url: "/api/platform/models/download/model_asset_damage_v1",
          status: "ACTIVE",
          min_app_version: "2.4.0",
          release_notes: "Quantized ONNX model optimized for mobile inspections.",
          created_at: new Date("2026-02-18T00:00:00Z").toISOString(),
        },
      ],
      subscriptionPlans: [
        {
          plan_id: "BASIC",
          name: "Starter Edge Tier",
          price_monthly_inr: 499,
          billing_period: "MONTHLY",
          max_devices: 2,
          max_users: 5,
          storage_limit_mb: 2048,
          event_limit_monthly: 1000,
          features: ["Offline Edge AI", "Local Room Database", "Standard Dashboard", "Community Support"],
          support_level: "COMMUNITY",
        },
        {
          plan_id: "PRO",
          name: "Professional Fleet Tier",
          price_monthly_inr: 1499,
          billing_period: "MONTHLY",
          max_devices: 20,
          max_users: 50,
          storage_limit_mb: 25600,
          event_limit_monthly: 10000,
          features: ["Offline Edge AI", "Priority AWS Cloud Sync", "S3 Evidence Vault", "Real-Time SNS Alerts", "Business Hours Support"],
          support_level: "STANDARD_BUSINESS",
        },
        {
          plan_id: "ENTERPRISE",
          name: "Institutional Enterprise Tier",
          price_monthly_inr: 4999,
          billing_period: "ANNUAL",
          max_devices: 250,
          max_users: 500,
          storage_limit_mb: 204800,
          event_limit_monthly: 100000,
          features: ["Unlimited Edge AI Fleet", "Dedicated Cloud VPC", "Custom Model Fine-Tuning", "Multi-Tenant RBAC", "24x7 Dedicated SLA", "Air-Gapped On-Prem Hub"],
          support_level: "DEDICATED_24x7",
        },
      ],
      platformAuditEvents: [
        {
          id: "aud_seed_001",
          actor_id: "usr_platform_superadmin",
          actor_email: "superadmin@retinova.ai",
          actor_role: "PLATFORM_ADMIN",
          organization_id: "org_retinova_health",
          action: "ORGANIZATION_CREATED" as any,
          target_type: "ORGANIZATION",
          target_id: "org_retinova_health",
          timestamp: new Date("2026-01-01T00:00:00Z").toISOString(),
          metadata: { plan: "PRO", vertical: "HEALTHCARE" },
        },
      ],
    };
  }

  private loadData(): DbData {
    try {
      if (fs.existsSync(this.dbFilePath)) {
        const raw = fs.readFileSync(this.dbFilePath, 'utf-8');
        const parsed = JSON.parse(raw);
        const defaults = this.getInitialData();
        return {
          ...defaults,
          ...parsed,
          organizations: parsed.organizations && parsed.organizations.length > 0 ? parsed.organizations : defaults.organizations,
          platformUsers: parsed.platformUsers && parsed.platformUsers.length > 0 ? parsed.platformUsers : defaults.platformUsers,
          registeredDevices: parsed.registeredDevices && parsed.registeredDevices.length > 0 ? parsed.registeredDevices : defaults.registeredDevices,
          aiWorkflows: parsed.aiWorkflows && parsed.aiWorkflows.length > 0 ? parsed.aiWorkflows : defaults.aiWorkflows,
          modelRegistry: parsed.modelRegistry && parsed.modelRegistry.length > 0 ? parsed.modelRegistry : defaults.modelRegistry,
          subscriptionPlans: parsed.subscriptionPlans && parsed.subscriptionPlans.length > 0 ? parsed.subscriptionPlans : defaults.subscriptionPlans,
          platformAuditEvents: parsed.platformAuditEvents && parsed.platformAuditEvents.length > 0 ? parsed.platformAuditEvents : defaults.platformAuditEvents,
        };
      }
    } catch (err) {
      console.warn('Could not read existing db.json, initializing fresh store', err);
    }
    return this.getInitialData();
  }

  private isBatching: boolean = false;

  public batch<T>(fn: () => T): T {
    this.isBatching = true;
    try {
      const result = fn();
      return result;
    } finally {
      this.isBatching = false;
      this.save();
    }
  }

  public save(): void {
    if (this.isBatching) return;
    try {
      fs.writeFileSync(this.dbFilePath, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to persist database state:', err);
    }
  }

  public reset(): void {
    this.data = this.getInitialData();
    this.save();
  }

  // --- Users ---
  public getUsers(): User[] {
    return this.data.users;
  }

  public getUserByEmail(email: string): User | undefined {
    return this.data.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  }

  public getUserById(id: string): User | undefined {
    return this.data.users.find(u => u.id === id);
  }

  public addUser(user: User): User {
    this.data.users.push(user);
    this.save();
    return user;
  }

  // --- Facilities ---
  public getFacilities(): Facility[] {
    return this.data.facilities;
  }

  public getFacilityById(id: string): Facility | undefined {
    return this.data.facilities.find(f => f.id === id);
  }

  public addFacility(facility: Facility): Facility {
    this.data.facilities.push(facility);
    this.save();
    return facility;
  }

  // --- Patients ---
  public getPatients(search?: string, facilityId?: string, limit = 50, offset = 0): { patients: Patient[]; total: number } {
    let list = [...this.data.patients];

    if (facilityId) {
      list = list.filter(p => p.facility_id === facilityId);
    }

    if (search && search.trim()) {
      const q = search.toLowerCase().trim();
      list = list.filter(p => 
        p.name.toLowerCase().includes(q) || 
        p.patient_code.toLowerCase().includes(q) ||
        p.location.toLowerCase().includes(q) ||
        (p.phone && p.phone.includes(q))
      );
    }

    // Sort latest first
    list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const total = list.length;
    const paginated = list.slice(offset, offset + limit);

    return { patients: paginated, total };
  }

  public getPatientById(id: string): Patient | undefined {
    return this.data.patients.find(p => p.id === id);
  }

  public getPatientByCode(code: string): Patient | undefined {
    return this.data.patients.find(p => p.patient_code.toLowerCase() === code.toLowerCase());
  }

  public addPatient(patient: Patient): Patient {
    this.data.patients.push(patient);
    this.save();
    return patient;
  }

  public updatePatient(id: string, updates: Partial<Patient>): Patient | undefined {
    const idx = this.data.patients.findIndex(p => p.id === id);
    if (idx === -1) return undefined;
    this.data.patients[idx] = {
      ...this.data.patients[idx],
      ...updates,
      updated_at: new Date().toISOString()
    };
    this.save();
    return this.data.patients[idx];
  }

  // --- Screenings ---
  public getScreenings(filters?: {
    patientId?: string;
    facilityId?: string;
    status?: string;
    grade?: number;
    referralStatus?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
  }): { screenings: Screening[]; total: number } {
    let list = [...this.data.screenings];

    if (filters?.patientId) {
      list = list.filter(s => s.patient_id === filters.patientId);
    }
    if (filters?.facilityId) {
      list = list.filter(s => s.facility_id === filters.facilityId);
    }
    if (filters?.status) {
      list = list.filter(s => s.status === filters.status);
    }
    if (filters?.startDate) {
      list = list.filter(s => new Date(s.created_at) >= new Date(filters.startDate!));
    }
    if (filters?.endDate) {
      list = list.filter(s => new Date(s.created_at) <= new Date(filters.endDate!));
    }

    // Filter by grade or referral if needed
    if (filters?.grade !== undefined) {
      list = list.filter(s => {
        const cls = this.data.classifications.find(c => c.screening_id === s.id);
        return cls?.predicted_grade === filters.grade;
      });
    }

    if (filters?.referralStatus) {
      list = list.filter(s => {
        const ref = this.data.referrals.find(r => r.screening_id === s.id);
        return ref?.status === filters.referralStatus;
      });
    }

    list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const total = list.length;
    const limit = filters?.limit || 50;
    const offset = filters?.offset || 0;
    const paginated = list.slice(offset, offset + limit);

    // Populate relation entities
    const populated = paginated.map(s => this.populateScreening(s));

    return { screenings: populated, total };
  }

  public getScreeningById(id: string): Screening | undefined {
    const screening = this.data.screenings.find(s => s.id === id);
    if (!screening) return undefined;
    return this.populateScreening(screening);
  }

  private populateScreening(s: Screening): Screening {
    const patient = this.data.patients.find(p => p.id === s.patient_id);
    const facility = this.data.facilities.find(f => f.id === s.facility_id);
    const image = this.data.images.find(i => i.screening_id === s.id);
    const quality = image ? this.data.imageQuality.find(q => q.image_id === image.id) : undefined;
    const enhancement = image ? this.data.enhancements.find(e => e.image_id === image.id) : undefined;
    const segmentation = image ? this.data.segmentations.find(seg => seg.image_id === image.id) : undefined;
    const classification = this.data.classifications.find(c => c.screening_id === s.id);
    const explainability = this.data.explainability.find(ex => ex.screening_id === s.id);
    const referral = this.data.referrals.find(r => r.screening_id === s.id);
    const timeline = this.data.screeningEvents
      .filter(ev => ev.screening_id === s.id)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    return {
      ...s,
      patient: s.patient || patient,
      facility: s.facility || facility,
      image: s.image || image,
      quality: s.quality || quality,
      enhancement: s.enhancement || enhancement,
      segmentation: s.segmentation || segmentation,
      classification: s.classification || classification,
      explainability: s.explainability || explainability,
      referral: s.referral || referral,
      timeline: (s.timeline && s.timeline.length > 0) ? s.timeline : timeline
    };
  }

  public addScreening(screening: Screening): Screening {
    this.data.screenings.push(screening);
    this.save();
    return screening;
  }

  public updateScreening(id: string, updates: Partial<Screening>): Screening | undefined {
    const idx = this.data.screenings.findIndex(s => s.id === id);
    if (idx === -1) return undefined;
    this.data.screenings[idx] = {
      ...this.data.screenings[idx],
      ...updates
    };
    this.save();
    return this.populateScreening(this.data.screenings[idx]);
  }

  // --- Related AI Entities ---
  public addImage(img: ImageRecord): ImageRecord {
    this.data.images.push(img);
    this.save();
    return img;
  }

  public getImageById(id: string): ImageRecord | undefined {
    return this.data.images.find(i => i.id === id);
  }

  public getImageByScreeningId(screeningId: string): ImageRecord | undefined {
    return this.data.images.find(i => i.screening_id === screeningId);
  }

  public addImageQuality(iq: ImageQualityResult): ImageQualityResult {
    const idx = this.data.imageQuality.findIndex(q => q.image_id === iq.image_id);
    if (idx !== -1) {
      this.data.imageQuality[idx] = iq;
    } else {
      this.data.imageQuality.push(iq);
    }
    this.save();
    return iq;
  }

  public addEnhancement(enh: EnhancementResult): EnhancementResult {
    const idx = this.data.enhancements.findIndex(e => e.image_id === enh.image_id);
    if (idx !== -1) {
      this.data.enhancements[idx] = enh;
    } else {
      this.data.enhancements.push(enh);
    }
    this.save();
    return enh;
  }

  public addSegmentation(seg: SegmentationResult): SegmentationResult {
    const idx = this.data.segmentations.findIndex(s => s.image_id === seg.image_id);
    if (idx !== -1) {
      this.data.segmentations[idx] = seg;
    } else {
      this.data.segmentations.push(seg);
    }
    this.save();
    return seg;
  }

  public addClassification(cls: ClassificationResult): ClassificationResult {
    const idx = this.data.classifications.findIndex(c => c.screening_id === cls.screening_id);
    if (idx !== -1) {
      this.data.classifications[idx] = cls;
    } else {
      this.data.classifications.push(cls);
    }
    this.save();
    return cls;
  }

  public addExplainability(exp: ExplainabilityResult): ExplainabilityResult {
    const idx = this.data.explainability.findIndex(e => e.screening_id === exp.screening_id);
    if (idx !== -1) {
      this.data.explainability[idx] = exp;
    } else {
      this.data.explainability.push(exp);
    }
    this.save();
    return exp;
  }

  public addReferral(ref: ReferralResult): ReferralResult {
    const idx = this.data.referrals.findIndex(r => r.screening_id === ref.screening_id);
    if (idx !== -1) {
      this.data.referrals[idx] = ref;
    } else {
      this.data.referrals.push(ref);
    }
    this.save();
    return ref;
  }

  public updateReferral(id: string, updates: Partial<ReferralResult>): ReferralResult | undefined {
    const idx = this.data.referrals.findIndex(r => r.id === id || r.screening_id === id);
    if (idx === -1) {
      const screening = this.getScreeningById(id);
      const newReferral: ReferralResult = {
        id: `ref_${id}`,
        screening_id: id,
        status: (updates.status as any) || (screening?.referral?.status as any) || 'pending_evaluation',
        priority: (updates.priority as any) || (screening?.referral?.priority as any) || 'routine',
        reason: updates.reason || screening?.referral?.reason || 'Clinical Review Action',
        action_taken: (updates.action_taken as any) || 'referral_completed',
        action_notes: updates.action_notes || '',
        created_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        ...updates
      };
      this.data.referrals.push(newReferral);
      this.save();
      return newReferral;
    }
    this.data.referrals[idx] = {
      ...this.data.referrals[idx],
      ...updates
    };
    this.save();
    return this.data.referrals[idx];
  }

  public addScreeningEvent(event: ScreeningEvent): ScreeningEvent {
    this.data.screeningEvents.push(event);
    this.save();
    return event;
  }

  // --- Simulation Runs ---
  public getSimulationRuns(): SimulationRun[] {
    return [...this.data.simulationRuns].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  public getSimulationRunById(id: string): SimulationRun | undefined {
    return this.data.simulationRuns.find(r => r.id === id);
  }

  public addSimulationRun(run: SimulationRun): SimulationRun {
    this.data.simulationRuns.push(run);
    this.save();
    return run;
  }

  public updateSimulationRun(id: string, updates: Partial<SimulationRun>): SimulationRun | undefined {
    const idx = this.data.simulationRuns.findIndex(r => r.id === id);
    if (idx === -1) return undefined;
    this.data.simulationRuns[idx] = {
      ...this.data.simulationRuns[idx],
      ...updates
    };
    this.save();
    return this.data.simulationRuns[idx];
  }

  // --- Audit Logs ---
  public addAuditLog(log: Omit<AuditLog, 'id' | 'timestamp'>): AuditLog {
    const entry: AuditLog = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      ...log
    };
    this.data.auditLogs.push(entry);
    this.save();
    return entry;
  }

  public getAuditLogs(limit = 100): AuditLog[] {
    return [...this.data.auditLogs]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }

  // ==========================================================
  // MULTI-TENANT B2B/B2G PLATFORM DATA ACCESS METHODS
  // Enforces strict tenant boundaries at the database store layer
  // ==========================================================

  // --- Organizations ---
  public getOrganizations(orgIdFilter?: string): Organization[] {
    if (orgIdFilter) {
      return this.data.organizations.filter(o => o.organization_id === orgIdFilter);
    }
    return [...this.data.organizations];
  }

  public getOrganization(orgId: string): Organization | undefined {
    return this.data.organizations.find(o => o.organization_id === orgId);
  }

  public addOrganization(org: Organization): Organization {
    const existing = this.data.organizations.find(o => o.organization_id === org.organization_id);
    if (existing) {
      throw new Error(`Organization with ID '${org.organization_id}' already exists.`);
    }
    this.data.organizations.push(org);
    this.save();
    return org;
  }

  public updateOrganization(orgId: string, updates: Partial<Organization>): Organization | undefined {
    const idx = this.data.organizations.findIndex(o => o.organization_id === orgId);
    if (idx === -1) return undefined;
    this.data.organizations[idx] = {
      ...this.data.organizations[idx],
      ...updates,
      updated_at: new Date().toISOString()
    };
    this.save();
    return this.data.organizations[idx];
  }

  public deleteOrganization(orgId: string): boolean {
    const initLen = this.data.organizations.length;
    this.data.organizations = this.data.organizations.filter(o => o.organization_id !== orgId);
    if (this.data.organizations.length !== initLen) {
      this.save();
      return true;
    }
    return false;
  }

  // --- Platform Users (Scoped by Tenant) ---
  public getPlatformUsers(orgId?: string): PlatformUser[] {
    if (orgId) {
      return this.data.platformUsers.filter(u => u.organization_id === orgId);
    }
    return [...this.data.platformUsers];
  }

  public getPlatformUser(userId: string): PlatformUser | undefined {
    return this.data.platformUsers.find(u => u.id === userId);
  }

  public getPlatformUserByEmail(email: string): PlatformUser | undefined {
    return this.data.platformUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
  }

  public addPlatformUser(user: PlatformUser): PlatformUser {
    const existing = this.data.platformUsers.find(u => u.email.toLowerCase() === user.email.toLowerCase());
    if (existing) {
      throw new Error(`User with email '${user.email}' already exists.`);
    }
    this.data.platformUsers.push(user);
    this.save();
    return user;
  }

  public updatePlatformUser(userId: string, updates: Partial<PlatformUser>, orgId?: string): PlatformUser | undefined {
    const idx = this.data.platformUsers.findIndex(u => u.id === userId && (!orgId || u.organization_id === orgId));
    if (idx === -1) return undefined;
    this.data.platformUsers[idx] = {
      ...this.data.platformUsers[idx],
      ...updates,
      updated_at: new Date().toISOString()
    };
    this.save();
    return this.data.platformUsers[idx];
  }

  // --- Registered Edge Devices (Scoped by Tenant) ---
  public getRegisteredDevices(orgId?: string): RegisteredDevice[] {
    if (orgId) {
      return this.data.registeredDevices.filter(d => d.organization_id === orgId);
    }
    return [...this.data.registeredDevices];
  }

  public getRegisteredDevice(deviceId: string, orgId?: string): RegisteredDevice | undefined {
    return this.data.registeredDevices.find(d => d.device_id === deviceId && (!orgId || d.organization_id === orgId));
  }

  public registerDevice(device: RegisteredDevice): RegisteredDevice {
    const existingIdx = this.data.registeredDevices.findIndex(d => d.device_id === device.device_id);
    if (existingIdx !== -1) {
      this.data.registeredDevices[existingIdx] = {
        ...this.data.registeredDevices[existingIdx],
        ...device,
        last_seen: new Date().toISOString()
      };
      this.save();
      return this.data.registeredDevices[existingIdx];
    }
    this.data.registeredDevices.push(device);
    this.save();
    return device;
  }

  public updateDevice(deviceId: string, updates: Partial<RegisteredDevice>, orgId?: string): RegisteredDevice | undefined {
    const idx = this.data.registeredDevices.findIndex(d => d.device_id === deviceId && (!orgId || d.organization_id === orgId));
    if (idx === -1) return undefined;
    this.data.registeredDevices[idx] = {
      ...this.data.registeredDevices[idx],
      ...updates,
      last_seen: updates.last_seen || new Date().toISOString()
    };
    this.save();
    return this.data.registeredDevices[idx];
  }

  // --- AI Workflow Definitions ---
  public getAIWorkflows(): AIWorkflowDefinition[] {
    return [...this.data.aiWorkflows];
  }

  public getAIWorkflow(workflowId: string): AIWorkflowDefinition | undefined {
    return this.data.aiWorkflows.find(w => w.workflow_id === workflowId);
  }

  public addAIWorkflow(wf: AIWorkflowDefinition): AIWorkflowDefinition {
    const existing = this.data.aiWorkflows.find(w => w.workflow_id === wf.workflow_id);
    if (existing) {
      throw new Error(`Workflow with ID '${wf.workflow_id}' already exists.`);
    }
    this.data.aiWorkflows.push(wf);
    this.save();
    return wf;
  }

  public updateAIWorkflow(workflowId: string, updates: Partial<AIWorkflowDefinition>): AIWorkflowDefinition | undefined {
    const idx = this.data.aiWorkflows.findIndex(w => w.workflow_id === workflowId);
    if (idx === -1) return undefined;
    this.data.aiWorkflows[idx] = {
      ...this.data.aiWorkflows[idx],
      ...updates
    };
    this.save();
    return this.data.aiWorkflows[idx];
  }

  // --- Model Registry & Rollback Support ---
  public getModelRegistry(workflowId?: string): ModelRegistryRecord[] {
    if (workflowId) {
      return this.data.modelRegistry.filter(m => m.workflow_id === workflowId);
    }
    return [...this.data.modelRegistry];
  }

  public getModelRecord(modelId: string): ModelRegistryRecord | undefined {
    return this.data.modelRegistry.find(m => m.model_id === modelId);
  }

  public addModelRecord(rec: ModelRegistryRecord): ModelRegistryRecord {
    const existing = this.data.modelRegistry.find(m => m.model_id === rec.model_id);
    if (existing) {
      throw new Error(`Model with ID '${rec.model_id}' already exists.`);
    }
    this.data.modelRegistry.push(rec);
    this.save();
    return rec;
  }

  public updateModelRecord(modelId: string, updates: Partial<ModelRegistryRecord>): ModelRegistryRecord | undefined {
    const idx = this.data.modelRegistry.findIndex(m => m.model_id === modelId);
    if (idx === -1) return undefined;
    this.data.modelRegistry[idx] = {
      ...this.data.modelRegistry[idx],
      ...updates
    };
    this.save();
    return this.data.modelRegistry[idx];
  }

  // --- Subscription Plans ---
  public getSubscriptionPlans(): SubscriptionPlan[] {
    return [...this.data.subscriptionPlans];
  }

  public getSubscriptionPlan(planId: string): SubscriptionPlan | undefined {
    return this.data.subscriptionPlans.find(p => p.plan_id === planId);
  }

  // --- Platform Audit Events ---
  public addPlatformAuditEvent(evt: Omit<PlatformAuditEvent, 'id' | 'timestamp'>): PlatformAuditEvent {
    const entry: PlatformAuditEvent = {
      id: `aud_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      ...evt
    };
    this.data.platformAuditEvents.unshift(entry);
    // Keep max 500 audit records
    if (this.data.platformAuditEvents.length > 500) {
      this.data.platformAuditEvents = this.data.platformAuditEvents.slice(0, 500);
    }
    this.save();
    return entry;
  }

  public getPlatformAuditEvents(orgId?: string, limit = 100): PlatformAuditEvent[] {
    let list = this.data.platformAuditEvents;
    if (orgId) {
      list = list.filter(e => e.organization_id === orgId);
    }
    return list.slice(0, limit);
  }

  // --- AMC & Fleet Health Overview ---
  public getMaintenanceOverview(): OrgMaintenanceStatus[] {
    return this.data.organizations.map(org => {
      const devices = this.data.registeredDevices.filter(d => d.organization_id === org.organization_id);
      const now = new Date().getTime();
      const expiry = new Date(org.amc_expiry).getTime();
      const daysUntilExpiry = Math.round((expiry - now) / (1000 * 60 * 60 * 24));

      let amcStatus: 'ACTIVE' | 'EXPIRING_SOON' | 'EXPIRED' = 'ACTIVE';
      if (daysUntilExpiry < 0) amcStatus = 'EXPIRED';
      else if (daysUntilExpiry < 60) amcStatus = 'EXPIRING_SOON';

      // Devices needing updates (older than 2.4.0)
      const needAppUpdate = devices.filter(d => d.app_version !== '2.4.0').length;
      const needModelUpdate = devices.filter(d => d.model_version.includes('beta') || d.model_version.startsWith('v1.')).length;
      const onlineDevices = devices.filter(d => d.connectivity_status === 'ONLINE').length;

      return {
        organization_id: org.organization_id,
        organization_name: org.organization_name,
        amc_status: amcStatus,
        amc_expires_at: org.amc_expiry,
        devices_total: devices.length,
        devices_online: onlineDevices,
        devices_requiring_app_update: needAppUpdate,
        devices_requiring_model_update: needModelUpdate,
        last_sync_failures_24h: 0,
        support_sla_tier: org.subscription_plan === 'ENTERPRISE' ? '24x7 Dedicated (1 Hour SLA)' : 'Business Hours (4 Hour SLA)',
      };
    });
  }

  // --- Tenant Usage Tracking Against Plan Limits ---
  public getTenantUsage(orgId: string) {
    const org = this.getOrganization(orgId);
    if (!org) return null;

    const devices = this.getRegisteredDevices(orgId);
    const users = this.getPlatformUsers(orgId);
    const plan = this.getSubscriptionPlan(org.subscription_plan);

    const totalEvents = devices.reduce((sum, d) => sum + (d.total_detections || 0), 0);
    const estimatedStorageMb = devices.length * 120 + totalEvents * 0.4; // 400KB per evidence event

    return {
      organization_id: org.organization_id,
      organization_name: org.organization_name,
      subscription_plan: org.subscription_plan,
      status: org.status,
      devices: {
        current: devices.length,
        limit: plan?.max_devices ?? org.configuration.limits.maxDevices,
        percent: Math.round((devices.length / (plan?.max_devices ?? org.configuration.limits.maxDevices)) * 100),
      },
      users: {
        current: users.length,
        limit: plan?.max_users ?? org.configuration.limits.maxUsers,
        percent: Math.round((users.length / (plan?.max_users ?? org.configuration.limits.maxUsers)) * 100),
      },
      events: {
        currentMonthly: totalEvents,
        limitMonthly: plan?.event_limit_monthly ?? org.configuration.limits.maxMonthlyEvents,
        percent: Math.round((totalEvents / (plan?.event_limit_monthly ?? org.configuration.limits.maxMonthlyEvents)) * 100),
      },
      storage: {
        currentMb: Math.round(estimatedStorageMb),
        limitMb: plan?.storage_limit_mb ?? (org.configuration.limits.storageLimitGb * 1024),
        percent: Math.round((estimatedStorageMb / (plan?.storage_limit_mb ?? (org.configuration.limits.storageLimitGb * 1024))) * 100),
      }
    };
  }

  // --- AMC Contract Renewal Workflow ---
  public renewAMC(orgId: string, extensionYears = 1): Organization | undefined {
    const org = this.getOrganization(orgId);
    if (!org) return undefined;

    const currentExpiryTime = new Date(org.amc_expiry).getTime();
    const nowTime = Date.now();
    // Base renewal off current expiry if still active, or off today if expired
    const baseTime = currentExpiryTime > nowTime ? currentExpiryTime : nowTime;
    const newExpiry = new Date(baseTime + extensionYears * 365 * 24 * 60 * 60 * 1000).toISOString();

    const updated = this.updateOrganization(orgId, {
      amc_expiry: newExpiry,
      status: 'ACTIVE',
      updated_at: new Date().toISOString()
    });

    this.addPlatformAuditEvent({
      actor_id: 'usr_platform_superadmin',
      actor_email: 'superadmin@retinova.ai',
      actor_role: 'PLATFORM_ADMIN',
      organization_id: orgId,
      action: 'ORG_CONFIG_UPDATED',
      target_type: 'ORGANIZATION',
      target_id: orgId,
      metadata: {
        event: 'AMC_CONTRACT_RENEWED',
        previous_expiry: org.amc_expiry,
        new_expiry: newExpiry,
        extension_years: extensionYears
      }
    });

    return updated;
  }

  // --- Reset Demonstration Environment ---
  public resetDemoData(): { success: boolean; message: string; timestamp: string } {
    const initial = this.getInitialData();
    this.data.organizations = initial.organizations;
    this.data.platformUsers = initial.platformUsers;
    this.data.registeredDevices = initial.registeredDevices;
    this.data.aiWorkflows = initial.aiWorkflows;
    this.data.modelRegistry = initial.modelRegistry;
    this.data.subscriptionPlans = initial.subscriptionPlans;

    this.addPlatformAuditEvent({
      actor_id: 'usr_platform_superadmin',
      actor_email: 'superadmin@retinova.ai',
      actor_role: 'PLATFORM_ADMIN',
      organization_id: 'org_retinova_health',
      action: 'ORG_CONFIG_UPDATED',
      target_type: 'ORGANIZATION',
      target_id: 'GLOBAL',
      metadata: { action: 'DEMO_DATA_RESET_TRIGGERED' }
    });

    this.save();
    return {
      success: true,
      message: 'Demo dataset restored to baseline certified state for multi-vertical presentations.',
      timestamp: new Date().toISOString()
    };
  }

  // --- Tenant-Scoped Reporting & Export Engine ---
  public generateTenantReport(
    orgId: string,
    reportType: 'EVENTS' | 'DEVICES' | 'USAGE' | 'MAINTENANCE',
    format: 'JSON' | 'CSV' = 'JSON'
  ): { format: string; filename: string; content: any } {
    const org = this.getOrganization(orgId);
    const orgName = org?.organization_name || orgId;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

    if (reportType === 'DEVICES') {
      const devices = this.getRegisteredDevices(orgId);
      const rows = devices.map(d => ({
        device_id: d.device_id,
        device_name: d.device_name,
        device_type: d.device_type,
        app_version: d.app_version,
        model_version: d.model_version,
        connectivity_status: d.connectivity_status,
        battery_level: d.battery_level ?? 90,
        storage_free_mb: d.storage_free_mb ?? 18000,
        total_detections: d.total_detections,
        last_seen: d.last_seen
      }));

      if (format === 'CSV') {
        const headers = ['Device ID', 'Device Name', 'Form Factor', 'App Version', 'Model Version', 'Status', 'Battery %', 'Free Storage (MB)', 'Detections', 'Last Seen'];
        const csvRows = [headers.join(',')];
        for (const r of rows) {
          csvRows.push([
            r.device_id,
            `"${r.device_name}"`,
            r.device_type,
            r.app_version,
            r.model_version,
            r.connectivity_status,
            r.battery_level,
            r.storage_free_mb,
            r.total_detections,
            r.last_seen
          ].join(','));
        }
        return {
          format: 'CSV',
          filename: `RETINOVA_Device_Fleet_${orgId}_${timestamp}.csv`,
          content: csvRows.join('\n')
        };
      }

      return {
        format: 'JSON',
        filename: `RETINOVA_Device_Fleet_${orgId}_${timestamp}.json`,
        content: { organization: orgName, total_devices: rows.length, generated_at: new Date().toISOString(), devices: rows }
      };
    }

    if (reportType === 'USAGE') {
      const usage = this.getTenantUsage(orgId);
      if (format === 'CSV') {
        const headers = ['Metric', 'Current Consumed', 'Plan Quota Limit', 'Utilization %'];
        const csvRows = [
          headers.join(','),
          `Devices,${usage?.devices.current},${usage?.devices.limit},${usage?.devices.percent}%`,
          `Users,${usage?.users.current},${usage?.users.limit},${usage?.users.percent}%`,
          `Monthly Events,${usage?.events.currentMonthly},${usage?.events.limitMonthly},${usage?.events.percent}%`,
          `Storage (MB),${usage?.storage.currentMb},${usage?.storage.limitMb},${usage?.storage.percent}%`
        ];
        return {
          format: 'CSV',
          filename: `RETINOVA_Usage_Audit_${orgId}_${timestamp}.csv`,
          content: csvRows.join('\n')
        };
      }

      return {
        format: 'JSON',
        filename: `RETINOVA_Usage_Audit_${orgId}_${timestamp}.json`,
        content: { organization: orgName, usage, generated_at: new Date().toISOString() }
      };
    }

    if (reportType === 'MAINTENANCE') {
      const overview = this.getMaintenanceOverview().find(m => m.organization_id === orgId);
      if (format === 'CSV') {
        const headers = ['Organization', 'AMC Status', 'Contract Expiry', 'Total Devices', 'Online Devices', 'Firmware Updates Needed', 'Model Updates Needed', 'SLA Tier'];
        const csvRows = [
          headers.join(','),
          `"${overview?.organization_name}",${overview?.amc_status},${overview?.amc_expires_at},${overview?.devices_total},${overview?.devices_online},${overview?.devices_requiring_app_update},${overview?.devices_requiring_model_update},"${overview?.support_sla_tier}"`
        ];
        return {
          format: 'CSV',
          filename: `RETINOVA_Maintenance_Status_${orgId}_${timestamp}.csv`,
          content: csvRows.join('\n')
        };
      }

      return {
        format: 'JSON',
        filename: `RETINOVA_Maintenance_Status_${orgId}_${timestamp}.json`,
        content: { organization: orgName, maintenance: overview, generated_at: new Date().toISOString() }
      };
    }

    // Default: Audit / Events Summary
    const audits = this.getPlatformAuditEvents(orgId, 200);
    if (format === 'CSV') {
      const headers = ['Audit ID', 'Timestamp', 'Actor Email', 'Role', 'Action', 'Target Type', 'Target ID'];
      const csvRows = [headers.join(',')];
      for (const a of audits) {
        csvRows.push([a.id, a.timestamp, a.actor_email, a.actor_role, a.action, a.target_type, a.target_id].join(','));
      }
      return {
        format: 'CSV',
        filename: `RETINOVA_Audit_Log_${orgId}_${timestamp}.csv`,
        content: csvRows.join('\n')
      };
    }

    return {
      format: 'JSON',
      filename: `RETINOVA_Audit_Log_${orgId}_${timestamp}.json`,
      content: { organization: orgName, total_logs: audits.length, generated_at: new Date().toISOString(), audit_logs: audits }
    };
  }
}
