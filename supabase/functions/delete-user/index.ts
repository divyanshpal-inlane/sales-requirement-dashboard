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
      return new Response(
        JSON.stringify({ success: false, error: "Phone number is required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get environment variables
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      console.error("Missing Supabase environment variables");
      return new Response(
        JSON.stringify({ success: false, error: "Server configuration error" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Import Supabase client inside try-catch
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2.39.0");
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Find the user by phone in the User table
    const { data: user, error: userFetchError } = await supabase
      .from("User")
      .select("id, phone")
      .eq("phone", phone)
      .single();

    if (userFetchError || !user) {
      console.error("Error finding user:", userFetchError);
      return new Response(
        JSON.stringify({ success: false, error: "User not found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const userId = user.id;

    // Delete from User table (permissions will cascade due to ON DELETE CASCADE)
    const { error: deleteError } = await supabase
      .from("User")
      .delete()
      .eq("id", userId);

    if (deleteError) {
      console.error("Error deleting user record:", deleteError);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to delete user record" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Delete auth user
    const { error: authDeleteError } = await supabase.auth.admin.deleteUser(userId);

    if (authDeleteError) {
      console.error("Error deleting auth user:", authDeleteError);
      // Auth user deletion failed, but we already deleted the User record
      // This is a partial failure - the User record is deleted but auth user still exists
      console.warn("Auth user could not be deleted, but User record was deleted");
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "User deleted successfully",
        userId,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
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
