import express from 'express';
import { getExpenses, createExpense, deleteExpense } from '../controllers/expenseController';
import { verifyToken, isAdmin } from '../middleware/auth';

const router = express.Router();

router.get('/', verifyToken, getExpenses);
router.post('/', verifyToken, isAdmin, createExpense);
router.delete('/:id', verifyToken, isAdmin, deleteExpense);

export default router;
