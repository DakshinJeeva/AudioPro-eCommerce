import React, { useState, useEffect } from "react";
import { useAuth } from "../context/useAuth";
import { useNavigate } from "react-router-dom";
import { User, Mail, LogOut, ShieldCheck } from "lucide-react";
import { apiFetch } from "../utils/api";

export default function Profile() {
  const { user, login, logout } = useAuth();
  const navigate = useNavigate();

  const [phoneNumber, setPhoneNumber] = useState(() => {
    // Strip +91 prefix for display so user sees only local part
    const raw = user?.phoneNumber || "";
    if (raw.startsWith("+91")) return raw.slice(3);
    return raw;
  });
  const [code, setCode] = useState("");
  const [phoneStatus, setPhoneStatus] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const [addresses, setAddresses] = useState(user?.addresses || []);
  const [addrForm, setAddrForm] = useState({
    street: "",
    city: "",
    state: "",
    zipCode: "",
    country: "",
  });
  const [addrError, setAddrError] = useState("");
  const [addrStatus, setAddrStatus] = useState("");
  const [addrLoading, setAddrLoading] = useState(false);

  const refreshProfile = async () => {
    const token = localStorage.getItem("token");
    const profile = await apiFetch("/api/users/profile", { method: "GET" });
    if (token && login) {
      login(token, profile);
    } else {
      localStorage.setItem("user", JSON.stringify(profile));
    }
    setAddresses(profile.addresses || []);
  };

  // Ensure we always have the latest profile data (including addresses) when this page loads
  useEffect(() => {
    refreshProfile().catch((e) => {
      console.error("Failed to refresh profile on mount:", e);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSendCode = async () => {
    if (!phoneNumber) {
      setPhoneError("Please enter a phone number");
      return;
    }
    try {
      setPhoneError("");
      setPhoneStatus("");
      setSending(true);
      await apiFetch("/api/users/phone/start", {
        method: "POST",
        body: JSON.stringify({ phoneNumber }),
      });
      setPhoneStatus("Verification code sent to your phone");
    } catch (err) {
      setPhoneError(err.message || "Failed to send verification code");
    } finally {
      setSending(false);
    }
  };

  const handleAddressInputChange = (field, value) => {
    setAddrForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddAddress = async () => {
    const { street, city, state, zipCode, country } = addrForm;
    if (!street || !city || !state || !zipCode || !country) {
      setAddrError("Please fill in all address fields");
      return;
    }
    try {
      setAddrError("");
      setAddrStatus("");
      setAddrLoading(true);
      await apiFetch("/api/users/addresses", {
        method: "POST",
        body: JSON.stringify(addrForm),
      });
      setAddrForm({ street: "", city: "", state: "", zipCode: "", country: "" });
      setAddrStatus("Address added successfully");
      await refreshProfile();
    } catch (err) {
      setAddrError(err.message || "Failed to add address");
    } finally {
      setAddrLoading(false);
    }
  };

  const handleDeleteAddress = async (addressId) => {
    try {
      setAddrError("");
      setAddrStatus("");
      setAddrLoading(true);
      await apiFetch(`/api/users/addresses/${addressId}`, {
        method: "DELETE",
      });
      setAddrStatus("Address removed successfully");
      await refreshProfile();
    } catch (err) {
      setAddrError(err.message || "Failed to remove address");
    } finally {
      setAddrLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!code) {
      setPhoneError("Please enter the verification code");
      return;
    }
    try {
      setPhoneError("");
      setPhoneStatus("");
      setVerifying(true);
      await apiFetch("/api/users/phone/verify", {
        method: "POST",
        body: JSON.stringify({ code }),
      });
      setPhoneStatus("Phone number verified successfully");

      try {
        await refreshProfile();
      } catch (e){
        console.error("Failed to refresh profile:", e);
      }
    } catch (err) {
      setPhoneError(err.message || "Failed to verify code");
    } finally {
      setVerifying(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <User className="w-8 h-8 text-gray-400" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">You are not logged in</h2>
          <p className="text-gray-600">Please sign in to view your profile.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[60vh] bg-gradient-to-b from-gray-50 to-white py-12">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-black rounded-full flex items-center justify-center mx-auto mb-4">
            <User className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Profile</h1>
          <p className="text-gray-600">Manage your account information</p>
        </div>

        {/* Profile Card */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          {/* Info Section */}
          <div className="p-8 space-y-6">
            <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl">
              <div className="w-10 h-10 bg-black rounded-lg flex items-center justify-center flex-shrink-0">
                <User className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-500 mb-1">Full Name</p>
                <p className="text-lg font-semibold text-gray-900">{user.name}</p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl">
              <div className="w-10 h-10 bg-black rounded-lg flex items-center justify-center flex-shrink-0">
                <Mail className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-500 mb-1">Email Address</p>
                <p className="text-sm sm:text-lg font-semibold text-gray-900 break-words">
                  {user.email}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-4 p-4 bg-gray-50 rounded-xl">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                <div className="flex flex-col flex-1 gap-2">
                  <span className="text-sm font-medium text-gray-500 mb-1">Phone Number</span>
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-sm text-gray-700 select-none">
                      +91
                    </span>
                    <input
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      disabled={user.isPhoneVerified}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent text-sm disabled:bg-gray-100 disabled:text-gray-500"
                      placeholder="10-digit mobile number"
                    />
                  </div>
                </div>
                <div className="flex flex-row sm:flex-col items-center sm:items-end gap-2 sm:gap-2 mt-1 sm:mt-0">
                  {!user.isPhoneVerified && (
                    <button
                      type="button"
                      onClick={handleSendCode}
                      disabled={sending}
                      className="px-4 py-2 rounded-lg bg-black text-white text-sm font-medium hover:bg-gray-800 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {sending ? "Sending..." : "Send OTP"}
                    </button>
                  )}
                  {typeof user.isPhoneVerified === "boolean" && (
                    <span
                      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        user.isPhoneVerified
                          ? "bg-green-100 text-green-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {user.isPhoneVerified ? "Verified" : "Not verified"}
                    </span>
                  )}
                </div>
              </div>

              {!user.isPhoneVerified && (
                <>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    <input
                      type="text"
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent text-sm"
                      placeholder="Enter verification code"
                    />
                    <button
                      type="button"
                      onClick={handleVerifyCode}
                      disabled={verifying}
                      className="px-4 py-2 rounded-lg bg-black text-white text-sm font-medium hover:bg-gray-800 disabled:opacity-60 disabled:cursor-not-allowed w-full sm:w-auto"
                    >
                      {verifying ? "Verifying..." : "Verify"}
                    </button>
                  </div>

                  {(phoneStatus || phoneError) && (
                    <p
                      className={`text-xs ${
                        phoneError ? "text-red-600" : "text-green-600"
                      }`}
                    >
                      {phoneError || phoneStatus}
                    </p>
                  )}
                </>
              )}
            </div>

            {/* Addresses Section */}
            <div className="flex flex-col gap-3 p-4 bg-gray-50 rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-medium text-gray-700">Addresses</h2>
                {addrLoading && (
                  <span className="text-xs text-gray-500">Saving...</span>
                )}
              </div>

              {(!addresses || addresses.length === 0) && (
                <p className="text-sm text-gray-500">No addresses added yet.</p>
              )}

              {addresses && addresses.length > 0 && (
                <div className="space-y-2">
                  {addresses.map((addr) => (
                    <div
                      key={addr._id}
                      className="flex items-start justify-between gap-3 p-3 border border-gray-200 rounded-lg"
                    >
                      <div className="text-sm text-gray-800">
                        <p className="font-medium">{addr.street}</p>
                        <p className="text-gray-600">
                          {addr.city}, {addr.state} {addr.zipCode}
                        </p>
                        <p className="text-gray-500 text-xs">{addr.country}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteAddress(addr._id)}
                        disabled={addrLoading}
                        className="text-xs text-red-600 hover:text-red-700 font-medium"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="pt-3 mt-2 border-t border-gray-200">
                <p className="text-xs font-medium text-gray-600 mb-2">
                  Add new address
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                  <input
                    type="text"
                    value={addrForm.street}
                    onChange={(e) => handleAddressInputChange("street", e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                    placeholder="Street"
                  />
                  <input
                    type="text"
                    value={addrForm.city}
                    onChange={(e) => handleAddressInputChange("city", e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                    placeholder="City"
                  />
                  <input
                    type="text"
                    value={addrForm.state}
                    onChange={(e) => handleAddressInputChange("state", e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                    placeholder="State"
                  />
                  <input
                    type="text"
                    value={addrForm.zipCode}
                    onChange={(e) => handleAddressInputChange("zipCode", e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                    placeholder="ZIP / Postal code"
                  />
                  <input
                    type="text"
                    value={addrForm.country}
                    onChange={(e) => handleAddressInputChange("country", e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent sm:col-span-2"
                    placeholder="Country"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleAddAddress}
                  disabled={addrLoading}
                  className="px-4 py-2 rounded-lg bg-black text-white text-sm font-medium hover:bg-gray-800 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  Add Address
                </button>

                {(addrStatus || addrError) && (
                  <p
                    className={`mt-2 text-xs ${
                      addrError ? "text-red-600" : "text-green-600"
                    }`}
                  >
                    {addrError || addrStatus}
                  </p>
                )}
              </div>
            </div>

            {user.isAdmin && (
              <div className="flex items-start gap-4 p-4 bg-blue-50 rounded-xl border border-blue-100">
                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                  <ShieldCheck className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-blue-600 mb-1">Account Type</p>
                  <p className="text-lg font-semibold text-blue-900">Administrator</p>
                </div>
              </div>
            )}
          </div>

          {/* Actions Section */}
          <div className="px-8 py-6 bg-gray-50 border-t border-gray-100">
            <button
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-black text-white font-medium hover:bg-gray-800 transition-all duration-200 shadow-md hover:shadow-lg"
              onClick={() => {
                logout();
                navigate("/");
              }}
            >
              <LogOut className="w-5 h-5" />
              <span>Log out</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
