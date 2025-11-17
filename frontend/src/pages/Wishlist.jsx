import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Heart } from "lucide-react";
import { apiFetch } from "../utils/api";
import { useAuth } from "../context/useAuth";
import ProductCard from "../components/products/ProductCard";

const Wishlist = () => {
  const { user, loadingUser } = useAuth();
  const navigate = useNavigate();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (loadingUser) return;

    if (!user) {
      setLoading(false);
      return;
    }

    const fetchWishlist = async () => {
      try {
        const data = await apiFetch("/api/wishlist", { method: "GET" });
        const products = Array.isArray(data?.products) ? data.products : [];
        setItems(products);
      } catch (err) {
        setError(err.message || "Failed to load wishlist");
      }
      setLoading(false);
    };

    fetchWishlist();
  }, [user, loadingUser]);

  const handleGoToLogin = () => {
    navigate("/profile");
  };

  const handleBrowseProducts = () => {
    navigate("/#products");
  };

  if (loadingUser || loading) {
    return (
      <main className="min-h-[60vh] max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-center">
        <p className="text-gray-500 text-sm">Loading wishlist...</p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-[60vh] max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center justify-center gap-4 text-center">
        <Heart className="w-10 h-10 text-gray-300" />
        <h1 className="text-2xl font-semibold text-gray-900">Your wishlist is waiting</h1>
        <p className="text-gray-600 max-w-md text-sm">
          Sign in to start saving your favourite products and quickly find them later.
        </p>
        <button
          type="button"
          onClick={handleGoToLogin}
          className="bg-black text-white px-6 py-2.5 rounded-md text-sm font-medium hover:bg-gray-900"
        >
          Go to Profile / Login
        </button>
      </main>
    );
  }

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Heart className="w-6 h-6 text-red-500" />
            My Wishlist
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            All the products you have saved for later.
          </p>
        </div>
        {items.length > 0 && (
          <button
            type="button"
            onClick={handleBrowseProducts}
            className="hidden sm:inline-flex items-center text-xs font-medium text-gray-700 border border-gray-300 rounded-md px-3 py-1.5 hover:bg-gray-50"
          >
            Browse more products
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">
          {error}
        </div>
      )}

      {items.length === 0 ? (
        <div className="min-h-[40vh] flex flex-col items-center justify-center gap-3 text-center">
          <Heart className="w-10 h-10 text-gray-300" />
          <p className="text-gray-700 text-sm font-medium">No items in your wishlist yet.</p>
          <p className="text-gray-500 text-xs max-w-xs">
            Tap the heart icon on any product to add it to your wishlist.
          </p>
          <button
            type="button"
            onClick={handleBrowseProducts}
            className="mt-2 bg-black text-white px-5 py-2 rounded-md text-sm font-medium hover:bg-gray-900"
          >
            Start exploring products
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((product) => (
            <ProductCard
              key={product._id}
              product={product}
              initialLiked={true}
              onWishlistChange={(id, isLiked) => {
                if (!isLiked) {
                  setItems((prev) => prev.filter((p) => p._id !== id));
                }
              }}
            />
          ))}
        </div>
      )}
    </main>
  );
};

export default Wishlist;
