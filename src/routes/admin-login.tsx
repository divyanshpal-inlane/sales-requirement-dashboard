import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth, supabaseAdmin } from "@/context/auth-context";

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

      // First, find the actual phone format stored in Supabase auth
      // by looking up the user via the admin API
      const { data: usersData } =
        await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });

      const matchUser = usersData?.users?.find((u) => {
        if (!u.phone) return false;
        const uDigits = u.phone.replace(/\D/g, "");
        return (
          uDigits === rawDigits ||
          uDigits === withoutCountry ||
          uDigits.endsWith(withoutCountry) ||
          withoutCountry.endsWith(uDigits.replace(/^91/, ""))
        );
      });

      if (!matchUser?.phone) {
        throw new Error("No account found with this phone number");
      }

      // Login with the exact phone format from auth
      await login(matchUser.phone, formData.password, "admin");
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
