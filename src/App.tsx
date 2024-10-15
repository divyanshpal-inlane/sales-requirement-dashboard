import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  BrowserRouter,
  Navigate,
  Outlet,
  Route,
  Routes,
} from "react-router-dom";

import LL_test_booking_1 from "@/app/LL_test_booking_1";
import LL_test_booking_2 from "@/app/LL_test_booking_2";
import LL_test_booking_3 from "@/app/LL_test_booking_3";
import MainLayout from "@/components/layout/main-layout";
import Plan from "@/components/lesson/plan";
import { AuthProvider, ProtectedRoute } from "@/context/auth-context";
import ScheduleDetails from "@/routes/createSchedule/details";
import ScheduleSlots from "@/routes/createSchedule/slots";
import UploadLL from "@/routes/createSchedule/uploadLL";
import Home from "@/routes/home";
import Login from "@/routes/login";
import Aadhar from "@/routes/onboard/aadhar";
import Birthday from "@/routes/onboard/birthday";
import DLQuestion from "@/routes/onboard/DL";
import Prep from "@/routes/prep";
import Schedule from "@/routes/schedule";
import Start from "@/routes/start";

import Instructor from "./app/instructor/Instructor";
import LessonReview from "./app/LessonReview";
import OTP from "./app/OTP";
import TimerAndEmergency from "./app/TimerAndEmergency";
import Lesson10 from "./components/lesson/lesson10";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
});

export default function App() {
  return (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <Routes>
            <Route path="/start" element={<Start />} />
            <Route path="/login" element={<Login />} />
            <Route
              path="/onboard"
              element={
                <ProtectedRoute>
                  <Outlet />
                </ProtectedRoute>
              }
            >
              <Route path="birthday" element={<Birthday />} />
              <Route path="aadhar" element={<Aadhar />} />
              <Route path="dl" element={<DLQuestion />} />
            </Route>
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <MainLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/home" replace />} />
              <Route path="home" element={<Home />} />
              <Route path="prep" element={<Prep />} />
              <Route path="schedule" element={<Schedule />} />
            </Route>
            <Route path="/signature" element={<Lesson10 />} />
            <Route
              path="createSchedule"
              element={
                <ProtectedRoute>
                  <Outlet />
                </ProtectedRoute>
              }
            >
              <Route path="details" element={<ScheduleDetails />} />
              <Route path="slots" element={<ScheduleSlots />} />
              <Route path="uploadLL" element={<UploadLL />} />
            </Route>
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Outlet />
                </ProtectedRoute>
              }
            >
              <Route path="birthday" element={<Birthday />} />
              <Route path="aadhar" element={<Aadhar />} />
              <Route path="bookLL-1" element={<LL_test_booking_1 />} />
              <Route path="bookLL-2/:navId" element={<LL_test_booking_2 />} />
              <Route path="bookLL-3" element={<LL_test_booking_3 />} />
              <Route path="/OTP/:lessonId" element={<OTP />} />
              <Route path="/timer" element={<TimerAndEmergency />} />
              <Route path="/lesson-review" element={<LessonReview />} />
              <Route path="/instructor" element={<Instructor />} />
            </Route>
            <Route
              path="/lesson/:lessonId"
              element={
                <ProtectedRoute>
                  <Plan />
                </ProtectedRoute>
              }
            />
          </Routes>
        </AuthProvider>
      </QueryClientProvider>
    </BrowserRouter>
  );
}
