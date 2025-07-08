import { Calendar, HomeIcon, Library, HelpCircle } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";

import GreenGradient from "@/components/layout/greenGradient";

export default function MainLayout() {
  return (
    <GreenGradient>
      <div className="relative h-full">
        <Outlet />
      </div>
      <footer className="sticky bottom-0 w-full border-t border-gray-400 bg-white/50 backdrop-blur-lg backdrop-filter">
        <nav className="flex justify-around px-2">
          <NavLink
            to="/prep"
            className="flex min-w-0 flex-1 items-center justify-center"
          >
            {({ isActive }) => (
              <div
                className={`flex h-fit w-fit flex-col items-center border-primary px-2 py-2 text-xs ${isActive ? "-translate-y-0.5 border-t-4" : ""}`}
              >
                <Library
                  size={20}
                  className={isActive ? "stroke-primary" : "stroke-gray-400"}
                />
                <span className="mt-1 text-center leading-tight">Prep</span>
              </div>
            )}
          </NavLink>
          <NavLink
            to="/home"
            className="flex min-w-0 flex-1 items-center justify-center"
          >
            {({ isActive }) => (
              <div
                className={`flex h-fit w-fit flex-col items-center border-primary px-2 py-2 text-xs ${isActive ? "-translate-y-0.5 border-t-4" : ""}`}
              >
                <HomeIcon
                  size={20}
                  className={isActive ? "stroke-primary" : "stroke-gray-400"}
                />
                <span className="mt-1 text-center leading-tight">Home</span>
              </div>
            )}
          </NavLink>
          <NavLink
            to="/schedule"
            className="flex min-w-0 flex-1 items-center justify-center"
          >
            {({ isActive }) => (
              <div
                className={`flex h-fit w-fit flex-col items-center border-primary px-2 py-2 text-xs ${isActive ? "-translate-y-0.5 border-t-4" : ""}`}
              >
                <Calendar
                  size={20}
                  className={isActive ? "stroke-primary" : "stroke-gray-400"}
                />
                <span className="mt-1 text-center leading-tight">Schedule</span>
              </div>
            )}
          </NavLink>

          <NavLink
            to="/help"
            className="flex min-w-0 flex-1 items-center justify-center"
          >
            {({ isActive }) => (
              <div
                className={`flex h-fit w-fit flex-col items-center border-primary px-2 py-2 text-xs ${isActive ? "-translate-y-0.5 border-t-4" : ""}`}
              >
                <HelpCircle
                  size={20}
                  className={isActive ? "stroke-primary" : "stroke-gray-400"}
                />
                <span className="mt-1 text-center leading-tight">Help</span>
              </div>
            )}
          </NavLink>
        </nav>
      </footer>
    </GreenGradient>
  );
}
