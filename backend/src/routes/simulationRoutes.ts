import { Router } from 'express';
import { SimulationController } from '../controllers/simulationController';
import { authenticateToken, authorizeRoles } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);

router.post('/run', authorizeRoles('admin', 'district_manager', 'doctor'), SimulationController.run);
router.get('/runs', SimulationController.listRuns);
router.get('/runs/:id', SimulationController.getRunById);
router.get('/status', SimulationController.getStatus);

export default router;
