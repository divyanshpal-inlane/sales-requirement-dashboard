import { GoogleOAuthProvider } from "@react-oauth/google";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { APIProvider } from "@vis.gl/react-google-maps";
import {
  BrowserRouter,
  Navigate,
  Outlet,
  Route,
  Routes,
} from "react-router-dom";

import Instructor from "@/app/instructor/Instructor";
import InstructorProfile from "@/app/instructor/InstructorProfile";
import OTP from "@/app/instructor/OTP";
import LessonReview from "@/app/LessonReview";
import LL_test_booking_1 from "@/app/LL_test_booking_1";
import LL_test_booking_2 from "@/app/LL_test_booking_2";
import LL_test_booking_3 from "@/app/LL_test_booking_3";
import MainLayout from "@/components/layout/main-layout";
import Plan from "@/components/lesson/plan";
import RescheduleView from "@/components/lesson/RescheduleView";
import Lesson10 from "@/components/lesson/signature";
import PaymentCallback from "@/components/payment/PaymentCallback";
import PaymentPage from "@/components/payment/PaymentPage";
import PaymentStatus from "@/components/payment/PaymentStatus";
import ReschedulePaymentCallback from "@/components/payment/ReschedulePaymentCallback";
import {
  AuthProvider,
  ProtectedAdminRoute,
  ProtectedInstructorRoute,
  ProtectedLearnerRoute,
} from "@/context/auth-context";
import AdminHome from "@/routes/admin/AdminHome";
import DLTestDates from "@/routes/admin/DLTestDates";
import InstructorsManagement from "@/routes/admin/instructors";
import LearnerLLDetails from "@/routes/admin/LearnerLLDetails";
import AdminSchedules from "@/routes/admin/schedules";
import AdminLogin from "@/routes/admin-login";
import ScheduleDetails from "@/routes/createSchedule/details";
import UploadLL from "@/routes/createSchedule/uploadLL";
import Home from "@/routes/home";
import InstructorAuth from "@/routes/InstructorAuth";
import Login from "@/routes/login";
import Aadhar from "@/routes/onboard/aadhar";
import Birthday from "@/routes/onboard/birthday";
import DLQuestion from "@/routes/onboard/DL";
import Preferences from "@/routes/preferences";
import Prep from "@/routes/prep";
import Profile2 from "@/routes/profile2";
import Schedule from "@/routes/schedule";
import Start from "@/routes/start";
import StartLesson from "@/routes/startLesson";

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
            <Route path="/admin-login" element={<AdminLogin />} />
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
              {/* <Route path="preferences" element={<Preferences />} /> */}
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
              <Route
                path="details"
                element={
                  <APIProvider
                    apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}
                  >
                    <ScheduleDetails />
                  </APIProvider>
                }
              />
              {/* <Route path="slots" element={<ScheduleSlots />} /> */}
              <Route path="preferences" element={<Preferences />} />
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
              <Route
                path="/startLesson/:lessonNumber"
                element={<StartLesson />}
              />
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
                <GoogleOAuthProvider
                  clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}
                >
                  <ProtectedInstructorRoute>
                    <Instructor />
                  </ProtectedInstructorRoute>
                </GoogleOAuthProvider>
              }
            />
            <Route
              path="/instructor-profile"
              element={
                <ProtectedInstructorRoute>
                  <InstructorProfile />
                </ProtectedInstructorRoute>
              }
            />
            <Route
              path="/otp/:learnerId/:scheduleId"
              element={
                <ProtectedInstructorRoute>
                  <OTP />
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
            <Route
              path="/admin"
              element={
                <ProtectedAdminRoute>
                  <Outlet />
                </ProtectedAdminRoute>
              }
            >
              <Route index element={<AdminHome />} />
              <Route path="schedules" element={<AdminSchedules />} />
              <Route path="instructors" element={<InstructorsManagement />} />
              <Route path="learner-ll-details" element={<LearnerLLDetails />} />
              <Route path="dl-test-dates" element={<DLTestDates />} />
            </Route>
            <Route path="/payment" element={<PaymentPage />} />
            <Route path="/payment/callback" element={<PaymentCallback />} />
            <Route path="/payment/success" element={<PaymentStatus />} />
            <Route path="/payment/failure" element={<PaymentStatus />} />
            <Route
              path="/reschedule/callback"
              element={<ReschedulePaymentCallback />}
            />
          </Routes>
        </AuthProvider>
      </QueryClientProvider>
    </BrowserRouter>
  );
}
