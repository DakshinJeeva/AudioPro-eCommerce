// controllers/productController.js
import Product from "../models/productModel.js";
import asyncHandler from "express-async-handler";

export const addProduct = async (req, res) => {
  try {
    const { name, category, price, image, images, color, description, stock, featured } = req.body;

    // Basic validation
    if (!name || !category || !price) {
      return res.status(400).json({ message: "Please fill all required fields" });
    }

    const uploadedFiles = Array.isArray(req.files) ? req.files : [];

    let imagesArray = [];
    if (Array.isArray(images)) {
      imagesArray = images.filter(Boolean);
    } else if (typeof images === "string") {
      imagesArray = images
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }

    const uploadedUrls = uploadedFiles.map((file) => `/uploads/${file.filename}`);

    // Determine primary image and gallery
    let primaryImage = image || uploadedUrls[0] || imagesArray[0];
    const galleryImages = [...uploadedUrls, ...imagesArray];

    if (!primaryImage) {
      return res.status(400).json({ message: "At least one product image is required" });
    }

    const isFeatured =
      featured === true ||
      featured === "true" ||
      featured === "on" ||
      featured === 1 ||
      featured === "1";

    const product = new Product({
      name,
      category,
      price,
      image: primaryImage,
      images: galleryImages,
      color,
      description,
      stock: stock || 0,
      featured: isFeatured,
    });

    const createdProduct = await product.save();
    res.status(201).json(createdProduct);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getProducts = asyncHandler(async (req, res) => {
  const products = await Product.find({});
  res.json(products);
});

export const getProductById = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) {
    res.status(404);
    throw new Error("Product not found");
  }
  res.json(product);
});

// ── updateProductStockById (service function) ─────────────────────────────────
// Pure DB logic — no req/res dependency.
// Called directly by the Kafka consumer and wrapped by the HTTP handler below.
//
// @param {string} productId
// @param {number} stock  – the new absolute stock value
// @returns {Promise<Product>}
export const updateProductStockById = async (productId, stock) => {
  if (stock === undefined || stock < 0) {
    throw new Error("Stock must be a non-negative number");
  }

  const product = await Product.findById(productId);
  if (!product) {
    throw new Error(`Product not found: ${productId}`);
  }

  product.stock = stock;
  await product.save();
  return product;
};

// Update product stock (admin only) — HTTP wrapper around updateProductStockById
export const updateProductStock = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const { stock } = req.body;

  const product = await updateProductStockById(productId, stock);
  res.json(product);
});

// Get all products with stock info (admin)
export const getAllProducts = asyncHandler(async (req, res) => {
  const products = await Product.find({}).sort({ createdAt: -1 });
  res.json(products);
});

// Delete product (admin only)
export const deleteProduct = asyncHandler(async (req, res) => {
  const { productId } = req.params;

  const product = await Product.findById(productId);
  if (!product) {
    res.status(404);
    throw new Error("Product not found");
  }

  await product.deleteOne();

  res.json({ message: "Product deleted successfully" });
});

// ── POST /api/product/check-stock ────────────────────────────────────────────
// Body: { items: [{ productId, quantity }] }
// Returns: { success, outOfStockItems: [{ name, requested, available }] }
export const checkStock = asyncHandler(async (req, res) => {
  const { items } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ success: false, message: "No cart items provided" });
  }

  const outOfStockItems = [];

  for (const { productId, quantity } of items) {
    const product = await Product.findById(productId).select("name stock");
    if (!product) {
      outOfStockItems.push({ name: `Product (${productId})`, requested: quantity, available: 0 });
    } else if (product.stock < quantity) {
      outOfStockItems.push({ name: product.name, requested: quantity, available: product.stock });
    }
  }

  if (outOfStockItems.length > 0) {
    const details = outOfStockItems
      .map((i) => `"${i.name}" (requested: ${i.requested}, available: ${i.available})`)
      .join(", ");
    return res.status(200).json({
      success: false,
      message: `The following items are out of stock or have insufficient quantity: ${details}`,
      outOfStockItems,
    });
  }

  return res.status(200).json({ success: true, message: "All items are in stock" });
});


