import express from 'express';
import { getStats } from '../controllers/dashboardController';
import { verifyToken } from '../middleware/auth';

const router = express.Router();

router.get('/stats', verifyToken, getStats);

export default router;
