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
import BookLL from "@/app/bookLL";
import Home from "@/app/home";
import Page from "@/app/login/page";
import Prep from "@/app/prep";
import Schedule from "@/app/schedule";
import MainLayout from "@/components/layout/main-layout";
import Plam from "@/components/lesson/plan";
import { AuthProvider } from "@/context/auth-context";

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
              <Route path="bookLL" element={<BookLL />} />
              <Route path="lesson/:lessonId" element={<Plam />} />
            </Route>
          </Routes>
        </AuthProvider>
      </QueryClientProvider>
    </BrowserRouter>
  );
}
