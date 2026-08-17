import { User, createClient } from "@supabase/supabase-js";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { triggerShadowAuth } from "@/utils/shadowAuth";
import { isFeatureEnabled } from "@/services/featureFlagService";
// ── Single shared Supabase client ─────────────────────────────────────────
// All modules (queries, hooks, auth) must use this SAME instance so that
// when we inject a Go-auth session into localStorage the token is immediately
// available to every supabase.storage / supabase.from() call in the app.
// A second createClient() call would create an isolated object that never
// sees the localStorage write done in the same browser tab.
import { supabase } from "@/lib/supabaseClient";
export { supabase };

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY!;
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
  signUp: (phone: string, password: string, role: UserRole, name?: string) => Promise<void>;
  logout: () => Promise<void>;
  requestPasswordReset: (phone: string, context?: "learner" | "instructor" | "admin") => Promise<void>;
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
      // Trigger shadow auth for all users when Go auth is enabled
      if (session?.user) {
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
      // Trigger shadow auth for all users when signed in
      if (_event === 'SIGNED_IN' && session?.user) {
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

    // ── Go-service login (feature-flagged for all users) ────────────
    const goAuthEnabled = await isFeatureEnabled("go_auth_enabled");

    if (goAuthEnabled) {
      console.log("[AUTH] Trying Go service login for user:", last10);

      let goResponse: GoLoginResponse | null = null;
      let goLoginFailed = false;

      try {
        const res = await fetch(`${BACKEND_API}/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone: last10, password }),
        });

        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}));
          console.warn(
            "[AUTH] Go login failed (status:", res.status, "):",
            errBody.message || "Unknown error",
            "— will fall back to Supabase.",
          );
          goLoginFailed = true;
        } else {
          goResponse = await res.json();
        }
      } catch (err: any) {
        console.warn("[AUTH] Go service unreachable:", err.message, "— will fall back to Supabase.");
        goLoginFailed = true;
      }

      if (!goLoginFailed && goResponse) {
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

        // ── Establish Supabase session ──────────────────────────────────────
        // Step 1: try refreshSession
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
          "— injecting Go tokens directly.",
        );

        // Step 2: inject directly
        const goUser = {
          id: goResponse.supabaseUserId,
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

        localStorage.setItem("supabase_access_token", goResponse.supabaseAccessToken);

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
        console.log("[AUTH] ✅ Go login successful!");
        return;
      }

      // Go failed → fall through to Supabase
      console.log("[AUTH] Go login failed — falling back to Supabase.");
    }

    // ── Supabase login (fallback when Go fails or go_auth_enabled = false) ────
    console.log("[AUTH] Using Supabase direct login");

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
    // Trigger shadow auth for all users (Supabase fallback path)
    triggerShadowAuth(data.user, data.session);
  };

  const signUp = async (phone: string, password: string, role: UserRole, name?: string) => {
    // Normalize phone number
    const inputDigits = phone.replace(/\D/g, "");
    const last10 = inputDigits.slice(-10);
    // Supabase and Go signup both use E.164 format: +91XXXXXXXXXX
    const formattedPhone = phone.startsWith("+") ? phone : `+91${last10}`;

    console.log("[AUTH] Signup attempt:", { phone: formattedPhone, role, name });

    // ──────────────────────────────────────────────────────────────────────────
    // LEARNER SIGNUP: Call Supabase + Go service in parallel
    // Go service returns tokens immediately so learner is auto-logged in
    // ──────────────────────────────────────────────────────────────────────────
    if (role === "learner") {
      const supabaseSignupPromise = supabase.auth.signUp({
        phone: formattedPhone,
        password,
        options: {
          data: {
            user_role: "learner",
            name: name || "",
          },
        },
      });

      // Go learner signup — POST /auth/signup
      // Contract: { phone: "+91XXXXXXXXXX", password, name }
      // Role is hardcoded as "learner" server-side
      const goSignupPromise = (async () => {
        try {
          console.log("[AUTH] Attempting Go signup for learner:", formattedPhone);
          const res = await fetch(`${BACKEND_API}/auth/signup`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              phone: formattedPhone,  // +919876543210 per API contract
              password,
              name: name || "",
            }),
          });

          if (!res.ok) {
            const errBody = await res.json().catch(() => ({}));
            if (res.status === 409 && errBody.code === "phone_already_registered") {
              console.warn("[AUTH] Go: Learner phone already registered in RDS");
              return { success: false, error: "phone_already_registered", data: null };
            }
            if (res.status === 400 && errBody.code === "weak_password") {
              console.warn("[AUTH] Go: Weak password");
              return { success: false, error: "weak_password", data: null };
            }
            console.warn("[AUTH] Go learner signup failed:", errBody.message || "Unknown error");
            return { success: false, error: errBody.message || "Unknown error", data: null };
          }

          const goResponse = await res.json();
          console.log("[AUTH] ✅ Go learner signup successful:", goResponse.user?.id);
          return { success: true, error: null, data: goResponse };
        } catch (err: any) {
          console.warn("[AUTH] Go signup error (non-fatal, continuing with Supabase):", err.message);
          return { success: false, error: err.message, data: null };
        }
      })();

      // Run both in parallel
      const [supabaseResult, goResult] = await Promise.all([
        supabaseSignupPromise,
        goSignupPromise,
      ]);

      // Supabase must succeed
      const { data, error } = supabaseResult;
      if (error) {
        console.error("[AUTH] Supabase learner signup failed:", error.message);
        throw error;
      }
      console.log("[AUTH] ✅ Supabase learner signup successful:", data.user?.id);

      // Store Go tokens → learner is auto-logged in (no separate login needed)
      if (goResult.success && goResult.data) {
        localStorage.setItem("go_access_token", goResult.data.accessToken);
        localStorage.setItem("go_refresh_token", goResult.data.refreshToken);
        console.log("[AUTH] ✅ Go tokens stored — learner auto-logged in via Go.");
      } else {
        console.warn("[AUTH] Go signup failed (non-fatal). Learner will use Supabase session.", goResult.error);
      }

      // Create Learner record in Supabase DB (if not already created by trigger)
      const { data: existingLearner } = await supabase
        .from("Learner")
        .select("id")
        .eq("phone", formattedPhone)
        .maybeSingle();

      if (!existingLearner) {
        // Use 'as any' — the typed client enforces all NOT NULL columns but
        // these fields have DB-level defaults; the signup only sets the minimum.
        const { error: insertError } = await (supabase as any).from("Learner").insert({
          phone: formattedPhone,
          name: name || null,
          onboarding_completed: false,
        });
        if (insertError) {
          console.warn("[AUTH] Failed to create Learner record:", insertError.message);
        }
      }

      console.log("[AUTH] ✅ Learner signup complete (Supabase:", !!data.user, ", Go:", goResult.success, ")");
      return;
    }

    // ──────────────────────────────────────────────────────────────────────────
    // INSTRUCTOR SIGNUP: Supabase only (primary) + shadow auth sync to RDS
    // There is no dedicated Go endpoint for instructor signup.
    // After Supabase signup, triggerShadowAuth syncs the instructor to Go/RDS.
    // ──────────────────────────────────────────────────────────────────────────
    if (role === "instructor") {
      const { data, error } = await supabase.auth.signUp({
        phone: formattedPhone,
        password,
        options: {
          data: {
            user_role: "instructor",
            name: name || "",
          },
        },
      });

      if (error) {
        console.error("[AUTH] Supabase instructor signup failed:", error.message);
        throw error;
      }
      console.log("[AUTH] ✅ Supabase instructor signup successful:", data.user?.id);

      // Create Instructor record in Supabase DB
      const { data: existingInstructor } = await supabase
        .from("Instructor")
        .select("id")
        .eq("phone", formattedPhone)
        .maybeSingle();

      if (!existingInstructor) {
        const { error: insertError } = await supabase.from("Instructor").insert({
          phone: formattedPhone,
          name: name || null,
        });
        if (insertError) {
          console.warn("[AUTH] Failed to create Instructor record:", insertError.message);
        }
      }

      // Trigger shadow auth to sync instructor to Go/RDS in the background
      // This ensures no data loss — instructor ends up in both Supabase and RDS
      if (data.user && data.session) {
        console.log("[AUTH] Triggering shadow auth to sync instructor to RDS:", data.user.id);
        triggerShadowAuth(data.user, data.session);
      }

      console.log("[AUTH] ✅ Instructor signup complete (Supabase: true, RDS sync: triggered)");
      return;
    }

    throw new Error(`Unsupported signup role: ${role}`);
  };

  const logout = async () => {
    // Clear all stored tokens (Go + Supabase fallback)
    localStorage.removeItem("go_access_token");
    localStorage.removeItem("go_refresh_token");
    localStorage.removeItem("supabase_access_token");
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };


  const requestPasswordResetAlternative = async (phone: string, context?: "learner" | "instructor" | "admin") => {
    // Normalize to last 10 digits for consistency
    const last10 = phone.replace(/\D/g, "").slice(-10);

    console.log(`[AUTH] Password reset requested for phone: ${phone}, normalized: ${last10}, context: ${context || "auto-detect"}`);

    // ── Admin context: Always use Go service (don't check Learner/Instructor tables) ──
    if (context === "admin") {
      console.log("[AUTH] Admin context - using Go service directly");
      const goAuthEnabled = await isFeatureEnabled("go_auth_enabled");

      if (goAuthEnabled) {
        const res = await fetch(`${BACKEND_API}/auth/otp/request`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone: last10 }),
        });

        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}));
          throw new Error(errBody.message || "Failed to send OTP. Please try again.");
        }

        console.log("[AUTH] ✅ OTP request accepted by Go service (admin flow).");
        return;
      } else {
        throw new Error("Admin password reset is not available. Please contact support.");
      }
    }

    // Phone formats to try (database might store in different formats)
    const phoneFormats = [
      last10,                    // "9876543210"
      `+91${last10}`,            // "+919876543210"
      `91${last10}`,             // "919876543210"
      phone,                     // Original input
    ];

    // ── Step 1: Check if user is a Learner or Instructor → Use Supabase flow ───────
    // Check if user exists in Learner table first (try multiple phone formats)
    let learnerData = null;
    let learnerError = null;
    
    // First try exact matches (use .limit(1) to handle duplicate phone numbers)
    for (const phoneFormat of phoneFormats) {
      console.log(`[AUTH] Trying Learner lookup with phone format: ${phoneFormat}`);
      const { data, error } = await supabase
        .from("Learner")
        .select("id, name, phone")
        .eq("phone", phoneFormat)
        .limit(1)
        .single();
      
      console.log(`[AUTH] Learner query result:`, { data, error, phoneFormat });
      
      if (data && !error) {
        learnerData = data;
        learnerError = null;
        console.log(`[AUTH] ✅ Learner found with phone format: ${phoneFormat}`, data);
        break;
      }
      // Only store error if it's not the "no rows" error
      if (error && error.code !== 'PGRST116') {
        learnerError = error;
      }
    }

    // If not found with exact match, try using "ilike" pattern for partial match
    if (!learnerData) {
      console.log(`[AUTH] Exact match not found, trying pattern match with: %${last10}%`);
      const { data, error } = await supabase
        .from("Learner")
        .select("id, name, phone")
        .ilike("phone", `%${last10}%`)
        .limit(1)
        .single();
      
      console.log(`[AUTH] Learner ilike query result:`, { data, error });
      
      if (data && !error) {
        learnerData = data;
        learnerError = null;
        console.log(`[AUTH] ✅ Learner found with ilike pattern:`, data);
      }
    }

    // Check if user exists in Instructor table (try multiple phone formats)
    let instructorData = null;
    let instructorError = null;
    if (!learnerData) {
      for (const phoneFormat of phoneFormats) {
        console.log(`[AUTH] Trying Instructor lookup with phone format: ${phoneFormat}`);
        const { data, error } = await supabase
          .from("Instructor")
          .select("id_instructor, name, phone")
          .eq("phone", phoneFormat)
          .maybeSingle();
        
        console.log(`[AUTH] Instructor query result:`, { data, error, phoneFormat });
        
        if (data && !error) {
          instructorData = data;
          instructorError = null;
          console.log(`[AUTH] ✅ Instructor found with phone format: ${phoneFormat}`, data);
          break;
        }
        instructorError = error;
      }
      
      // If not found with exact match, try using "ilike" pattern for partial match
      if (!instructorData) {
        console.log(`[AUTH] Exact match not found, trying pattern match with: %${last10}%`);
        const { data, error } = await supabase
          .from("Instructor")
          .select("id_instructor, name, phone")
          .ilike("phone", `%${last10}%`)
          .maybeSingle();
        
        console.log(`[AUTH] Instructor ilike query result:`, { data, error });
        
        if (data && !error) {
          instructorData = data;
          instructorError = null;
          console.log(`[AUTH] ✅ Instructor found with ilike pattern:`, data);
        }
      }
    }

    // Determine user type and data
    let userType: "learner" | "instructor" | null = null;
    let userId: string | null = null;
    let userName: string | null = null;
    let userPhone: string | null = null;

    if (learnerData && !learnerError) {
      userType = "learner";
      userId = learnerData.id;
      userName = learnerData.name;
      userPhone = learnerData.phone;
    } else if (instructorData && !instructorError) {
      userType = "instructor";
      userId = instructorData.id_instructor;
      userName = instructorData.name;
      userPhone = instructorData.phone;
    }

    // ── If Learner or Instructor found → Use Supabase OTP flow ───────────────
    if (userType && userId) {
      console.log(`[AUTH] User found as ${userType}, using Supabase OTP flow`);

      // Generate OTP and send via Supabase edge function
      const otp = Math.floor(100000 + Math.random() * 900000).toString();

      otpStore.set(phone, {
        otp,
        timestamp: Date.now() + 10 * 60 * 1000,
      });

      await supabase.functions.invoke("send-message", {
        body: {
          message_type: "PASSWORD_RESET_OTP",
          user_type: userType,
          user_id: userId,
          user_name: userName,
          user_phone: userPhone,
          // Keep backward compatibility with learner_id for existing learner flow
          ...(userType === "learner" ? { learner_id: userId } : {}),
          otp: otp,
        },
      });

      console.log("[AUTH] ✅ OTP sent via Supabase edge function.");
      return;
    }

    // ── Step 2: Not Learner/Instructor → Use Go service for Admins ───────────
    const goAuthEnabled = await isFeatureEnabled("go_auth_enabled");

    if (goAuthEnabled) {
      console.log("[AUTH] User not found in Learner/Instructor, using Go service for admin:", last10);

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
      console.log("[AUTH] ✅ OTP request accepted by Go service (admin flow).");
      return;
    }

    // If Go service is not enabled and user not found in Learner/Instructor
    throw new Error("No account found with this phone number");
  };

  const verifyOtpAndResetPassword = async (
    phone: string,
    otp: string,
    newPassword: string | null,
  ) => {
    const last10 = phone.replace(/\D/g, "").slice(-10);

    // ── Step 1: Check if OTP exists in store (Learner/Instructor flow) ──────
    const storedOTPData = otpStore.get(phone);

    if (storedOTPData) {
      // OTP found in store → This is a Learner or Instructor
      console.log("[AUTH] OTP found in store, using Supabase flow for Learner/Instructor");

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
      console.log("[AUTH] ✅ Password reset successfully via Supabase (Learner/Instructor).");
      return;
    }

    // ── Step 2: OTP not in store → Use Go service for Admins ─────────────────
    const goAuthEnabled = await isFeatureEnabled("go_auth_enabled");

    if (goAuthEnabled) {
      if (!newPassword) {
        // ── Verify OTP → receive resetToken ─────────────────────────
        console.log("[AUTH] Verifying OTP via Go service for admin:", last10);

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

      // ── Reset password using the stored resetToken ─────────────────
      console.log("[AUTH] Resetting password via Go service (admin flow).");

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
      console.log("[AUTH] ✅ Password reset successfully via Go service (admin flow).");
      return;
    }

    // If we reach here, OTP wasn't found and Go service is disabled
    throw new Error("OTP expired or not requested. Please request a new OTP.");
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

    // ── Go-service change password (feature-flagged for all users) ───────
    const goAuthEnabled = await isFeatureEnabled("go_auth_enabled");

    if (goAuthEnabled) {
      console.log("[AUTH] Changing password via Go service for user:", last10);

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
