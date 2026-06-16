// backend/routes/cartRoutes.js
import express from "express";
import {
    getCart,
    addToCart,
    removeFromCart,
    updateCartItem,
} from "../controllers/cartController.js";
import { protect } from "../../middleware-service/authMiddleware.js";

const router = express.Router();

// Get user cart
router.get("/", protect, getCart);

// Add item to cart
router.post("/add", protect, addToCart);

// Remove item from cart
router.post("/remove", protect, removeFromCart);

// Update cart item (quantity, etc.)
router.post("/update", protect, updateCartItem);

export default router;
