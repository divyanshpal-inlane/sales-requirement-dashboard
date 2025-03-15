import { User } from "@supabase/supabase-js";
import { createContext, useContext, useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";

import { supabase } from "@/lib/supabaseClient";

type UserRole = "learner" | "instructor" | "admin";

interface AuthContextType {
  user: User | null;
  login: (phone: string, password: string, role: UserRole) => Promise<void>;
  signUp: (phone: string, password: string, role: UserRole) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

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
    await supabase.functions.invoke("send-message", {
      body: {
        message_type: "SIGN_UP_DONE_SCHEDULE_PLEASE",
        learner_id: userData.id,
      },
    });
  };

  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <AuthContext.Provider value={{ user, login, signUp, logout }}>
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
