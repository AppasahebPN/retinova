import { Router } from 'express';
import { ModelStatusController } from '../controllers/modelStatusController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);
router.get('/', ModelStatusController.getStatus);

export default router;
