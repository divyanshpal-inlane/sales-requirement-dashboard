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
  const sendAdminEmail = async (subject: string, message: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('send-admin-email', {
        body: { subject, message }
      });
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error sending admin email:', error);
      throw error;
    }
  };

  const handleDLResponse = async (response: boolean) => {
    try {
      if (response) {
        // User has a DL
        await mutate(
          {
            LL_result: true,
            has_a_DL: true,
            onboarding_completed: true,
          },
          {
            onSuccess: async () => {
              // Send message for users who already have a DL
              if (learner?.id) {
                await supabase.functions.invoke("send-message", {
                  body: {
                    message_type: "SIGN_UP_DONE_SCHEDULE_PLEASE", // This is the closest match to what you requested
                    learner_id: learner.id
                  }
                });
              }
              navigate("/home");
            },
          }
        );
      } else {
        // User does not have a DL
        await mutate(
          {
            LL_result: null,
            has_a_DL: false,
            onboarding_completed: true,
          },
          {
            onSuccess: async () => {
              // Send message for users who need to get a learner's license first
              if (learner?.id) {
                console.log("Sending message to learner:", learner.id);
                await supabase.functions.invoke("send-message", {
                  body: {
                    message_type: "WEBAPP_THANK_YOU_FOR_SIGNING_UP_LL_FIRST",
                    learner_id: learner.id
                  }
                });
                await sendAdminEmail(
                  "New Learner's License Application Needed",
                  `A new learner needs to apply for a Learner's License. 
                   Please fill in their application ID when completed.`
                );
              }
              window.open("https://forms.gle/4Qe8ttAhBYHE7PDq8", "_blank");
              navigate("/home");
            },
          }
        );
      }
    } catch (error) {
      console.error("Error handling DL response:", error);
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
