import { Eye, EyeOff } from "lucide-react";
import React, { useState } from "react";
import { Navigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/auth-context";

export default function InstructorAuth() {
  const { login, signUp, user } = useAuth();
  const [active, setActive] = useState<"login" | "signup">("login");
  const [phone, setPhone] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);

  const onSubmitHandler = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (active === "login") {
        await login(phone, password, "instructor");
      } else {
        await signUp(phone, password, "instructor");
      }
    } catch (error) {
      console.error("Instructor auth failed:", error);
    }
  };

  if (user && user.user_metadata.user_role === "instructor") {
    return <Navigate to="/instructor" />;
  }

  return (
    <div className="flex h-screen items-center justify-center font-glancyr">
      <div className="mx-auto flex aspect-[9/16] h-full max-h-[1000px] overflow-hidden rounded-lg bg-white shadow-lg">
        <div className="flex h-full w-full flex-col">
          <div className="flex h-full flex-col gap-6 p-6">
            <div className="flex flex-col items-center">
              <h2 className="text-2xl">Welcome, Instructor!</h2>
              <p className="text-lg">Ready to guide new drivers?</p>
            </div>

            <form onSubmit={onSubmitHandler}>
              <div className="space-y-4">
                <div className="flex h-fit rounded-md shadow-md">
                  <span className="flex items-center rounded-l-md border border-r-0 bg-gray-100 px-3 text-gray-500">
                    +91
                  </span>
                  <Input
                    className="rounded-l-none shadow-none"
                    placeholder="Enter Mobile Number"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
                <div className="relative w-full">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pr-10" // Ensure space for the button
                  />
                  <Button
                    className="absolute right-2 top-1/2 -translate-y-1/2 transform p-1"
                    type="button"
                    variant="ghost"
                    onClick={() => setShowPassword((prev) => !prev)}
                  >
                    {showPassword ? <EyeOff /> : <Eye />}
                  </Button>
                </div>

                <div className="flex flex-col items-center gap-1">
                  {active === "login" ? (
                    <>
                      <Button className="w-full" type="submit">
                        Login as Instructor
                      </Button>
                      <p className="text-sm text-muted-foreground">
                        Not registered?
                        <Button
                          type="button"
                          variant="link"
                          onClick={() => setActive("signup")}
                        >
                          Sign up
                        </Button>
                      </p>
                    </>
                  ) : (
                    <>
                      <Button className="w-full" type="submit">
                        Sign up as Instructor
                      </Button>
                      <p className="text-sm text-muted-foreground">
                        Already registered?
                        <Button
                          type="button"
                          variant="link"
                          onClick={() => setActive("login")}
                        >
                          Login
                        </Button>
                      </p>
                    </>
                  )}
                </div>
              </div>
            </form>

            <footer className="mt-auto flex flex-col text-center text-sm">
              By continuing, you agree to our
              <nav className="flex flex-row justify-center gap-4">
                <a
                  href="/terms"
                  className="text-muted-foreground hover:text-blue-500 hover:underline"
                >
                  Terms of Service
                </a>
                <a
                  href="/privacy"
                  className="text-muted-foreground hover:text-blue-500 hover:underline"
                >
                  Privacy Policies
                </a>
              </nav>
            </footer>
          </div>
        </div>
      </div>
    </div>
  );
}
