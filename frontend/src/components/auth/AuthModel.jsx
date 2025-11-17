import React, { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { apiFetch } from "../../utils/api";
import { useAuth } from "../../context/useAuth";

const AuthModal = ({ open, onClose, onAuthSuccess }) => {
  const [tab, setTab] = useState("signin");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [showForgot, setShowForgot] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuth();

  if (!open) return null;

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

const handleSubmit = async (e) => {
  e.preventDefault();
  setLoading(true);
  setMessage("");
  setMessageType("");

  try {
    let data;

    if (showForgot) {
      // Forgot Password API
      data = await apiFetch("/api/password/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email: form.email }),
      });
    } else if (tab === "signin") {
      // Login API
      data = await apiFetch("/api/users/login", {
        method: "POST",
        body: JSON.stringify({
          email: form.email,
          password: form.password,
        }),
      });
    } else {
      // Register API
      data = await apiFetch("/api/users/register", {
        method: "POST",
        body: JSON.stringify(form),
      });
    }

    // ✅ Handle different actions
    if (showForgot) {
      setMessage("Password reset link sent to your email!");
      setMessageType("success");
      if (onAuthSuccess) {
        onAuthSuccess("Password reset link sent to your email!", "success");
      }
    } else if (tab === "signin") {
      if (data?.token && (data.user?.isEmailVerified || data.isEmailVerified)) {
        login(
          data.token,
          data.user || { name: form.email.split("@")[0], email: form.email }
        );
        setMessage("Logged in successfully!");
        setMessageType("success");
        if (onAuthSuccess) {
          onAuthSuccess("Logged in successfully!", "success");
        }
        onClose();
      } else {
        const msg = data?.message || "Please verify your email before logging in.";
        setMessage(msg);
        setMessageType("error");
        if (onAuthSuccess) {
          onAuthSuccess(msg, "error");
        }
      }
    } else {
      setMessage("Account created successfully! Check your email to verify.");
      setMessageType("success");
      if (onAuthSuccess) {
        onAuthSuccess("Account created successfully! Check your email to verify.", "success");
      }
    }
  } catch (err) {
    setMessage(err.message || "Something went wrong");
    setMessageType("error");
  } finally {
    setLoading(false);
  }
};



  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-gray-100 p-6 md:p-7 relative z-10">
        {/* Header */}
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-xl font-semibold text-gray-900">
            {showForgot
              ? "Forgot Password"
              : tab === "signin"
              ? "Sign In"
              : "Sign Up"}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-gray-500 hover:text-black hover:bg-gray-100 transition"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        {!showForgot && (
          <div className="flex mb-5 border border-gray-200 rounded-xl overflow-hidden">
            <button
              onClick={() => setTab("signin")}
              className={`flex-1 py-2.5 text-sm ${
                tab === "signin"
                  ? "bg-black text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => setTab("signup")}
              className={`flex-1 py-2.5 text-sm ${
                tab === "signup"
                  ? "bg-black text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              Sign Up
            </button>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {tab === "signup" && !showForgot && (
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={onChange}
              placeholder="Full Name"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black"
            />
          )}

          {/* Email Field */}
          <input
            type="email"
            name="email"
            value={form.email}
            onChange={onChange}
            placeholder="Email"
            className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black"
          />

          {/* Password Field (Hidden for Forgot Password) */}
{!showForgot && (tab === "signin" || tab === "signup") && (
  <div className="relative">
    <input
      type={showPassword ? "text" : "password"}
      name="password"
      value={form.password}
      onChange={onChange}
      placeholder="Password"
      className="w-full px-4 py-2.5 pr-10 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black"
    />
    <button
      type="button"
      onClick={() => setShowPassword(!showPassword)}
      className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 bg-transparent"
      tabIndex={-1} // optional: prevents focus box from showing at all
    >
      {showPassword ? (
        <EyeOff className="w-4 h-4" />
      ) : (
        <Eye className="w-4 h-4" />
      )}
    </button>
  </div>
)}


          {/* Forgot Password Link */}
          {!showForgot && tab === "signin" && (
            <div className="flex justify-end mb-4">
            <button
              type="button"
              onClick={() => setShowForgot(true)}
              className="text-sm text-gray-500 hover:text-black"
            >
              Forgot password?
            </button>
          </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-black text-white py-2.5 text-sm rounded-xl font-medium hover:bg-gray-800 transition disabled:bg-gray-400"
          >
            {loading
              ? "Processing..."
              : showForgot
              ? "Send Reset Link"
              : tab === "signin"
              ? "Sign In"
              : "Create Account"}
          </button>

          {/* Message */}
          {message && (
            <p
              className={`text-xs text-center rounded-xl px-3 py-2 border bg-gray-50 ${
                messageType === "success"
                  ? "text-green-700 border-green-200"
                  : messageType === "error"
                  ? "text-red-700 border-red-200"
                  : "text-gray-700 border-gray-200"
              }`}
            >
              {message}
            </p>
          )}
        </form>

        {/* Footer */}
        {!showForgot && (
          <div className="text-center text-xs text-gray-600 mt-4">
            {tab === "signin" ? (
              <>
                Don’t have an account?{" "}
                <button
                  type="button"
                  onClick={() => setTab("signup")}
                  className="text-black font-medium hover:underline"
                >
                  Sign up
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => setTab("signin")}
                  className="text-black font-medium hover:underline"
                >
                  Sign in
                </button>
              </>
            )}
          </div>
        )}

        {/* Back for Forgot Password */}
        {showForgot && (
          <div className="text-center text-xs text-gray-600 mt-3">
            <button
              type="button"
              onClick={() => setShowForgot(false)}
              className="text-black font-medium hover:underline"
            >
              ← Back to Sign In
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuthModal;
