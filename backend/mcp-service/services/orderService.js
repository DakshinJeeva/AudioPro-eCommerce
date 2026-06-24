/**
 * mcp-service/services/orderService.js
 *
 * Decoupled order operations — calls the order-service REST API instead
 * of importing Mongoose models directly.
 *
 * Environment variables required:
 *   ORDER_SERVICE_URL  e.g. http://order-service:5003
 */

const ORDER_URL = process.env.ORDER_SERVICE_URL || "http://order-service:5003";

// ── helpers ───────────────────────────────────────────────────────────────────

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

const VALID_STATUSES = ["pending", "processing", "shipped", "delivered", "cancelled"];

// ── createOrderService ────────────────────────────────────────────────────────
/**
 * Place an order from the user's current cart.
 * Delegates to: POST order-service /api/orders
 */
export const createOrderService = async ({ token, paymentIntentId, address }) => {
  const data = await apiFetch(`${ORDER_URL}/api/orders`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ paymentIntentId, address }),
  });
  return data.order || data;
};

// ── getUserOrdersService ──────────────────────────────────────────────────────
/**
 * Get all orders for the authenticated user.
 * Delegates to: GET order-service /api/orders/myorders
 */
export const getUserOrdersService = async ({ token }) => {
  const data = await apiFetch(`${ORDER_URL}/api/orders/myorders`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data.orders || data;
};

// ── updateOrderStatusService ──────────────────────────────────────────────────
/**
 * Update the status of an order (admin).
 * Delegates to: PUT order-service /api/orders/:orderId/status
 */
export const updateOrderStatusService = async ({ token, orderId, orderStatus }) => {
  if (!VALID_STATUSES.includes(orderStatus)) {
    throw new Error(
      `Invalid order status. Valid values: ${VALID_STATUSES.join(", ")}`
    );
  }
  const data = await apiFetch(`${ORDER_URL}/api/orders/${orderId}/status`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ orderStatus }),
  });
  return data.order || data;
};

// ── getOrderSummaryService ────────────────────────────────────────────────────
/**
 * Returns a human-readable plain-text summary of the user's order history
 * for the MCP assistant to relay back to the user.
 */
export const getOrderSummaryService = async ({ token }) => {
  const orders = await getUserOrdersService({ token });

  if (!Array.isArray(orders) || orders.length === 0) {
    return "You have no orders yet.";
  }

  return orders
    .map((o) => {
      const items = (o.items || [])
        .map(
          (i) =>
            `  • ${i.product?.name || "Unknown"} × ${i.quantity} @ ₹${i.price}`
        )
        .join("\n");
      return (
        `Order ${o._id}\n` +
        `  Status: ${o.orderStatus} | Payment: ${o.paymentStatus}\n` +
        `  Total: ₹${o.totalAmount}\n` +
        `  Placed: ${new Date(o.createdAt).toDateString()}\n` +
        items
      );
    })
    .join("\n\n");
};
