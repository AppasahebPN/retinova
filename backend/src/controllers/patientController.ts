import { Response } from 'express';
import { PatientService } from '../services/patientService';
import { AuthenticatedRequest } from '../middleware/auth';

const patientService = new PatientService();

export class PatientController {
  public static async list(req: AuthenticatedRequest, res: Response): Promise<void> {
    const search = req.query.search as string;
    const facilityId = req.query.facilityId as string;
    const limit = parseInt(req.query.limit as string || '50', 10);
    const offset = parseInt(req.query.offset as string || '0', 10);

    const result = patientService.getPatients(search, facilityId, limit, offset);
    res.json(result);
  }

  public static async getById(req: AuthenticatedRequest, res: Response): Promise<void> {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const patient = patientService.getPatientById(id);

    if (!patient) {
      res.status(404).json({ error: 'Patient not found' });
      return;
    }

    res.json({ patient });
  }

  public static async register(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { name, age, gender, phone, location, diabetes_duration_years, facility_id } = req.body;

    if (!name || !age || !gender || !location) {
      res.status(400).json({ error: 'Name, age, gender, and location are required' });
      return;
    }

    const facilityIdToUse = facility_id || req.user?.facility_id;
    if (!facilityIdToUse) {
      res.status(400).json({ error: 'Healthcare facility ID is required' });
      return;
    }

    const patient = patientService.registerPatient({
      name,
      age: parseInt(age, 10),
      gender,
      phone,
      location,
      diabetes_duration_years: parseInt(diabetes_duration_years || '0', 10),
      facility_id: facilityIdToUse,
      registeredByUserId: req.user?.id
    });

    res.status(201).json({ patient });
  }

  public static async update(req: AuthenticatedRequest, res: Response): Promise<void> {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const updated = patientService.updatePatient(id, req.body, req.user?.id);

    if (!updated) {
      res.status(404).json({ error: 'Patient not found' });
      return;
    }

    res.json({ patient: updated });
  }
}
