import express from 'express';
import { getSaleReturns, getSaleReturnDetails, createSaleReturn, approveSaleReturn, rejectSaleReturn, getSupplierReturns, createSupplierReturn } from '../controllers/returnController';
import { verifyToken, isAdmin } from '../middleware/auth';

const router = express.Router();

router.get('/sales', verifyToken, getSaleReturns);
router.get('/sales/:id', verifyToken, getSaleReturnDetails);
router.post('/sales', verifyToken, createSaleReturn);
router.post('/sales/:id/approve', verifyToken, isAdmin, approveSaleReturn);
router.post('/sales/:id/reject', verifyToken, isAdmin, rejectSaleReturn);
router.get('/suppliers', verifyToken, getSupplierReturns);
router.post('/suppliers', verifyToken, createSupplierReturn);

export default router;
