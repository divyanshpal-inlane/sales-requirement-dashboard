import { User, Session } from "@supabase/supabase-js";
import { supabase, supabaseAdmin } from "@/context/auth-context";

/**
 * Determines the role for a user based on their metadata and database records
 * Returns null if role cannot be determined (user won't be migrated)
 */
export async function getUserRole(supabaseUser: User | null): Promise<string | null> {
  if (!supabaseUser) {
    return null;
  }

  // Get role from Supabase metadata (check both user_role and role)
  const supabaseRole = supabaseUser.user_metadata?.user_role || supabaseUser.user_metadata?.role;

  if (!supabaseRole) {
    console.warn("[Shadow Auth] No role found in user metadata");
    return null;
  }

  // For learner and instructor, return as-is
  if (supabaseRole === "learner" || supabaseRole === "instructor") {
    return supabaseRole;
  }

  // For admin, query Admin table to determine exact role
  if (supabaseRole === "admin") {
    // Check if phone exists
    if (!supabaseUser.phone) {
      console.warn("[Shadow Auth] Admin user has no phone number");
      return "admin";
    }

    try {
      const { data: adminData, error } = await (supabase as any)
        .from("Admin")
        .select("is_super_admin, is_admin")
        .eq("phone", supabaseUser.phone)
        .maybeSingle();

      if (error) {
        console.warn("[Shadow Auth] Error fetching admin status:", error.message);
        return "admin";
      }

      if (!adminData) {
        console.warn("[Shadow Auth] Admin record not found");
        return "admin";
      }

      // Determine admin type based on flags
      if (adminData.is_super_admin) {
        return "super_admin";
      } else if (adminData.is_admin) {
        return "admin";
      } else {
        return "user"; // Team member without is_admin flag
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.warn("[Shadow Auth] Error determining admin role:", errorMsg);
      return "admin";
    }
  }

  // For 'user' role, return as-is
  if (supabaseRole === "user") {
    return "user";
  }

  console.warn("[Shadow Auth] Unknown role in metadata:", supabaseRole);
  return null;
}

/**
 * Gets the encrypted password hash from Supabase auth.users table
 * Uses the service role key (supabaseAdmin) to fetch the actual encrypted password
 */
export async function getPasswordHash(user: User | null, session: Session | null): Promise<string | null> {
  if (!user) {
    console.warn("[Shadow Auth] No user provided for password hash");
    return null;
  }

  try {
    console.log("[Shadow Auth] Fetching encrypted password from auth.users table...");
    
    // Use the service role key (supabaseAdmin) to fetch the user's encrypted password
    const { data, error } = await supabaseAdmin.auth.admin.getUserById(user.id);

    if (error) {
      console.warn("[Shadow Auth] Error fetching user password:", error.message);
      return null;
    }

    if (!data || !data.user) {
      console.warn("[Shadow Auth] User not found in auth.users");
      return null;
    }

    // The encrypted password is stored in the user's encrypted_password field
    const encryptedPassword = (data.user as any).encrypted_password;

    if (!encryptedPassword) {
      console.warn("[Shadow Auth] No encrypted password found for user");
      return null;
    }

    console.log("[Shadow Auth] ✅ Encrypted password fetched successfully");
    return encryptedPassword;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.warn("[Shadow Auth] Error fetching encrypted password:", errorMsg);
    return null;
  }
}

/**
 * Triggers shadow auth to migrate user from Supabase to RDS
 * Sends: supabase_id_token, role_name, password_hash
 * This is a silent, fire-and-forget operation
 */
export async function triggerShadowAuth(
  supabaseUser: User | null,
  session: Session | null
): Promise<void> {
  console.log("[Shadow Auth] Shadow auth migration triggered for user:", supabaseUser?.id);
  
  if (!supabaseUser || !session?.access_token) {
    console.warn("[Shadow Auth] Missing user or access token");
    return;
  }

  try {
    // Get role from user metadata
    console.log("[Shadow Auth] Determining user role...");
    const roleName = await getUserRole(supabaseUser);

    if (!roleName) {
      console.warn("[Shadow Auth] No valid role found, skipping migration");
      return;
    }
    
    console.log("[Shadow Auth] Role determined:", roleName);

    // Get password hash from auth.users
    console.log("[Shadow Auth] Fetching encrypted password...");
    const passwordHash = await getPasswordHash(supabaseUser, session);

    if (!passwordHash) {
      console.warn("[Shadow Auth] No password hash available");
      return;
    }
    
    console.log("[Shadow Auth] Sending migration request...");

    // Send to shadow auth API endpoint (backend expects these exact field names)
    const shadowAuthUrl = import.meta.env.VITE_SHADOW_AUTH_API;

    if (!shadowAuthUrl) {
      console.warn("[Shadow Auth] VITE_SHADOW_AUTH_API not configured");
      return;
    }

    // Fire-and-forget: don't await, don't block UI
    // Backend expects: supabase_id_token, role_name, password_hash
    fetch(shadowAuthUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        supabase_id_token: session.access_token,
        role_name: roleName,
        password_hash: passwordHash,
      }),
    })
      .then((response) => {
        if (response.ok) {
          console.log("[Shadow Auth] ✅ Migration request sent successfully");
        } else {
          console.warn("[Shadow Auth] API error status:", response.status);
        }
      })
      .catch((error) => {
        // Silently fail - app continues working
        console.warn("[Shadow Auth] Request failed:", 
          error instanceof Error ? error.message : String(error)
        );
      });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.warn("[Shadow Auth] Unexpected error:", errorMsg);
    // Continue - don't break the app
  }
}
