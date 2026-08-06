import { User } from "@supabase/supabase-js";
import { createClient } from "@supabase/supabase-js";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { triggerShadowAuth } from "@/utils/shadowAuth";
import { isFeatureEnabled } from "@/services/featureFlagService";
import { isGoAuthUser } from "@/constants/goAuthUsers";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL!;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY!;
const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY!;
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// In dev the Vite proxy rewrites /go-api/* → http://localhost:8080/v1/*
// In production set VITE_BACKEND_API to the real Go service base URL (e.g. https://api.inlane.in/v1)
const BACKEND_API =
  import.meta.env.VITE_BACKEND_API || "/go-api";

/** Shape of the login response from the Go service. */
interface GoLoginResponse {
  accessToken: string;
  refreshToken: string;
  supabaseAccessToken: string;
  user: {
    id: string;
    phone: string;
    role: string;
    status: string;
  };
}

type UserRole = "learner" | "instructor" | "admin" | "user";

interface AuthContextType {
  user: User | null;
  login: (phone: string, password: string, role: UserRole) => Promise<void>;
  signUp: (phone: string, password: string, role: UserRole) => Promise<void>;
  logout: () => Promise<void>;
  requestPasswordReset: (phone: string) => Promise<void>;
  verifyOtpAndResetPassword: (
    phone: string,
    otp: string,
    newPassword: string | null,
  ) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// This map stores OTPs temporarily in memory
// In production, you might want to use a more secure method with expiration
const otpStore = new Map<string, { otp: string; timestamp: number }>();

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  // Stores the short-lived JWT reset token returned by POST /auth/otp/verify (Go flow).
  // Held in a ref so it persists across renders without triggering re-renders.
  const goResetTokenRef = useRef<string | null>(null);

  useEffect(() => {
    // Check active sessions and sets the user
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
      // Shadow auth only applies to pilot users in the Go migration list
      if (session?.user && isGoAuthUser(session.user.phone ?? "")) {
        triggerShadowAuth(session.user, session);
      }
    });

