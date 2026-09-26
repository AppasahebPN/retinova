import { v4 as uuidv4 } from 'uuid';
import { DatabaseStore } from '../db/store';
import { Patient, Screening } from '../types';

export class PatientService {
  private store: DatabaseStore;

  constructor() {
    this.store = DatabaseStore.getInstance();
  }

  public getPatients(search?: string, facilityId?: string, limit = 50, offset = 0) {
    return this.store.getPatients(search, facilityId, limit, offset);
  }

  public getPatientById(id: string): (Patient & { screenings?: Screening[] }) | undefined {
    const patient = this.store.getPatientById(id);
    if (!patient) return undefined;

    const { screenings } = this.store.getScreenings({ patientId: id });
    return {
      ...patient,
      screenings
    };
  }

  public registerPatient(data: {
    name: string;
    age: number;
    gender: 'Male' | 'Female' | 'Other';
    phone?: string;
    location: string;
    diabetes_duration_years: number;
    facility_id: string;
    registeredByUserId?: string;
  }): Patient {
    const now = new Date().toISOString();
    const count = this.store.getPatients().total + 1;
    const patientCode = `DR-MH-2026-${String(count).padStart(4, '0')}`;

    const newPatient: Patient = {
      id: uuidv4(),
      patient_code: patientCode,
      name: data.name.trim(),
      age: data.age,
      gender: data.gender,
      phone: data.phone?.trim(),
      location: data.location.trim(),
      diabetes_duration_years: data.diabetes_duration_years || 0,
      facility_id: data.facility_id,
      created_at: now,
      updated_at: now
    };

    const patient = this.store.addPatient(newPatient);

    this.store.addAuditLog({
      user_id: data.registeredByUserId,
      action: 'PATIENT_REGISTERED',
      entity: 'Patient',
      entity_id: patient.id,
      metadata: { patient_code: patient.patient_code, name: patient.name }
    });

    return patient;
  }

  public updatePatient(id: string, updates: Partial<Patient>, userId?: string): Patient | undefined {
    const updated = this.store.updatePatient(id, updates);
    if (updated) {
      this.store.addAuditLog({
        user_id: userId,
        action: 'PATIENT_UPDATED',
        entity: 'Patient',
        entity_id: id,
        metadata: updates
      });
    }
    return updated;
  }
}
