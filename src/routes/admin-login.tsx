import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/auth-context";

export default function AdminLogin() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const rawDigits = formData.phone.replace(/\D/g, "");
      const withoutCountry = rawDigits.replace(/^91/, "");

      // Try common phone formats directly via signInWithPassword
      const phoneVariants = [
        `+91${withoutCountry}`,
        withoutCountry,
        rawDigits,
      ];

      let loginSuccess = false;
      for (const phone of phoneVariants) {
        try {
          await login(phone, formData.password, "admin");
          loginSuccess = true;
          break;
        } catch {
          // Try next variant
        }
      }

      if (!loginSuccess) {
        throw new Error("Invalid phone number or password");
      }

      navigate("/admin");
    } catch (error) {
      console.error("Login failed:", error);
      setError(
        error instanceof Error
          ? error.message
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
          <h1 className="text-2xl font-bold">Admin Login</h1>
          <p className="text-gray-500">Enter your credentials to continue</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
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
            ) : (
              "Login"
            )}
          </Button>
        </form>

        <p className="text-center text-sm text-gray-500">
          Contact Super Admin to get access
        </p>
      </div>
    </div>
  );
}
