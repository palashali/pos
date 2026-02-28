import express from 'express';
import { getCustomers, createCustomer, getCustomerHistory } from '../controllers/customerController';
import { verifyToken } from '../middleware/auth';

const router = express.Router();

router.get('/', verifyToken, getCustomers);
router.post('/', verifyToken, createCustomer);
router.get('/:id/history', verifyToken, getCustomerHistory);

export default router;