    // Listen for changes on auth state (logged in, signed out, etc.)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
      // Shadow auth only applies to pilot users in the Go migration list
      if (_event === 'SIGNED_IN' && session?.user && isGoAuthUser(session.user.phone ?? "")) {
        triggerShadowAuth(session.user, session);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (phone: string, password: string, role: UserRole) => {
    console.log("[AUTH] Login attempt with:", { phone, role });

    // Normalize phone to last 10 digits
    const inputDigits = phone.replace(/\D/g, "");
    console.log("[AUTH] Extracted digits:", inputDigits, "Length:", inputDigits.length);

    if (inputDigits.length < 10) {
      console.error("[AUTH] Invalid phone format. Too few digits:", inputDigits.length);
      throw new Error("Invalid phone number format. Please enter a valid phone number.");
    }

    const last10 = inputDigits.slice(-10);
    console.log("[AUTH] Last 10 digits:", last10);

    // ── Go-service login (feature-flagged + per-user pilot list) ────────────
    const goAuthEnabled = await isFeatureEnabled("go_auth_enabled");

    if (goAuthEnabled && isGoAuthUser(last10)) {
      console.log("[AUTH] Using Go service login for pilot user:", last10);

      let goResponse: GoLoginResponse;
      try {
        const res = await fetch(`${BACKEND_API}/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone: last10, password }),
        });

        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}));
          throw new Error(errBody.message || "Invalid phone number or password");
        }

        goResponse = await res.json();
      } catch (err: any) {
        console.error("[AUTH] Go service login error:", err);
        throw err instanceof Error ? err : new Error("Login failed. Please try again.");
      }

      console.log("[AUTH] Go service response received for user:", goResponse.user?.id);

      // Role check against Go user object
      const userRole = goResponse.user?.role;
      const isValidRole =
        userRole === role ||
        (role === "admin" && (userRole === "admin" || userRole === "user"));

      if (!isValidRole) {
        console.error("[AUTH] Role mismatch:", { expected: role, actual: userRole });
        throw new Error("Invalid role for this login");
      }

      // Persist Go tokens for backend API calls
      localStorage.setItem("go_access_token", goResponse.accessToken);
      localStorage.setItem("go_refresh_token", goResponse.refreshToken);

      // Establish Supabase session using the Supabase-compatible JWT returned
      // by the Go service so that RLS and onAuthStateChange continue to work.
      const { data: sessionData, error: sessionError } =
        await supabase.auth.setSession({
          access_token: goResponse.supabaseAccessToken,
          refresh_token: goResponse.refreshToken,
        });

      if (sessionError) {
        console.error("[AUTH] Failed to set Supabase session:", sessionError.message);
        throw new Error("Failed to establish session: " + sessionError.message);
      }

      console.log("[AUTH] ✅ Go login successful! Supabase session established.");

      // Trigger shadow auth (fire-and-forget)
      if (sessionData?.user && sessionData?.session) {
        triggerShadowAuth(sessionData.user, sessionData.session);
      }

      return;
    }

    // ── Fallback: direct Supabase login ────────────────────────────────────
    console.log("[AUTH] Using Supabase direct login (go_auth_enabled = false)");

    const phoneFormats = [
      `+91${last10}`,
      `91${last10}`,
      last10,
      phone,
    ];

    let loginData = null;
    let lastError: any = null;

    for (const phoneFormat of phoneFormats) {
      try {
        console.log("[AUTH] Trying phone format:", phoneFormat);
        const { data, error } = await supabase.auth.signInWithPassword({
          phone: phoneFormat,
          password,
        });

        if (!error && data) {
          console.log("[AUTH] ✓ Login successful with format:", phoneFormat);
          loginData = data;
          break;
        }

        if (error) {
          lastError = error;
          console.warn("[AUTH] Format failed:", phoneFormat, "Error:", error.message);
        }
      } catch (err) {
        lastError = err;
        console.warn("[AUTH] Format error:", phoneFormat, "Error:", err);
      }
    }

    if (!loginData) {
      console.error("[AUTH] All phone formats failed. Last error:", lastError);
      throw lastError || new Error("Invalid phone number or password");
    }

    const data = loginData;

    console.log("[AUTH] User authenticated:", {
      userId: data.user?.id,
      phone: data.user?.phone,
      role: data.user?.user_metadata?.user_role,
    });

    const userRole = data.user?.user_metadata.user_role;
    const isValidRole =
      userRole === role ||
      (role === "admin" && (userRole === "admin" || userRole === "user"));

    if (!isValidRole) {
      console.error("[AUTH] Role mismatch:", { expected: role, actual: userRole });
      await supabase.auth.signOut();
      throw new Error("Invalid role for this login");
    }

    console.log("[AUTH] Login successful!");
    // Shadow auth only for pilot users (go_auth_enabled=false + shadow_auth_enabled=true migration path)
    if (isGoAuthUser(last10)) {
      triggerShadowAuth(data.user, data.session);
    }
  };

  const signUp = async (phone: string, password: string, role: UserRole) => {
    const { data, error } = await supabase.auth.signUp({
      phone,
      password,
      options: {
        data: {
          user_role: role,
        },
      },
    });

    if (error) throw error;

    // Check if learner record already exists
    const { data: existingLearner } = await supabase
      .from("Learner")
      .select("id")
      .eq("phone", phone)
      .maybeSingle();

    // Create learner record if it doesn't exist
    if (!existingLearner) {
      const { error: insertError } = await supabase.from("Learner").insert({
        phone,
        onboarding_completed: false,
      });

      if (insertError) throw insertError;
    }
  };

  const logout = async () => {
    // Clear Go service tokens
    localStorage.removeItem("go_access_token");
    localStorage.removeItem("go_refresh_token");
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };


  const requestPasswordResetAlternative = async (phone: string) => {
    // Normalize to last 10 digits for consistency
    const last10 = phone.replace(/\D/g, "").slice(-10);

    // ── Go-service OTP request (feature-flagged + per-user pilot list) ───────
    const goAuthEnabled = await isFeatureEnabled("go_auth_enabled");

    if (goAuthEnabled && isGoAuthUser(last10)) {
      console.log("[AUTH] Requesting OTP via Go service for pilot user:", last10);

      const res = await fetch(`${BACKEND_API}/auth/otp/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: last10 }),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.message || "Failed to send OTP. Please try again.");
      }

      // The Go service always returns 200 regardless of whether the phone
      // exists (anti-enumeration). We surface the generic message.
      console.log("[AUTH] ✅ OTP request accepted by Go service.");
      return;
    }

