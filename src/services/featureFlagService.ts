/**
 * Feature Flag Service
 * Manages fetching and caching of feature flags from the backend
 */

interface FeatureFlags {
  shadow_auth_enabled?: boolean;
  /** When true, login goes through the Go backend instead of Supabase directly. */
  go_auth_enabled?: boolean;
  [key: string]: any;
}

interface CachedFlags {
  flags: FeatureFlags;
  timestamp: number;
}

// Cache store
let flagCache: CachedFlags | null = null;

// Default TTL: 1 hour (3600000 ms)
const DEFAULT_TTL = 3600000;

// Feature Flag API endpoint
// In dev the Vite proxy rewrites /go-api/* → http://localhost:8080/v1/*
// In production set VITE_BACKEND_API to the real Go service base URL (e.g. https://api.inlane.in/v1)
const BACKEND_API =
  import.meta.env.VITE_BACKEND_API || '/go-api';

const FEATURE_FLAG_API = `${BACKEND_API}/internal/feature-flags`;

// Internal API key for feature flags endpoint
const INTERNAL_API_KEY = import.meta.env.VITE_INTERNAL_API_KEY || 'HSuQKwbbBwIt1mCwimDVB3RUPe8BrHT6q0AOGdutKIt';

/**
 * Fetch feature flags from the backend
 * This function handles the actual API call
 */
async function fetchFlagsFromBackend(): Promise<FeatureFlags> {
  try {
    console.log('[Feature Flags] Fetching feature flags from backend...');
    
    const response = await fetch(FEATURE_FLAG_API, {
      method: 'GET',
      headers: { 
        'Content-Type': 'application/json',
        'x-internal-key': INTERNAL_API_KEY,
      },
    });

    if (!response.ok) {
      console.error('[Feature Flags] API returned status:', response.status);
      // Return safe defaults if API fails
      // go_auth_enabled defaults to false so non-pilot users use Supabase
      return { shadow_auth_enabled: true, go_auth_enabled: false };
    }

    const data = await response.json();
    console.log('[Feature Flags] ✅ Feature flags fetched successfully');
    
    return data || { shadow_auth_enabled: true };
  } catch (error) {
    console.error('[Feature Flags] Error fetching feature flags:', error);
    // Return safe defaults if network error
    // go_auth_enabled defaults to false so non-pilot users use Supabase
    return { shadow_auth_enabled: true, go_auth_enabled: false };
  }
}

/**
 * Check if cache is still valid
 */
function isCacheValid(ttl: number = DEFAULT_TTL): boolean {
  if (!flagCache) {
    return false;
  }
  
  const age = Date.now() - flagCache.timestamp;
  const isValid = age < ttl;
  
  if (!isValid) {
    console.log('[Feature Flags] Cache expired, will refresh on next fetch');
  }
  
  return isValid;
}

/**
 * Get feature flags with caching
 * - Returns cached flags if available and not expired
 * - Otherwise fetches fresh flags from backend
 * - Cache TTL: 1 hour (configurable)
 */
export async function getFeatureFlags(ttl?: number): Promise<FeatureFlags> {
  // Return cached flags if available and valid
  if (isCacheValid(ttl)) {
    console.log('[Feature Flags] Using cached flags');
    return flagCache!.flags;
  }

  // Fetch fresh flags from backend
  const flags = await fetchFlagsFromBackend();
  
  // Cache the flags
  flagCache = {
    flags,
    timestamp: Date.now(),
  };
  
  return flags;
}

/**
 * Check if a specific feature flag is enabled
 * Returns true by default if flag is not found (fail-safe)
 */
export async function isFeatureEnabled(
  featureName: keyof FeatureFlags,
  ttl?: number
): Promise<boolean> {
  const flags = await getFeatureFlags(ttl);
  const isEnabled = flags[featureName] ?? true; // Default to enabled if not specified
  
  console.log(`[Feature Flags] "${featureName}" is ${isEnabled ? 'ENABLED' : 'DISABLED'}`);
  return isEnabled;
}

/**
 * Clear the feature flag cache
 * Useful for testing or manual cache invalidation
 */
export function clearFlagCache(): void {
  flagCache = null;
  console.log('[Feature Flags] Cache cleared');
}

/**
 * Get cache status (for debugging)
 */
export function getCacheStatus(): {
  isCached: boolean;
  age: number | null;
  flags: FeatureFlags | null;
} {
  return {
    isCached: flagCache !== null,
    age: flagCache ? Date.now() - flagCache.timestamp : null,
    flags: flagCache?.flags || null,
  };
}
