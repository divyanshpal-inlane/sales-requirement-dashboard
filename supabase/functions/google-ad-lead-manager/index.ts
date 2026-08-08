// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
console.info("server started");
// Function to flatten the incoming data
function parseGoogleLeadData(incomingData) {
  return {
    // These leads come exclusively from Google Ads lead forms — without an
    // explicit source, Cratio misattributes them to its default (SEO).
    leadSource: "Paid Search",
    utm_source: "google",
    utm_medium: "cpc",
    lead_id: incomingData.lead_id,
    user_email: incomingData.user_column_data[0]?.string_value || "",
    user_phone: incomingData.user_column_data[1]?.string_value || "",
    postal_code: incomingData.user_column_data[2]?.string_value || "",
    full_name: incomingData.user_column_data[3]?.string_value || "",
    has_driver_license: incomingData.user_column_data[4]?.string_value || "",
    api_version: incomingData.api_version,
    form_id: incomingData.form_id,
    campaign_id: incomingData.campaign_id,
    google_key: incomingData.google_key,
    is_test: incomingData.is_test,
    gcl_id: incomingData.gcl_id,
    adgroup_id: incomingData.adgroup_id,
    creative_id: incomingData.creative_id,
  };
}
Deno.serve(async (req) => {
  const incomingData = await req.json();
  console.log(`incomding data: ${JSON.stringify(incomingData)}`);
  //TODO: save to database for further use
  const parsedData = parseGoogleLeadData(incomingData);
  console.log(`parsed data: ${JSON.stringify(parsedData)}`);
  const response = await fetch(
    "https://apps.cratiocrm.com/Customize/Webhooks/webhook.php?id=593650",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(parsedData),
    },
  );
  if (response) {
    console.log(`response ${JSON.stringify(response)}`);
  }
  return new Response(JSON.stringify(response), {
    headers: {
      "Content-Type": "application/json",
      Connection: "keep-alive",
    },
  });
});
