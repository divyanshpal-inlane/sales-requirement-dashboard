import { useState } from "react"; // Import useState
import { Navigate } from "react-router";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/auth-context";

export default function Login() {
  const { login, signUp, user } = useAuth();
  const [active, setActive] = useState<"login" | "signup">("login");
  const [phone, setPhone] = useState<string>("");
  const [password, setPassword] = useState<string>("");

  const onSubmitHandler = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (active === "login") {
        await login(phone, password);
      } else {
        await signUp(phone, password);
      }
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  if (user) {
    if (active === "signup") return <Navigate to="/home" />;
    return <Navigate to="/onboard/birthday" />;
  }

  return (
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
          {" "}
          {/* Add form element */}
          <div className="space-y-4">
            {/* <Input
              placeholder="Enter Your Name"
              value={name} // Bind phone state
              onChange={(e) => setName(e.target.value)} // Update phone state
            /> */}
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
            <Input
              type="password"
              placeholder="Create Password"
              value={password} // Bind password state
              onChange={(e) => setPassword(e.target.value)} // Update password state
            />
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
                      onClick={() => setActive("signup")}
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
              href="#"
              className="text-muted-foreground hover:text-blue-500 hover:underline"
            >
              Terms of Service
            </a>
            <a
              href="#"
              className="text-muted-foreground hover:text-blue-500 hover:underline"
            >
              Privacy Policies
            </a>
          </nav>
        </footer>
      </div>
    </div>
  );
}
