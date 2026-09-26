import { api } from './api';
import type { Patient, PaginatedPatients, RegisterPatientInput } from '../types';

export const patientService = {
  async search(query?: string, facilityId?: string): Promise<Patient[]> {
    const params = new URLSearchParams();
    if (query) params.set('search', query);
    if (facilityId) params.set('facilityId', facilityId);
    params.set('limit', '50');
    const qs = params.toString();
    const data = await api.get<PaginatedPatients>(`/patients${qs ? '?' + qs : ''}`);
    return data.patients;
  },

  async getById(id: string): Promise<Patient> {
    const data = await api.get<{ patient: Patient }>(`/patients/${id}`);
    return data.patient;
  },

  async register(input: RegisterPatientInput): Promise<Patient> {
    const data = await api.post<{ patient: Patient }>('/patients', input);
    return data.patient;
  },
};
