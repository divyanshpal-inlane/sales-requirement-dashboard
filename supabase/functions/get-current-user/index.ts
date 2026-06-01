import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, content-type, apikey",
};

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { 
      status: 405,
      headers: corsHeaders 
    });
  }

  try {
    const { phone } = await req.json();

    if (!phone) {
      console.error("[get-current-user] Missing phone");
      return new Response(
        JSON.stringify({ success: false, error: "Phone is required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      console.error("[get-current-user] Missing Supabase environment variables");
      return new Response(
        JSON.stringify({ success: false, error: "Server configuration error" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2.39.0");
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Normalize phone to last 10 digits
    const phoneDigits = phone.replace(/\D/g, "");
    const last10 = phoneDigits.slice(-10);
    
    console.log("[get-current-user] Looking for user. Input phone:", phone, "Last 10:", last10);

    // Try multiple phone format queries
    const phoneFormats = [
      `+91${last10}`,
      `91${last10}`,
      last10,
      phone,
    ];

    let userData = null;
    let foundFormat = null;

    for (const format of phoneFormats) {
      console.log("[get-current-user] Trying format:", format);
      
      const { data, error } = await supabase
        .from("User")
        .select("*")
        .eq("phone", format)
        .single();

      if (!error && data) {
        userData = data;
        foundFormat = format;
        console.log("[get-current-user] ✓ Found user with format:", format, "User:", userData);
        break;
      }
      
      if (error && error.code !== "PGRST116") { // PGRST116 = no rows found
        console.error("[get-current-user] Error with format", format, ":", error);
      }
    }

    if (!userData) {
      console.log("[get-current-user] User not found in User table");
      console.log("[get-current-user] Querying all users to debug...");
      
      const { data: allUsers, error: allError } = await supabase
        .from("User")
        .select("id, phone, name");
      
      if (!allError && allUsers) {
        console.log("[get-current-user] All users in table:", allUsers.map(u => ({ id: u.id, phone: u.phone })));
      }
    }

    if (!userData) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "User not found",
          tried_formats: phoneFormats,
          last_10: last10
        }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get user's permissions
    const { data: permissions, error: permError } = await supabase
      .from("user_permissions")
      .select("permission")
      .eq("user_id", userData.id);

    if (permError) {
      console.error("[get-current-user] Error fetching permissions:", permError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        user: {
          ...userData,
          permissions: (permissions || []).map((p: any) => p.permission),
        },
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error) {
    console.error("[get-current-user] Unexpected error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "An error occurred",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
