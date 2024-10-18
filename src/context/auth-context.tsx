import { createClient, User } from "@supabase/supabase-js";
import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { Navigate } from "react-router";

import { Database } from "@/types/database.types";

type UserRole = "learner" | "instructor";

type AuthContextType = {
  user: User | undefined;
  userRole: UserRole | undefined;
  login: (phone: string, password: string, role: UserRole) => Promise<User>;
  signUp: (phone: string, password: string, role: UserRole) => Promise<User>;
  logout: () => Promise<void>;
};

const supabaseUrl = "https://csnzgfzxnscumvjefpon.supabase.co";
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY;
export const supabase = createClient<Database>(supabaseUrl, supabaseKey);

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User>();
  const [userRole, setUserRole] = useState<UserRole>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check active session and sets the user
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user);
      setUserRole(session?.user.user_metadata.user_role as UserRole);
      setLoading(false);
    });

    // Listen for changes on auth state (logged in, signed out, etc.)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user);
      setUserRole(session?.user.user_metadata.user_role as UserRole);
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (
    phone: string,
    password: string,
    role: UserRole,
  ): Promise<User> => {
    const { data, error } = await supabase.auth.signInWithPassword({
      phone,
      password,
    });
    if (error) throw error;
    if (data.user.user_metadata.user_role !== role) {
      await logout();
      throw new Error("Invalid user role for this login type");
    }
    return data.user;
  };

  const signUp = async (
    phone: string,
    password: string,
    role: UserRole,
  ): Promise<User> => {
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
    if (!data.user) throw new Error("User creation failed");
    return data.user;
  };

  const logout = async (): Promise<void> => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  if (loading) {
    return <div>Loading...</div>; // Or your custom loading component
  }

  return (
    <AuthContext.Provider value={{ user, userRole, login, logout, signUp }}>
      <div className="flex h-screen items-center justify-center font-glancyr">
        <div className="mx-auto flex aspect-[9/16] h-full max-h-[1000px] overflow-hidden rounded-lg bg-white shadow-lg">
          {children}
        </div>
      </div>
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth should be used inside AuthProvider");
  return context;
}

export function ProtectedLearnerRoute({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, userRole } = useAuth();

  if (!user || userRole !== "learner") return <Navigate to="/login" />;
  return <>{children}</>;
}

export function ProtectedInstructorRoute({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useAuth();

  if (!user || user.user_metadata.user_role !== "instructor")
    return <Navigate to="/instructor-login" />;
  return <>{children}</>;
}

export function useUser() {
  const { user } = useAuth();
  const phone = user?.phone;
  if (!user || !phone) {
    throw new Error("user is required");
  }
  return { phone };
}
