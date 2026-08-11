import { createBrowserClient } from '@supabase/ssr';

const missingConfigMessage = 'La configuración de Supabase no está disponible. Revisa NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY en Vercel.';

function createMissingConfigClient() {
  return {
    auth: {
      getSession: async () => ({ data: { session: null }, error: new Error(missingConfigMessage) }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      signOut: async () => ({ error: null }),
      signInWithPassword: async () => ({ data: { user: null, session: null }, error: new Error(missingConfigMessage) }),
      signUp: async () => ({ data: { user: null, session: null }, error: new Error(missingConfigMessage) }),
      resetPasswordForEmail: async () => ({ error: new Error(missingConfigMessage) }),
      resend: async () => ({ error: new Error(missingConfigMessage) }),
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: null }),
          single: async () => ({ data: null }),
        }),
      }),
    }),
  } as any;
}

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key || !url.startsWith('http') || !key.trim()) {
    return createMissingConfigClient();
  }

  return createBrowserClient(url!, key!);
}
