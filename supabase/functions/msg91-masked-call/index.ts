// MSG91 Click-to-Call — used exclusively for Instructor ↔ KAM calls.
// Learner ↔ Instructor calls use the Exotel-powered `masked-call` function.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { from, to } = await req.json();

    if (!from || !to) {
      throw new Error("'from' and 'to' phone numbers are required");
    }

    const MSG91_AUTHKEY = Deno.env.get("MSG91_AUTHKEY");
    const MSG91_CALLER_ID = Deno.env.get("MSG91_CALLER_ID");
    const MSG91_VOICE_URL =
      Deno.env.get("MSG91_VOICE_URL") ||
      "https://control.msg91.com/api/v5/voice/call/ctc";

    if (!MSG91_AUTHKEY || !MSG91_CALLER_ID) {
      throw new Error("MSG91 credentials are not configured");
    }

    const normalizePhone = (phone: string) => {
      const digits = phone.replace(/\D/g, "");
      if (digits.startsWith("91") && digits.length === 12) return digits;
      if (digits.length === 10) return `91${digits}`;
      return digits;
    };

    const destination = normalizePhone(from);
    const destinationB = normalizePhone(to);

    const payload = {
      caller_id: MSG91_CALLER_ID,
      destination,
      destinationB: [destinationB],
    };

    console.log("[msg91-masked-call] Calling MSG91:", MSG91_VOICE_URL);
    console.log(
      "[msg91-masked-call] From:",
      destination,
      "To:",
      destinationB,
      "CallerId:",
      MSG91_CALLER_ID,
    );

    const response = await fetch(MSG91_VOICE_URL, {
      method: "POST",
      headers: {
        authkey: MSG91_AUTHKEY,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });

    const responseText = await response.text();
    console.log("[msg91-masked-call] MSG91 response status:", response.status);
    console.log("[msg91-masked-call] MSG91 response body:", responseText);

    if (!response.ok) {
      throw new Error(`MSG91 API error: ${response.status} - ${responseText}`);
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch {
      data = { raw: responseText };
    }

    return new Response(
      JSON.stringify({
        success: true,
        callSid:
          data?.data?.id ??
          data.requestId ??
          data.request_id ??
          data.id ??
          null,
        status: data.message ?? data.type ?? data.status ?? null,
        raw: data,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error) {
    console.error("[msg91-masked-call] Error:", (error as Error).message);
    return new Response(
      JSON.stringify({ success: false, error: (error as Error).message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      },
    );
  }
});
