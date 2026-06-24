// backend/cart-service/controllers/cartController.js
//
// All cart logic lives here — no dependency on mcp-service.
// Product lookups use the product-service HTTP API (no Mongoose populate).
// ─────────────────────────────────────────────────────────────────────────────
import asyncHandler from "express-async-handler";
import Cart from "../models/cartModel.js";

const PRODUCT_URL =
  process.env.PRODUCT_SERVICE_URL || "http://product-service:5002";

// ── internal helpers ──────────────────────────────────────────────────────────

/** Normalise a cart item's product reference to a plain string ID. */
const getItemProductId = (item) => {
  if (!item.product) return null;
  if (item.product._id) return item.product._id.toString();
  return item.product.toString();
};

/**
 * Fetch a single product from product-service.
 * Route: GET /api/product/:id  → returns product object directly.
 * Throws on non-2xx or missing product.
 */
async function fetchProduct(productId) {
  const res  = await fetch(`${PRODUCT_URL}/api/product/${productId}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || `Product service error ${res.status}`);
  // getProductById returns the document directly (not wrapped in { product })
  const product = data._id ? data : (data.product || null);
  if (!product?._id) throw new Error(`Product not found: ${productId}`);
  return product;
}

/**
 * Enrich cart items with full product details by calling product-service
 * for each unique productId. Returns a plain cart-shaped object.
 *
 * This replaces Mongoose .populate("items.product") so we never need the
 * Product schema registered in this process.
 */
async function enrichCart(cart) {
  if (!cart || !cart.items?.length) return cart || { items: [] };

  const enrichedItems = await Promise.all(
    cart.items.map(async (item) => {
      const productId = getItemProductId(item);
      try {
        const product = await fetchProduct(productId);
        return {
          _id:      item._id,
          quantity: item.quantity,
          product,              // full product object
        };
      } catch {
        // product might be deleted; keep item stub so cart doesn't crash
        return {
          _id:      item._id,
          quantity: item.quantity,
          product:  { _id: productId, name: "Unavailable", price: 0, stock: 0 },
        };
      }
    })
  );

  return {
    _id:   cart._id,
    user:  cart.user,
    items: enrichedItems,
  };
}

// ── GET /api/cart ─────────────────────────────────────────────────────────────
export const getCart = asyncHandler(async (req, res) => {
  const cart = await Cart.findOne({ user: req.user._id });
  const enriched = await enrichCart(cart);
  res.json(enriched);
});

// ── POST /api/cart/add ────────────────────────────────────────────────────────
export const addToCart = asyncHandler(async (req, res) => {
  const { productId, quantity = 1 } = req.body;
  const qty = Number(quantity);

  if (!productId) {
    res.status(400);
    throw new Error("productId is required");
  }

  // Validate product exists and has enough stock
  const product = await fetchProduct(productId);

  let cart = await Cart.findOne({ user: req.user._id });
  if (!cart) cart = await Cart.create({ user: req.user._id, items: [] });

  const idx        = cart.items.findIndex((i) => getItemProductId(i) === productId.toString());
  const currentQty = idx > -1 ? cart.items[idx].quantity : 0;
  const newQty     = currentQty + qty;

  if (product.stock < newQty) {
    res.status(400);
    throw new Error(`Insufficient stock. Available: ${product.stock}`);
  }

  if (idx > -1) {
    cart.items[idx].quantity = newQty;
  } else {
    cart.items.push({ product: productId, quantity: qty });
  }

  await cart.save();

  const enriched = await enrichCart(cart);
  res.json(enriched);
});

// ── POST /api/cart/remove ─────────────────────────────────────────────────────
export const removeFromCart = asyncHandler(async (req, res) => {
  const productId = req.params.productId || req.body.productId;

  if (!productId) {
    res.status(400);
    throw new Error("productId is required");
  }

  const cart = await Cart.findOne({ user: req.user._id });
  if (!cart) {
    res.status(404);
    throw new Error("Cart not found");
  }

  cart.items = cart.items.filter(
    (i) => getItemProductId(i) !== productId.toString()
  );

  await cart.save();

  const enriched = await enrichCart(cart);
  res.json(enriched);
});

// ── POST /api/cart/update ─────────────────────────────────────────────────────
export const updateCartItem = asyncHandler(async (req, res) => {
  const productId = req.params.productId || req.body.productId;
  const quantity  = Number(req.body.quantity);

  if (!productId || isNaN(quantity)) {
    res.status(400);
    throw new Error("productId and quantity are required");
  }
  if (quantity < 1) {
    res.status(400);
    throw new Error("Quantity must be at least 1");
  }

  // Validate stock via product-service
  const product = await fetchProduct(productId);
  if (product.stock < quantity) {
    res.status(400);
    throw new Error(
      `Insufficient stock. Available: ${product.stock}, Requested: ${quantity}`
    );
  }

  const cart = await Cart.findOne({ user: req.user._id });
  if (!cart) {
    res.status(404);
    throw new Error("Cart not found");
  }

  const item = cart.items.find((i) => getItemProductId(i) === productId.toString());
  if (!item) {
    res.status(404);
    throw new Error("Item not found in cart");
  }

  item.quantity = quantity;
  await cart.save();

  const enriched = await enrichCart(cart);
  res.json(enriched);
});

// ── clearCartByUserId ─────────────────────────────────────────────────────────
// Pure DB helper — no req/res. Called directly by the Kafka consumer.
export const clearCartByUserId = async (userId) => {
  if (!userId) throw new Error("userId is required");
  await Cart.findOneAndUpdate({ user: userId }, { $set: { items: [] } });
  console.log(`[cart-service] Cart cleared for user=${userId}`);
};
