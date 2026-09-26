import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { DatabaseStore } from '../db/store';
import { config } from '../config';
import { AuthenticatedRequest } from '../middleware/auth';

export class AuthController {
  public static async login(req: Request, res: Response): Promise<void> {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    const store = DatabaseStore.getInstance();
    const user = store.getUserByEmail(email);

    if (!user) {
      res.status(401).json({ error: 'Invalid credentials. User not found.' });
      return;
    }

    const isMatch = bcrypt.compareSync(password, user.password_hash);
    if (!isMatch) {
      res.status(401).json({ error: 'Invalid credentials. Incorrect password.' });
      return;
    }

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        facility_id: user.facility_id,
        full_name: user.full_name
      },
      config.jwtSecret,
      { expiresIn: '7d' }
    );

    const facility = user.facility_id ? store.getFacilityById(user.facility_id) : undefined;

    store.addAuditLog({
      user_id: user.id,
      action: 'USER_LOGIN',
      entity: 'User',
      entity_id: user.id,
      metadata: { role: user.role }
    });

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        facility_id: user.facility_id,
        facility
      }
    });
  }

  public static async me(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const store = DatabaseStore.getInstance();
    const user = store.getUserById(req.user.id);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const facility = user.facility_id ? store.getFacilityById(user.facility_id) : undefined;

    res.json({
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        facility_id: user.facility_id,
        facility
      }
    });
  }

  public static async demoUsers(_req: Request, res: Response): Promise<void> {
    const store = DatabaseStore.getInstance();
    const users = store.getUsers().map(u => ({
      id: u.id,
      email: u.email,
      full_name: u.full_name,
      role: u.role,
      facility_id: u.facility_id
    }));
    res.json({ users });
  }
}
