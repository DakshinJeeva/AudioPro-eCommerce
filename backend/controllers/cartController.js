// backend/controllers/cartController.js
import asyncHandler from "express-async-handler";
import {
  getCartService,
  addToCartService,
  removeFromCartService,
  updateCartItemService
} from "../services/cartService.js";

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
