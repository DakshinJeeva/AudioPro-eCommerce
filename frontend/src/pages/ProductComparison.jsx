import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Package, X, Plus, ArrowLeft, Star } from "lucide-react";
import { apiFetch, API_BASE } from "../utils/api";

const ProductComparison = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const [baseProduct, setBaseProduct] = useState(null);
  const [compareProducts, setCompareProducts] = useState([null, null]);
  const [allProducts, setAllProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showProductSelector, setShowProductSelector] = useState(null);

  const baseProductId = searchParams.get("product");

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch the base product
        if (baseProductId) {
          const product = await apiFetch(`/api/product/${baseProductId}`);
          setBaseProduct(product);
        }

        // Fetch all products for selection
        const products = await apiFetch("/api/product");
        setAllProducts(products.filter(p => p._id !== baseProductId));
      } catch (err) {
        setError(err.message || "Failed to load products");
      }
      setLoading(false);
    };

    fetchData();
  }, [baseProductId]);

  const handleSelectProduct = (product, index) => {
    const newCompareProducts = [...compareProducts];
    newCompareProducts[index] = product;
    setCompareProducts(newCompareProducts);
    setShowProductSelector(null);
  };

  const handleRemoveProduct = (index) => {
    const newCompareProducts = [...compareProducts];
    newCompareProducts[index] = null;
    setCompareProducts(newCompareProducts);
  };

  const renderProductCard = (product, isBase = false, index = null) => {
    if (!product) {
      return (
        <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center justify-center min-h-[400px]">
          <Plus className="w-12 h-12 text-gray-400 mb-4" />
          <p className="text-gray-500 text-center mb-4">Select a product to compare</p>
          <button
            onClick={() => setShowProductSelector(index)}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            Choose Product
          </button>
        </div>
      );
    }

    const imageUrl = product.image?.startsWith("http") 
      ? product.image 
      : `${API_BASE}${product.image}`;

    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6 relative">
        {!isBase && (
          <button
            onClick={() => handleRemoveProduct(index)}
            className="absolute top-2 right-2 p-1 text-gray-400 hover:text-red-500 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
        
        <div className="text-center mb-4">
          <div className="bg-gray-100 rounded-lg p-4 mb-4">
            <img
              src={imageUrl}
              alt={product.name}
              className="w-full h-32 object-contain"
            />
          </div>
          <h3 className="font-semibold text-lg mb-2">{product.name}</h3>
          <p className="text-2xl font-bold text-gray-900">
            ₹{product.price.toLocaleString("en-IN")}
          </p>
        </div>

        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Category:</span>
            <span className="font-medium">{product.category}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Rating:</span>
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
              <span className="font-medium">{product.rating?.toFixed(1) || "0.0"}</span>
            </div>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Stock:</span>
            <span className={`font-medium ${product.stock > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {product.stock > 0 ? `${product.stock} available` : 'Out of stock'}
            </span>
          </div>
          <div className="pt-2 border-t">
            <span className="text-gray-600">Description:</span>
            <p className="text-gray-800 mt-1 text-xs leading-relaxed">
              {product.description || "No description available"}
            </p>
          </div>
        </div>

        {isBase && (
          <div className="mt-4 pt-4 border-t">
            <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
              Base Product
            </span>
          </div>
        )}
      </div>
    );
  };

  const ProductSelector = ({ index }) => {
    const availableProducts = allProducts.filter(p => 
      !compareProducts.some(cp => cp?._id === p._id)
    );

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg max-w-4xl w-full max-h-[80vh] overflow-hidden">
          <div className="p-6 border-b">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Select Product to Compare</h2>
              <button
                onClick={() => setShowProductSelector(null)}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
          
          <div className="p-6 overflow-y-auto max-h-[60vh]">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {availableProducts.map((product) => (
                <div
                  key={product._id}
                  onClick={() => handleSelectProduct(product, index)}
                  className="border border-gray-200 rounded-lg p-4 cursor-pointer hover:border-blue-500 hover:shadow-md transition-all"
                >
                  <div className="text-center">
                    <div className="bg-gray-100 rounded-lg p-3 mb-3">
                      <img
                        src={product.image?.startsWith("http") ? product.image : `${API_BASE}${product.image}`}
                        alt={product.name}
                        className="w-full h-20 object-contain"
                      />
                    </div>
                    <h3 className="font-medium text-sm mb-1">{product.name}</h3>
                    <p className="text-lg font-bold text-gray-900">
                      ₹{product.price.toLocaleString("en-IN")}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">{product.category}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Package className="w-10 h-10 text-gray-400 animate-spin" />
      </div>
    );
  }

  if (error || !baseProduct) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center flex-col gap-3 text-center">
        <Package className="w-10 h-10 text-gray-300" />
        <p className="text-gray-600">{error || "Product not found"}</p>
        <button
          onClick={() => navigate(-1)}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Product
        </button>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Product Comparison</h1>
        <p className="text-gray-600">Compare up to 3 products side by side</p>
      </div>

      {/* Comparison Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Base Product */}
        {renderProductCard(baseProduct, true)}
        
        {/* Comparison Products */}
        {compareProducts.map((product, index) => (
          <div key={index}>
            {renderProductCard(product, false, index)}
          </div>
        ))}
      </div>

      {/* Product Selector Modal */}
      {showProductSelector !== null && (
        <ProductSelector index={showProductSelector} />
      )}
    </main>
  );
};

export default ProductComparison;
