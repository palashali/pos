import express from 'express';
import { getSettings, updateSettings } from '../controllers/settingController';
import { verifyToken, isAdmin } from '../middleware/auth';

const router = express.Router();

router.get('/', verifyToken, getSettings);
router.put('/', verifyToken, isAdmin, updateSettings);

export default router;
