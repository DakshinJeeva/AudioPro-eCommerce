import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Package, ShoppingCart, Heart } from "lucide-react";
import { apiFetch, API_BASE } from "../utils/api";
import { useAuth } from "../context/useAuth";

const ProductDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [qty, setQty] = useState(1);
  const [adding, setAdding] = useState(false);
  const [liked, setLiked] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  // Scroll to top whenever a new product is opened
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [id]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await apiFetch(`/api/products/${id}`);
        setProduct(data);

        // If user is logged in, check if this product is already in wishlist
        if (user) {
          try {
            const wishlist = await apiFetch("/api/wishlist", { method: "GET" });
            const ids = Array.isArray(wishlist?.products)
              ? wishlist.products.map((p) => (typeof p === "string" ? p : p._id))
              : [];
            if (ids.includes(data._id)) {
              setLiked(true);
            }
          } catch {
            // ignore wishlist preload errors
          }
        }
      } catch (err) {
        setError(err.message || "Failed to load product");
      }
      setLoading(false);
    };
    fetchData();
  }, [id, user]);

  const handleAddToCart = async () => {
    if (!user) {
      alert("Please sign in to add items to cart");
      return;
    }
    if (!product || product.stock === 0) {
      alert("This product is out of stock");
      return;
    }
    setAdding(true);
    try {
      await apiFetch("/api/cart/add", {
        method: "POST",
        body: JSON.stringify({ productId: product._id, quantity: qty }),
      });
      alert("Added to cart!");
      navigate("/cart");
    } catch (err) {
      alert(err.message || "Failed to add to cart");
    }
    setAdding(false);
  };

  const handleToggleWishlist = async () => {
    if (!user) {
      alert("Please sign in to use wishlist");
      return;
    }

    if (!product) return;

    const nextLiked = !liked;
    setLiked(nextLiked);

    try {
      if (nextLiked) {
        await apiFetch("/api/wishlist/add", {
          method: "POST",
          body: JSON.stringify({ productId: product._id }),
        });
      } else {
        await apiFetch("/api/wishlist/remove", {
          method: "POST",
          body: JSON.stringify({ productId: product._id }),
        });
      }
    } catch (err) {
      setLiked(!nextLiked);
      alert(err.message || "Failed to update wishlist");
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Package className="w-10 h-10 text-gray-400 animate-spin" />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center flex-col gap-3 text-center">
        <Package className="w-10 h-10 text-gray-300" />
        <p className="text-gray-600">{error || "Product not found"}</p>
      </div>
    );
  }

  const inStock = product.stock > 0;
  const imageList = (product.images && product.images.length > 0)
    ? product.images
    : [product.image].filter(Boolean);
  const activeImage = imageList[Math.min(activeIndex, imageList.length - 1)];

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="grid gap-10 lg:grid-cols-2">
        {/* Left: main image and thumbnails */}
        <div>
          <div className="bg-gray-100 rounded-xl flex items-center justify-center min-h-[320px] sm:min-h-[420px] mb-4">
            {activeImage && (
              <img
                src={activeImage.startsWith("http") ? activeImage : `${API_BASE}${activeImage}`}
                alt={product.name}
                className="max-h-[380px] w-auto object-contain"
              />
            )}
          </div>
          {/* Thumbnails row */}
          <div className="flex gap-3 overflow-x-auto pb-1">
            {imageList.map((img, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setActiveIndex(idx)}
                className={`border rounded-md bg-white flex-shrink-0 py-3 px-4 flex items-center justify-center ${
                  idx === activeIndex ? "border-black" : "border-gray-200"
                }`}
              >
                <img
                  src={img.startsWith("http") ? img : `${API_BASE}${img}`}
                  alt={`${product.name} ${idx + 1}`}
                  className="h-16 w-auto object-contain"
                />
              </button>
            ))}
          </div>
        </div>

        {/* Right: details */}
        <div className="space-y-6">
          {/* Category */}
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-[0.18em]">
            {product.category}
          </p>

          {/* Title & Price */}
          <div className="space-y-2">
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">
              {product.name}
            </h1>
            <p className="text-2xl sm:text-3xl font-bold text-gray-900">
              ₹{product.price.toLocaleString("en-IN")}
            </p>
          </div>

          {/* Description */}
          <p className="text-sm sm:text-base text-gray-700 leading-relaxed">
            {product.description ||
              "A premium audio product designed for everyday listening with exceptional clarity and comfort."}
          </p>

          {/* Specs placeholder */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 space-y-3">
            <h2 className="text-sm font-semibold text-gray-900">Specifications</h2>
            <ul className="text-sm text-gray-700 list-disc list-inside space-y-1">
              <li>Category: {product.category}</li>
              <li>Price: ₹{product.price.toLocaleString("en-IN")}</li>
              <li>Rating: {product.rating?.toFixed(1) || "0.0"}</li>
              <li>Stock: {product.stock}</li>
            </ul>
          </div>

          {/* Quantity + Add to Cart + Wishlist */}
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <span className="text-sm font-semibold text-gray-900">Quantity:</span>
              <div className="inline-flex items-center border border-gray-300 rounded-md overflow-hidden">
                <button
                  type="button"
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  className="px-3 py-2 text-lg text-gray-700 hover:bg-gray-100"
                >
                  −
                </button>
                <span className="px-4 py-2 text-sm font-medium text-gray-900 min-w-[3rem] text-center">
                  {qty}
                </span>
                <button
                  type="button"
                  onClick={() => setQty((q) => q + 1)}
                  className="px-3 py-2 text-lg text-gray-700 hover:bg-gray-100"
                >
                  +
                </button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={!inStock || adding}
                className="flex-1 bg-black text-white px-6 py-3 rounded-md font-semibold flex items-center justify-center gap-2 hover:bg-gray-900 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {adding ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <ShoppingCart className="w-4 h-4" />
                    Add to Cart
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleToggleWishlist}
                className="w-full sm:w-auto border border-gray-300 rounded-md px-4 py-3 flex items-center justify-center gap-2 text-gray-700 hover:bg-gray-50"
              >
                <Heart
                  className={`w-4 h-4 transition-colors ${
                    liked ? "fill-red-500 text-red-500" : "text-gray-700"
                  }`}
                />
              </button>
            </div>

            <p className="text-xs text-gray-600 flex items-center gap-2">
              <span
                className={`inline-block w-2 h-2 rounded-full ${
                  inStock ? "bg-green-500" : "bg-red-500"
                }`}
              />
              {inStock ? "In stock and ready to ship" : "Currently out of stock"}
            </p>
          </div>
        </div>
      </div>
    </main>
  );
};

export default ProductDetails;
