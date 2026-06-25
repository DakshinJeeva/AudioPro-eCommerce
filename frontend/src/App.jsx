// App.jsx
import './App.css';
import React, { useState, useEffect } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import AdminDashboard from "./pages/AdminDashboard"; // example

import Hero from "./components/home/Hero";
import Features from './components/home/Features';
import Header from "./components/layout/Header";
import Footer from './components/layout/Footer';
import Newsletter from './components/home/Newsletter';
import FeaturedProducts from './components/home/FeaturedProducts';
import ContactSection from "./components/home/ContactSection";
import ChatWidget from "./components/common/ChatWidget";
import Contact from "./pages/Contact";
import MobileMenu from "./components/layout/MobileMenu";
import { AuthProvider } from "./context/useAuth";
import AuthModel from "./components/auth/AuthModel"; 
import CartPage from './pages/CartPage';
import OrderHistory from './pages/OrderHistory';
import Wishlist from "./pages/Wishlist";
import VerifyEmail from './pages/VerifyEmail';
import ResetPassword from "./pages/ResetPassword";
import Profile from "./pages/Profile";
import ProductDetails from "./pages/ProductDetails";
import ProductComparison from "./pages/ProductComparison";

// Smoothly scroll to a section when the URL hash changes (e.g. /#products)
const ScrollToHash = () => {
  const { hash, pathname } = useLocation();

  useEffect(() => {
    if (!hash) return;

    // Only handle hashes on the home page
    if (pathname !== "/") return;

    const id = hash.replace('#', '');
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [hash, pathname]);

  return null;
};

function App() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false); 
  const [authStatus, setAuthStatus] = useState({ message: "", type: "" });

  const handleAuthStatus = (message, type = "success") => {
    setAuthStatus({ message, type });

    // Auto-dismiss success messages after 3 seconds
    if (type === "success") {
      setTimeout(() => {
        setAuthStatus({ message: "", type: "" });
      }, 3000);
    }
  };

  return (
    <AuthProvider>
      <div className="min-h-screen flex flex-col">
        <Header 
          onMenuToggle={ () => setIsMenuOpen(!isMenuOpen)}
          onAuthOpen={() => setIsAuthOpen(!isAuthOpen)} 
        />

        {authStatus.message && (
          <div
            className={`px-4 py-3 text-sm flex items-center justify-between ${
              authStatus.type === "success"
                ? "bg-green-50 text-green-800 border-b border-green-200"
                : authStatus.type === "error"
                ? "bg-red-50 text-red-800 border-b border-red-200"
                : "bg-gray-50 text-gray-800 border-b border-gray-200"
            }`}
          >
            <div className="flex items-center justify-center flex-1">
              {authStatus.type === "success" && (
                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              )}
              {authStatus.message}
            </div>
            <button
              onClick={() => setAuthStatus({ message: "", type: "" })}
              className="ml-4 text-current hover:opacity-70 focus:outline-none"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        )}

        {/* Smooth-scroll handler for #home, #products, #categories on the home page */}
        <ScrollToHash />

        {/* flex-1 makes this grow to fill the space between header and footer */}
        <main className="flex-1">
          <Routes>
            <Route 
              path="/" 
              element={
                <>
                  <Hero />
                  
                  <FeaturedProducts />
                  <Features />
                  <ContactSection />
                  
                </>
              } 
            />
            <Route path="/cart" element={<CartPage />} />
            <Route path="/orders" element={<OrderHistory />} />
            <Route path="/wishlist" element={<Wishlist />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/products/:id" element={<ProductDetails />} />
            <Route path="/compare" element={<ProductComparison />} />
            <Route path="/verify-email/:token" element={<VerifyEmail />} />
            <Route path="/reset-password/:token" element={<ResetPassword />} />
            <Route path="/profile" element={<Profile onLogoutSuccess={handleAuthStatus} />} />
            <Route path="/contact" element={<Contact />} />
          </Routes>
        </main>

        <MobileMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
        
        <ChatWidget />
        <Footer />
        <AuthModel
          open={isAuthOpen}
          onClose={() => setIsAuthOpen(false)}
          onAuthSuccess={handleAuthStatus}
        />
      </div>
    </AuthProvider>
  );
}

export default App;
