import Aadhar from "@/app/aadhar";
import Birthday from "@/app/birthday";
import BookLL from "@/app/bookLL";
import Home from "@/app/home";
import Page from "@/app/login/page";
import Lesson from "@/components/lesson";
import { useState } from "react";
import { BrowserRouter, Outlet, Route, Routes } from "react-router-dom";

export default function App() {
  const [count, setCount] = useState(0);

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            <div className="flex h-screen items-center justify-center">
              <div className="mx-auto flex h-full max-h-[1000px] w-full max-w-md overflow-hidden rounded-lg bg-white shadow-lg">
                <Outlet />
              </div>
            </div>
          }
        >
          <Route path="login" element={<Page />} />
          <Route path="birthday" element={<Birthday />} />
          <Route path="aadhar" element={<Aadhar />} />
          <Route path="bookLL" element={<BookLL />} />
          <Route path="home" element={<Home />} />
          <Route path="lesson/:lessonId" element={<Lesson />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
