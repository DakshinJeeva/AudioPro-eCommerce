import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { TrendingUp, Package } from "lucide-react";
import { apiFetch } from "../../utils/api";
import ProductCard from "../products/ProductCard";
import { useAuth } from "../../context/useAuth";

const FeaturedProducts = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [priceSort, setPriceSort] = useState(""); // '' | 'asc' | 'desc' for category sections
  const [searchTerm, setSearchTerm] = useState("");
  const location = useLocation();
  const { user } = useAuth();
  const [wishlistIds, setWishlistIds] = useState([]);

  const categoryConfigs = [
    {
      id: "headphones",
      title: "Headphones & Earphones",
      description: "Wired, wireless, Bluetooth and true wireless earbuds",
      match: (category) => {
        const c = (category || "").toLowerCase();
        return c.includes("headphone") || c.includes("earphone");
      },
    },
    {
      id: "studio-monitors",
      title: "Studio Monitors & Pro Speakers",
      description: "For music production and professional audio work",
      match: (category) => {
        const c = (category || "").toLowerCase();
        return c.includes("studio") || c.includes("monitor") || c.includes("speaker");
      },
    },
    {
      id: "home-audio",
      title: "Home Audio & HiFi Systems",
      description: "Home audio systems, music systems and HiFi equipment",
      match: (category) => {
        const c = (category || "").toLowerCase();
        return (
          c.includes("home audio") ||
          c.includes("music system") ||
          c.includes("hifi") ||
          c.includes("hi-fi")
        );
      },
    },
    {
      id: "accessories",
      title: "Cables, earbuds & Accessories",
      description: "Upgrade cables, earbuds and audio accessories",
      match: (category) => {
        const c = (category || "").toLowerCase();
        return c.includes("accessor") || c.includes("cable") || c.includes("eartip");
      },
    },
  ];

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const data = await apiFetch("/api/products");
        // Guard: ensure we always store a flat array
        if (Array.isArray(data)) {
          setProducts(data);
        } else if (data && Array.isArray(data.products)) {
          setProducts(data.products);
        } else {
          console.warn("Unexpected products response shape:", data);
          setProducts([]);
        }
      } catch (err) {
        console.error("Failed to fetch products:", err);
        setProducts([]);
      }
      setLoading(false);
    };
    fetchProducts();
  }, []);

  // Preload wishlist IDs for logged-in user so hearts can glow
  useEffect(() => {
    if (!user) {
      setWishlistIds([]);
      return;
    }

    const fetchWishlist = async () => {
      try {
        const wishlist = await apiFetch("/api/wishlist", { method: "GET" });
        const ids = Array.isArray(wishlist?.products)
          ? wishlist.products.map((p) => (typeof p === "string" ? p : p._id))
          : [];
        setWishlistIds(ids);
      } catch (err) {
        console.error("Failed to preload wishlist:", err);
        setWishlistIds([]);
      }
    };

    fetchWishlist();
  }, [user]);

  // Sync searchTerm with ?q= in the URL
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const q = params.get("q") || "";
    setSearchTerm(q.toLowerCase());
  }, [location.search]);

  const matchesSearch = (product) => {
    if (!searchTerm) return true;
    const name = (product.name || "").toLowerCase();
    const category = (product.category || "").toLowerCase();
    const description = (product.description || "").toLowerCase();
    return (
      name.includes(searchTerm) ||
      category.includes(searchTerm) ||
      description.includes(searchTerm)
    );
  };

  const filteredProducts = products.filter(matchesSearch);

  const featuredProducts = filteredProducts.filter((p) => p.featured && (p.stock || 0) > 0);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-gray-50">
        <div className="text-center space-y-4">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-200 border-t-gray-900 mx-auto"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <Package className="w-6 h-6 text-gray-400 animate-pulse" />
            </div>
          </div>
          <p className="text-gray-600 font-medium">Loading products...</p>
        </div>
      </div>
    );
  }

  return (
    <section
      id="products"
      className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 relative overflow-hidden flex flex-col"
    >
      {/* Subtle Background Pattern */}
      <div className="absolute inset-0 bg-grid-pattern opacity-[0.02] pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative flex-1 flex flex-col">
        {/* Header Section */}
        <div className="text-center py-8">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-full text-sm font-medium mb-4 shadow-lg">
            <TrendingUp className="w-4 h-4" />
            Trending Now
          </div>

          {/* Title */}
          <h2 className="text-4xl lg:text-5xl font-bold mb-3 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 bg-clip-text text-transparent leading-tight">
            Featured Products
          </h2>

          {/* Subtitle */}
          <p className="text-gray-600 text-base max-w-2xl mx-auto leading-relaxed">
            Discover our carefully curated collection of premium audio equipment
          </p>
        </div>

        {/* Products Grid using ProductCard - only featured products (no wishlist / cart actions) */}
        {featuredProducts.length > 0 ? (
          <div className="py-8 border-b border-gray-200">
            <div className="grid grid-cols-2 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {featuredProducts.map((product) => (
                <ProductCard
                  key={product._id}
                  product={product}
                  showActions={false}
                  initialLiked={wishlistIds.includes(product._id)}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-20">
            <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Featured Products</h3>
            <p className="text-gray-600">Mark products as featured in the admin dashboard to show them here.</p>
          </div>
        )}

        {/* Category Sections */}
        {filteredProducts.length > 0 && (
          <div id="categories" className="py-10 space-y-10">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-2">
              <h3 className="text-xl md:text-2xl font-semibold text-gray-900">Shop by Category</h3>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-700 font-medium">Sort by price:</span>
                <select
                  value={priceSort}
                  onChange={(e) => setPriceSort(e.target.value)}
                  className="border border-gray-300 rounded px-3 py-1 bg-white text-sm"
                >
                  <option value="">Default</option>
                  <option value="asc">Low to High</option>
                  <option value="desc">High to Low</option>
                </select>
              </div>
            </div>

            {categoryConfigs.map((config) => {
              const categoryProducts = filteredProducts.filter((p) =>
                config.match(p.category)
              );
              const sortedCategoryProducts = [...categoryProducts].sort((a, b) => {
                if (priceSort === "asc") return (a.price || 0) - (b.price || 0);
                if (priceSort === "desc") return (b.price || 0) - (a.price || 0);
                return 0;
              });
              if (sortedCategoryProducts.length === 0) return null;
              return (
                <section key={config.id} className="space-y-5">
                  <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-2">
                    <h4 className="text-sm md:text-base font-semibold text-gray-900 uppercase tracking-[0.18em]">
                      {config.title}
                    </h4>
                    {config.description && (
                      <p className="text-xs md:text-sm text-gray-500 max-w-xl">
                        {config.description}
                      </p>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                    {sortedCategoryProducts.map((product) => (
                      <ProductCard
                        key={product._id}
                        product={product}
                        initialLiked={wishlistIds.includes(product._id)}
                      />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>

      {/* Decorative Elements */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-blue-100 rounded-full blur-3xl opacity-20 pointer-events-none"></div>
      <div className="absolute bottom-20 right-10 w-72 h-72 bg-purple-100 rounded-full blur-3xl opacity-20 pointer-events-none"></div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(-50%) translateX(0) rotate(0deg); }
          50% { transform: translateY(-50%) translateX(10px) rotate(5deg); }
        }
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.6s ease-out;
        }
      `}</style>
    </section>
  );
};

export default FeaturedProducts;