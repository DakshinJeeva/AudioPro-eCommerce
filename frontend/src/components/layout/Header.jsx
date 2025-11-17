// frontend/src/components/layout/Header.jsx
import React, { useState, useEffect } from "react";
import { Menu, Search, User, ShoppingCart, Package, Heart } from "lucide-react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { apiFetch } from "../../utils/api";
import { useAuth } from "../../context/useAuth";
import LiquidTextLogo from "../brand/LiquidTextLogo";

const Header = ({ onMenuToggle, onAuthOpen }) => {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [cartCount, setCartCount] = useState(0);
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSectionNav = (id) => {
    if (window.location.pathname !== "/") {
      navigate(`/#${id}`);
      return;
    }

    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  // Keep search input in sync with `?q=` in the URL
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const q = params.get("q") || "";
    setSearchValue(q);
  }, [location.search]);

  // Fetch cart count whenever user changes
  useEffect(() => {
    const fetchCartCount = async () => {
      if (!user) {
        setCartCount(0);
        return;
      }
      try {
        const cart = await apiFetch("/api/cart");
        setCartCount(cart.items.length);
      } catch (err) {
        console.error("Failed to fetch cart:", err);
        setCartCount(0);
      }
    };
    fetchCartCount();
  }, [user]);

  return (
    <header className="bg-white/90 backdrop-blur border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <div className="flex items-center">
            <button onClick={onMenuToggle} className="lg:hidden mr-4 p-2 rounded-lg hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-black">
              <Menu className="w-6 h-6" />
            </button>
            <div className="leading-none">
              <LiquidTextLogo text="AUDIOPRO" />
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-8">
            <Link
              to="/#home"
              onClick={(e) => {
                e.preventDefault();
                handleSectionNav("home");
              }}
              className="text-gray-900 hover:text-gray-600 transition"
            >
              Home
            </Link>
            <Link
              to="/#products"
              onClick={(e) => {
                e.preventDefault();
                handleSectionNav("products");
              }}
              className="text-gray-900 hover:text-gray-600 transition"
            >
              Products
            </Link>
            <Link
              to="/#categories"
              onClick={(e) => {
                e.preventDefault();
                handleSectionNav("categories");
              }}
              className="text-gray-900 hover:text-gray-600 transition"
            >
              Categories
            </Link>
            <Link
              to="/#contact"
              onClick={(e) => {
                e.preventDefault();
                handleSectionNav("contact");
              }}
              className="text-gray-900 hover:text-gray-600 transition"
            >
              Contact
            </Link>
            {user?.isAdmin && (
              <Link to="/admin" className="text-gray-900 hover:text-gray-600 transition">
                Admin Dashboard
              </Link>
            )}
          </nav>

          {/* Icons */}
          <div className="flex items-center space-x-4 md:space-x-6">
            <button 
              onClick={() => setSearchOpen(!searchOpen)}
              className="p-2 rounded-lg hover:bg-gray-100 transition focus:outline-none focus:ring-2 focus:ring-black"
            >
              <Search className="w-5 h-5" />
            </button>

            {/* PROFILE/LOGIN ICON */}
            <button
              onClick={() => {
                if (user) {
                  navigate("/profile");
                } else {
                  onAuthOpen();
                }
              }}
              className="p-2 rounded-lg hover:bg-gray-100 transition focus:outline-none focus:ring-2 focus:ring-black"
              title={user ? "Profile" : "Sign in / Sign up"}
            >
              <User className="w-5 h-5" />
            </button>

            {/* ORDER HISTORY ICON */}
            {user && (
              <>
                <button 
                  className="p-2 rounded-lg hover:bg-gray-100 transition focus:outline-none focus:ring-2 focus:ring-black"
                  onClick={() => navigate("/orders")}
                  title="Order History"
                >
                  <Package className="w-5 h-5" />
                </button>

                {/* WISHLIST ICON */}
                <button
                  className="p-2 rounded-lg hover:bg-gray-100 transition focus:outline-none focus:ring-2 focus:ring-black text-gray-800"
                  onClick={() => navigate("/wishlist")}
                  title="Wishlist"
                >
                  <Heart className="w-5 h-5" />
                </button>
              </>
            )}

            {/* CART ICON */}
            <button 
              className="relative p-2 mr-1 rounded-lg hover:bg-gray-100 transition focus:outline-none focus:ring-2 focus:ring-black"
              onClick={() => navigate("/cart")} // Go to cart page
            >
              <ShoppingCart className="w-5 h-5" />
              {cartCount > 0 && (
                <span className="absolute -top-2 right-0 bg-black text-white text-xs w-5 h-5 rounded-full flex items-center justify-center shadow-md">
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Search Bar */}
        {searchOpen && (
          <div className="pb-4">
            <input
              type="text"
              placeholder="Search products..."
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black"
              autoFocus
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  const q = searchValue.trim();

                  // Always send user to home with the query param
                  const search = q ? `?q=${encodeURIComponent(q)}` : "";
                  navigate(`/${search}`);

                  // Scroll to products when searching from home
                  setTimeout(() => {
                    const el = document.getElementById("products");
                    if (el) {
                      el.scrollIntoView({ behavior: "smooth", block: "start" });
                    }
                  }, 0);

                  setSearchOpen(false);
                }
              }}
            />
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
