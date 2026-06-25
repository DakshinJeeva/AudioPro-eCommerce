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
  // Merge headers first, then spread the rest of options (excluding headers)
  // so that the Content-Type we set here is never overwritten by the caller.
  const { headers: callerHeaders = {}, ...restOptions } = options;
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json", ...callerHeaders },
    ...restOptions,
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
    // GET /api/product/:id  — returns the document directly
    const data = await apiFetch(`${PRODUCT_URL}/api/product/${productId}`);
    const product = data._id ? data : (data.product || null);
    if (!product?._id) throw new Error(`No product found with ID: ${productId}`);
    return product;
  }

  if (productName) {
    // product-service has no search param — fetch all and filter client-side
    const products = await apiFetch(`${PRODUCT_URL}/api/product`);
    const list = Array.isArray(products) ? products : (products.products || []);
    const match = list.find((p) =>
      p.name?.toLowerCase().includes(productName.toLowerCase())
    );
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
  // cart-service returns the enriched cart directly (not wrapped)
  return data.items ? data : (data.cart || data);
};

// ── removeFromCartService ─────────────────────────────────────────────────────
/**
 * Remove a product from the cart.
 * Delegates to: DELETE cart-service /api/cart/remove/:productId
 */
export const removeFromCartService = async ({ token, productId }) => {
  // Route is POST /api/cart/remove with productId in the body
  const data = await apiFetch(`${CART_URL}/api/cart/remove`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ productId }),
  });
  return data.items ? data : (data.cart || data);
};

// ── updateCartItemService ─────────────────────────────────────────────────────
/**
 * Update the quantity of a cart item.
 * Delegates to: PUT cart-service /api/cart/update/:productId
 */
export const updateCartItemService = async ({ token, productId, quantity }) => {
  if (quantity < 1) throw new Error("Quantity must be at least 1");
  // Route is POST /api/cart/update with productId and quantity in the body
  const data = await apiFetch(`${CART_URL}/api/cart/update`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ productId, quantity }),
  });
  return data.items ? data : (data.cart || data);
};
