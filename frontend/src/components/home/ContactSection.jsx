import React, { useState } from "react";
import { apiFetch } from "../../utils/api";

const ContactSection = () => {
  const [submitting, setSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [statusType, setStatusType] = useState("success"); // 'success' | 'error'

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatusMessage("");
    setStatusType("success");

    const formData = new FormData(e.target);
    const name = formData.get("name") || "";
    const email = formData.get("email") || "";
    const message = formData.get("message") || "";

    if (!email || !message) {
      setStatusType("error");
      setStatusMessage("Please enter your email and a message.");
      return;
    }

    try {
      setSubmitting(true);
      await apiFetch("/api/contact", {
        method: "POST",
        body: JSON.stringify({ name, email, message }),
      });

      setStatusType("success");
      setStatusMessage("Message sent successfully. We'll get back to you soon.");
      e.target.reset();
    } catch (err) {
      setStatusType("error");
      setStatusMessage(err.message || "Failed to send message. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section
      id="contact"
      className="py-16 sm:py-20 bg-gradient-to-br from-gray-50 via-white to-gray-50 border-t border-gray-200"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:gap-14 md:grid-cols-2 items-start">
          {/* Text / Info */}
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black text-white text-xs font-medium mb-4">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-400" />
              We usually reply within a few hours
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
              Need help with your order?
            </h2>
            <p className="text-gray-600 mb-6">
              Reach out to us for product recommendations, order support, or any
              questions about your audio setup.
            </p>

            <div className="space-y-4 text-sm sm:text-base text-gray-700">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400 mb-1">
                  Email
                </p>
                <p className="font-medium">arudioPro@gmail.com</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400 mb-1">
                  Phone
                </p>
                <p className="font-medium">+91-8668126410</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400 mb-1">
                  Store address
                </p>
                <p className="font-medium">
                  12/38,TMS NAGAR,2ND STREET,
                  <br />
                  TIRUPUR-641607,TAMILNADU
                </p>
              </div>
            </div>
          </div>

          {/* Form */}
          <form
            onSubmit={handleSubmit}
            className="bg-white/80 backdrop-blur rounded-2xl p-6 sm:p-8 space-y-5 shadow-lg border border-gray-100"
          >
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-800">Name</label>
              <input
                type="text"
                name="name"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-black bg-white"
                placeholder="Your name"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-800">Email</label>
              <input
                type="email"
                name="email"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-black bg-white"
                placeholder="you@example.com"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-800">Message</label>
              <textarea
                rows={4}
                name="message"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-black bg-white resize-none"
                placeholder="Tell us what you need help with..."
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-black text-white py-3 rounded-xl font-medium hover:bg-gray-800 transition shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting ? "Sending..." : "Send Message"}
            </button>
            {statusMessage && (
              <p
                className={`text-sm mt-1 ${
                  statusType === "success" ? "text-emerald-600" : "text-red-600"
                }`}
              >
                {statusMessage}
              </p>
            )}
          </form>
        </div>
      </div>
    </section>
  );
};

export default ContactSection;
