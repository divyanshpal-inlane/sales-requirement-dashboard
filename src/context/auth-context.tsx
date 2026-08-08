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
  supabaseUserId: string; // Supabase auth.users UUID (must match JWT sub claim)
  user: {
    id: string;           // RDS/Go-service internal user UUID
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
  changePassword: (
    oldPassword: string,
    newPassword: string,
    confirmNewPassword: string,
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
      // Guard: if Supabase fires SIGNED_OUT while a Go auth user is logged in
      // (e.g. because refreshSession failed with an invalid token during Go login),
      // do NOT clear the user state.  We can detect this by checking whether
      // go_access_token is still in localStorage:
      //   - During Go login: go_access_token is set BEFORE refreshSession runs,
      //     so it is present here → suppress the spurious SIGNED_OUT.
      //   - During real logout: logout() removes go_access_token BEFORE calling
      //     supabase.auth.signOut(), so it is gone here → SIGNED_OUT proceeds normally.
      if (_event === 'SIGNED_OUT' && !session && localStorage.getItem("go_access_token")) {
        console.log("[AUTH] SIGNED_OUT suppressed — Go auth session in progress.");
        setLoading(false);
        return;
      }

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
        (role === "admin" && (userRole === "admin" || userRole === "user" || userRole === "super_admin"));

      if (!isValidRole) {
        console.error("[AUTH] Role mismatch:", { expected: role, actual: userRole });
        throw new Error("Invalid role for this login");
      }

      // Persist Go tokens for backend API calls
      localStorage.setItem("go_access_token", goResponse.accessToken);
      localStorage.setItem("go_refresh_token", goResponse.refreshToken);

      // ── Establish Supabase session ────────────────────────────────────────
      // Strategy:
      //   Step 1 — refreshSession: works if Go passes back a valid Supabase
      //            refresh token (e.g. after shadow-auth migration).
      //   Step 2 — Direct injection: if refreshSession fails it means Go's
      //            tokens are not recognised by Supabase.  We SKIP setSession
      //            entirely because calling it when the JWT sub does not exist
      //            in auth.users triggers an internal _removeSession() that
      //            (a) clears localStorage and (b) fires onAuthStateChange
      //            SIGNED_OUT — both of which wipe the tokens we are about to
      //            store.  Instead we inject the supabaseAccessToken straight
      //            into Supabase's storage and set user state from Go response.

      // Step 1: try refreshSession (uses only the refresh token, no sub validation)
      const { data: refreshData, error: refreshError } =
        await supabase.auth.refreshSession({ refresh_token: goResponse.refreshToken });

      if (!refreshError && refreshData?.session) {
        console.log("[AUTH] ✅ Supabase session established via refreshSession.");
        if (refreshData.user && refreshData.session) {
          triggerShadowAuth(refreshData.user, refreshData.session);
        }
        return;
      }

      console.warn(
        "[AUTH] refreshSession failed:",
        refreshError?.message,
        "— injecting Go tokens directly (skipping setSession to avoid SIGNED_OUT race).",
      );

      // Step 2: inject directly — do NOT call setSession here.
      // Construct a minimal Supabase-shaped User from the Go response.
      // Use supabaseUserId (not user.id which is the RDS UUID) as the Supabase user ID.
      const goUser = {
        id: goResponse.supabaseUserId,  // Supabase auth.users UUID (must match JWT sub claim)
        phone: goResponse.user.phone,
        aud: "authenticated",
        role: "authenticated",
        app_metadata: {
          provider: "go_auth",
          providers: ["go_auth"],
          user_role: goResponse.user.role,
        },
        user_metadata: {
          user_role: goResponse.user.role,
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        email: "",
        email_confirmed_at: undefined as unknown as string,
        phone_confirmed_at: new Date().toISOString(),
        last_sign_in_at: new Date().toISOString(),
        identities: [],
        factors: [],
      } as unknown as User;

      // Store the supabaseAccessToken so it is available for all Supabase
      // API calls (e.g. in hooks / queries throughout the app).
      localStorage.setItem("supabase_access_token", goResponse.supabaseAccessToken);

      // Inject the token into Supabase's internal session storage so that
      // every supabase.from(...) call automatically sends it as the
      // Authorization Bearer header — without touching individual queries.
      try {
        const projectRef = new URL(supabaseUrl).hostname.split(".")[0];
        const supabaseStorageKey = `sb-${projectRef}-auth-token`;
        const injectedSession = {
          access_token: goResponse.supabaseAccessToken,
          token_type: "bearer",
          expires_in: 3600,
          expires_at: Math.floor(Date.now() / 1000) + 3600,
          refresh_token: goResponse.refreshToken,
          user: goUser,
        };
        localStorage.setItem(supabaseStorageKey, JSON.stringify(injectedSession));
        console.log("[AUTH] Supabase session storage injected with Go supabaseAccessToken.");
      } catch (storageErr) {
        console.warn("[AUTH] Could not inject Supabase session storage:", storageErr);
      }

      setUser(goUser);
      console.log(
        "[AUTH] ✅ Go login successful! go_access_token + supabase_access_token stored.",
      );
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
    // Clear all stored tokens (Go + Supabase fallback)
    localStorage.removeItem("go_access_token");
    localStorage.removeItem("go_refresh_token");
    localStorage.removeItem("supabase_access_token");
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

  const changePassword = async (
    oldPassword: string,
    newPassword: string,
    confirmNewPassword: string,
  ) => {
    // Client-side validation
    if (!oldPassword) {
      throw new Error("Please enter your current password");
    }

    if (!newPassword || newPassword.length < 6) {
      throw new Error("New password must be at least 6 characters long");
    }

    if (newPassword !== confirmNewPassword) {
      throw new Error("New password and confirmation password must match.");
    }

    if (oldPassword === newPassword) {
      throw new Error("New password must be different from old password");
    }

    if (!user?.phone) {
      throw new Error("User not found. Please log in again.");
    }

    // Normalize phone to last 10 digits
    const last10 = user.phone.replace(/\D/g, "").slice(-10);

    // ── Go-service change password (feature-flagged + per-user pilot list) ───────
    const goAuthEnabled = await isFeatureEnabled("go_auth_enabled");

    if (goAuthEnabled && isGoAuthUser(last10)) {
      console.log("[AUTH] Changing password via Go service for pilot user:", last10);

      const goAccessToken = localStorage.getItem("go_access_token");
      if (!goAccessToken) {
        throw new Error("Authentication required. Please log in again.");
      }

      const res = await fetch(`${BACKEND_API}/auth/change-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${goAccessToken}`,
        },
        body: JSON.stringify({
          oldPassword,
          newPassword,
          confirmNewPassword,
        }),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));

        // Handle specific error codes from Go service
        if (errBody.code === "password_do_not_match") {
          throw new Error("New password and confirmation password must match.");
        }
        if (errBody.code === "weak_password") {
          throw new Error("Password must be at least 6 characters.");
        }
        if (errBody.code === "invalid_credentials") {
          throw new Error("Current password is incorrect.");
        }
        if (errBody.code === "unauthorized" || res.status === 401) {
          throw new Error("Authentication required. Please log in again.");
        }

        throw new Error(errBody.message || "Failed to change password. Please try again.");
      }

      console.log("[AUTH] ✅ Password changed successfully via Go service.");
      return;
    }

    // ── Fallback: Supabase-based password change ───────────────────────────────
    console.log("[AUTH] Changing password via Supabase for user:", last10);

    if (!user?.id) {
      throw new Error("User not found. Please log in again.");
    }

    // First, verify the old password by attempting to sign in
    const phoneFormats = [
      `+91${last10}`,
      last10,
      user.phone,
    ];

    let isPasswordValid = false;

    for (const phoneFormat of phoneFormats) {
      const { error } = await supabase.auth.signInWithPassword({
        phone: phoneFormat,
        password: oldPassword,
      });

      if (!error) {
        isPasswordValid = true;
        break;
      }
    }

    if (!isPasswordValid) {
      throw new Error("Current password is incorrect.");
    }

    // If password is verified, update to new password
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      user.id,
      { password: newPassword },
    );

    if (updateError) {
      throw new Error("Failed to update password: " + updateError.message);
    }

    console.log("[AUTH] ✅ Password changed successfully via Supabase.");
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
        changePassword,
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

  // Allow "admin", "super_admin", and "user" (team members created by admin) roles
  const userRole = user.user_metadata.user_role;
  if (userRole !== "admin" && userRole !== "user" && userRole !== "super_admin") {
    return <Navigate to="/login" />;
  }

  return <>{children}</>;
}
