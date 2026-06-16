import React, { useEffect, useState } from "react";
import { apiFetch, API_BASE } from "../utils/api";
import { useAuth } from "../context/useAuth";
import { X } from "lucide-react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";


// Load Stripe with your publishable key
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_KEY);

// Checkout Form
const CheckoutForm = ({ amount, address, cartItems, token, onSuccess }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log("🟡 handleSubmit triggered");

    if (!stripe || !elements) {
      console.error("❌ Stripe or Elements not loaded");
      alert("Stripe is not loaded yet. Please wait a second and try again.");
      return;
    }

    if (!address.street || !address.city || !address.state || !address.zipCode || !address.country) {
      alert("Please fill in all address fields");
      return;
    }

    setLoading(true);

    try {
      // ─────────────────────────────────────────────────────────────────
      // 🆕 STEP 1: Synchronous Stock Check (product-service)
      // ─────────────────────────────────────────────────────────────────
      console.log("🔍 Pre-checking inventory stock levels...");
      const stockPayload = cartItems.map((item) => ({
        productId: item.product?._id,
        quantity: item.quantity,
      }));

      const stockResponse = await apiFetch("/api/product/check-stock", {
        method: "POST",
        body: JSON.stringify({ items: stockPayload }),
      });

      if (!stockResponse.success) {
        console.error("❌ Stock validation failed:", stockResponse.message);
        alert(stockResponse.message || "Some items in your cart are no longer available.");
        setLoading(false);
        return; // 🛑 STOP. Do NOT charge the card.
      }

      console.log("✅ Stock verified! Proceeding to payment gateway.");

      // ─────────────────────────────────────────────────────────────────
      // STEP 2: Create Payment Intent (Only happens if stock is available)
      // ─────────────────────────────────────────────────────────────────
      console.log("🟢 Creating Payment Intent with amount:", amount);
      const response = await apiFetch("/api/payment/create-payment-intent", {
        method: "POST",
        body: JSON.stringify({ amount }),
      });

      console.log("🧾 Payment Intent Response:", response);
      const { clientSecret } = response;

      if (!clientSecret) {
        throw new Error("No clientSecret returned from backend");
      }

      // ─────────────────────────────────────────────────────────────────
      // STEP 3: Confirm Payment with Stripe
      // ─────────────────────────────────────────────────────────────────
      console.log("✅ Confirming payment with Stripe");
      const result = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: elements.getElement(CardElement),
        },
      });

      console.log("💳 Stripe Result:", result);

      if (result.error) {
        console.error("❌ Payment Error:", result.error.message);
        alert(result.error.message);

      } else if (result.paymentIntent.status === "succeeded") {
        console.log("✅ Payment Succeeded");
        const paymentIntentId = result.paymentIntent.id;

        // Pass everything to the parent component to trigger the Kafka Order Service flow
        if (onSuccess) {
          await onSuccess(paymentIntentId, address);
        }

      } else {
        console.warn("⚠️ Payment status:", result.paymentIntent.status);
      }
    } catch (err) {
      console.error("🔥 Checkout process failed:", err);
      alert(err.message || "Payment failed");
    }

    setLoading(false);
  };
  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-4 border p-4 rounded-lg">
      <h3 className="font-semibold">Enter Card Details</h3>
      <CardElement
        className="p-4 border rounded-lg"
        options={{
          style: {
            base: {
              fontSize: "16px",
              color: "#32325d",
              "::placeholder": { color: "#a0aec0" },
            },
            invalid: { color: "#fa755a" },
          },
        }}
      />
      <button
        type="submit"
        disabled={!stripe || loading}
        className="bg-black text-white px-6 py-3 rounded-lg hover:bg-gray-800 transition w-full"
      >
        {loading ? "Processing..." : `Pay ₹${(amount / 100).toFixed(2)}`}
      </button>
    </form>
  );
};

