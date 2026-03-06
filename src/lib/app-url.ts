type ResolveAppBaseUrlOptions = {
  forceProductionDefault?: boolean;
};

export function resolveAppBaseUrl(options: ResolveAppBaseUrlOptions = {}) {
  const envBase =
    process.env.GOOGLE_CALENDAR_APP_BASE_URL ||
    process.env.STRIPE_REDIRECT_BASE ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_BASE_URL;

  if (envBase && envBase.trim().length > 0) {
    return envBase.replace(/\/$/, '');
  }

  const useProductionDefault =
    options.forceProductionDefault || process.env.NODE_ENV === 'production';

  return useProductionDefault ? 'https://www.clientwave.app' : 'http://localhost:3000';
}
