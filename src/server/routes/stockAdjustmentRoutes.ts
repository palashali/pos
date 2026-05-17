import express from 'express';
import { getStockAdjustments, createStockAdjustment, approveStockAdjustment } from '../controllers/stockAdjustmentController';
import { verifyToken, isAdmin } from '../middleware/auth';

const router = express.Router();

router.get('/', verifyToken, getStockAdjustments);
router.post('/', verifyToken, createStockAdjustment);
router.post('/:id/approve', verifyToken, isAdmin, approveStockAdjustment);

export default router;
