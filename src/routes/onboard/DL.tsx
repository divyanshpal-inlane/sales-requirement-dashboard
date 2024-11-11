import { useNavigate } from "react-router";

import { Button } from "@/components/ui/button";
import { useLearnerUpdate } from "@/queries/learner";

export default function DLQuestion() {
  const { mutate, isPending } = useLearnerUpdate();
  const navigate = useNavigate();

  const handleDLResponse = (response: boolean) => {
    if (response) {
      mutate(
        {
          LL_result: true,
          has_a_DL: true,
        },
        {
          onSuccess: () => {
            navigate("/home");
          },
        },
      );
    } else {
      mutate(
        {
          LL_result: null,
          has_a_DL: false,
        },
        {
          onSuccess: () => {
            window.open("https://forms.gle/4Qe8ttAhBYHE7PDq8", "_blank");
            navigate("/home");
          },
        },
      );
    }
  };

  return (
    <div className="flex h-full w-full flex-col">
      <header className="relative h-[400px]">
        <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
          <img
            src={"/assets/lesson1.png"}
            alt="Four-wheeler with driver"
            className="h-full w-full object-fill"
          />
        </div>
      </header>

      <div className="flex h-full flex-col gap-6 p-6">
        <div className="flex flex-col items-center">
          <h2 className="text-center text-2xl">
            Do you have a DL for a Four Wheeler?
          </h2>
          <p className="text-lg">Let us know to proceed further.</p>
        </div>

        <div className="flex flex-col gap-4">
          <Button
            disabled={isPending}
            className="w-full"
            onClick={() => handleDLResponse(true)}
          >
            Yes
          </Button>
          <Button
            disabled={isPending}
            className="w-full"
            variant="outline"
            onClick={() => handleDLResponse(false)}
          >
            No
          </Button>
        </div>
      </div>

      <footer className="mb-12 mt-auto flex flex-col text-center text-sm">
        By continuing, you agree to our
        <nav className="flex flex-row justify-center gap-4">
          <a
            href="/terms-of-service"
            className="text-muted-foreground hover:text-blue-500 hover:underline"
          >
            Terms of Service
          </a>
          <a
            href="/privacy-policies"
            className="text-muted-foreground hover:text-blue-500 hover:underline"
          >
            Privacy Policies
          </a>
        </nav>
      </footer>
    </div>
  );
}
