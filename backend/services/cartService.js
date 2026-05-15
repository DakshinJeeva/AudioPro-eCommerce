import Cart from "../models/cartModel.js";
import Product from "../models/productModel.js";

export const addToCartService = async ({ userId, productId, quantity = 1 }) => {
  const product = await Product.findById(productId);
  if (!product) throw new Error("Product not found");

  let cart = await Cart.findOne({ user: userId }).populate("items.product");
  if (!cart) cart = await Cart.create({ user: userId, items: [] });

  const getItemProductId = (item) => {
    if (!item.product) return null;
    if (item.product._id) return item.product._id.toString();
    return item.product.toString();
  };

  const itemIndex = cart.items.findIndex(
    (i) => getItemProductId(i) === productId.toString()
  );

  const currentQuantity = itemIndex > -1 ? cart.items[itemIndex].quantity : 0;
  const newQuantity = itemIndex > -1 ? currentQuantity + quantity : quantity;

  if (product.stock < newQuantity) {
    throw new Error(`Insufficient stock. Available: ${product.stock}`);
  }

  if (itemIndex > -1) {
    cart.items[itemIndex].quantity = newQuantity;
  } else {
    cart.items.push({ product: productId, quantity });
  }

  await cart.save();
  return cart;
};