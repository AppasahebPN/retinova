import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { UserRole } from '../types';
import { DatabaseStore } from '../db/store';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: UserRole;
    facility_id?: string;
    full_name: string;
  };
}

export function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    // For demo convenience, if no token, check if Demo-User header exists
    const demoRole = req.headers['x-demo-role'] as UserRole;
    if (demoRole) {
      const store = DatabaseStore.getInstance();
      const user = store.getUsers().find(u => u.role === demoRole);
      if (user) {
        req.user = {
          id: user.id,
          email: user.email,
          role: user.role,
          facility_id: user.facility_id,
          full_name: user.full_name
        };
        return next();
      }
    }
    return res.status(401).json({ error: 'Authentication required. Please log in.' });
  }

  jwt.verify(token, config.jwtSecret, (err: any, user: any) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired session token.' });
    }
    req.user = user;
    next();
  });
}

const platformRoleEquivalents: Record<string, string[]> = {
  PLATFORM_ADMIN: ['admin', 'doctor', 'healthcare_worker', 'district_manager'],
  ORG_ADMIN: ['admin', 'doctor', 'healthcare_worker', 'district_manager'],
  REVIEWER: ['doctor'],
  OPERATOR: ['healthcare_worker'],
  VIEWER: ['district_manager']
};

export function authorizeRoles(...allowedRoles: (UserRole | string)[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'User is not authenticated' });
    }

    const userRole = req.user.role;
    const equivalentRoles = platformRoleEquivalents[userRole] || [userRole];

    const hasAccess = allowedRoles.some(r => r === userRole || equivalentRoles.includes(r as string));

    if (!hasAccess) {
      return res.status(403).json({
        error: `Access denied. Role '${req.user.role}' is not authorized for this operation.`
      });
    }

    next();
  };
}
