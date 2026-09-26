import { Response } from 'express';
import { ScreeningService } from '../services/screeningService';
import { AuthenticatedRequest } from '../middleware/auth';

const screeningService = new ScreeningService();

export class ScreeningController {
  public static async list(req: AuthenticatedRequest, res: Response): Promise<void> {
    const {
      patientId,
      facilityId,
      status,
      grade,
      referralStatus,
      startDate,
      endDate,
      limit,
      offset
    } = req.query;

    const result = screeningService.getScreenings({
      patientId: patientId as string,
      facilityId: (facilityId as string) || (req.user?.role === 'healthcare_worker' ? req.user.facility_id : undefined),
      status: status as string,
      grade: grade !== undefined ? parseInt(grade as string, 10) : undefined,
      referralStatus: referralStatus as string,
      startDate: startDate as string,
      endDate: endDate as string,
      limit: limit ? parseInt(limit as string, 10) : 50,
      offset: offset ? parseInt(offset as string, 10) : 0
    });

    res.json(result);
  }

  public static async getById(req: AuthenticatedRequest, res: Response): Promise<void> {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const screening = screeningService.getScreeningById(id);

    if (!screening) {
      res.status(404).json({ error: 'Screening record not found' });
      return;
    }

    res.json({ screening });
  }

  public static async create(req: AuthenticatedRequest, res: Response): Promise<void> {
    const {
      patientId,
      facilityId,
      eye,
      notes,
      imageStorageUrl,
      originalFilename,
      deviceId
    } = req.body;

    if (!patientId || !eye) {
      res.status(400).json({ error: 'Patient ID and eye selection (left/right) are required' });
      return;
    }

    const facilityIdToUse = facilityId || req.user?.facility_id;
    if (!facilityIdToUse) {
      res.status(400).json({ error: 'Facility ID is required' });
      return;
    }

    const screening = await screeningService.createScreening({
      patientId,
      facilityId: facilityIdToUse,
      eye,
      notes,
      userId: req.user?.id,
      userName: req.user?.full_name,
      imageStorageUrl,
      originalFilename,
      deviceId
    });

    res.status(201).json({ screening });
  }

  public static async runAnalysis(req: AuthenticatedRequest, res: Response): Promise<void> {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    try {
      const screening = await screeningService.runAnalysis(
        id,
        req.user?.id,
        req.user?.full_name
      );

      res.json({
        message: 'AI screening analysis completed successfully',
        screening
      });
    } catch (err: any) {
      res.status(500).json({
        error: 'Failed to complete AI screening analysis',
        details: err.message
      });
    }
  }

  public static async updateReferral(req: AuthenticatedRequest, res: Response): Promise<void> {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const { action_taken, action_notes } = req.body;

    if (!action_taken) {
      res.status(400).json({ error: 'Action taken is required' });
      return;
    }

    const referral = screeningService.updateReferralAction(id, {
      action_taken,
      action_notes,
      userId: req.user?.id,
      userName: req.user?.full_name
    });

    if (!referral) {
      res.status(404).json({ error: 'Screening referral record not found' });
      return;
    }

    res.json({ referral, message: 'Referral action recorded successfully' });
  }

  public static async uploadImage(req: AuthenticatedRequest, res: Response): Promise<void> {
    const file = req.file;
    if (!file) {
      res.status(400).json({ error: 'No image file uploaded' });
      return;
    }

    const storageUrl = `/uploads/${file.filename}`;
    res.json({
      storageUrl,
      originalFilename: file.originalname,
      size: file.size,
      mimetype: file.mimetype
    });
  }
}
