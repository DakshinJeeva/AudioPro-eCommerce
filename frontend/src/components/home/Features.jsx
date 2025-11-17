import React from "react";
import { ShoppingCart, Search, User, Heart, Menu, X, Star, Truck, Shield, Headphones, ChevronRight, Phone, Mail, MapPin } from 'lucide-react';

const Features = () => {
  const features = [
    { icon: Truck, title: 'Free Shipping', desc: 'On orders over $100' },
    { icon: Shield, title: '2 Year Warranty', desc: 'Full protection' },
    { icon: Headphones, title: '24/7 Support', desc: 'Dedicated team' }
  ];

  return (
    <section className="py-20 bg-black text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-3 gap-12">
          {features.map((feature, idx) => (
            <div key={idx} className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-white text-black rounded-full mb-6 shadow-lg">
                <feature.icon className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
              <p className="text-gray-400">{feature.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;