import React, { useState, useEffect } from "react";
import { apiFetch, API_BASE } from "../utils/api";
import { Trash2 } from "lucide-react";

const AdminDashboard = () => {
  const [view, setView] = useState("products"); // 'products', 'orders', or 'stocks'
  const [form, setForm] = useState({
    name: "",
    category: "",
    price: "",
    color: "",
    description: "",
    stock: "",
    featured: false,
  });
  const [primaryImageFile, setPrimaryImageFile] = useState(null);
  const [additionalImageFiles, setAdditionalImageFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [exportStart, setExportStart] = useState("");
  const [exportEnd, setExportEnd] = useState("");
  const [exporting, setExporting] = useState(false);
  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [stockUpdates, setStockUpdates] = useState({}); // { productId: newStock }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const fieldValue = type === "checkbox" ? checked : value;
    setForm((prev) => ({
      ...prev,
      [name]: fieldValue,
    }));
  };

  const handleExportOrders = async () => {
    try {
      setExporting(true);

      const params = new URLSearchParams();
      if (exportStart) params.append("start", exportStart);
      if (exportEnd) params.append("end", exportEnd);

      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/api/orders/export?${params.toString()}`, {
        method: "GET",
        headers: {
          Authorization: token ? `Bearer ${token}` : "",
        },
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || res.statusText);
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `orders_export_${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert(err.message || "Failed to export orders");
    } finally {
      setExporting(false);
    }
  };

  const handlePrimaryImageChange = (e) => {
    const file = e.target.files && e.target.files[0];
    setPrimaryImageFile(file || null);
  };

  const handleAdditionalImagesChange = (e) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    setAdditionalImageFiles(files);
  };

  useEffect(() => {
    if (view === "orders") {
      fetchOrders();
    } else if (view === "stocks") {
      fetchProducts();
    }
  }, [view]);

  const fetchOrders = async () => {
    setOrdersLoading(true);
    try {
      const data = await apiFetch("/api/orders/all");
      setOrders(data || []);
    } catch (err) {
      console.error("Failed to fetch orders:", err);
      alert(err.message || "Failed to fetch orders");
    }
    setOrdersLoading(false);
  };

  const fetchProducts = async () => {
    setProductsLoading(true);
    try {
      const data = await apiFetch("/api/product/admin/all");
      setProducts(data || []);
      // Initialize stock updates with current stock values
      const updates = {};
      data.forEach(product => {
        updates[product._id] = product.stock || 0;
      });
      setStockUpdates(updates);
    } catch (err) {
      console.error("Failed to fetch products:", err);
      alert(err.message || "Failed to fetch products");
    }
    setProductsLoading(false);
  };

  const handleStockUpdate = async (productId) => {
    const newStock = stockUpdates[productId];
    if (newStock === undefined || newStock < 0) {
      alert("Stock must be a non-negative number");
      return;
    }

    try {
      await apiFetch(`/api/product/${productId}/stock`, {
        method: "PUT",
        body: JSON.stringify({ stock: newStock }),
      });
      alert("Stock updated successfully!");
      fetchProducts(); // Refresh products
    } catch (err) {
      alert(err.message || "Failed to update stock");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const formData = new FormData();
      formData.append("name", form.name);
      formData.append("category", form.category);
      formData.append("price", form.price);
      formData.append("color", form.color);
      formData.append("description", form.description);
      formData.append("stock", form.stock);
      formData.append("featured", form.featured);

      if (primaryImageFile) {
        formData.append("images", primaryImageFile);
      }
      additionalImageFiles.forEach((file) => {
        formData.append("images", file);
      });

      const _data = await apiFetch("/api/product", {
        method: "POST",
        body: formData,
      });
      setMessage("Product added successfully!");
      setForm({ name: "", category: "", price: "", color: "", description: "", stock: "", featured: false });
      setPrimaryImageFile(null);
      setAdditionalImageFiles([]);
      // Refresh stocks view if it's open
      if (view === "stocks") {
        fetchProducts();
      }
    } catch (err) {
      setMessage(err.message || "Error adding product");
    }

    setLoading(false);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: "bg-yellow-100 text-yellow-800",
      processing: "bg-blue-100 text-blue-800",
      shipped: "bg-purple-100 text-purple-800",
      delivered: "bg-green-100 text-green-800",
      cancelled: "bg-red-100 text-red-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  return (
    <div className="max-w-7xl mx-auto mt-10 p-6">
      {/* Toggle Buttons */}
      <div className="flex gap-4 mb-6 border-b">
        <button
          onClick={() => setView("products")}
          className={`px-6 py-2 font-semibold ${
            view === "products"
              ? "border-b-2 border-black text-black"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Add Product
        </button>
        <button
          onClick={() => setView("orders")}
          className={`px-6 py-2 font-semibold ${
            view === "orders"
              ? "border-b-2 border-black text-black"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          View Orders
        </button>
        <button
          onClick={() => setView("stocks")}
          className={`px-6 py-2 font-semibold ${
            view === "stocks"
              ? "border-b-2 border-black text-black"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Update Stocks
        </button>
      </div>

      {view === "products" ? (
        <div className="max-w-3xl mx-auto bg-white shadow rounded p-6">
          <h2 className="text-2xl font-bold mb-6">Add New Product</h2>
          {message && <p className="mb-4 text-green-600">{message}</p>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              name="name"
              placeholder="Name"
              value={form.name}
              onChange={handleChange}
              className="w-full border px-4 py-2 rounded"
            />
            <select
              name="category"
              value={form.category}
              onChange={handleChange}
              className="w-full border px-4 py-2 rounded bg-white"
            >
              <option value="">Select Category</option>
              <option value="Headphones & Earphones">
                Headphones & Earphones (wired, wireless, Bluetooth, TWS)
              </option>
              <option value="Studio Monitors & Professional Audio Speakers">
                Studio Monitors & Professional Audio Speakers
              </option>
              <option value="Home Audio Systems, Music Systems & HiFi Audio Equipment">
                Home Audio Systems, Music Systems & HiFi Audio Equipment
              </option>
              <option value="Audio Cables, earbuds & Accessories">
                Audio Cables, earbuds & Accessories
              </option>
            </select>
            <input name="price" placeholder="Price" type="number" value={form.price} onChange={handleChange} className="w-full border px-4 py-2 rounded" />
            <label className="block text-sm font-semibold text-gray-700">Primary Image</label>
            <input
              type="file"
              accept="image/*"
              onChange={handlePrimaryImageChange}
              className="w-full border px-4 py-2 rounded"
            />
            <label className="block text-sm font-semibold text-gray-700">Additional Images</label>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleAdditionalImagesChange}
              className="w-full border px-4 py-2 rounded"
            />
            <input name="color" placeholder="Color (e.g., bg-blue-100)" value={form.color} onChange={handleChange} className="w-full border px-4 py-2 rounded" />
            <input name="description" placeholder="Description" value={form.description} onChange={handleChange} className="w-full border px-4 py-2 rounded" />
            <input name="stock" placeholder="Stock" type="number" value={form.stock} onChange={handleChange} className="w-full border px-4 py-2 rounded" />
            <label className="inline-flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                name="featured"
                checked={form.featured}
                onChange={handleChange}
                className="h-4 w-4 border-gray-300 rounded"
              />
              <span>Featured product (show in Featured section)</span>
            </label>
            <button type="submit" disabled={loading} className="bg-black text-white px-6 py-2 rounded">
              {loading ? "Adding..." : "Add Product"}
            </button>
          </form>
        </div>
      ) : view === "orders" ? (
        <div className="bg-white shadow rounded p-6">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
            <div>
              <h2 className="text-2xl font-bold">All Orders</h2>
              <p className="text-sm text-gray-500 mt-1">Filter and export orders as CSV by date range.</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-end">
              <div className="flex flex-col text-xs sm:text-sm">
                <label className="mb-1 text-gray-600">Start date</label>
                <input
                  type="date"
                  value={exportStart}
                  onChange={(e) => setExportStart(e.target.value)}
                  className="border rounded px-3 py-2 text-sm"
                />
              </div>
              <div className="flex flex-col text-xs sm:text-sm">
                <label className="mb-1 text-gray-600">End date</label>
                <input
                  type="date"
                  value={exportEnd}
                  onChange={(e) => setExportEnd(e.target.value)}
                  className="border rounded px-3 py-2 text-sm"
                />
              </div>
              <button
                type="button"
                onClick={handleExportOrders}
                disabled={exporting}
                className="bg-black text-white px-4 py-2 rounded text-sm mt-1 sm:mt-0 hover:bg-gray-800 disabled:opacity-60 disabled:cursor-not-allowed"
             >
                {exporting ? "Exporting..." : "Export CSV"}
              </button>
            </div>
          </div>
          {ordersLoading ? (
            <p className="text-center py-10">Loading orders...</p>
          ) : orders.length === 0 ? (
            <p className="text-center text-gray-500 py-10">No orders yet.</p>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => (
                <div key={order._id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-semibold text-lg">
                        Order #{order._id.slice(-8).toUpperCase()}
                      </h3>
                      <p className="text-sm text-gray-600">
                        Customer: {order.user?.name || "Unknown"} ({order.user?.email || "N/A"})
                      </p>
                      <p className="text-sm text-gray-500">{formatDate(order.createdAt)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold">₹{order.totalAmount}</p>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(order.orderStatus)}`}>
                        {order.orderStatus.charAt(0).toUpperCase() + order.orderStatus.slice(1)}
                      </span>
                    </div>
                  </div>

                  <div className="mb-3">
                    <h4 className="font-semibold mb-2">Items:</h4>
                    <div className="space-y-1">
                      {order.items.map((item, index) => (
                        <div key={index} className="flex justify-between text-sm p-2 bg-gray-50 rounded">
                          <span>
                            {item.product?.name || "Unknown Product"} × {item.quantity}
                          </span>
                          <span className="font-medium">₹{item.quantity * item.price}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="border-t pt-3 mb-3">
                    <p className="text-sm text-gray-600">
                      <span className="font-semibold">Address:</span> {order.address.street}, {order.address.city}, {order.address.state} {order.address.zipCode}, {order.address.country}
                    </p>
                  </div>

                  {/* Status Update */}
                  <div className="border-t pt-3">
                    <label className="block text-sm font-semibold mb-2">Update Status:</label>
                    <select
                      value={order.orderStatus}
                      onChange={async (e) => {
                        try {
                          await apiFetch(`/api/orders/${order._id}/status`, {
                            method: "PUT",
                            body: JSON.stringify({ orderStatus: e.target.value }),
                          });
                          fetchOrders(); // Refresh orders
                          // If stock view is open, refresh products to show updated stock
                          if (view === "stocks") {
                            fetchProducts();
                          }
                        } catch (err) {
                          alert(err.message || "Failed to update status");
                        }
                      }}
                      className="border rounded px-3 py-2 text-sm"
                    >
                      <option value="processing">Processing</option>
                      <option value="shipped">Shipped</option>
                      <option value="delivered">Delivered</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : view === "stocks" ? (
        <div className="bg-white shadow rounded p-4 sm:p-6">
          <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6">Stock Management</h2>
          {productsLoading ? (
            <p className="text-center py-10">Loading products...</p>
          ) : products.length === 0 ? (
            <p className="text-center text-gray-500 py-10">No products found.</p>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {products.map((product) => (
                <div key={product._id} className="border rounded-lg p-3 sm:p-4 relative">
                  <button
                    type="button"
                    onClick={async () => {
                      if (!window.confirm("Are you sure you want to delete this product?")) return;
                      try {
                        await apiFetch(`/api/product/${product._id}`, {
                          method: "DELETE",
                        });
                        fetchProducts();
                      } catch (err) {
                        alert(err.message || "Failed to delete product");
                      }
                    }}
                    className="absolute top-2 right-2 p-1 rounded-full bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 transition-colors"
                    aria-label="Delete product"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                    <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                      <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-100 rounded flex items-center justify-center overflow-hidden">
                        {product.image ? (
                          <img
                            src={product.image.startsWith("http") ? product.image : `${API_BASE}${product.image}`}
                            alt={product.name}
                            className="max-h-full w-auto object-contain"
                          />
                        ) : (
                          <span className="text-2xl text-gray-400">❓</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-base sm:text-lg truncate">{product.name}</h3>
                        <p className="text-xs sm:text-sm text-gray-500 truncate">{product.category}</p>
                        <p className="text-xs sm:text-sm text-gray-600 mt-1">
                          Current Stock: {" "}
                          <span
                            className={`font-bold ${
                              product.stock === 0 ? "text-red-600" : "text-green-600"
                            }`}
                          >
                            {product.stock}
                          </span>
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
                      <input
                        type="number"
                        min="0"
                        value={stockUpdates[product._id] ?? product.stock}
                        onChange={(e) => {
                          setStockUpdates({
                            ...stockUpdates,
                            [product._id]: parseInt(e.target.value) || 0,
                          });
                        }}
                        className="w-24 border rounded px-3 py-2 text-sm flex-shrink-0"
                        placeholder="Stock"
                      />
                      <button
                        onClick={() => handleStockUpdate(product._id)}
                        className="bg-black text-white px-4 py-2 rounded hover:bg-gray-800 transition text-sm w-full sm:w-auto text-center"
                      >
                        Update
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
};

export default AdminDashboard;
