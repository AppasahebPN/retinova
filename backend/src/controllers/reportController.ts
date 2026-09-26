import { Response } from 'express';
import { ReportService } from '../services/reportService';
import { DatabaseStore } from '../db/store';
import { AuthenticatedRequest } from '../middleware/auth';

const reportService = new ReportService();

export class ReportController {
  public static async getReportHtml(req: AuthenticatedRequest, res: Response): Promise<void> {
    const screeningId = Array.isArray(req.params.screeningId) ? req.params.screeningId[0] : req.params.screeningId;
    const store = DatabaseStore.getInstance();
    const screening = store.getScreeningById(screeningId);

    if (!screening) {
      res.status(404).send('Screening not found');
      return;
    }

    const html = reportService.generateReportHtml(screening);
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  }

  public static async getReportCard(req: AuthenticatedRequest, res: Response): Promise<void> {
    const screeningId = Array.isArray(req.params.screeningId) ? req.params.screeningId[0] : req.params.screeningId;
    const store = DatabaseStore.getInstance();
    const screening = store.getScreeningById(screeningId);

    if (!screening) {
      res.status(404).send('Screening not found');
      return;
    }

    try {
      const cardBuffer = await reportService.generateReportCard(screeningId);
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Content-Disposition', `inline; filename="RETINOVA_Card_${screeningId.slice(0, 8)}.png"`);
      res.send(cardBuffer);
    } catch (err: any) {
      console.error('Failed to generate report card:', err);
      res.status(500).send('Failed to generate clinical report card');
    }
  }

  public static async getReportData(req: AuthenticatedRequest, res: Response): Promise<void> {
    const screeningId = Array.isArray(req.params.screeningId) ? req.params.screeningId[0] : req.params.screeningId;
    const store = DatabaseStore.getInstance();
    const screening = store.getScreeningById(screeningId);

    if (!screening) {
      res.status(404).json({ error: 'Screening not found' });
      return;
    }

    res.json({
      screeningId: screening.id,
      patient: screening.patient,
      facility: screening.facility,
      quality: screening.quality,
      classification: screening.classification,
      segmentation: screening.segmentation,
      explainability: screening.explainability,
      referral: screening.referral,
      timeline: screening.timeline,
      generatedAt: new Date().toISOString()
    });
  }
}
