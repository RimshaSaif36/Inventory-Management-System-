"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAppDispatch } from "@/app/redux";
import { setUser } from "@/state/userSlice";
import { login, resetPassword } from "@/lib/authService";
import { apiClient } from "@/lib/apiClient";
import { Eye, EyeOff } from "lucide-react";

const LoginPage = () => {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showReset, setShowReset] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { data, error: authError } = await login(email, password);
      if (authError) {
        setError(authError.message || "Login failed");
        setLoading(false);
      } else if (data.user && data.session) {
        // Successful auth with Supabase
        try {
          const userData = {
            id: data.user.id,
            email: data.user.email || email,
            name: data.user.user_metadata?.name || "",
            role: data.user.user_metadata?.role?.toUpperCase() || "ACCOUNTANT",
            storeId: data.user.user_metadata?.storeId || "",
          };
          
          dispatch(setUser(userData));
          
          // Redirect to dashboard after successful login
          router.push("/dashboard");
        } catch (err: any) {
          console.error("Failed to process login:", err);
          setError("Failed to process login");
          setLoading(false);
        }
      } else {
        setError("Login failed");
        setLoading(false);
      }
    } catch (err: any) {
      setError(err?.message || "Login failed");
      setLoading(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetMessage(null);
    try {
      const { data, error } = await resetPassword(resetEmail);
      if (error) {
        setResetMessage(error.message || "Failed to send reset email");
      } else {
        setResetMessage("Password reset email sent. Check your inbox.");
      }
    } catch (err: any) {
      setResetMessage(err?.message || "Failed to send reset email");
    }
  };

  return (
    <div className="w-full min-h-screen flex items-center justify-center bg-white">
      <div className="w-full max-w-md p-8">
        <h1 className="text-center text-2xl font-semibold mb-6">Inventory</h1>
        <h2 className="text-center text-xl text-gray-600 mb-6">Management</h2>

        {!showReset ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border rounded px-3 py-2"
                autoComplete="email"
                required
              />
            </div>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border rounded px-3 py-2 pr-10"
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            {error && <div className="text-red-600">{error}</div>}
            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-2 rounded mt-2"
              disabled={loading}
            >
              {loading ? "Logging in..." : "Login"}
            </button>

            <div className="text-center mt-3">
              <button
                type="button"
                className="text-sm text-blue-600 underline"
                onClick={() => setShowReset(true)}
              >
                Forgot password?
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleReset} className="space-y-4">
            <div>
              <input
                type="email"
                placeholder="Enter your email"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                className="w-full border rounded px-3 py-2"
                required
              />
            </div>
            {resetMessage && <div className="text-sm text-green-600">{resetMessage}</div>}
            <div className="flex gap-2">
              <button className="flex-1 bg-blue-600 text-white py-2 rounded" type="submit">Send reset email</button>
              <button
                type="button"
                className="flex-1 border rounded py-2"
                onClick={() => setShowReset(false)}
              >
                Back
              </button>
            </div>
          </form>
        )}

        <div className="text-center text-xs text-gray-400 mt-6">© 2020-2026 ER YAN YAO</div>
      </div>
    </div>
  );
};

export default LoginPage;
