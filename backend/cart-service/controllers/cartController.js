// backend/cart-service/controllers/cartController.js
import asyncHandler from "express-async-handler";
import {
  getCartService,
  addToCartService,
  removeFromCartService,
  updateCartItemService
} from "../mcp-service/cartService.js";
import Cart from "../models/cartModel.js";

export const getCart = asyncHandler(async (req, res) => {
  const cart = await getCartService({ userId: req.user._id });
  res.json(cart);
});

export const addToCart = asyncHandler(async (req, res) => {
  const cart = await addToCartService({
    userId: req.user._id,
    productId: req.body.productId,
    quantity: req.body.quantity
  });
  res.json(cart);
});

export const removeFromCart = asyncHandler(async (req, res) => {
  const cart = await removeFromCartService({
    userId: req.user._id,
    productId: req.body.productId
  });
  res.json(cart);
});

export const updateCartItem = asyncHandler(async (req, res) => {
  const cart = await updateCartItemService({
    userId: req.user._id,
    productId: req.body.productId,
    quantity: req.body.quantity
  });
  res.json(cart);
});

// ── Internal: clear cart by userId (called by Kafka cart-consumer) ────────────
// Body: { userId }  |  Header: x-internal-secret
export const clearCartInternal = asyncHandler(async (req, res) => {
  const { userId } = req.body;
  if (!userId) {
    res.status(400);
    throw new Error("userId is required");
  }
  await Cart.findOneAndUpdate({ user: userId }, { $set: { items: [] } });
  console.log(`[cart-service] Cart cleared for user=${userId}`);
  res.status(200).json({ success: true, message: `Cart cleared for user ${userId}` });
});
