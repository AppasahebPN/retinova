// ============================================================
// RETINOVA PLATFORM — Multi-Tenant Management REST API
// B2B / B2G Platform Operations, Tenant Isolation, RBAC & Fleet Control
// ============================================================

import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { DatabaseStore } from '../db/store';
import { config } from '../config';
import {
  PlatformAuthenticatedRequest,
  authenticatePlatformUser,
  enforceTenantIsolation,
  requirePlatformRoles,
} from '../middleware/tenantIsolation';
import { AIWorkflowEngine } from '../services/aiWorkflowEngine';
import { ModelLifecycleManager } from '../services/modelManager';
import {
  Organization,
  PlatformUser,
  RegisteredDevice,
  SubscriptionTier,
} from '../types/platform';

const router = Router();

// ============================================================
// 1. AUTHENTICATION & SESSION ENDPOINTS
// ============================================================

/**
 * POST /api/platform/auth/login
 * Multi-tenant authentication returning JWT with organization scoping and role
 */
router.post('/auth/login', async (req, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const store = DatabaseStore.getInstance();
  const user = store.getPlatformUserByEmail(email);

  if (!user || !user.is_active) {
    return res.status(401).json({ error: 'Invalid credentials or inactive account.' });
  }

  // Demo fallback password support
  const isMatch =
    password === 'demo1234' ||
    password === 'password' ||
    bcrypt.compareSync(password, user.password_hash);

  if (!isMatch) {
    return res.status(401).json({ error: 'Invalid credentials. Password incorrect.' });
  }

  const org = store.getOrganization(user.organization_id);

  const token = jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      organization_id: user.organization_id,
      full_name: user.full_name,
    },
    config.jwtSecret,
    { expiresIn: '7d' }
  );

  store.updatePlatformUser(user.id, { last_login: new Date().toISOString() });

  store.addPlatformAuditEvent({
    actor_id: user.id,
    actor_email: user.email,
    actor_role: user.role,
    organization_id: user.organization_id,
    action: 'LOGIN',
    target_type: 'USER',
    target_id: user.id,
    metadata: { ip: req.ip },
  });

  return res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      organization_id: user.organization_id,
      organization_name: org?.organization_name,
      organization_type: org?.organization_type,
    },
  });
});

/**
 * GET /api/platform/auth/me
 */
router.get('/auth/me', authenticatePlatformUser, (req: PlatformAuthenticatedRequest, res) => {
  const store = DatabaseStore.getInstance();
  const user = req.platformUser!;
  const org = store.getOrganization(user.organization_id);

  return res.json({
    user,
    organization: org,
  });
});

/**
 * GET /api/platform/auth/demo-users
 * Returns list of seeded demo users across multiple verticals for rapid testing
 */
router.get('/auth/demo-users', (_req, res) => {
  const store = DatabaseStore.getInstance();
  const users = store.getPlatformUsers().map(u => {
    const org = store.getOrganization(u.organization_id);
    return {
      id: u.id,
      email: u.email,
      full_name: u.full_name,
      role: u.role,
      organization_id: u.organization_id,
      organization_name: org?.organization_name || u.organization_id,
      organization_type: org?.organization_type || 'HEALTHCARE',
      demo_password: 'password (or demo1234)',
    };
  });
  return res.json({ demo_users: users });
});

// ============================================================
// 2. ORGANIZATION MANAGEMENT (Strict Multi-Tenancy)
// ============================================================

/**
 * GET /api/platform/organizations
 * PLATFORM_ADMIN gets all organizations.
 * Other roles get only their assigned organization.
 */
router.get('/organizations', authenticatePlatformUser, (req: PlatformAuthenticatedRequest, res) => {
  const store = DatabaseStore.getInstance();
  const user = req.platformUser!;

  if (user.role === 'PLATFORM_ADMIN') {
    return res.json({ organizations: store.getOrganizations() });
  }

  // Scoped strictly to user's organization
  const org = store.getOrganization(user.organization_id);
  return res.json({ organizations: org ? [org] : [] });
});

