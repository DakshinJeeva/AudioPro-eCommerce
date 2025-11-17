import React from "react";

const Contact = () => {
  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 py-10">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">Contact Us</h1>
        <p className="text-gray-600 mb-8">
          Have questions about products, orders, or anything else? Reach out and well get back to you as soon as possible.
        </p>
        <div className="space-y-6 bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Email</h2>
            <p className="text-gray-600 text-sm sm:text-base">support@example.com</p>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Phone</h2>
            <p className="text-gray-600 text-sm sm:text-base">+91-00000 00000</p>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Address</h2>
            <p className="text-gray-600 text-sm sm:text-base">
              AudioPro Store<br />
              123, Sample Street<br />
              Your City, Your Country
            </p>
          </div>
        </div>
      </div>
    </main>
  );
};

export default Contact;
