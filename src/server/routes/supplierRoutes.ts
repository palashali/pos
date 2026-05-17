import express from "express";
import { verifyToken, isAdmin } from "../middleware/auth";
import { getSuppliers, createSupplier, createSupplierReturn, getSupplierReturns } from "../controllers/supplierController";

const router = express.Router();

router.get("/", verifyToken, getSuppliers);
router.post("/", verifyToken, isAdmin, createSupplier);
router.post("/returns", verifyToken, createSupplierReturn);
router.get("/returns", verifyToken, getSupplierReturns);

export default router;
