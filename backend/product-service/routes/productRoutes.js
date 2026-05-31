// backend/routes/productRoutes.js
import express from "express";
import multer from "multer";
import path from "path";
import { addProduct, getProducts, updateProductStock, getAllProducts, getProductById, deleteProduct } from "../controllers/productController.js";
import { protect } from "../../middleware-service/authMiddleware.js";
import { admin } from "../../middleware-service/adminMiddleware.js";


const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join("uploads"));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname) || "";
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  },
});

const upload = multer({ storage });

// Public routes
router.get("/", getProducts);
router.get("/:id", getProductById);

// Admin routes
router.post("/", protect, admin, upload.array("images", 6), addProduct);
router.get("/admin/all", protect, admin, getAllProducts);
router.put("/:productId/stock", protect, admin, updateProductStock);
router.delete("/:productId", protect, admin, deleteProduct);


export default router;
