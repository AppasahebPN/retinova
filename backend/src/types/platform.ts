// ============================================================
// RETINOVA PLATFORM — Multi-Tenant Architecture & Domain Models
// Core TypeScript Definitions for B2B/B2G Platformization
// ============================================================

export type OrganizationType = 
  | 'HEALTHCARE'
  | 'INSURANCE'
  | 'GOVERNMENT'
  | 'INDUSTRIAL'
  | 'SECURITY'
  | 'OTHER';

export type OrganizationStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'TRIAL';

export type PlatformRole = 
  | 'PLATFORM_ADMIN'
  | 'ORG_ADMIN'
  | 'OPERATOR'
  | 'REVIEWER'
  | 'VIEWER';

export type SubscriptionTier = 'BASIC' | 'PRO' | 'ENTERPRISE' | 'CUSTOM';

export type DeviceConnectivityStatus = 'ONLINE' | 'OFFLINE' | 'SYNCING' | 'ERROR';

export type WorkflowVertical = 
  | 'HEALTHCARE'
  | 'INSURANCE'
  | 'GOVERNMENT'
  | 'SECURITY'
  | 'INDUSTRIAL';

// ---- Organization Entity ----
export interface OrganizationConfig {
  enabledWorkflows: string[];
  confidenceThreshold: number; // e.g. 0.75
  severityEscalationRules: {
    notifySNSOnHigh: boolean;
    notifySNSOnCritical: boolean;
    requireReviewForHigh: boolean;
  };
  evidenceRetentionDays: number;
  branding: {
    companyName: string;
    logoUrl?: string;
    primaryColor?: string;
    dashboardTitle?: string;
  };
  limits: {
    maxDevices: number;
    maxUsers: number;
    maxMonthlyEvents: number;
    storageLimitGb: number;
  };
}

export interface Organization {
  organization_id: string;
  organization_name: string;
  organization_type: OrganizationType;
  subscription_plan: SubscriptionTier;
  status: OrganizationStatus;
  isDemo?: boolean;
  created_at: string;
  updated_at: string;
  configuration: OrganizationConfig;
  contact_email: string;
  contact_phone?: string;
  country: string;
  amc_expiry: string; // Annual Maintenance Contract expiration date
}

// ---- Multi-Tenant User Entity ----
export interface PlatformUser {
  id: string;
  email: string;
  password_hash: string;
  full_name: string;
  organization_id: string;
  role: PlatformRole;
  is_active: boolean;
  isDemo?: boolean;
  created_at: string;
  updated_at: string;
  last_login?: string;
}

// ---- Registered Edge Device Entity ----
export interface RegisteredDevice {
  device_id: string;
  organization_id: string;
  device_name: string;
  device_type: 'ANDROID_PHONE' | 'RUGGED_TABLET' | 'EDGE_GATEWAY' | 'JETSON_NODE';
  app_version: string;
  model_version: string;
  assigned_workflow_id: string;
  last_seen: string;
  connectivity_status: DeviceConnectivityStatus;
  status: 'ACTIVE' | 'DISABLED' | 'DECOMMISSIONED';
  isDemo?: boolean;
  registered_at: string;
  location?: {
    name?: string;
    latitude: number;
    longitude: number;
  };
  battery_level?: number;
  storage_free_mb?: number;
  total_detections: number;
  pending_sync_count: number;
}

// ---- AI Workflow Specification ----
export interface AIWorkflowDefinition {
  workflow_id: string;
  vertical: WorkflowVertical;
  name: string;
  description: string;
  version: string;
  model_id: string;
  input_type: 'FUNDUS_IMAGE' | 'RGB_IMAGE' | 'MULTI_FRAME' | 'THERMAL_IMAGE';
  output_classes: string[];
  confidence_threshold: number;
  severity_mapping: Record<string, 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'>;
  evidence_requirements: string[]; // e.g. ['gradcam_heatmap', 'vessel_mask']
  reporting_format: 'CLINICAL_DOSSIER' | 'CLAIMS_REPORT' | 'SURVEILLANCE_DISPATCH' | 'INFRASTRUCTURE_AUDIT';
  is_active: boolean;
}

// ---- Model Version Registry ----
export interface ModelRegistryRecord {
  model_id: string;
  workflow_id: string;
  version: string;
  name: string;
  format: 'PYTORCH_PT' | 'ONNX' | 'TFLITE' | 'TORCHSCRIPT';
  size_bytes: number;
  checksum_sha256: string;
  download_url: string;
  status: 'ACTIVE' | 'DEPRECATED' | 'STAGING' | 'ARCHIVED';
  min_app_version: string;
  release_notes: string;
  created_at: string;
}

// ---- Subscription Plan Definition ----
export interface SubscriptionPlan {
  plan_id: SubscriptionTier;
  name: string;
  price_monthly_inr: number;
  billing_period: 'MONTHLY' | 'ANNUAL';
  max_devices: number;
  max_users: number;
  storage_limit_mb: number;
  event_limit_monthly: number;
  features: string[];
  support_level: 'COMMUNITY' | 'STANDARD_BUSINESS' | 'DEDICATED_24x7';
}

// ---- Platform Audit Event ----
export interface PlatformAuditEvent {
  id: string;
  actor_id: string;
  actor_email: string;
  actor_role: PlatformRole;
  organization_id: string;
  action: 
    | 'LOGIN'
    | 'LOGOUT'
    | 'USER_CREATED'
    | 'USER_DELETED'
    | 'USER_ROLE_CHANGED'
    | 'DEVICE_REGISTERED'
    | 'DEVICE_DISABLED'
    | 'DEVICE_RENAMED'
    | 'WORKFLOW_CONFIG_CHANGED'
    | 'MODEL_UPDATED'
    | 'EVENT_REVIEWED'
    | 'ORG_CONFIG_UPDATED'
    | 'PLAN_CHANGED';
  target_type: 'USER' | 'DEVICE' | 'ORGANIZATION' | 'WORKFLOW' | 'MODEL' | 'EVENT';
  target_id: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

// ---- Maintenance / AMC Status ----
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
