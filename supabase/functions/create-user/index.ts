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
    const { phone, password, name, permissions, adminId } = await req.json();

    // Validate required fields
    if (!phone || !password || !name || !adminId) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required fields" }),
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

    // Create auth user with "admin" role (created by admin for team members)
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      phone,
      password,
      phone_confirm: true,  // Mark phone as confirmed so user can login immediately
      user_metadata: {
        user_role: "admin",  // Users created by admin are team members with admin role
      },
    });

    if (authError) {
      console.error("Error creating auth user:", authError);
      return new Response(
        JSON.stringify({ success: false, error: authError.message }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const userId = authData.user.id;

    console.log("[create-user] ✓ User created for:", phone);

    // Create User record (don't set id, let it auto-generate)
    const { data: userData, error: userError } = await supabase
      .from("User")
      .insert({
        phone,
        name,
        admin_id: adminId,
        created_by_admin_id: adminId,
      })
      .select()
      .single();

    if (userError) {
      console.error("Error creating user record:", userError);
      console.error("Full error details:", JSON.stringify(userError, null, 2));
      // Clean up auth user if User creation fails
      try {
        await supabase.auth.admin.deleteUser(userId);
      } catch (e) {
        console.error("Error cleaning up auth user:", e);
      }
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: userError.message || "Failed to create user record",
          details: userError
        }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Create permissions if provided
    if (permissions && Array.isArray(permissions) && permissions.length > 0) {
      const permissionRecords = permissions.map((permission: string) => ({
        user_id: userId,
        permission,
      }));

      const { error: permError } = await supabase
        .from("user_permissions")
        .insert(permissionRecords);

      if (permError) {
        console.error("Error creating permissions:", permError);
        // Clean up if permissions creation fails
        try {
          await supabase.from("User").delete().eq("id", userId);
          await supabase.auth.admin.deleteUser(userId);
        } catch (e) {
          console.error("Error during cleanup:", e);
        }
        return new Response(
          JSON.stringify({ success: false, error: "Failed to create permissions" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        userId,
        phone,
        name,
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