/**
 * GET /api/platform/organizations/:orgId
 */
router.get(
  '/organizations/:orgId',
  authenticatePlatformUser,
  enforceTenantIsolation,
  (req: PlatformAuthenticatedRequest, res) => {
    const store = DatabaseStore.getInstance();
    const orgId = req.params.orgId as string;
    const org = store.getOrganization(orgId);
    if (!org) {
      return res.status(404).json({ error: 'Organization not found' });
    }
    return res.json({ organization: org });
  }
);

/**
 * POST /api/platform/organizations
 * Create a new organization tenant (PLATFORM_ADMIN only)
 */
router.post(
  '/organizations',
  authenticatePlatformUser,
  requirePlatformRoles('PLATFORM_ADMIN'),
  (req: PlatformAuthenticatedRequest, res) => {
    const store = DatabaseStore.getInstance();
    const {
      organization_name,
      organization_type,
      subscription_plan = 'BASIC',
      contact_email,
      country = 'India',
    } = req.body;

    if (!organization_name || !organization_type || !contact_email) {
      return res.status(400).json({
        error: 'organization_name, organization_type, and contact_email are required',
      });
    }

    const orgId = `org_${organization_name.toLowerCase().replace(/[^a-z0-9]/g, '_').substring(0, 20)}_${Math.random().toString(36).substring(2, 6)}`;

    // Calculate 1 year AMC expiry
    const amcDate = new Date();
    amcDate.setFullYear(amcDate.getFullYear() + 1);

    const newOrg: Organization = {
      organization_id: orgId,
      organization_name,
      organization_type,
      subscription_plan,
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      contact_email,
      country,
      amc_expiry: amcDate.toISOString(),
      configuration: {
        enabledWorkflows:
          organization_type === 'HEALTHCARE'
            ? ['retinal_dr_swinv2']
            : organization_type === 'INSURANCE'
            ? ['asset_damage_v1']
            : organization_type === 'GOVERNMENT'
            ? ['field_infrastructure_v1']
            : ['perimeter_security_v1'],
        confidenceThreshold: 0.75,
        severityEscalationRules: {
          notifySNSOnHigh: true,
          notifySNSOnCritical: true,
          requireReviewForHigh: true,
        },
        evidenceRetentionDays: 90,
        branding: {
          companyName: organization_name,
          dashboardTitle: `${organization_name} — Edge AI Intelligence Portal`,
        },
        limits: {
          maxDevices: subscription_plan === 'ENTERPRISE' ? 100 : subscription_plan === 'PRO' ? 25 : 5,
          maxUsers: subscription_plan === 'ENTERPRISE' ? 100 : subscription_plan === 'PRO' ? 30 : 5,
          maxMonthlyEvents: subscription_plan === 'ENTERPRISE' ? 50000 : subscription_plan === 'PRO' ? 10000 : 1000,
          storageLimitGb: subscription_plan === 'ENTERPRISE' ? 250 : subscription_plan === 'PRO' ? 50 : 10,
        },
      },
    };

    store.addOrganization(newOrg);

    store.addPlatformAuditEvent({
      actor_id: req.platformUser!.id,
      actor_email: req.platformUser!.email,
      actor_role: req.platformUser!.role,
      organization_id: newOrg.organization_id,
      action: 'ORG_CONFIG_UPDATED',
      target_type: 'ORGANIZATION',
      target_id: newOrg.organization_id,
      metadata: { action: 'ORGANIZATION_CREATED', plan: subscription_plan },
    });

    return res.status(201).json({ organization: newOrg });
  }
);

/**
 * PATCH /api/platform/organizations/:orgId
 * Update organization configuration, branding, or AI workflows
 */
