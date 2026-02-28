import express from 'express';
import { login, getProfile } from '../controllers/authController';
import { verifyToken } from '../middleware/auth';

const router = express.Router();

router.post('/login', login);
router.get('/profile', verifyToken, getProfile);

export default router;
