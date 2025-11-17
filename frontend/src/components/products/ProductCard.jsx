import React, { useState, useEffect } from "react";

import { useNavigate } from "react-router-dom";

import { Heart, Star, ShoppingCart, Eye } from "lucide-react";
import { apiFetch, API_BASE } from "../../utils/api";

import { useAuth } from "../../context/useAuth";

const ProductCard = ({ product, showActions = true, initialLiked = false, onWishlistChange }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [liked, setLiked] = useState(!!initialLiked);
  const [hasUserToggled, setHasUserToggled] = useState(false);

  const [adding, setAdding] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  // One-way sync from initialLiked -> liked, only before user interacts.
  useEffect(() => {
    if (!hasUserToggled && initialLiked && !liked) {
      setLiked(true);
    }
  }, [initialLiked, liked, hasUserToggled]);

  const handleAddToCart = async () => {
    if (!user) {
      alert("Please sign in to add items to cart");
      return;
    }

    if (product.stock === 0) {
      alert("This product is out of stock");
      return;
    }

    console.log("Product to add:", product);

    setAdding(true);
    try {
      const data = await apiFetch("/api/cart/add", {
        method: "POST",
        body: JSON.stringify({ productId: product._id, quantity: 1 }),
      });
      console.log("Cart updated:", data);
      alert("Added to cart!");
    } catch (err) {
      console.error(err);
      alert(err.message || "Failed to add to cart");
    }
    setAdding(false);
  };

  const handleToggleWishlist = async (e) => {
    e.stopPropagation();

    if (!user) {
      alert("Please sign in to use wishlist");
      return;
    }
    setHasUserToggled(true);

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

      if (onWishlistChange) {
        onWishlistChange(product._id, nextLiked);
      }
    } catch (err) {
      setLiked(!nextLiked);
      alert(err.message || "Failed to update wishlist");
    }
  };

  const handleCardClick = () => {
    if (!product?._id) return;
    navigate(`/products/${product._id}`);
  };

  return (
    <div 
      className="group relative h-full cursor-pointer"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleCardClick}
    >
      {/* Main Card - clean ecommerce style */}
      <div className="bg-white rounded-lg overflow-hidden border border-gray-200 hover:shadow-md transition-shadow duration-200 h-full flex flex-col">
        
        {/* Image Container */}
        <div className={`${product.color || 'bg-gray-100'} relative overflow-hidden`}>        

          {/* Stock Badge */}
          {product.stock > 0 && product.stock < 10 && (
            <div className="absolute top-4 left-4 bg-orange-500 text-white text-xs font-semibold px-3 py-1.5 rounded-full shadow-lg z-10">
              Only {product.stock} left
            </div>
          )}
          {/* End of Stock Badge */}

          {product.stock === 0 && (
            <div className="absolute top-4 left-4 bg-gray-900 text-white text-xs font-semibold px-3 py-1.5 rounded-full shadow-lg z-10">
              Out of Stock
            </div>
          )}

          {/* Wishlist Button (optional) */}
          {showActions && (
            <button 
              onClick={handleToggleWishlist}
              className="absolute top-3 right-3 p-1.5 rounded-md hover:bg-white/70 hover:shadow-sm transition-all duration-150 z-10"
              aria-label="Add to wishlist"
            >
              <Heart 
                className={`w-5 h-5 transition-colors ${
                  liked ? 'fill-red-500 text-red-500' : 'text-gray-700'
                }`} 
              />
            </button>
          )}

          {/* Product Image */}
          <div className="py-10 px-6 flex items-center justify-center min-h-[220px] transition-transform duration-300 group-hover:scale-105">
            {product.image && (
              <img
                src={product.image.startsWith("http") ? product.image : `${API_BASE}${product.image}`}
                alt={product.name}
                className="max-h-60 w-auto object-contain"
              />
            )}
          </div>

          {/* Quick View Overlay */}
          <div className={`absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent flex items-end justify-center pb-8 transition-all duration-300 ${
            isHovered ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}>
            <button
              type="button"
              onClick={(e) => e.stopPropagation()}
              className="bg-white text-gray-900 px-6 py-3 rounded-xl font-semibold hover:bg-gray-50 transition-colors shadow-xl flex items-center gap-2 transform hover:scale-105"
            >
              <Eye className="w-4 h-4" />
              Quick View
            </button>
          </div>
        </div>

        {/* Product Info */}
        <div className="p-6 flex-1 flex flex-col">
          {/* Category */}
          <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-[0.18em] mb-1">
            {product.category}
          </p>
          
          {/* Product Name */}
          <h3 className="font-medium text-base mb-3 text-gray-900 leading-snug line-clamp-2">
            {product.name}
          </h3>

          {/* Rating */}
          <div className="flex items-center gap-2 mb-3">
            
            <div className="flex gap-0.5">
              {[...Array(5)].map((_, i) => (
                <Star 
                  key={i} 
                  className={`w-4 h-4 ${
                    i < Math.floor(product.rating || 0) 
                      ? 'fill-amber-400 text-amber-400' 
                      : i < (product.rating || 0)
                      ? 'fill-amber-200 text-amber-200'
                      : 'fill-gray-200 text-gray-200'
                  }`}
                />
              ))}
            </div>
            <span className="text-xs font-medium text-gray-600">
              {product.rating ? product.rating.toFixed(1) : '0.0'}
            </span>
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Price & Add to Cart */}
          <div className="space-y-3">
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-bold text-gray-900">
                ₹{product.price.toLocaleString('en-IN')}
              </p>
            </div>

            {showActions && (
              <>
                {product.stock === 0 ? (
                  <button
                    type="button"
                    disabled
                    onClick={(e) => e.stopPropagation()}
                    className="w-full bg-gray-100 text-gray-400 px-6 py-3.5 rounded-xl font-semibold cursor-not-allowed transition-all"
                  >
                    Out of Stock
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAddToCart();
                    }}
                    disabled={adding}
                    className="w-full bg-gray-900 text-white px-6 py-3.5 rounded-xl font-semibold hover:bg-gray-800 active:scale-95 transition-all duration-200 disabled:bg-gray-400 disabled:cursor-not-allowed shadow-lg shadow-gray-900/20 hover:shadow-xl hover:shadow-gray-900/30 flex items-center justify-center gap-2"
                  >
                    {adding ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Adding...
                      </>
                    ) : (
                      <>
                        <ShoppingCart className="w-4 h-4" />
                        Add to Cart
                      </>
                    )}
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;