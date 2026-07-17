import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/context/auth-context";

/**
 * Get role from Supabase user metadata and database
 * Supabase stores: "admin", "learner", "instructor"
 * Backend expects: "super_admin", "admin", "user", "learner", "instructor"
 * 
 * For admin users, we need to check the Admin table to determine:
 * - is_super_admin = true → "super_admin"
 * - is_admin = true → "admin"
 * - is_admin = false → "user" (team member)
 * 
 * Returns null if role cannot be determined - user will NOT be migrated
 */
export async function getUserRole(supabaseUser: User | null): Promise<string | null> {
  if (!supabaseUser) {
    console.error('[Shadow Auth] No user provided, cannot determine role');
    return null;
  }
  
  // Get role from Supabase user_metadata
  const supabaseRole = supabaseUser.user_metadata?.user_role;
  
  if (!supabaseRole) {
    console.error('[Shadow Auth] No role found in user metadata for user:', supabaseUser.id);
    return null;
  }
  
  // For learner and instructor roles, return as-is
  if (supabaseRole === 'learner' || supabaseRole === 'instructor') {
    return supabaseRole;
  }
  
  // For admin role, check Admin table to determine super_admin or admin or user
  if (supabaseRole === 'admin') {
    try {
      const { data: adminData, error } = await supabase
        .from('Admin')
        .select('is_super_admin, is_admin')
        .eq('phone', supabaseUser.phone)
        .single();
      
      if (error) {
        console.error('[Shadow Auth] Error fetching admin status for phone:', supabaseUser.phone, '- Error:', error.message);
        // Don't migrate if we can't determine the role from Admin table
        return null;
      }
      
      if (!adminData) {
        console.error('[Shadow Auth] Admin record not found for phone:', supabaseUser.phone, '- User will not be migrated');
        return null;
      }
      
      // Determine exact role based on admin flags
      if (adminData.is_super_admin) {
        return 'super_admin';
      } else if (adminData.is_admin) {
        return 'admin';
      } else {
        // Team member (admin user but not is_admin flag)
        return 'user';
      }
    } catch (err) {
      console.error('[Shadow Auth] Exception fetching admin role for user:', supabaseUser.id, '- Error:', err);
      // Don't migrate if there's an exception
      return null;
    }
  }
  
  // Unknown/unexpected role in metadata - don't migrate
  console.error('[Shadow Auth] Unknown role in metadata:', supabaseRole, 'for user:', supabaseUser.id);
  return null;
}

// Shadow Auth API endpoint
const SHADOW_AUTH_API = 
  import.meta.env.VITE_SHADOW_AUTH_API || 
  'https://54yexougxi.execute-api.ap-south-1.amazonaws.com/prod/internal/auth/shadow';

/**
 * Trigger shadow auth migration for Supabase user
 * This sends the user's Supabase ID token along with their role to the backend
 * so they get created in the AWS RDS database with the correct role assigned.
 * 
 * This is a fire-and-forget operation - errors are logged but don't block the app.
 */
export async function triggerShadowAuth(
  supabaseUser: User | null,
  session: Session | null
): Promise<void> {
  if (!supabaseUser || !session?.access_token) {
    console.warn('[Shadow Auth] No user or access token available, skipping migration');
    return;
  }

  try {
    // Get role - this now requires await as it checks Admin table
    const roleName = await getUserRole(supabaseUser);

    // If role is null, don't migrate the user
    if (!roleName) {
      console.warn('[Shadow Auth] Role is null/undefined for user:', supabaseUser.id, '- User will not be migrated');
      return;
    }

    // Validate role (case-sensitive)
    const validRoles = ['super_admin', 'admin', 'user', 'learner', 'instructor'];
    if (!validRoles.includes(roleName)) {
      console.error('[Shadow Auth] Invalid role:', roleName, '- Valid roles:', validRoles);
      return;
    }

    const requestBody = {
      supabase_id_token: session.access_token,
      role_name: roleName
    };

    console.log('[Shadow Auth] 📤 Sending migration request:');
    console.log('  User ID:', supabaseUser.id);
    console.log('  Role:', roleName);
    console.log('  Endpoint:', SHADOW_AUTH_API);
    console.log('  Body:', {
      supabase_id_token: session.access_token.substring(0, 20) + '...',
      role_name: roleName
    });

    // Fire-and-forget - don't await the response
    // Backend handles duplicates automatically (idempotent)
    fetch(SHADOW_AUTH_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    })
      .then((response: Response) => {
        console.log('[Shadow Auth] 📡 Response received:');
        console.log('  Status:', response.status, response.statusText);
        
        if (response.ok) {
          // Try to parse response body
          response.json()
            .then((data) => {
              console.log('[Shadow Auth] ✅ Migration initiated for user:', supabaseUser.id);
              console.log('[Shadow Auth] Response data:', data);
            })
            .catch((err) => {
              console.log('[Shadow Auth] ✅ Migration initiated for user:', supabaseUser.id);
              console.log('[Shadow Auth] (Response body not JSON)');
            });
        } else {
          console.warn('[Shadow Auth] ⚠️ Unexpected status:', response.status);
          response.text()
            .then((text) => {
              console.warn('[Shadow Auth] Error response:', text);
            })
            .catch(() => {
              console.warn('[Shadow Auth] (Could not read error response)');
            });
        }
      })
      .catch((error: any) => {
        // Silently fail - user can still use the app
        console.error('[Shadow Auth] ❌ Network error:', error.message);
        console.error('[Shadow Auth] This is expected if shadow auth service is down');
      });

  } catch (error) {
    console.error('[Shadow Auth] Error:', error);
    // Silently fail - user can still use the app
  }
}
