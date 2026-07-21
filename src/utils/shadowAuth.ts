import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/context/auth-context";
import { isFeatureEnabled } from "@/services/featureFlagService";

/**
 * Deduplication tracking for Shadow Auth calls
 * Prevents triggering Shadow Auth multiple times for the same session
 * Key format: "userId:sessionId" to handle concurrent sessions
 */
const processedSessions = new Set<string>();

/**
 * Generate a unique key for deduplication
 * Uses userId + hash of first 20 chars of access token
 */
function getSessionKey(supabaseUser: User, session: Session): string {
  const tokenPrefix = session.access_token.substring(0, 20);
  return `${supabaseUser.id}:${tokenPrefix}`;
}

/**
 * Check if Shadow Auth has already been triggered for this session
 */
function isSessionProcessed(supabaseUser: User, session: Session): boolean {
  const key = getSessionKey(supabaseUser, session);
  return processedSessions.has(key);
}

/**
 * Mark session as processed to prevent duplicate triggers
 */
function markSessionProcessed(supabaseUser: User, session: Session): void {
  const key = getSessionKey(supabaseUser, session);
  processedSessions.add(key);
}

/**
 * Cleanup old sessions from tracking (prevent memory leak)
 * Keep only the most recent 100 sessions
 */
function cleanupOldSessions(): void {
  if (processedSessions.size > 100) {
    // Convert to array, keep last 100 entries
    const entries = Array.from(processedSessions);
    const entriesToKeep = entries.slice(-100);
    
    processedSessions.clear();
    entriesToKeep.forEach(entry => processedSessions.add(entry));
    
    console.log('[Shadow Auth] Cleanup: Kept last 100 sessions, cleared', entries.length - 100);
  }
}


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

/**
 * Get hashed password from Supabase auth.users table via Edge Function
 * Calls get-password-hash Edge Function which uses Service Role Key
 * 
 * Returns null if password cannot be fetched - user will NOT be migrated
 */
export async function getPasswordHash(user: User | null): Promise<string | null> {
  if (!user || !user.phone) {
    console.error('[Shadow Auth] No user or phone provided, cannot fetch password');
    return null;
  }

  try {
    console.log('[Shadow Auth] Calling get-password-hash Edge Function for phone:', user.phone);
    
    // Call Edge Function to get password hash
    const { data: result, error: functionError } = await supabase.functions.invoke(
      'get-password-hash',
      {
        body: { phone: user.phone },
      }
    );

    if (functionError) {
      console.error('[Shadow Auth] Error calling get-password-hash function for phone:', user.phone, '- Error:', functionError.message);
      return null;
    }

    console.log('[Shadow Auth] Edge Function response received:', { success: result?.success, hasPasswordHash: !!result?.password_hash });

    if (!result || !result.password_hash) {
      console.error('[Shadow Auth] No password hash returned from function for user:', user.id);
      return null;
    }

    console.log('[Shadow Auth] ✅ Encrypted password fetched successfully for user:', user.id, '- Hash length:', result.password_hash.length);
    return result.password_hash;
  } catch (err) {
    console.error('[Shadow Auth] Exception fetching password hash for user:', user.id, '- Error:', err);
    return null;
  }
}

// Shadow Auth API endpoint
const SHADOW_AUTH_API = 
  import.meta.env.VITE_SHADOW_AUTH_API || 
  'https://54yexougxi.execute-api.ap-south-1.amazonaws.com/prod/internal/auth/shadow';

// Shadow Auth API internal key for authentication
const SHADOW_AUTH_API_KEY = 
  import.meta.env.VITE_SHADOW_AUTH_API_KEY || 
  'HSuQKwbbBwIt1mCwimDVB3RUPe8BrHT6q0AOGdutKIt';

/**
 * Trigger shadow auth migration for Supabase user
 * This sends the user's Supabase ID token, role, and password hash to the backend
 * so they get created in the AWS RDS database with the correct role assigned.
 * 
 * This is a fire-and-forget operation - errors are logged but don't block the app.
 * 
 * Deduplication:
 * - Tracks processed sessions to prevent duplicate API calls
 * - Multiple triggers from getSession/onAuthStateChange/login all handled automatically
 * - Only sends one Shadow Auth request per unique session
 * 
 * Feature Flag Check:
 * - Fetches the `shadow_auth_enabled` feature flag from the backend
 * - If disabled, skips the Shadow Auth API call entirely
 * - Uses in-memory caching with 1-hour TTL to minimize API calls
 */
export async function triggerShadowAuth(
  supabaseUser: User | null,
  session: Session | null
): Promise<void> {
  if (!supabaseUser || !session?.access_token) {
    return;
  }

  // DEDUPLICATION CHECK: Skip if this session was already processed
  if (isSessionProcessed(supabaseUser, session)) {
    console.log('[Shadow Auth] ℹ️ Session already processed for user:', supabaseUser.id, '- Skipping duplicate trigger');
    return;
  }

  try {
    // Check feature flag: shadow_auth_enabled
    const shadowAuthEnabled = await isFeatureEnabled('shadow_auth_enabled');
    
    if (!shadowAuthEnabled) {
      return;
    }


    // Get role - this requires await as it checks Admin table
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

    // Get password hash
    const passwordHash = await getPasswordHash(supabaseUser);

    if (!passwordHash) {
      console.warn('[Shadow Auth] Password hash is null for user:', supabaseUser.id, '- User will not be migrated');
      return;
    }

    console.log('[Shadow Auth] Triggering migration for user:', supabaseUser.id, 'with role:', roleName);

    // Mark this session as processed BEFORE initiating fetch
    // This prevents race conditions if triggerShadowAuth is called again while fetch is in-flight
    markSessionProcessed(supabaseUser, session);
    cleanupOldSessions(); // Cleanup tracking to prevent memory leaks

    // Fire-and-forget - don't await the response
    // Backend handles duplicates automatically (idempotent)
    fetch(SHADOW_AUTH_API, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'X-Internal-Key': SHADOW_AUTH_API_KEY
      },
      body: JSON.stringify({
        supabase_id_token: session.access_token,
        role_name: roleName,
        password_hash: passwordHash
      })
    })
      .then((response: Response) => {
        if (response.ok) {
          console.log('[Shadow Auth] ✅ Migration initiated for user:', supabaseUser.id);
        } else {
          console.warn('[Shadow Auth] Unexpected status:', response.status);
        }
      })
      .catch((error: any) => {
        // Silently fail - user can still use the app
        console.error('[Shadow Auth] Network error (silent):', error.message);
      });

  } catch (error) {
    console.error('[Shadow Auth] Error:', error);
    // Silently fail - user can still use the app
  }
}
