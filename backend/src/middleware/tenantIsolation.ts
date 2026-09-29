import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { PlatformRole, PlatformUser } from '../types/platform';
import { DatabaseStore } from '../db/store';

export interface PlatformAuthenticatedRequest extends Request {
  platformUser?: PlatformUser;
  targetOrgId?: string;
}

/**
 * Middleware: Authenticates Platform Users via JWT or demo fallback header
 */
export function authenticatePlatformUser(
  req: PlatformAuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  const store = DatabaseStore.getInstance();
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  // 1. Check Bearer JWT token
  if (token) {
    try {
      const decoded: any = jwt.verify(token, config.jwtSecret);
      const user = store.getPlatformUser(decoded.id);
      if (user && user.is_active) {
        req.platformUser = user;
        return next();
      }
    } catch (err) {
      // If token invalid, proceed to check fallback headers or reject
    }
  }

  // 2. Demo & API testing header fallback: 'x-platform-user-id'
  const demoUserId = req.headers['x-platform-user-id'] as string;
  if (demoUserId) {
    const user = store.getPlatformUser(demoUserId);
    if (user && user.is_active) {
      req.platformUser = user;
      return next();
    }
  }

  // 3. Demo role header fallback: 'x-platform-role' (picks first active user with that role)
  const demoRole = req.headers['x-platform-role'] as PlatformRole;
  if (demoRole) {
    const orgFilter = (req.headers['x-organization-id'] as string) || undefined;
    const users = store.getPlatformUsers(orgFilter).filter(u => u.role === demoRole && u.is_active);
    if (users.length > 0) {
      req.platformUser = users[0];
      return next();
    }
  }

  // 4. Default to Platform Superadmin in dev/demo if configured or reject
  // If neither provided, return 401
  return res.status(401).json({
    error: 'Platform authentication required.',
    details: 'Please provide Authorization Bearer token or x-platform-user-id header.',
  });
}

/**
 * Middleware: Enforces Strict Multi-Tenant Data Isolation.
 *
 * Rules:
 * 1. PLATFORM_ADMIN has global read/write visibility across all tenants.
 * 2. All other roles (ORG_ADMIN, OPERATOR, REVIEWER, VIEWER) are strictly restricted
 *    to their assigned organization_id.
 * 3. Any attempt to query, mutate, or pass an organizationId differing from the user's
 *    assigned organization_id is rejected with HTTP 403.
 */
export function enforceTenantIsolation(
  req: PlatformAuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  if (!req.platformUser) {
    return res.status(401).json({ error: 'User is not authenticated' });
  }

  const user = req.platformUser;

  // Resolve target organization from route params, query, or body
  const targetOrgId = 
    req.params.organizationId ||
    req.params.orgId ||
    (req.query.organization_id as string) ||
    req.body.organization_id ||
    user.organization_id;

  req.targetOrgId = targetOrgId;

  // PLATFORM_ADMIN can access any tenant
  if (user.role === 'PLATFORM_ADMIN') {
    return next();
  }

  // Non-platform admin must strictly match user.organization_id
  if (targetOrgId && targetOrgId !== user.organization_id) {
    // Log security violation audit event
    const store = DatabaseStore.getInstance();
    store.addPlatformAuditEvent({
      actor_id: user.id,
      actor_email: user.email,
      actor_role: user.role,
      organization_id: user.organization_id,
      action: 'ORG_CONFIG_UPDATED', // Attempted unauthorized cross-tenant access
      target_type: 'ORGANIZATION',
      target_id: targetOrgId,
      metadata: {
        violation: 'CROSS_TENANT_ACCESS_DENIED',
        attempted_org: targetOrgId,
        user_org: user.organization_id,
        path: req.originalUrl,
        method: req.method
      }
    });

    return res.status(403).json({
      error: 'Tenant isolation violation: Access denied.',
      details: `Your account belongs to organization '${user.organization_id}'. You cannot access resources for organization '${targetOrgId}'.`,
    });
  }

  // Ensure body organization_id is forced to user's org if modifying data
  if (req.body && typeof req.body === 'object') {
    req.body.organization_id = user.organization_id;
  }

  next();
}

/**
 * Middleware: Enforces Role-Based Access Control (RBAC)
 */
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
