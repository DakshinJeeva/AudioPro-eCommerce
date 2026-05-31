// backend/routes/wishlistRoutes.js
import express from "express";
import { getWishlist, addToWishlist, removeFromWishlist } from "../controllers/wishController.js";
import { protect } from "../../middleware-service/authMiddleware.js";

const router = express.Router();

router.route("/").get(protect, getWishlist);
router.route("/add").post(protect, addToWishlist);
router.route("/remove").post(protect, removeFromWishlist);

export default router;
