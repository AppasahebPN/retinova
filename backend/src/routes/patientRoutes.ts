import { Router } from 'express';
import { PatientController } from '../controllers/patientController';
import { authenticateToken, authorizeRoles } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);

router.get('/', PatientController.list);
router.get('/:id', PatientController.getById);
router.post('/', authorizeRoles('admin', 'healthcare_worker', 'doctor'), PatientController.register);
router.put('/:id', authorizeRoles('admin', 'healthcare_worker', 'doctor'), PatientController.update);

export default router;
