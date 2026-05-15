import Cart from "../models/cartModel.js";
import Product from "../models/productModel.js";

// ── resolve product by id OR name ─────────────────────────────────────────────
export const resolveProduct = async ({ productId, productName }) => {
  let product = null;

  if (productId) {
    product = await Product.findById(productId);
    if (!product) throw new Error(`No product found with ID: ${productId}`);
  } else if (productName) {
    product = await Product.findOne({
      name: { $regex: new RegExp(productName, "i") }
    });
    if (!product) throw new Error(`No product found with name: "${productName}"`);
  } else {
    throw new Error("Provide either productId or productName");
  }

  return product;
};

// ── helpers ──────────────────────────────────────────────────────────────────
const getItemProductId = (item) => {
  if (!item.product) return null;
  if (item.product._id) return item.product._id.toString();
  return item.product.toString();
};

// ── get cart ──────────────────────────────────────────────────────────────────
export const getCartService = async ({ userId }) => {
  const cart = await Cart.findOne({ user: userId }).populate("items.product");
  return cart || { items: [] };
};

// ── add to cart ───────────────────────────────────────────────────────────────
export const addToCartService = async ({ userId, productId, quantity = 1 }) => {
  const product = await Product.findById(productId);
  if (!product) throw new Error("Product not found");

  let cart = await Cart.findOne({ user: userId }).populate("items.product");
  if (!cart) cart = await Cart.create({ user: userId, items: [] });

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

// ── remove from cart ──────────────────────────────────────────────────────────
export const removeFromCartService = async ({ userId, productId }) => {
  const cart = await Cart.findOne({ user: userId });
  if (!cart) throw new Error("Cart not found");

  cart.items = cart.items.filter(
    (i) => getItemProductId(i) !== productId.toString()
  );

  await cart.save();
  return cart;
};

// ── update cart item ──────────────────────────────────────────────────────────
export const updateCartItemService = async ({ userId, productId, quantity }) => {
  if (quantity < 1) throw new Error("Quantity must be at least 1");

  const product = await Product.findById(productId);
  if (!product) throw new Error("Product not found");

  if (product.stock < quantity) {
    throw new Error(
      `Insufficient stock. Available: ${product.stock}, Requested: ${quantity}`
    );
  }

  const cart = await Cart.findOne({ user: userId });
  if (!cart) throw new Error("Cart not found");

  const item = cart.items.find(
    (i) => getItemProductId(i) === productId.toString()
  );
  if (!item) throw new Error("Item not found in cart");

  item.quantity = quantity;
  await cart.save();

  const populated = await Cart.findById(cart._id).populate("items.product");
  return populated;
};