import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

const missingConfigMessage = 'La configuración de Supabase no está disponible. Revisa NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY en Vercel.';

function createMissingConfigClient() {
  return {
    auth: {
      getSession: async () => ({ data: { session: null }, error: new Error(missingConfigMessage) }),
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: null }),
          single: async () => ({ data: null }),
          order: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: null }),
              single: async () => ({ data: null }),
            }),
          }),
        }),
      }),
    }),
  } as any;
}

export async function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key || !url.startsWith('http') || !key.trim()) {
    return createMissingConfigClient();
  }

  const cookieStore = await cookies();

  return createServerClient(url!, key!, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Se puede ignorar si se llama desde Server Components.
        }
      },
    },
  });
}
