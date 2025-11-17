import React from 'react';
import { ShoppingCart, Search, User, Heart, Menu, X, Star, Truck, Shield, Headphones, ChevronRight, Phone, Mail, MapPin } from 'lucide-react';

const Newsletter = () => {
  return (
    <section className="py-20 bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center bg-white rounded-2xl shadow">
        <h2 className="text-4xl font-bold mb-4">Stay in the Loop</h2>
        <p className="text-gray-600 mb-8 text-lg">
          Subscribe to get special offers, free giveaways, and updates
        </p>
        <form className="flex flex-col sm:flex-row gap-4 max-w-xl mx-auto p-8">
          <input
            type="email"
            placeholder="Enter your email"
            className="flex-1 px-6 py-4 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-black"
          />
          <button className="bg-black text-white px-8 py-4 rounded-xl hover:bg-gray-800 transition whitespace-nowrap shadow">
            Subscribe
          </button>
        </form>
      </div>
    </section>
  );
};

export default Newsletter;