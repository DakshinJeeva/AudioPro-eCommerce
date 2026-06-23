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

// ── clearCartByUserId (service function) ──────────────────────────────────────
// Pure DB logic — no req/res dependency.
// Called directly by the Kafka consumer and wrapped by the HTTP handler below.
//
// @param {string} userId
// @returns {Promise<void>}
export const clearCartByUserId = async (userId) => {
  if (!userId) throw new Error("userId is required");
  await Cart.findOneAndUpdate({ user: userId }, { $set: { items: [] } });
  console.log(`[cart-service] Cart cleared for user=${userId}`);
};


