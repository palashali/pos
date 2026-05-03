import express from 'express';
import { getWorkers, createWorker, updateWorker, updateProfile, deleteWorker } from '../controllers/workerController';
import { verifyToken, isAdmin } from '../middleware/auth';

const router = express.Router();

router.get('/', verifyToken, getWorkers);
router.post('/', verifyToken, isAdmin, createWorker);
router.put('/profile', verifyToken, updateProfile);
router.put('/:id', verifyToken, isAdmin, updateWorker);
router.delete('/:id', verifyToken, isAdmin, deleteWorker);

export default router;
