import { Eye, EyeOff } from "lucide-react"; // Add this import
import { useState } from "react"; // Import useState
import { Navigate } from "react-router";
import { useSearchParams } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/auth-context";

export default function Login() {
  const { login, signUp, user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const active = searchParams.get("active") || "login";
  const [phone, setPhone] = useState<string>(searchParams.get("phone") || "");
  const [password, setPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");

  const onSubmitHandler = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(""); // Clear any previous errors
    try {
      if (active === "login") {
        await login(phone, password, "learner");
      } else {
        await signUp(phone, password, "learner");
      }
    } catch (error) {
      // Handle different error messages
      setErrorMessage(error?.message || "An error occurred. Please try again.");
      console.error("Login failed:", error);
    }
  };

  if (user && user.user_metadata.user_role === "learner") {
    if (active === "login") return <Navigate to="/home" />;
    return <Navigate to="/onboard/birthday" />;
  } else if (user && user.user_metadata.user_role === "instructor") {
    return <Navigate to="/instructor" />;
  }

  return (
    <div className="flex h-screen items-center justify-center font-glancyr">
      <div className="mx-auto flex aspect-[9/16] h-full max-h-[1000px] overflow-hidden rounded-lg bg-white shadow-lg">
        <div className="flex h-full w-full flex-col">
          <header className="relative h-[400px]">
            <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
              <img
                src="/assets/login-hero.png"
                alt="Person with car"
                className="h-full w-full object-fill"
              />
            </div>
          </header>

          <div className="flex h-full flex-col gap-6 p-6">
            <div className="flex flex-col items-center">
              <h2 className="text-2xl">Ready to take the wheel?</h2>
              <p className="text-lg">Let&apos;s get you driving!</p>
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
                    value={phone} // Bind phone state
                    onChange={(e) => setPhone(e.target.value)} // Update phone state
                  />
                </div>
                <div className="space-y-1">
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder={
                        active === "login"
                          ? "Enter Password"
                          : "Create Password"
                      }
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                  {errorMessage && (
                    <p className="text-sm text-destructive" role="alert">
                      {errorMessage}
                    </p>
                  )}
                </div>
                <div className="flex flex-col items-center gap-1">
                  {active === "login" ? (
                    <>
                      <Button className="w-full" type="submit">
                        Login
                      </Button>
                      <p className="text-sm text-muted-foreground">
                        Not signed up ?
                        <Button
                          type="button"
                          variant={"link"}
                          onClick={() => {
                            setSearchParams({ active: "signup" });
                            setErrorMessage("");
                          }}
                        >
                          Signup
                        </Button>
                      </p>
                    </>
                  ) : (
                    <>
                      <Button className="w-full" type="submit">
                        Signup
                      </Button>
                      <p className="text-sm text-muted-foreground">
                        Already signed up ?
                        <Button
                          type="button"
                          variant={"link"}
                          onClick={() => {
                            setSearchParams({ active: "login" });
                            setErrorMessage("");
                          }}
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
                  target="_blank"
                  href="https://inlane.in/terms-and-conditions"
                  className="text-muted-foreground hover:text-blue-500 hover:underline"
                  rel="noreferrer"
                >
                  Terms of Service
                </a>
                <a
                  target="_blank"
                  href="https://inlane.in/privacy-policy"
                  className="text-muted-foreground hover:text-blue-500 hover:underline"
                  rel="noreferrer"
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
