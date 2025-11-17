import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { apiFetch } from "../utils/api";
import { useAuth } from "../context/useAuth";

const VerifyEmail = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const { login } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const verifyEmailToken = async () => {
      if (!token) {
        setError("Invalid verification token");
        setLoading(false);
        return;
      }

      try {
        const data = await apiFetch(`/api/users/verify-email/${token}`, {
          method: "GET",
        });

        setSuccess(true);
        
        // Auto login after verification
        if (data.token) {
          localStorage.setItem("token", data.token);
          login(data.token, { 
            name: data.user.name, 
            email: data.user.email 
          });
          
          // Redirect to home after 3 seconds
          setTimeout(() => {
            navigate("/");
          }, 3000);
        }
      } catch (err) {
        setError(err.message || "Failed to verify email");
      } finally {
        setLoading(false);
      }
    };

    verifyEmailToken();
  }, [token, navigate, login]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-50 to-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
        <div className="text-center">
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-16 w-16 border-2 border-gray-200 border-b-black mx-auto mb-4"></div>
              <h2 className="text-2xl font-bold text-gray-900">Verifying your email...</h2>
              <p className="mt-2 text-gray-600">Please wait while we verify your email address.</p>
            </>
          ) : success ? (
            <>
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
                <svg
                  className="h-8 w-8 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Email Verified!</h2>
              <p className="mt-2 text-gray-600">
                Your email has been successfully verified. You will be redirected to the home page shortly.
              </p>
              <Link
                to="/"
                className="mt-4 inline-block text-blue-600 hover:text-blue-800 underline"
              >
                Go to Home Page
              </Link>
            </>
          ) : (
            <>
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4">
                <svg
                  className="h-8 w-8 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Verification Failed</h2>
              <p className="mt-2 text-red-600">{error}</p>
              <div className="mt-4 space-y-2">
                <p className="text-gray-600">
                  The verification link may have expired or is invalid.
                </p>
                <Link
                  to="/"
                  className="inline-block text-blue-600 hover:text-blue-800 underline"
                >
                  Go to Home Page
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;