router.patch(
  '/organizations/:orgId',
  authenticatePlatformUser,
  enforceTenantIsolation,
  requirePlatformRoles('PLATFORM_ADMIN', 'ORG_ADMIN'),
  (req: PlatformAuthenticatedRequest, res) => {
    const store = DatabaseStore.getInstance();
    const updates = req.body;

    // Non-platform admin cannot modify subscription plan or status directly
    if (req.platformUser!.role !== 'PLATFORM_ADMIN') {
      delete updates.subscription_plan;
      delete updates.status;
      delete updates.amc_expiry;
    }

    const orgId = req.params.orgId as string;
    const updated = store.updateOrganization(orgId, updates);
    if (!updated) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    store.addPlatformAuditEvent({
      actor_id: req.platformUser!.id,
      actor_email: req.platformUser!.email,
      actor_role: req.platformUser!.role,
      organization_id: updated.organization_id,
      action: 'ORG_CONFIG_UPDATED',
      target_type: 'ORGANIZATION',
      target_id: updated.organization_id,
      metadata: { modifiedFields: Object.keys(updates) },
    });

    return res.json({ organization: updated });
  }
);

/**
 * GET /api/platform/organizations/:orgId/usage
 * Calculates device, user, event, and storage consumption vs plan quotas
 */
router.get(
  '/organizations/:orgId/usage',
  authenticatePlatformUser,
  enforceTenantIsolation,
  (req: PlatformAuthenticatedRequest, res) => {
    const store = DatabaseStore.getInstance();
    const orgId = req.params.orgId as string;
    const usage = store.getTenantUsage(orgId);
    if (!usage) {
      return res.status(404).json({ error: 'Organization not found' });
    }
    return res.json({ usage });
  }
);

/**
 * GET /api/platform/organizations/:orgId/users
 */
router.get(
  '/organizations/:orgId/users',
  authenticatePlatformUser,
  enforceTenantIsolation,
  (req: PlatformAuthenticatedRequest, res) => {
    const store = DatabaseStore.getInstance();
    const orgId = req.params.orgId as string;
    const users = store.getPlatformUsers(orgId).map(u => ({
      id: u.id,
      email: u.email,
      full_name: u.full_name,
      role: u.role,
      is_active: u.is_active,
      created_at: u.created_at,
      last_login: u.last_login,
    }));
    return res.json({ users });
  }
);

/**
 * POST /api/platform/organizations/:orgId/users
 * Add user to organization
 */
