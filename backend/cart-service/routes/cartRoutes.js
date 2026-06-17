// backend/cart-service/routes/cartRoutes.js
import express from "express";
import {
  getCart,
  addToCart,
  removeFromCart,
  updateCartItem,
  clearCartInternal,
} from "../controllers/cartController.js";
import { protect } from "../../middleware-service/authMiddleware.js";
import { protectInternal } from "../../middleware-service/internalMiddleware.js";

const router = express.Router();

// Get user cart
router.get("/", protect, getCart);

// Add item to cart
router.post("/add", protect, addToCart);

// Remove item from cart
router.post("/remove", protect, removeFromCart);

// Update cart item (quantity, etc.)
router.post("/update", protect, updateCartItem);

// ── Internal (Kafka consumer → cart clear) ────────────────────────────────────
// Body: { userId }  |  Header: x-internal-secret
router.post("/clear-by-user", protectInternal, clearCartInternal);

export default router;
