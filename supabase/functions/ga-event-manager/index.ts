// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.
// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, content-length",
  "Access-Control-Max-Age": "86400",
};
console.log("Hello from ga-event-manager!");
async function handleFormPageEvent(eventData, clientId) {
  console.log("Handling form page event with data:", clientId, eventData);
  try {
    const measurementId1 = Deno.env.get("GA_MEASUREMENT_ID");
    const apiSecret1 = Deno.env.get("GA_API_SECRET");
    const response = await fetch(
      `https://www.google-analytics.com/mp/collect?measurement_id=${measurementId1}&api_secret=${apiSecret1}`,
      {
        method: "POST",
        body: JSON.stringify({
          client_id: clientId,
          events: [
            {
              name: "signup_completed",
              params: eventData,
            },
          ],
        }),
      },
    );
    if (response) {
      console.log(
        "handleFormPageEvent response:",
        response.status,
        response.statusText,
      );
    }
  } catch (error) {
    console.error("Error handling form page event:", error);
  }
}
async function handleLandingPageSignup(eventData, clientId) {
  // Only phone number is expected
  if (!eventData.phone) {
    console.log(`no phone number found for client id ${clientId}`);
    return;
  }
  try {
    const measurementId = Deno.env.get("GA_MEASUREMENT_ID");
    const apiSecret = Deno.env.get("GA_API_SECRET");
    const response = await fetch(
      `https://www.google-analytics.com/mp/collect?measurement_id=${measurementId}&api_secret=${apiSecret}`,
      {
        method: "POST",
        body: JSON.stringify({
          client_id: clientId,
          events: [
            {
              name: "signup_completed",
              params: eventData,
            },
          ],
        }),
      },
    );
    if (response) {
      console.log(
        "handleLandingPageSignup response:",
        response.status,
        response.statusText,
      );
    }
  } catch (error) {
    console.error("error handling from landing pager signup", error);
  }
}
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  }
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", {
      status: 405,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  }
  const { eventSource, clientId, leadData } = await req.json();
  switch (eventSource) {
    case "event-from-form-page": {
      const resp = await handleFormPageEvent(leadData, clientId);
      return new Response(JSON.stringify(resp), {
        status: 200,
        headers: corsHeaders,
      });
    }
    case "landing_page_signup": {
      const resp = await handleLandingPageSignup(leadData, clientId);
      return new Response(JSON.stringify(resp), {
        status: 200,
        headers: corsHeaders,
      });
    }
    case "event-from-payment-page": {
      break;
    }
    default: {
      return new Response("Bad Request: Invalid event source", {
        status: 400,
        headers: corsHeaders,
      });
    }
  }
  return new Response("Event not processed", {
    status: 400,
    headers: corsHeaders,
  });
}); /* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/ga-event-manager' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
