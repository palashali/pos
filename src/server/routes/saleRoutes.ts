import express from 'express';
import { createSale, getSales, getSaleDetails } from '../controllers/saleController';
import { verifyToken } from '../middleware/auth';

const router = express.Router();

router.get('/', verifyToken, getSales);
router.get('/:id', verifyToken, getSaleDetails);
router.post('/', verifyToken, createSale);

export default router;
