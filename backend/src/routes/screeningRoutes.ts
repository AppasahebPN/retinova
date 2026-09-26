import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { ScreeningController } from '../controllers/screeningController';
import { authenticateToken, authorizeRoles } from '../middleware/auth';
import { config } from '../config';

const router = Router();

// Multer storage for uploaded fundus images
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, config.storagePath);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `fundus_upload_${uuidv4()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only JPG, JPEG, and PNG image files are supported'));
    }
  }
});

router.use(authenticateToken);

router.get('/', ScreeningController.list);
router.get('/:id', ScreeningController.getById);
router.post('/', authorizeRoles('admin', 'healthcare_worker', 'doctor'), ScreeningController.create);
router.post('/:id/analyze', ScreeningController.runAnalysis);
router.post('/:id/referral', authorizeRoles('admin', 'doctor', 'healthcare_worker'), ScreeningController.updateReferral);
router.post('/upload', upload.single('image'), ScreeningController.uploadImage);

export default router;
