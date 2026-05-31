// backend/routes/userRoutes.js
import express from "express";
import { registerUser, authUser, getUserProfile, verifyEmail, resendVerificationEmail, startPhoneVerification, verifyPhone, addAddress, removeAddress } from "../controllers/userController.js";
import { protect } from "../../middleware-service/authMiddleware.js";

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", authUser);
router.get("/profile", protect, getUserProfile);
router.get("/verify-email/:token", verifyEmail);
router.post("/resend-verification", resendVerificationEmail);
router.post("/phone/start", protect, startPhoneVerification);
router.post("/phone/verify", protect, verifyPhone);
router.post("/addresses", protect, addAddress);
router.delete("/addresses/:addressId", protect, removeAddress);

export default router;