const CartPage = () => {
  const { user } = useAuth();
  const [cart, setCart] = useState({ items: [] });
  const [loading, setLoading] = useState(true);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutValidating, setCheckoutValidating] = useState(false);
  const [address, setAddress] = useState({
    street: "",
    city: "",
    state: "",
    zipCode: "",
    country: "",
  });
  const [selectedAddressId, setSelectedAddressId] = useState("");

  const addresses = user?.addresses || [];

  // Scroll to top when cart page is opened
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const fetchCart = async () => {
    if (!user) return;
    setLoading(true);
    try {
      console.log("🛒 Fetching cart for user:", user.email);
      const data = await apiFetch("/api/cart");
      console.log("🛍️ Cart data:", data);
      setCart(data || { items: [] });
    } catch (err) {
      console.error("❌ Cart fetch error:", err);
      alert(err.message || "Failed to fetch cart");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCart();
  }, [user]);

  const updateQuantity = async (productId, quantity) => {
    if (!productId || quantity < 1) return;
    try {
      console.log("🔁 Updating quantity for:", productId, "→", quantity);
      await apiFetch("/api/cart/update", {
        method: "POST",
        body: JSON.stringify({ productId, quantity }),
      });
      fetchCart();
    } catch (err) {
      console.error("❌ Update error:", err);
      alert(err.message || "Failed to update quantity");
      fetchCart(); // Refresh cart to show current stock
    }
  };

  const removeItem = async (productId) => {
    if (!productId) return;
    try {
      console.log("🗑️ Removing item:", productId);
      await apiFetch("/api/cart/remove", {
        method: "POST",
        body: JSON.stringify({ productId }),
      });
      fetchCart();
    } catch (err) {
      console.error("❌ Remove error:", err);
      alert(err.message || "Failed to remove item");
    }
  };

  const totalPrice = cart.items.reduce(
    (acc, item) => acc + (item.product?.price || 0) * item.quantity,
    0
  );

  if (!user) return <p className="text-center mt-20">Please login to view your cart.</p>;
  if (loading) return <p className="text-center mt-20">Loading cart...</p>;

  const handlePaymentSuccess = async (paymentIntentId) => {
    console.log("✅ Payment success handler triggered");
    try {
      // Create order after successful payment
      await apiFetch("/api/orders", {
        method: "POST",
        body: JSON.stringify({
          paymentIntentId,
          address,
        }),
      });
      alert("Order completed successfully!");
      setCheckoutOpen(false);
      fetchCart(); // This will show empty cart since it's cleared on backend
    } catch (err) {
      console.error("❌ Order creation error:", err);
      alert(err.message || "Payment succeeded but order creation failed. Please contact support.");
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <h1 className="text-2xl sm:text-3xl font-bold mb-6 sm:mb-8">Your Cart</h1>

      {cart.items.length === 0 ? (
        <p>Your cart is empty.</p>
      ) : (
        <div className="space-y-4 sm:space-y-6">
          {cart.items.map((item, index) => (
            <div
              key={item.product?._id || index}
              className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 border rounded-lg"
            >
              <div className="flex items-center gap-4 w-full sm:w-auto">
                {/* Product image */}
                <div className="w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0 overflow-hidden rounded-lg border bg-gray-50 flex items-center justify-center">
                  {item.product?.images?.length > 0 || item.product?.image ? (
                    <img
                      src={
                        item.product?.images?.length > 0
                          ? `${API_BASE}${item.product.images[0]}`
                          : `${API_BASE}${item.product.image}`
                      }
                      alt={item.product?.name || "Product"}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-2xl">❓</span>
                  )}
                </div>
                <div className="min-w-0">
                  <h2 className="font-semibold">{item.product?.name || "Unknown Product"}</h2>
                  <p className="text-gray-500">₹{item.product?.price || "0.00"}</p>
                </div>
              </div>

              <div className="flex items-center justify-between gap-4 w-full sm:w-auto">
                <div className="flex flex-col items-start sm:items-center gap-1">
                  <input
                    type="number"
                    min="1"
                    max={item.product?.stock || 1}
                    value={item.quantity}
                    onChange={(e) =>
                      updateQuantity(item.product?._id, parseInt(e.target.value))
                    }
                    className="w-20 text-center border rounded-lg px-2 py-1"
                  />
                  {item.product?.stock !== undefined && (
                    <span className="text-xs text-gray-500">
                      Stock: {item.product.stock}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => removeItem(item.product?._id)}
                  className="text-red-500 hover:text-red-700"
                >
                  <X />
                </button>
              </div>
            </div>
          ))}

          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mt-6">
            <p className="text-lg sm:text-xl font-bold">Total: ₹{totalPrice}</p>
            <button
              disabled={checkoutValidating}
              onClick={async () => {
                // ── If checkout is already open, just close it ────────────
                if (checkoutOpen) {
                  setCheckoutOpen(false);
                  return;
                }

                console.log("🟢 Checkout button clicked — running pre-flight checks via user-service");

                // ── Guard 1: Cart must have at least one item ─────────────
                if (cart.items.length === 0) {
                  alert("Your cart is empty. Please add items before checking out.");
                  return;
                }

                // ── Guards 2 & 3: Fetch fresh profile from user-service ───
                setCheckoutValidating(true);
                try {
                  const profile = await apiFetch("/api/users/profile");
                  console.log("👤 Fresh profile fetched:", profile);

                  if (!profile.isPhoneVerified) {
                    alert("Your phone number is not verified. Please verify your phone in your Profile before checking out.");
                    return;
                  }

                  if (!profile.addresses || profile.addresses.length === 0) {
                    alert("No saved address found. Please add a shipping address in your Profile before checking out.");
                    return;
                  }

                  // All checks passed — preselect first saved address
                  const first = profile.addresses[0];
                  setSelectedAddressId(first._id || "");
                  setAddress({
                    street: first.street || "",
                    city: first.city || "",
                    state: first.state || "",
                    zipCode: first.zipCode || "",
                    country: first.country || "",
                  });

                  setCheckoutOpen(true);
                } catch (err) {
                  console.error("❌ Profile validation failed:", err);
                  alert(err.message || "Could not validate your profile. Please try again.");
                } finally {
                  setCheckoutValidating(false);
                }
              }}
              className="bg-black text-white px-6 py-3 rounded-lg hover:bg-gray-800 transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {checkoutValidating ? "Validating…" : checkoutOpen ? "Cancel" : "Checkout"}
            </button>
          </div>

          {/* Stripe Payment Section */}
          <div className="mt-4">
            {checkoutOpen && (
              <div className="mt-6 space-y-4">
                <div className="border p-4 rounded-lg">
                  <h3 className="font-semibold mb-4">Shipping Address</h3>

                  {addresses.length === 0 && (
                    <p className="text-sm text-red-600">
                      You have no saved addresses. Please add one in your profile before checkout.
                    </p>
                  )}

                  {addresses.length > 0 && (
                    <div className="space-y-3">
                      {addresses.map((addr) => (
                        <label
                          key={addr._id}
                          className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:border-gray-400"
                        >
                          <input
                            type="radio"
                            name="shippingAddress"
                            className="mt-1"
                            checked={selectedAddressId === (addr._id || "")}
                            onChange={() => {
                              setSelectedAddressId(addr._id || "");
                              setAddress({
                                street: addr.street || "",
                                city: addr.city || "",
                                state: addr.state || "",
                                zipCode: addr.zipCode || "",
                                country: addr.country || "",
                              });
                            }}
                          />
                          <div className="text-sm text-gray-800">
                            <p className="font-medium">{addr.street}</p>
                            <p className="text-gray-600">
                              {addr.city}, {addr.state} {addr.zipCode}
                            </p>
                            <p className="text-gray-500 text-xs">{addr.country}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                {addresses.length > 0 && selectedAddressId && (
                  <Elements stripe={stripePromise}>
                    <CheckoutForm
                      amount={totalPrice * 100}
                      address={address}
                      cartItems={cart.items}
                      token={localStorage.getItem("token")}
                      onSuccess={handlePaymentSuccess}
                    />
                  </Elements>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CartPage;
