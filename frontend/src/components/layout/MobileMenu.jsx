import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { Menu, Search, User, ShoppingCart, X } from "lucide-react";
import { useAuth } from "../../context/useAuth";

const MobileMenu = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleSectionNav = (id) => {
    // Close menu immediately for better UX
    onClose();

    if (window.location.pathname !== "/") {
      navigate(`/#${id}`);
      return;
    }

    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      {/* Overlay */}
      <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose} />

      {/* Side Menu */}
      <div className="fixed left-0 top-0 bottom-0 w-72 sm:w-80 bg-white p-6 overflow-y-auto shadow-lg transition-transform transform">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-xl font-bold tracking-tight">Menu</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Main Navigation */}
        <nav className="space-y-5">
          <div className="space-y-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-[0.18em]">
              Browse
            </p>
            <Link
              to="/#home"
              onClick={(e) => {
                e.preventDefault();
                handleSectionNav("home");
              }}
              className="block text-base font-medium text-gray-900 hover:text-gray-600 transition"
            >
              Home
            </Link>
            <Link
              to="/#products"
              onClick={(e) => {
                e.preventDefault();
                handleSectionNav("products");
              }}
              className="block text-base font-medium text-gray-900 hover:text-gray-600 transition"
            >
              Products
            </Link>
            <Link
              to="/wishlist"
              onClick={onClose}
              className="block text-base font-medium text-gray-900 hover:text-gray-600 transition"
            >
              Wishlist
            </Link>
            <Link
              to="/#categories"
              onClick={(e) => {
                e.preventDefault();
                handleSectionNav("categories");
              }}
              className="block text-base font-medium text-gray-900 hover:text-gray-600 transition"
            >
              Categories
            </Link>
            <Link
              to="/#contact"
              onClick={(e) => {
                e.preventDefault();
                handleSectionNav("contact");
              }}
              className="block text-base font-medium text-gray-900 hover:text-gray-600 transition"
            >
              Contact
            </Link>
          </div>

          {/* Admin Section (only for admin users) */}
          {user?.isAdmin && (
            <div className="pt-4 border-t border-gray-100 space-y-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-[0.18em]">
                Admin
              </p>
              <Link
                to="/admin"
                onClick={onClose}
                className="block text-base font-medium text-gray-900 hover:text-gray-600 transition"
              >
                Admin Dashboard
              </Link>
            </div>
          )}
        </nav>
      </div>
    </div>
  );
};

export default MobileMenu;
