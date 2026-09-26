import { Router } from 'express';
import { AuthController } from '../controllers/authController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.post('/login', AuthController.login);
router.get('/me', authenticateToken, AuthController.me);
router.get('/demo-users', AuthController.demoUsers);

export default router;
