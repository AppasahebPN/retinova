import { Response } from 'express';
import { AnalyticsService } from '../services/analyticsService';
import { AuthenticatedRequest } from '../middleware/auth';

const analyticsService = new AnalyticsService();

export class AnalyticsController {
  public static async getOverview(req: AuthenticatedRequest, res: Response): Promise<void> {
    const facilityId = req.query.facilityId as string;
    const district = req.query.district as string;

    const data = analyticsService.getDashboardOverview({ facilityId, district });
    res.json(data);
  }
}
