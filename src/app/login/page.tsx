"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../contexts/AuthContext";
import Image from "next/image";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const { login, isAuthenticated, loading } = useAuth();

  // Redirect to main page if already authenticated
  useEffect(() => {
    if (!loading && isAuthenticated) {
      router.push("/");
    }
  }, [isAuthenticated, loading, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const success = await login(username, password);
      if (!success) {
        setError("Invalid username or password");
      }
    } catch (err) {
      setError("Login failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleLogin(e);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="flex w-full justify-evenly shadow-none">
        {/* Left: Login Form */}
        <div className="flex flex-col justify-center w-full max-w-md px-8 py-12">
          {/* Logo for small screens */}
          <div className="flex justify-center mb-20 md:hidden">
            <Image
              src="/codelink.png"
              alt="Codelink Logo"
              width={150}
              height={60}
            />
          </div>
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Sign In</h2>
          </div>
          <form onSubmit={handleLogin} className="space-y-6">
            {/* Email Field */}
            <div>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onKeyPress={handleKeyPress}
                className="block w-full px-4 py-3 border border-slate-200 rounded-md focus:ring-2 focus:ring-orange-100 focus:border-orange-500 transition-all duration-200 text-slate-800 placeholder-slate-400"
                placeholder="Username"
                required
                disabled={isLoading}
              />
            </div>
            {/* Password Field */}
            <div className="relative">
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyPress={handleKeyPress}
                className="block w-full px-4 py-3 border border-slate-200 rounded-md focus:ring-2 focus:ring-orange-100 focus:border-orange-500 transition-all duration-200 text-slate-800 placeholder-slate-400 pr-10"
                placeholder="Password"
                required
                disabled={isLoading}
              />
              <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 cursor-pointer">
                {/* Eye icon (password visibility toggle, not functional) */}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                </svg>
              </span>
            </div>
            {/* Remember me & Forgot Password */}
            <div className="flex items-center justify-between text-xs mb-2">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  className="form-checkbox rounded border-slate-300"
                />
                <span className="text-slate-500">Remember me</span>
              </label>
              <a href="#" className="text-orange-500 hover:underline">
                Forgot Password ?
              </a>
            </div>
            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-2">
                <div className="flex items-center">
                  <svg
                    className="w-4 h-4 text-red-500 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                    />
                  </svg>
                  <p className="text-xs font-medium text-red-700">{error}</p>
                </div>
              </div>
            )}
            {/* Login Button */}
            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-3 px-6 rounded-md font-bold text-base transition-all duration-300 ${
                isLoading
                  ? "bg-orange-200 text-slate-500 cursor-not-allowed"
                  : "bg-orange-500 text-white hover:bg-orange-600 shadow-md"
              }`}
            >
              {isLoading ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Signing in...</span>
                </div>
              ) : (
                "Sign In"
              )}
            </button>
          </form>
        </div>
        {/* Right: Image and Logo */}
        <div className="hidden md:flex flex-col items-center justify-center w-full max-w-xl">
          <div className="flex flex-col items-center">
            <Image
              src="/codelink.png"
              alt="Codelink Logo"
              width={300}
              height={80}
              className="mb-6"
            />
            <Image
              src="/sign_in.png"
              alt="Sign In Illustration"
              width={400}
              height={300}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
