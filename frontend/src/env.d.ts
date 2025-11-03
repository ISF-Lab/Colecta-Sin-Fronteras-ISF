/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly PUBLIC_BACKEND_URL: string;
  readonly PUBLIC_SUPABASE_URL: string;
  readonly PUBLIC_SUPABASE_ANON_KEY: string;
  readonly PUBLIC_TURNSTILE_SITE_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Declaración de Cloudflare Turnstile
interface Window {
  turnstile?: {
    render: (container: string | HTMLElement, options: {
      sitekey: string;
      callback?: (token: string) => void;
      'error-callback'?: () => void;
      theme?: 'light' | 'dark' | 'auto';
      size?: 'normal' | 'compact';
    }) => string;
    reset: (widgetId?: string) => void;
    remove: (widgetId?: string) => void;
    getResponse: (widgetId?: string) => string;
  };
}