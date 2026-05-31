// backend/controllers/ratingController.js
import asyncHandler from "express-async-handler";
import Rating from "../models/ratingModel.js";
import Order from "../../order-service/models/orderModel.js";
import Product from "../models/productModel.js";

// Submit rating for a product (only for delivered orders)
export const submitRating = asyncHandler(async (req, res) => {
  const { productId, orderId, rating, comment } = req.body;
  const userId = req.user._id;

  // Validate rating
  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).json({ message: "Rating must be between 1 and 5" });
  }

  // Verify order belongs to user and is delivered
  const order = await Order.findById(orderId);
  if (!order) {
    return res.status(404).json({ message: "Order not found" });
  }

  if (order.user.toString() !== userId.toString()) {
    return res.status(403).json({ message: "Not authorized to rate this order" });
  }

  if (order.orderStatus !== "delivered") {
    return res.status(400).json({ message: "Can only rate products from delivered orders" });
  }

  // Verify product is in the order
  const orderItem = order.items.find(item => item.product.toString() === productId);
  if (!orderItem) {
    return res.status(400).json({ message: "Product not found in this order" });
  }

  // Check if rating already exists
  const existingRating = await Rating.findOne({
    user: userId,
    product: productId,
    order: orderId,
  });

  let savedRating;
  if (existingRating) {
    // Update existing rating
    existingRating.rating = rating;
    if (comment !== undefined) existingRating.comment = comment;
    savedRating = await existingRating.save();
  } else {
    // Create new rating
    savedRating = await Rating.create({
      user: userId,
      product: productId,
      order: orderId,
      rating,
      comment: comment || "",
    });
  }

  // Calculate and update product average rating
  const ratings = await Rating.find({ product: productId });
  if (ratings.length > 0) {
    const averageRating = ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length;
    await Product.findByIdAndUpdate(productId, {
      rating: Math.round(averageRating * 10) / 10, // Round to 1 decimal place
    });
  } else {
    // If no ratings, set to 0
    await Product.findByIdAndUpdate(productId, {
      rating: 0,
    });
  }

  res.status(201).json(savedRating);
});

// Get ratings for a product
export const getProductRatings = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const ratings = await Rating.find({ product: productId })
    .populate("user", "name")
    .sort({ createdAt: -1 });
  res.json(ratings);
});

// Get user's ratings for an order
export const getOrderRatings = asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  const userId = req.user._id;

  // Verify order belongs to user
  const order = await Order.findById(orderId);
  if (!order) {
    return res.status(404).json({ message: "Order not found" });
  }

  if (order.user.toString() !== userId.toString()) {
    return res.status(403).json({ message: "Not authorized" });
  }

  const ratings = await Rating.find({
    user: userId,
    order: orderId,
  }).populate("product", "name image _id");

  res.json(ratings);
});

