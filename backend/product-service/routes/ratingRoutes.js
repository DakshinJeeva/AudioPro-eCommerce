// backend/routes/ratingRoutes.js
import express from "express";
import { submitRating, getProductRatings, getOrderRatings } from "../controllers/ratingController.js";
import { protect } from "../../middleware-service/authMiddleware.js";

const router = express.Router();

// Submit rating for a product (protected)
router.post("/", protect, submitRating);

// Get ratings for a product (public)
router.get("/product/:productId", getProductRatings);

// Get user's ratings for an order (protected)
router.get("/order/:orderId", protect, getOrderRatings);

export default router;

