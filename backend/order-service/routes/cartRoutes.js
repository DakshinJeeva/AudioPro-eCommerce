// backend/routes/cartRoutes.js
import express from "express";
import { getCart, addToCart, removeFromCart, updateCartItem } from "../controllers/cartController.js";
import { protect } from "../../middleware-service/authMiddleware.js";

const router = express.Router();

router.route("/").get(protect, getCart);
router.route("/add").post(protect, addToCart);
router.route("/remove").post(protect, removeFromCart);
router.route("/update").post(protect, updateCartItem);

export default router;
