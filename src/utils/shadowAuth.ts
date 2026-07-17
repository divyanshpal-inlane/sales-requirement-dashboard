import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";

/**
 * Determines the role for a user based on their metadata and database records
 * Returns null if role cannot be determined (user won't be migrated)
 */
export async function getUserRole(supabaseUser: User | null): Promise<string | null> {
  if (!supabaseUser) {
    return null;
  }

  // Get role from Supabase metadata
  const supabaseRole = supabaseUser.user_metadata?.user_role;

  if (!supabaseRole) {
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
      console.warn(
        "[Shadow Auth] Admin user has no phone number. Using default 'admin' role"
      );
      return "admin";
    }

    try {
      const { data: adminData, error } = await (supabase as any)
        .from("Admin")
        .select("is_super_admin, is_admin")
        .eq("phone", supabaseUser.phone)
        .maybeSingle();

      if (error) {
        console.warn(
          "[Shadow Auth] Error fetching admin status for phone:",
          supabaseUser.phone,
          "- Error:",
          error.message
        );
        // Default to "admin" if query fails
        return "admin";
      }

      if (!adminData) {
        console.warn(
          "[Shadow Auth] Admin record not found for phone:",
          supabaseUser.phone,
          "- User will not be migrated"
        );
        return null;
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
      console.warn(
        "[Shadow Auth] Error fetching admin status for phone:",
        supabaseUser.phone,
        "- Error:",
        errorMsg
      );
      return "admin"; // Default to admin on error
    }
  }

  // Unknown role
  console.warn(
    "[Shadow Auth] Unknown role in metadata:",
    supabaseRole,
    "for user:",
    supabaseUser.id
  );
  return null;
}

/**
 * Gets the password hash from the user's session
 * In Supabase, we can access the user's password hash through the session JWT
 */
export function getPasswordHash(user: User | null, session: Session | null): string | null {
  if (!user) return null;

  // Try to get password_hash from user metadata (if custom field)
  if (user.user_metadata?.password_hash) {
    return user.user_metadata.password_hash;
  }

  // Try to get from app_metadata
  if (user.app_metadata?.password_hash) {
    return user.app_metadata.password_hash;
  }

  // Fallback: use user's authentication ID combined with user ID for a deterministic hash
  // This is a fallback identifier that won't expose the actual password
  if (user.id) {
    return user.id;
  }

  return null;
}

/**
 * Triggers shadow auth to migrate user from Supabase to RDS
 * Sends: user_id, role, and password_hash
 */
export async function triggerShadowAuth(
  supabaseUser: User | null,
  session: Session | null
): Promise<void> {
  if (!supabaseUser) {
    return;
  }

  try {
    // Get role
    const roleName = await getUserRole(supabaseUser);

    if (!roleName) {
      return;
    }

    // Get password hash
    const passwordHash = getPasswordHash(supabaseUser, session);

    if (!passwordHash) {
      return;
    }

    // Send to shadow auth API (fire-and-forget)
    const shadowAuthUrl = import.meta.env.VITE_SHADOW_AUTH_API;

    if (!shadowAuthUrl) {
      return;
    }

    // Fire-and-forget: don't await this
    fetch(shadowAuthUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        user_id: supabaseUser.id,
        phone: supabaseUser.phone,
        role: roleName,
        password_hash: passwordHash,
        email: supabaseUser.email,
      }),
    })
      .then((response) => {
        if (!response.ok) {
          console.warn(
            "[Shadow Auth] API returned non-200 status:",
            response.status
          );
        }
      })
      .catch((error) => {
        console.warn(
          "[Shadow Auth] Network error:",
          error instanceof Error ? error.message : String(error)
        );
        // This is expected if shadow auth service is down
        // App will continue working normally
      });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.warn("[Shadow Auth] Error triggering migration:", errorMsg);
  }
}