router.post(
  '/organizations/:orgId/users',
  authenticatePlatformUser,
  enforceTenantIsolation,
  requirePlatformRoles('PLATFORM_ADMIN', 'ORG_ADMIN'),
  (req: PlatformAuthenticatedRequest, res) => {
    const store = DatabaseStore.getInstance();
    const { email, password, full_name, role = 'OPERATOR' } = req.body;

    if (!email || !password || !full_name) {
      return res.status(400).json({ error: 'email, password, and full_name are required' });
    }

    const salt = bcrypt.genSaltSync(10);
    const password_hash = bcrypt.hashSync(password, salt);

    const orgId = req.params.orgId as string;
    const newUser: PlatformUser = {
      id: `usr_${Math.random().toString(36).substring(2, 9)}`,
      email,
      password_hash,
      full_name,
      organization_id: orgId,
      role,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    try {
      store.addPlatformUser(newUser);

      store.addPlatformAuditEvent({
        actor_id: req.platformUser!.id,
        actor_email: req.platformUser!.email,
        actor_role: req.platformUser!.role,
        organization_id: orgId,
        action: 'USER_CREATED',
        target_type: 'USER',
        target_id: newUser.id,
        metadata: { role, email },
      });

      return res.status(201).json({
        user: {
          id: newUser.id,
          email: newUser.email,
          full_name: newUser.full_name,
          role: newUser.role,
          organization_id: newUser.organization_id,
        },
      });
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  }
);

// ============================================================
// 3. DEVICE MANAGEMENT
// ============================================================

/**
 * GET /api/platform/devices
 * Scoped to organization
 */
router.get('/devices', authenticatePlatformUser, (req: PlatformAuthenticatedRequest, res) => {
  const store = DatabaseStore.getInstance();
  const user = req.platformUser!;

  const orgFilter = user.role === 'PLATFORM_ADMIN' ? (req.query.organization_id as string) : user.organization_id;

  const devices = store.getRegisteredDevices(orgFilter);
  return res.json({ devices });
});

/**
 * GET /api/platform/devices/:deviceId
 */
router.get('/devices/:deviceId', authenticatePlatformUser, (req: PlatformAuthenticatedRequest, res) => {
  const store = DatabaseStore.getInstance();
  const user = req.platformUser!;
  const orgFilter = user.role === 'PLATFORM_ADMIN' ? undefined : user.organization_id;

  const deviceId = req.params.deviceId as string;
  const device = store.getRegisteredDevice(deviceId, orgFilter);
  if (!device) {
    return res.status(404).json({ error: 'Device not found or not in your organization' });
  }

  return res.json({ device });
});

/**
 * POST /api/platform/devices/register
 * Edge device registration endpoint
 */
router.post('/devices/register', authenticatePlatformUser, (req: PlatformAuthenticatedRequest, res) => {
  const store = DatabaseStore.getInstance();
  const user = req.platformUser!;
  const {
    device_id,
    device_name,
    device_type = 'ANDROID_PHONE',
    app_version = '2.4.0',
    model_version = 'v2.4.0',
    assigned_workflow_id,
    location,
  } = req.body;

  if (!device_id || !device_name) {
    return res.status(400).json({ error: 'device_id and device_name are required' });
  }

  // Ensure target org is user's org if not superadmin
  const targetOrg =
    user.role === 'PLATFORM_ADMIN' && req.body.organization_id
      ? req.body.organization_id
      : user.organization_id;

  const org = store.getOrganization(targetOrg);
  if (!org) {
    return res.status(404).json({ error: 'Organization does not exist' });
  }

  // Check device limit quota
  const currentDevices = store.getRegisteredDevices(targetOrg);
  const plan = store.getSubscriptionPlan(org.subscription_plan);
  const limit = plan?.max_devices ?? org.configuration.limits.maxDevices;

  if (currentDevices.length >= limit && !currentDevices.some(d => d.device_id === device_id)) {
    return res.status(403).json({
      error: `Device limit reached (${currentDevices.length}/${limit}). Please upgrade your subscription plan.`,
    });
  }

  const registered = store.registerDevice({
    device_id,
    organization_id: targetOrg,
    device_name,
    device_type,
    app_version,
    model_version,
    assigned_workflow_id: assigned_workflow_id || org.configuration.enabledWorkflows[0] || 'retinal_dr_swinv2',
    last_seen: new Date().toISOString(),
    connectivity_status: 'ONLINE',
    status: 'ACTIVE',
    registered_at: new Date().toISOString(),
    location,
    battery_level: req.body.battery_level ?? 92,
    storage_free_mb: req.body.storage_free_mb ?? 18400,
    total_detections: 0,
    pending_sync_count: 0,
  });

  store.addPlatformAuditEvent({
    actor_id: user.id,
    actor_email: user.email,
    actor_role: user.role,
    organization_id: targetOrg,
    action: 'DEVICE_REGISTERED',
    target_type: 'DEVICE',
    target_id: registered.device_id,
    metadata: { device_name, device_type, app_version },
  });

  return res.status(201).json({ device: registered });
});

/**
 * PATCH /api/platform/devices/:deviceId
 * Update device status (disable, rename, assign location, workflow)
 */
router.patch(
  '/devices/:deviceId',
  authenticatePlatformUser,
  requirePlatformRoles('PLATFORM_ADMIN', 'ORG_ADMIN'),
  (req: PlatformAuthenticatedRequest, res) => {
    const store = DatabaseStore.getInstance();
    const user = req.platformUser!;
    const orgFilter = user.role === 'PLATFORM_ADMIN' ? undefined : user.organization_id;

    const deviceId = req.params.deviceId as string;
    const updated = store.updateDevice(deviceId, req.body, orgFilter);
    if (!updated) {
      return res.status(404).json({ error: 'Device not found or not in your organization' });
    }

    store.addPlatformAuditEvent({
      actor_id: user.id,
      actor_email: user.email,
      actor_role: user.role,
      organization_id: updated.organization_id,
      action: req.body.status === 'DISABLED' ? 'DEVICE_DISABLED' : 'DEVICE_RENAMED',
      target_type: 'DEVICE',
      target_id: updated.device_id,
      metadata: req.body,
    });

    return res.json({ device: updated });
  }
);

/**
 * POST /api/platform/devices/:deviceId/heartbeat
 * Device telemetry reporting
 */
router.post('/devices/:deviceId/heartbeat', (req, res) => {
  const store = DatabaseStore.getInstance();
  const { connectivity_status = 'ONLINE', battery_level, storage_free_mb, pending_sync_count } = req.body;

  const updated = store.updateDevice(req.params.deviceId, {
    connectivity_status,
    battery_level,
    storage_free_mb,
    pending_sync_count,
    last_seen: new Date().toISOString(),
  });

  if (!updated) {
    return res.status(404).json({ error: 'Device not recognized' });
  }

  return res.json({ status: 'ACK', device_id: updated.device_id, last_seen: updated.last_seen });
});

// ============================================================
// 4. AI WORKFLOW MODULE SYSTEM
// ============================================================

/**
 * GET /api/platform/workflows
 */
router.get('/workflows', authenticatePlatformUser, (req: PlatformAuthenticatedRequest, res) => {
  const store = DatabaseStore.getInstance();
  const user = req.platformUser!;
  const workflows = store.getAIWorkflows();

  if (user.role === 'PLATFORM_ADMIN') {
    return res.json({ workflows });
  }

  const org = store.getOrganization(user.organization_id);
  const enabled = org?.configuration.enabledWorkflows || [];

  return res.json({
    workflows: workflows.map(w => ({
      ...w,
      is_enabled_for_org: enabled.includes(w.workflow_id),
    })),
  });
});

/**
 * POST /api/platform/workflows/:workflowId/execute
 * Executes modular AI inference pipeline
 */
router.post('/workflows/:workflowId/execute', authenticatePlatformUser, async (req: PlatformAuthenticatedRequest, res) => {
  try {
    const workflowId = req.params.workflowId as string;
    const user = req.platformUser!;
    const engine = AIWorkflowEngine.getInstance();

    const output = await engine.executePipeline(workflowId, req.body.input || {}, {
      organizationId: user.organization_id,
      deviceId: req.body.deviceId || 'cloud_direct_node',
      metadata: req.body.metadata,
    });

    return res.json({
      success: true,
      data: output,
    });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// ============================================================
// 5. MODEL MANAGEMENT & OTA UPDATES
// ============================================================

/**
 * GET /api/platform/models
 */
router.get('/models', authenticatePlatformUser, (req, res) => {
  const store = DatabaseStore.getInstance();
  const workflowId = req.query.workflow_id as string;
  const models = store.getModelRegistry(workflowId);
  return res.json({ models });
});

/**
 * GET /api/platform/models/check-update/:deviceId
 * Edge device checks for updates
 */
router.get('/models/check-update/:deviceId', (req, res) => {
  try {
    const manager = ModelLifecycleManager.getInstance();
    const result = manager.checkForModelUpdate(req.params.deviceId as string);
    return res.json(result);
  } catch (err: any) {
    return res.status(404).json({ error: err.message });
  }
});

/**
 * POST /api/platform/models/activate
 * Device reports download & verification result; activates or safely rolls back
 */
router.post('/models/activate', (req, res) => {
  try {
    const manager = ModelLifecycleManager.getInstance();
    const response = manager.verifyAndActivate(req.body);
    return res.json(response);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// ============================================================
// 6. SUBSCRIPTION & LICENSING
// ============================================================

/**
 * GET /api/platform/plans
 */
router.get('/plans', (_req, res) => {
  const store = DatabaseStore.getInstance();
  return res.json({ plans: store.getSubscriptionPlans() });
});

/**
 * POST /api/platform/organizations/:orgId/plan
 * Assign plan (PLATFORM_ADMIN only)
 */
router.post(
  '/organizations/:orgId/plan',
  authenticatePlatformUser,
  requirePlatformRoles('PLATFORM_ADMIN'),
  (req: PlatformAuthenticatedRequest, res) => {
    const { plan_id } = req.body;
    const store = DatabaseStore.getInstance();
    const plan = store.getSubscriptionPlan(plan_id);

    if (!plan) {
      return res.status(400).json({ error: `Invalid subscription plan '${plan_id}'` });
    }

    const orgId = req.params.orgId as string;
    const org = store.updateOrganization(orgId, {
      subscription_plan: plan_id as SubscriptionTier,
      configuration: {
        ...store.getOrganization(orgId)!.configuration,
        limits: {
          maxDevices: plan.max_devices,
          maxUsers: plan.max_users,
          maxMonthlyEvents: plan.event_limit_monthly,
          storageLimitGb: Math.round(plan.storage_limit_mb / 1024),
        },
      },
    });

    if (!org) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    store.addPlatformAuditEvent({
      actor_id: req.platformUser!.id,
      actor_email: req.platformUser!.email,
      actor_role: req.platformUser!.role,
      organization_id: org.organization_id,
      action: 'PLAN_CHANGED',
      target_type: 'ORGANIZATION',
      target_id: org.organization_id,
      metadata: { plan_id },
    });

    return res.json({ message: 'Plan updated successfully', organization: org });
  }
);

// ============================================================
// 7. MAINTENANCE / AMC MODULE
// ============================================================

/**
 * GET /api/platform/maintenance/overview
 */
router.get(
  '/maintenance/overview',
  authenticatePlatformUser,
  (req: PlatformAuthenticatedRequest, res) => {
    const store = DatabaseStore.getInstance();
    const user = req.platformUser!;
    const all = store.getMaintenanceOverview();

    if (user.role === 'PLATFORM_ADMIN') {
      return res.json({ maintenance: all });
    }

    const scoped = all.filter(m => m.organization_id === user.organization_id);
    return res.json({ maintenance: scoped });
  }
);

// ============================================================
// 8. AUDIT TRAIL
// ============================================================

/**
 * GET /api/platform/audit-logs
 */
router.get('/audit-logs', authenticatePlatformUser, (req: PlatformAuthenticatedRequest, res) => {
  const store = DatabaseStore.getInstance();
  const user = req.platformUser!;
  const orgFilter = user.role === 'PLATFORM_ADMIN' ? (req.query.organization_id as string) : user.organization_id;

  const logs = store.getPlatformAuditEvents(orgFilter);
  return res.json({ audit_logs: logs });
});

// ============================================================
// 9. AUTOMATED CUSTOMER ONBOARDING WIZARD
// ============================================================

/**
 * POST /api/platform/onboarding/wizard
 * End-to-end customer onboarding pipeline:
 * Creates Org -> Sets Plan -> Configures Workflow -> Creates Org Admin -> Registers Device -> Generates Workspace
 */
router.post(
  '/onboarding/wizard',
  authenticatePlatformUser,
  requirePlatformRoles('PLATFORM_ADMIN'),
  (req: PlatformAuthenticatedRequest, res) => {
    const store = DatabaseStore.getInstance();
    const {
      organization_name,
      organization_type = 'HEALTHCARE',
      subscription_plan = 'PRO',
      workflow_id,
      admin_email,
      admin_name,
      admin_password = 'password123',
      initial_device_name,
      initial_device_type = 'ANDROID_PHONE',
      country = 'India',
    } = req.body;

    if (!organization_name || !admin_email || !admin_name) {
      return res.status(400).json({
        error: 'organization_name, admin_email, and admin_name are required for onboarding.',
      });
    }

    // 1. Create Organization Entity
    const orgId = `org_${organization_name.toLowerCase().replace(/[^a-z0-9]/g, '_').substring(0, 18)}_${Math.random().toString(36).substring(2, 6)}`;
    const amcDate = new Date();
    amcDate.setFullYear(amcDate.getFullYear() + 1);

    const defaultWorkflow =
      workflow_id ||
      (organization_type === 'HEALTHCARE'
        ? 'retinal_dr_swinv2'
        : organization_type === 'INSURANCE'
        ? 'asset_damage_v1'
        : organization_type === 'GOVERNMENT'
        ? 'field_infrastructure_v1'
        : 'perimeter_security_v1');

    const plan = store.getSubscriptionPlan(subscription_plan) || store.getSubscriptionPlan('PRO')!;

    const newOrg: Organization = {
      organization_id: orgId,
      organization_name,
      organization_type,
      subscription_plan,
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      contact_email: admin_email,
      country,
      amc_expiry: amcDate.toISOString(),
      configuration: {
        enabledWorkflows: [defaultWorkflow],
        confidenceThreshold: 0.75,
        severityEscalationRules: {
          notifySNSOnHigh: true,
          notifySNSOnCritical: true,
          requireReviewForHigh: true,
        },
        evidenceRetentionDays: 90,
        branding: {
          companyName: organization_name,
          dashboardTitle: `${organization_name} — AI Portal`,
        },
        limits: {
          maxDevices: plan.max_devices,
          maxUsers: plan.max_users,
          maxMonthlyEvents: plan.event_limit_monthly,
          storageLimitGb: Math.round(plan.storage_limit_mb / 1024),
        },
      },
    };

    store.addOrganization(newOrg);

    // 2. Provision Organization Administrator
    const salt = bcrypt.genSaltSync(10);
    const password_hash = bcrypt.hashSync(admin_password, salt);
    const newAdminUser: PlatformUser = {
      id: `usr_${Math.random().toString(36).substring(2, 9)}`,
      email: admin_email,
      password_hash,
      full_name: admin_name,
      organization_id: orgId,
      role: 'ORG_ADMIN',
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    store.addPlatformUser(newAdminUser);

    // 3. Provision Initial Edge Device
    const devId = `DEV-${organization_type.substring(0, 3)}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const devToken = `dvt_${Math.random().toString(36).substring(2, 12)}_${Date.now()}`;
    const registeredDev = store.registerDevice({
      device_id: devId,
      organization_id: orgId,
      device_name: initial_device_name || `${organization_name} Primary Edge Unit 01`,
      device_type: initial_device_type as any,
      app_version: '2.4.0',
      model_version: defaultWorkflow === 'retinal_dr_swinv2' ? 'v2.4.0' : 'v1.0.0',
      assigned_workflow_id: defaultWorkflow,
      last_seen: new Date().toISOString(),
      connectivity_status: 'ONLINE',
      status: 'ACTIVE',
      registered_at: new Date().toISOString(),
      battery_level: 100,
      storage_free_mb: 24500,
      total_detections: 0,
      pending_sync_count: 0,
    });

    // 4. Record Audit Log
    store.addPlatformAuditEvent({
      actor_id: req.platformUser!.id,
      actor_email: req.platformUser!.email,
      actor_role: req.platformUser!.role,
      organization_id: orgId,
      action: 'ORG_CONFIG_UPDATED',
      target_type: 'ORGANIZATION',
      target_id: orgId,
      metadata: {
        action: 'ONBOARDING_WIZARD_COMPLETED',
        plan: subscription_plan,
        device_id: devId,
        admin_email,
      },
    });

    // 5. Generate Response Dossier
    return res.status(201).json({
      success: true,
      message: `Organization '${organization_name}' successfully onboarded and provisioned.`,
      workspace: {
        organization_id: orgId,
        organization_name,
        organization_type,
        subscription_plan,
        amc_expiry: newOrg.amc_expiry,
        dashboard_url: `/dashboard`,
        admin_credentials: {
          email: admin_email,
          temporary_password: admin_password,
          role: 'ORG_ADMIN',
        },
        initial_device: {
          device_id: devId,
          device_name: registeredDev.device_name,
          device_token: devToken,
          assigned_workflow: defaultWorkflow,
          apk_download_url: `/download/apk`,
          install_portal_url: `/install`,
        },
      },
    });
  }
);

// ============================================================
// 10. AMC CONTRACT RENEWAL
// ============================================================

/**
 * POST /api/platform/organizations/:orgId/renew-amc
 * Renews maintenance contract
 */
router.post(
  '/organizations/:orgId/renew-amc',
  authenticatePlatformUser,
  requirePlatformRoles('PLATFORM_ADMIN'),
  (req: PlatformAuthenticatedRequest, res) => {
    const store = DatabaseStore.getInstance();
    const orgId = req.params.orgId as string;
    const { extension_years = 1 } = req.body;

    const updated = store.renewAMC(orgId, Number(extension_years));
    if (!updated) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    return res.json({
      success: true,
      message: `AMC contract for '${updated.organization_name}' renewed for ${extension_years} year(s).`,
      organization: updated,
    });
  }
);

// ============================================================
// 11. CUSTOMER REPORTING & DATA EXPORT ENGINE
// ============================================================

/**
 * GET /api/platform/reports/generate
 * Generates tenant-scoped CSV or JSON reports (DEVICES, USAGE, MAINTENANCE, AUDIT)
 */
router.get(
  '/reports/generate',
  authenticatePlatformUser,
  enforceTenantIsolation,
  (req: PlatformAuthenticatedRequest, res) => {
    const store = DatabaseStore.getInstance();
    const user = req.platformUser!;
    const orgId =
      user.role === 'PLATFORM_ADMIN' && req.query.organization_id
        ? (req.query.organization_id as string)
        : user.organization_id;

    const reportType = ((req.query.type as string) || 'DEVICES').toUpperCase() as any;
    const format = ((req.query.format as string) || 'JSON').toUpperCase() as any;

    try {
      const report = store.generateTenantReport(orgId, reportType, format);

      if (format === 'CSV') {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${report.filename}"`);
        return res.send(report.content);
      }

      return res.json(report.content);
    } catch (err: any) {
      return res.status(500).json({ error: 'Failed to generate report: ' + err.message });
    }
  }
);

// ============================================================
// 12. DEMO DATA RESET CONTROLLER
// ============================================================

/**
 * POST /api/platform/demo/reset
 * Restores clean demo state for investor and customer presentations
 */
router.post(
  '/demo/reset',
  authenticatePlatformUser,
  requirePlatformRoles('PLATFORM_ADMIN'),
  (_req: PlatformAuthenticatedRequest, res) => {
    const store = DatabaseStore.getInstance();
    const result = store.resetDemoData();
    return res.json(result);
  }
);

// ============================================================
// 13. SOFTWARE & APK VERSION MANAGEMENT
// ============================================================

/**
 * GET /api/platform/app-versions
 * Overview of software version deployment across fleets
 */
router.get('/app-versions', authenticatePlatformUser, (req: PlatformAuthenticatedRequest, res) => {
  const store = DatabaseStore.getInstance();
  const user = req.platformUser!;
  const orgFilter = user.role === 'PLATFORM_ADMIN' ? undefined : user.organization_id;
  const devices = store.getRegisteredDevices(orgFilter);

  const currentProductionApk = {
    version: '2.4.0',
    release_date: '2026-09-29',
    file_size_bytes: 82961834,
    min_android_sdk: 24,
    target_android_sdk: 34,
    download_url: '/download/apk',
    release_notes:
      'Multi-tenant edge engine with local Swin V2 Tiny inference, offline SQLite queue, and decoupled AWS sync.',
  };

  const devicesUpToDate = devices.filter(d => d.app_version === currentProductionApk.version).length;
  const devicesRequiringUpdate = devices.length - devicesUpToDate;

  return res.json({
    latest_release: currentProductionApk,
    fleet_summary: {
      total_devices: devices.length,
      up_to_date: devicesUpToDate,
      pending_update: devicesRequiringUpdate,
    },
  });
});

export default router;
