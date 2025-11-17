// backend/controllers/cartController.js
import asyncHandler from "express-async-handler";
import Cart from "../models/cartModel.js";
import Product from "../models/productModel.js";

export const getCart = asyncHandler(async (req, res) => {
  const cart = await Cart.findOne({ user: req.user._id }).populate("items.product");
  res.json(cart || { items: [] });
});

export const addToCart = asyncHandler(async (req, res) => {
  console.log("Add to cart body:", req.body);
  const { productId, quantity } = req.body;
  const requestedQuantity = quantity || 1;

  // Check product stock
  const product = await Product.findById(productId);
  if (!product) {
    return res.status(404).json({ message: "Product not found" });
  }

  let cart = await Cart.findOne({ user: req.user._id }).populate("items.product");
  if (!cart) cart = await Cart.create({ user: req.user._id, items: [] });

  // Helper to safely get product ID from cart item (supports populated docs and raw ObjectIds)
  const getItemProductId = (item) => {
    if (!item.product) return null;
    if (item.product._id) return item.product._id.toString();
    return item.product.toString();
  };

  // Check current cart quantity for this product
  const itemIndex = cart.items.findIndex((i) => getItemProductId(i) === productId.toString());
  const currentQuantity = itemIndex > -1 ? cart.items[itemIndex].quantity : 0;
  const newQuantity = itemIndex > -1 ? currentQuantity + requestedQuantity : requestedQuantity;

  // Check if stock is available
  if (product.stock < newQuantity) {
    return res.status(400).json({ 
      message: `Insufficient stock. Available: ${product.stock}, Requested: ${newQuantity}` 
    });
  }

  if (itemIndex > -1) {
    cart.items[itemIndex].quantity = newQuantity;
  } else {
    cart.items.push({ product: productId, quantity: requestedQuantity });
  }

  await cart.save();
  const populatedCart = await Cart.findById(cart._id).populate("items.product");
  res.json(populatedCart);
});

export const removeFromCart = asyncHandler(async (req, res) => {
  const { productId } = req.body;
  const cart = await Cart.findOne({ user: req.user._id });
  if (!cart) return res.status(404).json({ message: "Cart not found" });

  const getItemProductId = (item) => {
    if (!item.product) return null;
    if (item.product._id) return item.product._id.toString();
    return item.product.toString();
  };

  cart.items = cart.items.filter((i) => getItemProductId(i) !== productId.toString());
  await cart.save();
  res.json(cart);
});

export const updateCartItem = asyncHandler(async (req, res) => {
  const { productId, quantity } = req.body;
  
  if (quantity < 1) {
    return res.status(400).json({ message: "Quantity must be at least 1" });
  }

  // Check product stock
  const product = await Product.findById(productId);
  if (!product) {
    return res.status(404).json({ message: "Product not found" });
  }

  if (product.stock < quantity) {
    return res.status(400).json({ 
      message: `Insufficient stock. Available: ${product.stock}, Requested: ${quantity}` 
    });
  }

  const cart = await Cart.findOne({ user: req.user._id });
  if (!cart) return res.status(404).json({ message: "Cart not found" });

  const getItemProductId = (item) => {
    if (!item.product) return null;
    if (item.product._id) return item.product._id.toString();
    return item.product.toString();
  };

  const item = cart.items.find((i) => getItemProductId(i) === productId.toString());
  if (item) item.quantity = quantity;
  await cart.save();
  
  const populatedCart = await Cart.findById(cart._id).populate("items.product");
  res.json(populatedCart);
});
