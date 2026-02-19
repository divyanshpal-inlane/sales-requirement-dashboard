import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("MY_SUPABASE_URL") ?? "",
      Deno.env.get("MY_SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // Verify the requesting user is a super admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user: requestingUser }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !requestingUser) {
      throw new Error("Unauthorized");
    }

    // Check if requesting user is super admin
    const { data: requestingAdmin, error: adminError } = await supabaseClient
      .from("Admin")
      .select("is_super_admin")
      .eq("phone", requestingUser.phone)
      .single();

    if (adminError || !requestingAdmin?.is_super_admin) {
      throw new Error("Only super admin can create admin users");
    }

    const { phone, password, name } = await req.json();

    if (!phone || !password || !name) {
      throw new Error("Phone, password, and name are required");
    }

    // Create auth user with admin role
    const { data: newUser, error: createError } = await supabaseClient.auth.admin.createUser({
      phone,
      password,
      phone_confirm: true,
      user_metadata: {
        user_role: "admin",
        name,
      },
    });

    if (createError) {
      console.error("Error creating auth user:", createError);
      throw new Error(createError.message);
    }

    console.log("Admin user created:", { phone, name, userId: newUser.user.id });

    return new Response(
      JSON.stringify({ success: true, userId: newUser.user.id }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error creating admin user:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
