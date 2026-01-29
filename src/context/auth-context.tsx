import { User } from "@supabase/supabase-js";
import { createClient } from "@supabase/supabase-js";
import { createContext, useContext, useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL!;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY!;
const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY!;
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

type UserRole = "learner" | "instructor" | "admin";

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

  useEffect(() => {
    // Check active sessions and sets the user
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for changes on auth state (logged in, signed out, etc.)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (phone: string, password: string, role: UserRole) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      phone,
      password,
    });

    if (error) throw error;

    // Check if the user has the correct role
    if (data.user?.user_metadata.user_role !== role) {
      await supabase.auth.signOut();
      throw new Error("Invalid role for this login");
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
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const requestPasswordReset = async (phone: string) => {
    const { data, error } = await supabase.auth.admin.listUsers({
      filters: { phone },
    });
    // If no users found with this phone or error occurs
    if (error || !data || data.users.length === 0) {
      throw new Error("No account found with this phone number");
    }

    // Generate a 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    otpStore.set(phone, {
      otp,
      timestamp: Date.now() + 10 * 60 * 1000,
    });

    const { data: userData, error: userError } = await supabase
      .from("Learner")
      .select("*")
      .eq("phone", phone)
      .single();

    if (userError) {
      throw new Error("Failed to retrieve user details");
    }

    // Send OTP via WhatsApp using your existing function
    await supabase.functions.invoke("send-message", {
      body: {
        message_type: "PASSWORD_RESET_OTP",
        learner_id: userData.id,
        otp: otp,
      },
    });

    return;
  };

  const requestPasswordResetAlternative = async (phone: string) => {
    // First check if user exists in Learner table
    const { data: userData, error: userError } = await supabase
      .from("Learner")
      .select("id")
      .eq("phone", phone)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (userError || !userData) {
      throw new Error("No account found with this phone number");
    }

    // Also verify user exists in auth.users before sending OTP
    const normalizedPhone = phone.replace(/\D/g, "");
    const phoneVariants = [
      normalizedPhone,
      `+91${normalizedPhone}`,
      `91${normalizedPhone}`,
      normalizedPhone.replace(/^91/, ""),
    ];

    const { data: users, error: authError } =
      await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });

    if (authError) {
      throw new Error("Failed to verify account. Please try again.");
    }

    const authUser = users?.users.find((user) => {
      if (!user.phone) return false;
      const userPhoneNormalized = user.phone.replace(/\D/g, "");
      return phoneVariants.some(
        (variant) =>
          variant === user.phone ||
          variant === userPhoneNormalized ||
          userPhoneNormalized.endsWith(normalizedPhone) ||
          normalizedPhone.endsWith(userPhoneNormalized.replace(/^91/, ""))
      );
    });

    if (!authUser) {
      throw new Error("No account found with this phone number. Please sign up first.");
    }

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
        normalizedPhone,                    // e.g., "9876543210"
        `+91${normalizedPhone}`,           // e.g., "+919876543210"
        `91${normalizedPhone}`,            // e.g., "919876543210"
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
              normalizedPhone.endsWith(userPhoneNormalized.replace(/^91/, ""))
          );
        });

        if (authUser || users.users.length < perPage) {
          break; // Found user or no more pages
        }
        page++;
      }

      if (!authUser) {
        throw new Error(
          "No account found with this phone number. Please sign up first."
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
      throw new Error(
        "Password reset failed: " + error.message,
      );
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

  if (user.user_metadata.user_role !== "admin") {
    return <Navigate to="/login" />;
  }

  return <>{children}</>;
}
