import { Calendar, HomeIcon, Library } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";

import GreenGradient from "@/components/layout/greenGradient";

export default function MainLayout() {
  return (
    <GreenGradient>
      <div className="relative h-full">
        <Outlet />
      </div>
      <footer className="sticky bottom-0 w-full border-t border-gray-400 bg-white/50 backdrop-blur-lg backdrop-filter">
        <nav className="flex justify-between px-6">
          <NavLink to="/prep" className="flex items-center">
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
          <NavLink to="/schedule" className="flex items-center">
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
