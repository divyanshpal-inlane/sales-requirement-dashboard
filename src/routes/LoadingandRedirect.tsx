import React, { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

interface LocationState {
  from?: string;
}

const LoadingAndRedirect: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState;

  // Use state passed via navigate to next page.
  const targetPath = state?.next || "/";

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate(targetPath, { replace: true });
    }, 5000); // 5 seconds delay

    return () => clearTimeout(timer);
  }, [navigate, targetPath]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white font-sans text-neutral-900">
      <h1 className="mb-3 text-2xl font-bold">Loading...</h1>
    </div>
  );
};

export default LoadingAndRedirect;
