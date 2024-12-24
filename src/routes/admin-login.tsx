import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/auth-context";
import { supabase } from "@/lib/supabaseClient";

export default function AdminLogin() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSignUp, setIsSignUp] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    password: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSignUp = async () => {
    try {
      // Then sign up the user with auth
      const { error: authError } = await supabase.auth.signUp({
        phone: formData.phone,
        password: formData.password,
        options: {
          data: {
            user_role: "admin",
          },
        },
      });

      if (authError) throw authError;

      setError(
        "Admin account created. Please check your phone for verification.",
      );
      setIsSignUp(false);
    } catch (error) {
      console.error("Signup failed:", error);
      setError("Failed to create admin account. Please try again.");
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (isSignUp) {
        await handleSignUp();
      } else {
        await login(formData.phone, formData.password, "admin");
        navigate("/admin/schedules");
      }
    } catch (error) {
      console.error("Login failed:", error);
      setError(
        isSignUp
          ? "Failed to create admin account"
          : "Invalid credentials or not an admin user",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-full w-full flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold">
            Admin {isSignUp ? "Sign Up" : "Login"}
          </h1>
          <p className="text-gray-500">
            {isSignUp
              ? "Create a new admin account"
              : "Enter your credentials to continue"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUp && (
            <div className="space-y-2">
              <Input
                name="name"
                type="text"
                placeholder="Full Name"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>
          )}

          <div className="space-y-2">
            <Input
              name="phone"
              type="tel"
              placeholder="Phone number"
              value={formData.phone}
              onChange={handleChange}
              required
              minLength={10}
            />
          </div>

          <div className="space-y-2">
            <Input
              name="password"
              type="password"
              placeholder="Password"
              value={formData.password}
              onChange={handleChange}
              required
              minLength={6}
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : isSignUp ? (
              "Sign Up"
            ) : (
              "Login"
            )}
          </Button>

          <div className="text-center">
            <button
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-sm text-primary hover:underline"
            >
              {isSignUp
                ? "Already have an account? Login"
                : "Need an account? Sign Up"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
