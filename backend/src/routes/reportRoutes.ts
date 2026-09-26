import { Router } from 'express';
import { ReportController } from '../controllers/reportController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Allow printable HTML and clinical card PNG without auth or with auth token for flexible iframe/download/print access
router.get('/:screeningId/html', ReportController.getReportHtml);
router.get('/:screeningId/card', ReportController.getReportCard);
router.get('/:screeningId/data', authenticateToken, ReportController.getReportData);

export default router;
