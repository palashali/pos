import express from "express";
import { verifyToken, isAdmin } from "../middleware/auth";
import { getLocations, createLocation, getProductStocks } from "../controllers/locationController";

const router = express.Router();

router.get("/", verifyToken, getLocations);
router.post("/", verifyToken, isAdmin, createLocation);
router.get("/product/:productId", verifyToken, getProductStocks);

export default router;
