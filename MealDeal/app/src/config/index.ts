/**
 * Secure Configuration Module for MealDeal
 *
 * SECURITY CRITICAL:
 * - Reads ALL configuration from environment variables ONLY
 * - Uses EXPO_PUBLIC_* prefix (safe for client-side code)
 * - NO hardcoded fallback values (forces explicit configuration)
 * - Validates at runtime that all required env vars are present
 * - Throws clear errors if configuration is incomplete
 * - NEVER includes service_role key (server-only auth)
 * - NEVER includes sensitive secrets in client code
 *
 * OWASP Key Management Best Practices:
 * 1. Keys in environment variables, never hardcoded
 * 2. Different keys for different environments (dev/staging/prod)
 * 3. Sensitive keys (service_role) never in client code
 * 4. Public keys (anonKey) safe for client use only for specific operations
 * 5. Validation at startup prevents runtime security issues
 *
 * Environment Variables Required (in .env.local or Expo config):
 * EXPO_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
 * EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...
 */

/**
 * Configuration object type
 * Deutsch: Konfigurationsobjekttyp
 */
interface Config {
  supabaseUrl: string;
  supabaseAnonKey: string;
}

/**
 * Read configuration from environment variables
 * Deutsch: Konfiguration aus Umgebungsvariablen lesen
 *
 * This function is called at module load time and throws if config is invalid.
 * This ensures the app fails fast with clear errors rather than failing
 * silently or at runtime when trying to use unconfigured services.
 *
 * @throws Error if required environment variables are missing
 * @returns Config object with validated values
 */
function loadConfig(): Config {
  // Read from Expo's EXPO_PUBLIC_* environment variables
  // These are safe to expose in client code

  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  // Validate supabaseUrl
  if (!supabaseUrl) {
    throw new Error(
      'Missing required environment variable: EXPO_PUBLIC_SUPABASE_URL\n' +
      'Set this in .env.local or your Expo configuration.\n' +
      'Example: EXPO_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co\n\n' +
      'Deutsch: Erforderliche Umgebungsvariable fehlt: EXPO_PUBLIC_SUPABASE_URL\n' +
      'Setzen Sie dies in .env.local oder Ihrer Expo-Konfiguration.'
    );
  }

  if (!supabaseUrl.startsWith('https://')) {
    throw new Error(
      'Invalid EXPO_PUBLIC_SUPABASE_URL: must start with https://\n' +
      'Example: https://xxxxx.supabase.co\n\n' +
      'Deutsch: Ungültige EXPO_PUBLIC_SUPABASE_URL: muss mit https:// beginnen'
    );
  }

  if (!supabaseUrl.includes('supabase.co')) {
    throw new Error(
      'Invalid EXPO_PUBLIC_SUPABASE_URL: must be a valid Supabase URL\n' +
      'Example: https://xxxxx.supabase.co\n\n' +
      'Deutsch: Ungültige EXPO_PUBLIC_SUPABASE_URL: muss eine gültige Supabase-URL sein'
    );
  }

  // Validate supabaseAnonKey
  if (!supabaseAnonKey) {
    throw new Error(
      'Missing required environment variable: EXPO_PUBLIC_SUPABASE_ANON_KEY\n' +
      'Set this in .env.local or your Expo configuration.\n' +
      'This is the public anon key (not the service_role key!).\n\n' +
      'Deutsch: Erforderliche Umgebungsvariable fehlt: EXPO_PUBLIC_SUPABASE_ANON_KEY\n' +
      'Dies ist der öffentliche anon-Schlüssel (nicht der service_role-Schlüssel!)'
    );
  }

  if (supabaseAnonKey.length < 50) {
    throw new Error(
      'Invalid EXPO_PUBLIC_SUPABASE_ANON_KEY: appears too short\n' +
      'Make sure you are using the public anon key, not another key.\n\n' +
      'Deutsch: Ungültiger EXPO_PUBLIC_SUPABASE_ANON_KEY: scheint zu kurz zu sein\n' +
      'Stellen Sie sicher, dass Sie den öffentlichen anon-Schlüssel verwenden.'
    );
  }

  // Check for common misconfiguration: service_role key in client code
  if (supabaseAnonKey.includes('service_role') || supabaseAnonKey.includes('JWT secret')) {
    throw new Error(
      'SECURITY ERROR: EXPO_PUBLIC_SUPABASE_ANON_KEY contains service_role or secret!\n' +
      'NEVER expose service_role or JWT secret in client code.\n' +
      'Use only the public anon key.\n\n' +
      'SECURITY ERROR: EXPO_PUBLIC_SUPABASE_ANON_KEY enthält service_role!\n' +
      'service_role und JWT-Geheimnisse dürfen NIEMALS in Client-Code offengelegt werden.'
    );
  }

  return {
    supabaseUrl: supabaseUrl.trim(),
    supabaseAnonKey: supabaseAnonKey.trim(),
  };
}

/**
 * Configuration instance - loaded at module initialization
 * Deutsch: Konfigurationsinstanz - beim Modul-Laden geladen
 *
 * This runs immediately when the module is imported.
 * If it throws, the app will not start, preventing silent failures.
 */
let config: Config;
try {
  config = loadConfig();
} catch (error) {
  // In development, this helps catch configuration errors early
  console.error('Configuration Error: Failed to load MealDeal config');
  console.error(error instanceof Error ? error.message : String(error));
  throw error; // Re-throw to prevent app from starting with invalid config
}

/**
 * Check if configuration is valid
 * Deutsch: Überprüfe, ob Konfiguration gültig ist
 *
 * This can be called at runtime to verify config is still valid,
 * though it should not fail if called at startup.
 *
 * @returns true if config is valid, false otherwise
 */
export function isConfigValid(): boolean {
  try {
    return (
      !!config.supabaseUrl &&
      config.supabaseUrl.startsWith('https://') &&
      config.supabaseUrl.includes('supabase.co') &&
      !!config.supabaseAnonKey &&
      config.supabaseAnonKey.length > 50 &&
      !config.supabaseAnonKey.includes('service_role')
    );
  } catch {
    return false;
  }
}

/**
 * Export the configuration object
 * Deutsch: Konfigurationsobjekt exportieren
 *
 * Usage:
 * import { Config } from './config';
 * const supabase = createClient(Config.supabaseUrl, Config.supabaseAnonKey);
 *
 * Security Notes:
 * - This module exports only the ANON key (safe for public use)
 * - The service_role key is NEVER included
 * - The anon key can only perform operations allowed by Supabase RLS policies
 * - Row-Level Security (RLS) in Supabase database protects sensitive data
 * - Users can only access their own data as defined in RLS policies
 */
export const AppConfig = Object.freeze(config);
