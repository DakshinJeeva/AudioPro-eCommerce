import React from 'react';
import { ShoppingCart, Search, User, Heart, Menu, X, Star, Truck, Shield, Headphones, ChevronRight, Phone, Mail, MapPin } from 'lucide-react';
import bgVideo from '../../utils/3946077-uhd_4096_2160_25fps.mp4';
import AnimatedNumber from '../common/AnimatedNumber';

const Hero = () => {
  return (
    <section id="home" className="relative py-16 md:py-20 overflow-hidden">
      {/* Background Video */}
      <div className="absolute inset-0 -z-10">
        <video
          className="h-full w-full object-cover"
          src={bgVideo}
          autoPlay
          muted
          loop
          playsInline
        />
      </div>

      <div className="relative w-full px-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 items-center">
          {/* Left Content */}
          <div>
            <p className="text-gray-600 text-sm font-medium mb-4 tracking-wide">PREMIUM AUDIO</p>
            <h2 className="text-5xl lg:text-6xl font-bold mb-6 leading-tight">
              Experience<br />Pure Sound
            </h2>
            <p className="text-gray-600 text-lg mb-8 max-w-lg">
              Elevate your listening experience with our premium collection of headphones and audio accessories.
            </p>
            
            {/* CTA Buttons */}
            <div className="flex flex-wrap gap-4 mb-12">
              <button className="bg-black text-white px-8 py-4 rounded-xl hover:bg-gray-800 transition flex items-center gap-2 shadow">
                <ShoppingCart className="w-5 h-5" />
                Shop Now
              </button>
              <button className="bg-white text-black px-8 py-4 rounded-xl border border-gray-300 hover:border-black transition">
                Explore Collection
              </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-8 border-t pt-8">
              <div>
                <p className="text-3xl font-bold mb-1">
                  <AnimatedNumber value={50} suffix="K+" />
                </p>
                <p className="text-gray-600 text-sm">Happy Customers</p>
              </div>
              <div className="border-l pl-8">
                <p className="text-3xl font-bold mb-1">
                  <AnimatedNumber value={4.9} decimals={1} />
                </p>
                <p className="text-gray-600 text-sm">Rating</p>
              </div>
              <div className="border-l pl-8">
                <p className="text-3xl font-bold mb-1">
                  <AnimatedNumber value={100} suffix="+" />
                </p>
                <p className="text-gray-600 text-sm">Products</p>
              </div>
            </div>
          </div>

          
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;