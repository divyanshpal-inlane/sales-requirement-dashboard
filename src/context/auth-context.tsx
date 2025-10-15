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

    // Fetch the newly created user details
    const { data: userData, error: userError } = await supabase
      .from("Learner")
      .select("*")
      .eq("phone", phone)
      .single();

    if (userError) throw userError;

    // Send the sign-up done message
    // await supabase.functions.invoke("send-message", {
    //   body: {
    //     message_type: "SIGN_UP_DONE_NEED_SCHEDULE",
    //     learner_id: userData.id,
    //   },
    // });
  };

  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  // Function to request a password reset OTP
  const requestPasswordReset = async (phone: string) => {
    // Instead of querying auth tables directly (which requires special permissions),
    // we'll check if a user exists by attempting admin retrieval
    console.log("get learner details");
    const { data, error } = await supabase.auth.admin.listUsers({
      filters: { phone },
    });
    // If no users found with this phone or error occurs
    if (error || !data || data.users.length === 0) {
      throw new Error("No account found with this phone number");
    }

    // Generate a 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Store OTP in memory with timestamp (expires in 10 minutes)
    otpStore.set(phone, {
      otp,
      timestamp: Date.now() + 10 * 60 * 1000, // 10 minutes expiry
    });

    console.log("Get user details:");
    // Get user details to send OTP
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

  // Alternative implementation if admin API is not available
  const requestPasswordResetAlternative = async (phone: string) => {
    // Check if a user exists with this phone in the Learner table
    const { data: userData, error: userError } = await supabase
      .from("Learner")
      .select("id")
      .eq("phone", phone)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (userError || !userData) {
      console.log("Failed");
      console.error("No account or multiple accounts found with this phone number");
    }

    // Generate a 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Store OTP in memory with timestamp (expires in 10 minutes)
    otpStore.set(phone, {
      otp,
      timestamp: Date.now() + 10 * 60 * 1000, // 10 minutes expiry
    });

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

  // Function to verify OTP and reset password
  const verifyOtpAndResetPassword = async (
    phone: string,
    otp: string,
    newPassword: string | null,
  ) => {
    // Check if OTP exists and is valid
    const storedOTPData = otpStore.get(phone);

    if (!storedOTPData) {
      throw new Error(
        "OTP expired or not requested. Please request a new OTP.",
      );
    }

    if (Date.now() > storedOTPData.timestamp) {
      // OTP expired
      otpStore.delete(phone);
      throw new Error("OTP expired. Please request a new OTP.");
    }

    if (storedOTPData.otp !== otp) {
      throw new Error("Invalid OTP. Please try again.");
    }

    // If newPassword is null, this is just an OTP verification step
    if (!newPassword) {
      return;
    }

    try {
      // Use the Admin API to retrieve the user by phone number
      const { data: users, error: userError } =
        await supabaseAdmin.auth.admin.listUsers();

      if (userError || !users) {
        throw new Error("Failed to retrieve users from the auth.users table.");
      }

      // Find the user with the matching phone number
      const authUser = users.users.find((user) => user.phone === phone);

      if (!authUser) {
        throw new Error("User not found in the auth.users table.");
      }

      const authUserId = authUser.id;

      // Use the Admin API to update the user's password
      const { error: updateError } =
        await supabaseAdmin.auth.admin.updateUserById(authUserId, {
          password: newPassword,
        });

      if (updateError) {
        throw new Error("Failed to update password: " + updateError.message);
      }
    } catch (error) {
      throw new Error(
        "Authentication failed during password reset: " + error.message,
      );
    }

    // Clear the OTP from storage
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
