import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function LoginForm() {
  return (
    <div className="h-full">
      <div className="relative h-64 bg-primary">
        <svg
          className="absolute bottom-0 h-16 w-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          <path d="M0,100 C50,0 50,0 100,100 Z" fill="white" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
          <img
            src="/api/placeholder/400/320"
            alt="Person with car"
            className="h-full w-full object-cover"
          />
        </div>
      </div>

      <div className="p-6">
        <h2 className="mb-2 text-2xl font-bold">Ready to take the wheel?</h2>
        <p className="mb-6 text-lg">Let's get you driving!</p>

        <div className="space-y-4">
          <div className="flex h-fit rounded-md shadow-md">
            <span className="flex items-center rounded-l-md border border-r-0 bg-gray-100 px-3 text-gray-500">
              +91
            </span>
            <Input
              className="rounded-l-none shadow-none"
              placeholder="Enter Mobile Number"
            />
          </div>

          <Input type="password" placeholder="Create Password" />

          <Button className="w-full">Continue</Button>
        </div>

        <p className="mt-4 text-center text-sm">
          By continuing, you agree to our{" "}
          <a href="#" className="text-blue-500 hover:underline">
            Terms of Service
          </a>{" "}
          and{" "}
          <a href="#" className="text-blue-500 hover:underline">
            Privacy Policies
          </a>
        </p>
      </div>
    </div>
  );
}
