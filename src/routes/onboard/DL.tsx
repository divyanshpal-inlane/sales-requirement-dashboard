import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabaseClient";
import { useLearnerUpdate } from "@/queries/learner";
import { useQueryClient } from "@tanstack/react-query";


export default function DLQuestion() {
  const { mutate, isPending } = useLearnerUpdate();
  const navigate = useNavigate();
  const [learner, setLearner] = useState<any>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    // Fetch learner details
    const fetchLearnerDetails = async () => {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        console.error("Error fetching session:", sessionError);
        return;
      }

      const learnerPhone = session?.user?.phone;

      if (!learnerPhone) {
        console.error("Learner ID not found in session");
        return;
      }

      const { data: learnerData, error } = await supabase
        .from("Learner")
        .select("*")
        .eq("phone", learnerPhone) // Use the learnerPhone parameter to fetch the correct learner
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
      const { data, error } = await supabase.functions.invoke(
        "send-admin-email",
        {
          body: { subject, message },
        },
      );

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error sending admin email:", error);
      throw error;
    }
  };

  const handleDLResponse = async (response: boolean) => {
    try {
      if (response) {
        // User has a DL
        mutate(
          {
            LL_result: true,
            has_a_DL: true,
            onboarding_completed: true,
          },
          {
            onSuccess: async () => {
              console.log("Refetching learner query");
              // Refetch queries to ensure Learner data is updated on home page
              // Better solution than addding delays
              await queryClient.refetchQueries({ queryKey: ['learner'] });
              navigate("/home");
              
              // Send message in the background without awaiting
              if (learner) {
                supabase.functions
                  .invoke("send-message", {
                    body: {
                      message_type: "SIGN_UP_DONE_NEED_SCHEDULE",
                      learner_id: learner.id,
                    },
                  })
                  .catch((error) => {
                    console.error("Error sending message:", error);
                  });
                }
              },
          },
        );
      } else {
        // User does not have a DL
        mutate(
          {
            LL_result: null,
            has_a_DL: false,
            onboarding_completed: true,
          },
          {
            onSuccess: async () => {
              // Navigate and open form immediately
              // Form should not be displayed immediately
              // User should be redirected to home, then page
              // for filling form and booking appointment should be shown
              // window.open("https://forms.gle/4Qe8ttAhBYHE7PDq8", "_blank");
              console.log("Refetching learner query");
              // Refetch queries to ensure Learner data is updated on home page
              // Better solution than addding delays
              await queryClient.refetchQueries({ queryKey: ['learner'] });
              navigate("/home");

              // Send messages in the background without awaiting
              if (learner) {
                console.log("Sending message to learner:", learner.id);

                // Send WhatsApp message in background
                supabase.functions
                  .invoke("send-message", {
                    body: {
                      message_type: "WEBAPP_THANK_YOU_FOR_SIGNING_UP_LL_FIRST",
                      learner_id: learner.id,
                    },
                  })
                  .catch((error) => {
                    console.error("Error sending WhatsApp message:", error);
                  });

                // Send admin email in background
                sendAdminEmail(
                  "New Learner's License Application Needed",
                  `${learner.name} needs to apply for a Learner's License.\nPlease fill in their application ID when completed.`,
                ).catch((error) => {
                  console.error("Error sending admin email:", error);
                });
              }
            },
          },
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
