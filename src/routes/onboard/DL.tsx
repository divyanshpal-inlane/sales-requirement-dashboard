import { useNavigate } from "react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useLearnerUpdate } from "@/queries/learner";
import { supabase } from "@/lib/supabaseClient";

export default function DLQuestion() {
  const { mutate, isPending } = useLearnerUpdate();
  const navigate = useNavigate();
  const [learner, setLearner] = useState<any>(null);

  useEffect(() => {
    // Fetch learner details
    const fetchLearnerDetails = async () => {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        console.error("Error fetching session:", sessionError);
        return;
      }

      const learnerId = session?.user?.id;

      if (!learnerId) {
        console.error("Learner ID not found in session");
        return;
      }

      const { data: learnerData, error } = await supabase
        .from("Learner")
        .select("*")
        .eq("id", learnerId) // Use the learnerId parameter to fetch the correct learner
        .single();

      if (error) {
        console.error("Error fetching learner details:", error);
      } else {
        setLearner(learnerData);
      }
    };

    fetchLearnerDetails();
  }, []);

  const handleDLResponse = (response: boolean) => {
    if (response) {
      mutate(
        {
          LL_result: true,
          has_a_DL: true,
          onboarding_completed: true,
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
          onboarding_completed: true,
        },
        {
          onSuccess: () => {
            window.open("https://forms.gle/4Qe8ttAhBYHE7PDq8", "_blank");
            navigate("/home");
            if (learner) {
              supabase.functions.invoke("send-message", {
                body: {
                  message_type: "LL_DETAILS_BOOK_APPOINTMENT",
                  learner_id: learner.id,
                },
              });
            }
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
