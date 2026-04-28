// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

/// <reference lib="deno.ns" />
/// <reference lib="dom" />

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { title, startTime, endTime, attendees, description, location } =
      await req.json();

    // Cal.com API credentials
    const apiKey = Deno.env.get("CAL_API_KEY");
    const userId = 991901;
    const eventTypeId = 2249209;

    if (!apiKey || !userId || !eventTypeId) {
      throw new Error("Cal.com API credentials not configured");
    }

    // Format the dates as required by Cal.com API
    const startDate = new Date(startTime);
    const endDate = new Date(endTime);

    // Create the booking via Cal.com API
    const response = await fetch(`https://api.cal.com/v1/bookings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        eventTypeId: parseInt(eventTypeId),
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        title,
        description,
        responses: {
          name: attendees[0].name,
          email: attendees[0].email,
          location: location || "",
          guests: attendees
            .slice(1)
            .map((a) => a.email)
            .join(","),
          notes: description,
        },
      }),
    });

    const responseData = await response.json();

    if (!response.ok) {
      console.error("Cal.com API error:", responseData);
      return new Response(
        JSON.stringify({
          success: false,
          error: `Cal.com API error: ${JSON.stringify(responseData)}`,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: response.status,
        },
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        eventId: responseData.uid || responseData.id,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error) {
    console.error("Error creating Cal.com event:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      },
    );
  }
});
