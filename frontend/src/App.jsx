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
  };

  return (
    <AuthProvider>
      <Header 
        onMenuToggle={ () => setIsMenuOpen(!isMenuOpen)}
        onAuthOpen={() => setIsAuthOpen(!isAuthOpen)} 
      />

      {authStatus.message && (
        <div
          className={`px-4 py-2 text-sm text-center ${
            authStatus.type === "success"
              ? "bg-green-50 text-green-800 border-b border-green-200"
              : authStatus.type === "error"
              ? "bg-red-50 text-red-800 border-b border-red-200"
              : "bg-gray-50 text-gray-800 border-b border-gray-200"
          }`}
        >
          {authStatus.message}
        </div>
      )}

      {/* Smooth-scroll handler for #home, #products, #categories on the home page */}
      <ScrollToHash />

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
        <Route path="/verify-email/:token" element={<VerifyEmail />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />
        <Route path="/profile" element={<Profile onLogoutSuccess={handleAuthStatus} />} />
        <Route path="/contact" element={<Contact />} />

      </Routes>

      <MobileMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
      
      <Footer />
      <AuthModel
        open={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onAuthSuccess={handleAuthStatus}
      />
      
    </AuthProvider>
  );
}

export default App;
