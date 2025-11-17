// backend/routes/orderRoutes.js
import express from "express";
import { createOrder, getUserOrders, getAllOrders, updateOrderStatus, exportOrdersCsv } from "../controllers/orderController.js";
import { protect } from "../middleware/authMiddleware.js";
import { admin } from "../middleware/adminMiddleware.js";

const router = express.Router();

// Create order (protected)
router.post("/", protect, createOrder);

// Get user's orders (protected)
router.get("/", protect, getUserOrders);

// Get all orders (protected + admin)
router.get("/all", protect, admin, getAllOrders);

// Export orders as CSV in a date range (protected + admin)
router.get("/export", protect, admin, exportOrdersCsv);

// Update order status (protected + admin)
router.put("/:orderId/status", protect, admin, updateOrderStatus);

export default router;

