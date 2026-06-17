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

// Update product stock (admin only)
export const updateProductStock = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const { stock } = req.body;

  if (stock === undefined || stock < 0) {
    return res.status(400).json({ message: "Stock must be a non-negative number" });
  }

  const product = await Product.findById(productId);
  if (!product) {
    return res.status(404).json({ message: "Product not found" });
  }

  product.stock = stock;
  await product.save();

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

// ── POST /api/product/decrement-stock ─────────────────────────────────────────
// Internal-only: batch decrement stock after a confirmed payment.
// Body: { items: [{ productId, quantity }] }
// Header: x-internal-secret
export const decrementStockInternal = asyncHandler(async (req, res) => {
  const { items } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ success: false, message: "No items provided" });
  }

  const results = [];

  for (const { productId, quantity } of items) {
    const product = await Product.findById(productId);
    if (!product) {
      results.push({ productId, status: "not_found" });
      console.warn(`[product-service] Product ${productId} not found — skipping stock decrement`);
      continue;
    }
    if (product.stock < quantity) {
      // Log anomaly but continue — pre-payment check already validated stock
      results.push({ productId, name: product.name, status: "insufficient_stock", have: product.stock, needed: quantity });
      console.error(`[product-service] Insufficient stock for ${product.name}: have ${product.stock}, need ${quantity}`);
      continue;
    }
    await Product.findByIdAndUpdate(productId, { $inc: { stock: -quantity } });
    results.push({ productId, name: product.name, status: "decremented", by: quantity });
    console.log(`  ✅ Stock decremented — ${product.name} by ${quantity}`);
  }

  return res.status(200).json({ success: true, results });
});

