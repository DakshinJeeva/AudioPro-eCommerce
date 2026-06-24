/**
 * mcp-service/services/cartService.js
 *
 * Decoupled cart operations — calls the cart-service and product-service
 * REST APIs instead of importing Mongoose models directly.
 *
 * Environment variables required:
 *   CART_SERVICE_URL    e.g. http://cart-service:5005
 *   PRODUCT_SERVICE_URL e.g. http://product-service:5002
 */

const CART_URL    = process.env.CART_SERVICE_URL    || "http://cart-service:5005";
const PRODUCT_URL = process.env.PRODUCT_SERVICE_URL || "http://product-service:5002";

// ── helpers ───────────────────────────────────────────────────────────────────

/**
 * Thin fetch wrapper — throws a descriptive error when the downstream
 * service returns a non-2xx status.
 */
async function apiFetch(url, options = {}) {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || `Upstream error ${res.status} from ${url}`);
  }
  return data;
}

// ── resolveProduct ────────────────────────────────────────────────────────────
/**
 * Resolve a product by ID or partial name via product-service.
 * Returns the full product document { _id, name, price, stock, … }.
 */
export const resolveProduct = async ({ productId, productName }) => {
  if (productId) {
    const data = await apiFetch(`${PRODUCT_URL}/api/products/${productId}`);
    const product = data.product || data;
    if (!product?._id) throw new Error(`No product found with ID: ${productId}`);
    return product;
  }

  if (productName) {
    const data = await apiFetch(
      `${PRODUCT_URL}/api/products?search=${encodeURIComponent(productName)}`
    );
    const products = data.products || data;
    const match = Array.isArray(products)
      ? products.find((p) =>
          p.name?.toLowerCase().includes(productName.toLowerCase())
        )
      : null;
    if (!match) throw new Error(`No product found with name: "${productName}"`);
    return match;
  }

  throw new Error("Provide either productId or productName");
};

// ── getCartService ────────────────────────────────────────────────────────────
/**
 * Fetch the current user's cart.
 * Delegates to: GET cart-service /api/cart  (auth: Bearer <internalToken>)
 */
export const getCartService = async ({ userId, token }) => {
  const data = await apiFetch(`${CART_URL}/api/cart`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data.cart || data || { items: [] };
};

// ── addToCartService ──────────────────────────────────────────────────────────
/**
 * Add a product to the cart.
 * Delegates to: POST cart-service /api/cart/add
 */
export const addToCartService = async ({ token, productId, quantity = 1 }) => {
  const data = await apiFetch(`${CART_URL}/api/cart/add`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ productId, quantity }),
  });
  return data.cart || data;
};

// ── removeFromCartService ─────────────────────────────────────────────────────
/**
 * Remove a product from the cart.
 * Delegates to: DELETE cart-service /api/cart/remove/:productId
 */
export const removeFromCartService = async ({ token, productId }) => {
  const data = await apiFetch(`${CART_URL}/api/cart/remove/${productId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  return data.cart || data;
};

// ── updateCartItemService ─────────────────────────────────────────────────────
/**
 * Update the quantity of a cart item.
 * Delegates to: PUT cart-service /api/cart/update/:productId
 */
export const updateCartItemService = async ({ token, productId, quantity }) => {
  if (quantity < 1) throw new Error("Quantity must be at least 1");
  const data = await apiFetch(`${CART_URL}/api/cart/update/${productId}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ quantity }),
  });
  return data.cart || data;
};
