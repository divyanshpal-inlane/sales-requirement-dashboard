import { DatePickerDemo } from "@/components/date-picker";
import GreenGradient from "@/components/layout/greenGradient";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Calendar, HomeIcon, Library } from "lucide-react";
import { NavLink } from "react-router-dom";

export default function Home() {
  return (
    <GreenGradient>
      <div className="relative flex h-full flex-col overflow-y-auto p-6 pb-20">
        <div className="mb-6 flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            className="text-primary-foreground"
          >
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <h1 className="text-xl">Test Date</h1>
          <div className="w-6" />
        </div>

        <div className="mb-6 overflow-hidden rounded-3xl bg-white shadow-lg">
          <img
            src="/api/placeholder/400/240"
            alt="Person using laptop"
            className="h-48 w-full object-cover"
          />
        </div>

        <Label className="mb-4 text-xl">
          When are you taking your Learners License Test?
        </Label>

        <DatePickerDemo />

        <Button className="mt-auto w-full" variant={"purple"}>
          Submit
        </Button>
      </div>
      <footer className="sticky bottom-0 w-full border-t border-gray-400 bg-white">
        <nav className="flex justify-between px-6">
          <NavLink to="/aadhar" className="flex items-center">
            {({ isActive }) => (
              <p
                className={`flex h-fit w-fit flex-col items-center border-primary px-4 py-2 text-xs ${isActive ? "-translate-y-0.5 border-t-4" : ""}`}
              >
                <Library
                  size={24}
                  className={isActive ? "stroke-primary" : "stroke-gray-400"}
                />
                <span>Prep time</span>
              </p>
            )}
          </NavLink>
          <NavLink to="/home" className="flex items-center">
            {({ isActive }) => (
              <p
                className={`flex h-fit w-fit flex-col items-center border-primary px-4 py-2 text-xs ${isActive ? "-translate-y-0.5 border-t-4" : ""}`}
              >
                <HomeIcon
                  size={24}
                  className={isActive ? "stroke-primary" : "stroke-gray-400"}
                />
                <span>Home</span>
              </p>
            )}
          </NavLink>
          <NavLink to="/birthday" className="flex items-center">
            {({ isActive }) => (
              <p
                className={`flex h-fit w-fit flex-col items-center border-primary px-4 py-2 text-xs ${isActive ? "-translate-y-0.5 border-t-4" : ""}`}
              >
                <Calendar
                  size={24}
                  className={isActive ? "stroke-primary" : "stroke-gray-400"}
                />
                <span>My schedule</span>
              </p>
            )}
          </NavLink>
        </nav>
      </footer>
    </GreenGradient>
  );
}
