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
    let { phone } = await req.json();

    if (!phone) {
      return new Response(
        JSON.stringify({ success: false, error: "Phone number is required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Normalize phone number to consistent format: +919876543210
    const phoneDigits = phone.replace(/\D/g, "");
    const normalizedPhone = phoneDigits.endsWith("91") 
      ? `+${phoneDigits}` 
      : `+91${phoneDigits.replace(/^91/, "")}`;
    phone = normalizedPhone;
    console.log("[delete-admin-user] Normalized phone:", phone);

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

    console.log("[delete-admin-user] Starting admin deletion for phone:", phone);

    // Fetch all admins for flexible phone matching
    const { data: allAdmins, error: adminsFetchError } = await supabase
      .from("Admin")
      .select("id, phone");

    if (adminsFetchError) {
      console.error("[delete-admin-user] Error fetching admins:", adminsFetchError);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to fetch admins" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Flexible phone matching - match by comparing digits
    const admin = allAdmins?.find((a) => {
      if (!a.phone) return false;
      const adminDigits = a.phone.replace(/\D/g, "");
      const phoneVariants = [
        phone,
        phone.replace(/^\+91/, "").replace(/^91/, ""),
        `+91${phone.replace(/^\+91/, "").replace(/^91/, "")}`,
        `91${phone.replace(/^\+91/, "").replace(/^91/, "")}`,
      ];
      
      return phoneVariants.some(
        (v) =>
          v === a.phone ||
          v.replace(/\D/g, "") === adminDigits ||
          adminDigits.endsWith(v.replace(/\D/g, "")) ||
          v.replace(/\D/g, "").endsWith(adminDigits),
      );
    });

    if (!admin) {
      console.error("[delete-admin-user] Error finding admin with phone:", phone);
      console.log("[delete-admin-user] Available phone numbers:", allAdmins?.map((a) => a.phone));
      return new Response(
        JSON.stringify({ success: false, error: "Admin not found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const adminId = admin.id;
    console.log("[delete-admin-user] Found admin with ID:", adminId);

    // Step 1: Find the actual auth user by phone (admin ID != auth user ID)
    console.log("[delete-admin-user] Searching for auth user by phone:", phone);
    
    // Try to find auth user by phone - search all variations
    let authUser = null;
    const phoneSearchVariants = [
      phone,
      phone.replace(/^\+91/, ""),
      phone.replace(/^\+/, ""),
      phone.replace(/\D/g, ""),
    ];

    for (const variant of phoneSearchVariants) {
      try {
        const { data: users } = await supabase.auth.admin.listUsers();
        authUser = users?.users?.find((u) => u.phone === variant);
        if (authUser) {
          console.log("[delete-admin-user] Found auth user with phone variant:", variant);
          break;
        }
      } catch (e) {
        console.log("[delete-admin-user] Error searching with variant:", variant, e);
      }
    }

    if (!authUser) {
      console.error("[delete-admin-user] Auth user not found by phone");
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Auth user not found" 
        }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const authUserId = authUser.id;
    console.log("[delete-admin-user] Found auth user with ID:", authUserId);

    // Step 2: Delete auth user FIRST (before deleting database record)
    console.log("[delete-admin-user] Attempting to delete auth user:", authUserId);
    const { error: authDeleteError } = await supabase.auth.admin.deleteUser(authUserId);

    if (authDeleteError) {
      console.error("[delete-admin-user] Error deleting auth user:", authDeleteError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Failed to delete admin from authentication system",
          details: authDeleteError.message 
        }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("[delete-admin-user] ✓ Auth user deleted successfully");

    // Step 2: Delete from Admin table (permissions will cascade due to ON DELETE CASCADE)
    console.log("[delete-admin-user] Attempting to delete Admin record:", adminId);
    const { error: deleteError } = await supabase
      .from("Admin")
      .delete()
      .eq("id", adminId);

    if (deleteError) {
      console.error("[delete-admin-user] Error deleting admin record:", deleteError);
      // Auth user is already deleted, so we log a warning but continue
      console.warn("[delete-admin-user] Admin record deletion failed, but auth user was already deleted");
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Failed to delete admin record from database",
          details: deleteError.message 
        }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("[delete-admin-user] ✓ Admin record deleted successfully");

    return new Response(
      JSON.stringify({
        success: true,
        message: "Admin deleted successfully from both authentication and database",
        adminId,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error) {
    console.error("[delete-admin-user] Unexpected error:", error);
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
