// backend/models/ratingModel.js
import mongoose from "mongoose";

const ratingSchema = mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  order: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, trim: true },
}, { timestamps: true });

// Prevent duplicate ratings for same product in same order
ratingSchema.index({ user: 1, product: 1, order: 1 }, { unique: true });

const Rating = mongoose.model("Rating", ratingSchema);
export default Rating;

