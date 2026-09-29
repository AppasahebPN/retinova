import { storage } from './storage';
import { api } from './api';
import { STORAGE_KEYS } from '../utils/constants';
import type { LoginResponse, User } from '../types';

export const authService = {
  async login(email: string, password: string): Promise<LoginResponse> {
    const data = await api.post<LoginResponse>('/auth/login', { email, password });
    await storage.setItem(STORAGE_KEYS.AUTH_TOKEN, data.token);
    await storage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(data.user));
    return data;
  },

  async loginOffline(role: 'healthcare_worker' | 'doctor' | 'district_manager' = 'healthcare_worker'): Promise<LoginResponse> {
    const mockUsers: Record<string, User> = {
      healthcare_worker: {
        id: 'usr_offline_asha',
        email: 'asha.worker@netra-ai.org',
        full_name: 'Primary Health Screener (Offline Field Mode)',
        role: 'healthcare_worker',
        facility_id: 'FACILITY_LOCAL',
      },
      doctor: {
        id: 'usr_offline_doctor',
        email: 'doctor@netra-ai.org',
        full_name: 'Reviewing Ophthalmologist (Offline Review Mode)',
        role: 'doctor',
        facility_id: 'FACILITY_LOCAL',
      },
      district_manager: {
        id: 'usr_offline_manager',
        email: 'manager@netra-ai.org',
        full_name: 'District Health Officer (Offline Ops)',
        role: 'district_manager',
        facility_id: 'FACILITY_LOCAL',
      },
    };
    const user = mockUsers[role] || mockUsers.healthcare_worker;
    const offlineToken = `offline_token_${Date.now()}`;
    const data: LoginResponse = { token: offlineToken, user };
    await storage.setItem(STORAGE_KEYS.AUTH_TOKEN, data.token);
    await storage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(data.user));
    return data;
  },

  async logout() {
    await storage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
    await storage.removeItem(STORAGE_KEYS.USER_DATA);
  },

  async getStoredToken(): Promise<string | null> {
    return storage.getItem(STORAGE_KEYS.AUTH_TOKEN);
  },

  async getStoredUser(): Promise<User | null> {
    const raw = await storage.getItem(STORAGE_KEYS.USER_DATA);
    if (!raw) return null;
    try { return JSON.parse(raw) as User; } catch { return null; }
  },

  async me(): Promise<User> {
    const data = await api.get<{ user: User }>('/auth/me');
    return data.user;
  },

  async getDemoUsers(): Promise<User[]> {
    const data = await api.get<{ users: User[] }>('/auth/demo-users');
    return data.users;
  },
};
