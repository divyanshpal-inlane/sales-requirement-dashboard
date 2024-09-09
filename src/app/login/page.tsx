import { Navigate } from "react-router";

import LoginForm from "@/components/login-form";
import { useAuth } from "@/context/auth-context";

export default function Page() {
  const { user } = useAuth();

  if (user) {
    return <Navigate to="/home" />;
  }
  return <LoginForm />;
}
