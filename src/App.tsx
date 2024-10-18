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
import RescheduleView from "@/components/lesson/RescheduleView";
import {
  AuthProvider,
  ProtectedInstructorRoute,
  ProtectedLearnerRoute,
} from "@/context/auth-context";
import ScheduleDetails from "@/routes/createSchedule/details";
import ScheduleSlots from "@/routes/createSchedule/slots";
import UploadLL from "@/routes/createSchedule/uploadLL";
import Home from "@/routes/home";
import InstructorAuth from "@/routes/InstructorAuth";
import Login from "@/routes/login";
import Aadhar from "@/routes/onboard/aadhar";
import Birthday from "@/routes/onboard/birthday";
import DLQuestion from "@/routes/onboard/DL";
import Prep from "@/routes/prep";
import Profile2 from "@/routes/profile2";
import Schedule from "@/routes/schedule";
import Start from "@/routes/start";
import StartLesson from "@/routes/startLesson";

import Instructor from "./app/instructor/Instructor";
import LessonReview from "./app/LessonReview";
import Lesson10 from "./components/lesson/signature";

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
            <Route path="/instructor-login" element={<InstructorAuth />} />
            <Route
              path="/onboard"
              element={
                <ProtectedLearnerRoute>
                  <Outlet />
                </ProtectedLearnerRoute>
              }
            >
              <Route path="birthday" element={<Birthday />} />
              <Route path="aadhar" element={<Aadhar />} />
              <Route path="dl" element={<DLQuestion />} />
            </Route>
            <Route
              path="/"
              element={
                <ProtectedLearnerRoute>
                  <MainLayout />
                </ProtectedLearnerRoute>
              }
            >
              <Route index element={<Navigate to="/home" replace />} />
              <Route path="home" element={<Home />} />
              <Route path="prep" element={<Prep />} />
              <Route path="schedule" element={<Schedule />} />
              <Route path="profile" element={<Profile2 />} />
            </Route>
            <Route path="/signature" element={<Lesson10 />} />
            <Route
              path="createSchedule"
              element={
                <ProtectedLearnerRoute>
                  <Outlet />
                </ProtectedLearnerRoute>
              }
            >
              <Route path="details" element={<ScheduleDetails />} />
              <Route path="slots" element={<ScheduleSlots />} />
              <Route path="uploadLL" element={<UploadLL />} />
            </Route>
            <Route
              path="/"
              element={
                <ProtectedLearnerRoute>
                  <Outlet />
                </ProtectedLearnerRoute>
              }
            >
              <Route path="birthday" element={<Birthday />} />
              <Route path="aadhar" element={<Aadhar />} />
              <Route path="bookLL-1" element={<LL_test_booking_1 />} />
              <Route path="bookLL-2/:navId" element={<LL_test_booking_2 />} />
              <Route path="bookLL-3" element={<LL_test_booking_3 />} />
              <Route path="/startLesson" element={<StartLesson />} />
              <Route path="/lesson-review" element={<LessonReview />} />
            </Route>
            <Route
              path="/lesson/:lessonId"
              element={
                <ProtectedLearnerRoute>
                  <Plan />
                </ProtectedLearnerRoute>
              }
            />
            <Route
              path="/instructor"
              element={
                <ProtectedInstructorRoute>
                  <Instructor />
                </ProtectedInstructorRoute>
              }
            />
            <Route
              path="/reschedule/:lessonId"
              element={
                <ProtectedLearnerRoute>
                  <RescheduleView />
                </ProtectedLearnerRoute>
              }
            />
          </Routes>
        </AuthProvider>
      </QueryClientProvider>
    </BrowserRouter>
  );
}
