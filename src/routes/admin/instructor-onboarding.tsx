import { APIProvider } from "@vis.gl/react-google-maps";

import { OnboardingWizard } from "@/components/admin/instructor-onboarding/OnboardingWizard";

export default function InstructorOnboardingPage() {
  return (
    <APIProvider apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}>
      <div className="container mx-auto px-4 py-6">
        <OnboardingWizard />
      </div>
    </APIProvider>
  );
}