    // ── Fallback: Supabase-based OTP flow ───────────────────────────────────
    // Check if user exists in Learner table
    const { data: userData, error: userError } = await supabase
      .from("Learner")
      .select("id")
      .eq("phone", phone)
      .maybeSingle();

    if (userError || !userData) {
      throw new Error("No account found with this phone number");
    }

    // Generate OTP and send
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    otpStore.set(phone, {
      otp,
      timestamp: Date.now() + 10 * 60 * 1000,
    });

    await supabase.functions.invoke("send-message", {
      body: {
        message_type: "PASSWORD_RESET_OTP",
        learner_id: userData.id,
        otp: otp,
      },
    });

    return;
  };

  const verifyOtpAndResetPassword = async (
    phone: string,
    otp: string,
    newPassword: string | null,
  ) => {
    // ── Go-service OTP verify / reset-password flow (feature-flagged + per-user pilot list) ──
    const last10 = phone.replace(/\D/g, "").slice(-10);
    const goAuthEnabled = await isFeatureEnabled("go_auth_enabled");

    if (goAuthEnabled && isGoAuthUser(last10)) {
      if (!newPassword) {
        // ── Step 2: Verify OTP → receive resetToken ─────────────────────────
        console.log("[AUTH] Verifying OTP via Go service for pilot user:", last10);

        const res = await fetch(`${BACKEND_API}/auth/otp/verify`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone: last10, otp }),
        });

        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}));
          if (res.status === 404) {
            throw new Error("No user found with the provided phone number.");
          }
          throw new Error(
            errBody.message || "The OTP is invalid, expired, or already used.",
          );
        }

        const data = await res.json();
        goResetTokenRef.current = data.resetToken;
        console.log("[AUTH] ✅ OTP verified. Reset token stored.");
        return;
      }

      // ── Step 3: Reset password using the stored resetToken ─────────────────
      console.log("[AUTH] Resetting password via Go service.");

      if (!goResetTokenRef.current) {
        throw new Error(
          "Reset token missing. Please verify your OTP again.",
        );
      }

      const res = await fetch(`${BACKEND_API}/auth/reset-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${goResetTokenRef.current}`,
        },
        body: JSON.stringify({ newPassword }),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        if (res.status === 400) {
          throw new Error(errBody.message || "Password must be at least 6 characters.");
        }
        throw new Error(
          errBody.message || "Failed to reset password. Please try again.",
        );
      }

      // Clear the stored reset token after successful use
      goResetTokenRef.current = null;
      console.log("[AUTH] ✅ Password reset successfully via Go service.");
      return;
    }

    // ── Fallback: Supabase-based OTP verify / password update ───────────────
    const storedOTPData = otpStore.get(phone);

    if (!storedOTPData) {
      throw new Error(
        "OTP expired or not requested. Please request a new OTP.",
      );
    }

    if (Date.now() > storedOTPData.timestamp) {
      otpStore.delete(phone);
      throw new Error("OTP expired. Please request a new OTP.");
    }

    if (storedOTPData.otp !== otp) {
      throw new Error("Invalid OTP. Please try again.");
    }

    if (!newPassword) {
      return;
    }

    try {
      // Normalize phone number - remove any non-digit characters and ensure consistent format
      const normalizedPhone = phone.replace(/\D/g, "");

      // Try multiple phone formats to find the user
      const phoneVariants = [
        normalizedPhone, // e.g., "9876543210"
        `+91${normalizedPhone}`, // e.g., "+919876543210"
        `91${normalizedPhone}`, // e.g., "919876543210"
        normalizedPhone.replace(/^91/, ""), // Remove 91 prefix if present
      ];

      let authUser = null;
      let page = 1;
      const perPage = 1000; // Increase page size to reduce pagination issues

      // Paginate through all users to find the matching phone
      while (!authUser) {
        const { data: users, error: userError } =
          await supabaseAdmin.auth.admin.listUsers({
            page,
            perPage,
          });

        if (userError) {
          throw new Error("Failed to retrieve users: " + userError.message);
        }

        if (!users || users.users.length === 0) {
          break; // No more users to check
        }

        // Try to find user with any of the phone variants
        authUser = users.users.find((user) => {
          if (!user.phone) return false;
          const userPhoneNormalized = user.phone.replace(/\D/g, "");
          return phoneVariants.some(
            (variant) =>
              variant === user.phone ||
              variant === userPhoneNormalized ||
              userPhoneNormalized.endsWith(normalizedPhone) ||
              normalizedPhone.endsWith(userPhoneNormalized.replace(/^91/, "")),
          );
        });

        if (authUser || users.users.length < perPage) {
          break; // Found user or no more pages
        }
        page++;
      }

      if (!authUser) {
        throw new Error(
          "No account found with this phone number. Please sign up first.",
        );
      }

      const { error: updateError } =
        await supabaseAdmin.auth.admin.updateUserById(authUser.id, {
          password: newPassword,
        });

      if (updateError) {
        throw new Error("Failed to update password: " + updateError.message);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      throw new Error("Password reset failed: " + errorMsg);
    }

    otpStore.delete(phone);

    return;
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        signUp,
        logout,
        requestPasswordReset: requestPasswordResetAlternative, // Use the alternative implementation
        verifyOtpAndResetPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export function useUser() {
  const { user } = useAuth();
  return {
    phone: user?.phone,
    role: user?.user_metadata.user_role as UserRole,
  };
}

export function ProtectedLearnerRoute({
  children,
}: {
  children: React.ReactNode;
}): JSX.Element {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" />;
  }

  if (user.user_metadata.user_role !== "learner") {
    return <Navigate to="/login" />;
  }

  return (
    <div className="flex h-screen items-center justify-center font-glancyr">
      <div className="mx-auto flex aspect-[9/16] h-full max-h-[1000px] overflow-hidden rounded-lg bg-white shadow-lg">
        {children}
      </div>
    </div>
  );
}

export function ProtectedInstructorRoute({
  children,
}: {
  children: React.ReactNode;
}): JSX.Element {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/instructor-login" />;
  }

  if (user.user_metadata.user_role !== "instructor") {
    return <Navigate to="/instructor-login" />;
  }

  return (
    <div className="flex h-screen items-center justify-center font-glancyr">
      <div className="mx-auto flex aspect-[9/16] h-full max-h-[1000px] overflow-hidden rounded-lg bg-white shadow-lg">
        {children}
      </div>
    </div>
  );
}

export function ProtectedAdminRoute({
  children,
}: {
  children: React.ReactNode;
}): JSX.Element {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" />;
  }

  // Allow both "admin" (super admin and admin) and "user" (team members created by admin) roles
  if (user.user_metadata.user_role !== "admin" && user.user_metadata.user_role !== "user") {
    return <Navigate to="/login" />;
  }

  return <>{children}</>;
}
