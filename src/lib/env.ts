export type AppEnvironment = 'development' | 'staging' | 'production';

export type PublicConfig = {
  appEnvironment: AppEnvironment;
  supabaseUrl: string;
  supabasePublishableKey: string;
};

export function getPublicConfig(): PublicConfig {
  const appEnvironment = process.env.EXPO_PUBLIC_APP_ENV;
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const supabasePublishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!['development', 'staging', 'production'].includes(appEnvironment ?? '')) {
    throw new Error('APP_ENV_INVALID');
  }
  if (!supabaseUrl || !/^https?:\/\//.test(supabaseUrl)) throw new Error('SUPABASE_URL_INVALID');
  if (!supabasePublishableKey || supabasePublishableKey.startsWith('<')) throw new Error('SUPABASE_KEY_INVALID');

  return { appEnvironment: appEnvironment as AppEnvironment, supabaseUrl, supabasePublishableKey };
}
