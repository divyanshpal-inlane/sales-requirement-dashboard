import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  BrowserRouter,
  Navigate,
  Outlet,
  Route,
  Routes,
} from "react-router-dom";

import Aadhar from "@/app/aadhar";
import Birthday from "@/app/birthday";
import Home from "@/app/home";
import LL_test_booking_1 from "@/app/LL_test_booking_1";
import LL_test_booking_2 from "@/app/LL_test_booking_2";
import LL_test_booking_3 from "@/app/LL_test_booking_3";
import Page from "@/app/login/page";
import Prep from "@/app/prep";
import Schedule from "@/app/schedule";
import MainLayout from "@/components/layout/main-layout";
import Plam from "@/components/lesson/plan";
import { AuthProvider } from "@/context/auth-context";

import LessonReview from "./app/LessonReview";
import OTP from "./app/OTP";
import TimerAndEmergency from "./app/TimerAndEmergency";

const queryClient = new QueryClient();

export default function App() {
  return (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Page />} />
            <Route path="/" element={<MainLayout />}>
              <Route index element={<Navigate to="/home" replace />} />
              <Route path="home" element={<Home />} />
              <Route path="prep" element={<Prep />} />
              <Route path="schedule" element={<Schedule />} />
            </Route>
            <Route path="/" element={<Outlet />}>
              <Route path="birthday" element={<Birthday />} />
              <Route path="aadhar" element={<Aadhar />} />
              <Route path="bookLL-1" element={<LL_test_booking_1 />} />
              <Route path="bookLL-2/:navId" element={<LL_test_booking_2 />} />
              <Route path="bookLL-3" element={<LL_test_booking_3 />} />
              <Route path="lesson/:lessonId" element={<Plam />} />
              <Route path="/OTP/:lessonId" element={<OTP />} />
              <Route path="/timer" element={<TimerAndEmergency />} />
              <Route path="/lesson-review" element={<LessonReview />} />
            </Route>
          </Routes>
        </AuthProvider>
      </QueryClientProvider>
    </BrowserRouter>
  );
}
