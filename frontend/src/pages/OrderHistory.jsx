import React, { useEffect, useState } from "react";
import { apiFetch } from "../utils/api";
import { useAuth } from "../context/useAuth";
import { Star } from "lucide-react";

const OrderHistory = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ratings, setRatings] = useState({}); // { orderId: { productId: rating } }
  const [showRatingModal, setShowRatingModal] = useState(null); // { orderId, productId }
  const [ratingForm, setRatingForm] = useState({ rating: 5, comment: "" });

  useEffect(() => {
    const fetchOrders = async () => {
      if (!user) return;
      setLoading(true);
      try {
        const data = await apiFetch("/api/orders");
        setOrders(data || []);
        
        // Fetch ratings for delivered orders
        const deliveredOrders = data.filter(order => order.orderStatus === "delivered");
        for (const order of deliveredOrders) {
          try {
            const orderRatings = await apiFetch(`/api/ratings/order/${order._id}`);
            if (orderRatings && Array.isArray(orderRatings)) {
              const ratingMap = {};
              orderRatings.forEach(r => {
                if (r.product && r.product._id) {
                  ratingMap[r.product._id] = r.rating;
                }
              });
              setRatings(prev => ({ ...prev, [order._id]: ratingMap }));
            }
          } catch (err) {
            // If no ratings exist yet (404), that's okay - user hasn't rated yet
            // Only log other errors
            if (err.message && !err.message.includes("404") && !err.message.includes("Not found")) {
              console.error("Failed to fetch ratings for order:", err);
            }
          }
        }
      } catch (err) {
        console.error("Failed to fetch orders:", err);
        alert(err.message || "Failed to fetch orders");
      }
      setLoading(false);
    };
    fetchOrders();
  }, [user]);

  if (!user) {
    return <p className="text-center mt-20">Please login to view your orders.</p>;
  }

  if (loading) {
    return <p className="text-center mt-20">Loading orders...</p>;
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: "bg-yellow-100 text-yellow-800",
      processing: "bg-blue-100 text-blue-800",
      shipped: "bg-purple-100 text-purple-800",
      delivered: "bg-green-100 text-green-800",
      cancelled: "bg-red-100 text-red-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  const handleSubmitRating = async (orderId, productId) => {
    try {
      await apiFetch("/api/ratings", {
        method: "POST",
        body: JSON.stringify({
          productId,
          orderId,
          rating: ratingForm.rating,
          comment: ratingForm.comment,
        }),
      });
      alert("Rating submitted successfully!");
      setShowRatingModal(null);
      setRatingForm({ rating: 5, comment: "" });
      
      // Update local ratings state immediately
      setRatings(prev => ({
        ...prev,
        [orderId]: {
          ...prev[orderId],
          [productId]: ratingForm.rating,
        },
      }));
      
      // Refresh orders to get updated product ratings (products will have new average rating)
      const data = await apiFetch("/api/orders");
      setOrders(data || []);
    } catch (err) {
      alert(err.message || "Failed to submit rating");
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold mb-8">Order History</h1>

      {orders.length === 0 ? (
        <p className="text-center text-gray-500 mt-10">You have no orders yet.</p>
      ) : (
        <div className="space-y-6">
          {orders.map((order) => (
            <div key={order._id} className="border rounded-lg p-6 shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-lg font-semibold">Order #{order._id.slice(-8).toUpperCase()}</h2>
                  <p className="text-sm text-gray-500">{formatDate(order.createdAt)}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold">₹{order.totalAmount}</p>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(order.orderStatus)}`}>
                    {order.orderStatus.charAt(0).toUpperCase() + order.orderStatus.slice(1)}
                  </span>
                </div>
              </div>

              <div className="mb-4">
                <h3 className="font-semibold mb-2">Items:</h3>
                <div className="space-y-2">
                  {order.items.map((item, index) => (
                    <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                      <div className="flex items-center gap-3 flex-1">
                        <div className="text-2xl">{item.product?.image || "❓"}</div>
                        <div className="flex-1">
                          <p className="font-medium">{item.product?.name || "Unknown Product"}</p>
                          <p className="text-sm text-gray-500">Quantity: {item.quantity} × ₹{item.price}</p>
                          {order.orderStatus === "delivered" && (
                            <div className="mt-2">
                              {ratings[order._id]?.[item.product?._id] ? (
                                <div className="flex items-center gap-1">
                                  <span className="text-sm text-gray-600">Your rating: </span>
                                  <div className="flex">
                                    {[...Array(5)].map((_, i) => (
                                      <Star
                                        key={i}
                                        className={`w-4 h-4 ${
                                          i < ratings[order._id][item.product._id]
                                            ? "fill-yellow-400 text-yellow-400"
                                            : "fill-gray-300 text-gray-300"
                                        }`}
                                      />
                                    ))}
                                  </div>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setShowRatingModal({ orderId: order._id, productId: item.product?._id, productName: item.product?.name })}
                                  className="text-sm text-blue-600 hover:text-blue-800 underline"
                                >
                                  Rate this product
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      <p className="font-semibold">₹{item.quantity * item.price}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-semibold mb-2">Shipping Address:</h3>
                <p className="text-sm text-gray-600">
                  {order.address.street}, {order.address.city}, {order.address.state} {order.address.zipCode}, {order.address.country}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Rating Modal */}
      {showRatingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold mb-4">Rate {showRatingModal.productName}</h3>
            <div className="mb-4">
              <label className="block text-sm font-semibold mb-2">Rating:</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setRatingForm({ ...ratingForm, rating: star })}
                    className="focus:outline-none"
                  >
                    <Star
                      className={`w-8 h-8 ${
                        star <= ratingForm.rating
                          ? "fill-yellow-400 text-yellow-400"
                          : "fill-gray-300 text-gray-300"
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-semibold mb-2">Comment (optional):</label>
              <textarea
                value={ratingForm.comment}
                onChange={(e) => setRatingForm({ ...ratingForm, comment: e.target.value })}
                className="w-full border rounded p-2"
                rows="3"
                placeholder="Share your experience..."
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => handleSubmitRating(showRatingModal.orderId, showRatingModal.productId)}
                className="bg-black text-white px-4 py-2 rounded hover:bg-gray-800"
              >
                Submit Rating
              </button>
              <button
                onClick={() => {
                  setShowRatingModal(null);
                  setRatingForm({ rating: 5, comment: "" });
                }}
                className="bg-gray-200 text-gray-800 px-4 py-2 rounded hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderHistory;

