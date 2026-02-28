import express from 'express';
import multer from 'multer';
import path from 'path';
import { getProducts, getProduct, getProductByBarcode, createProduct, updateProduct, deleteProduct, adjustStock, approveProduct, getProductHistory } from '../controllers/productController';
import { verifyToken, isAdmin } from '../middleware/auth';

const router = express.Router();

const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

router.get('/', verifyToken, getProducts);
router.get('/barcode/:barcode', verifyToken, getProductByBarcode);
router.get('/:id', verifyToken, getProduct);
router.get('/:id/history', verifyToken, getProductHistory);
router.post('/', verifyToken, upload.single('image'), createProduct);
router.post('/:id/approve', verifyToken, isAdmin, approveProduct);
router.put('/:id', verifyToken, isAdmin, upload.single('image'), updateProduct);
router.post('/:id/adjust-stock', verifyToken, isAdmin, adjustStock);
router.delete('/:id', verifyToken, isAdmin, deleteProduct);

export default router;
