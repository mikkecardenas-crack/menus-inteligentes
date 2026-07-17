import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// This endpoint is called automatically by Vercel Cron every 3 days
// to prevent Supabase free-tier from pausing due to inactivity.
export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Missing env vars' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Lightweight ping — just count profiles rows
    const { count, error } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    if (error) throw error;

    const now = new Date().toISOString();
    console.log(`[keep-alive] OK at ${now} — ${count} profiles`);

    return NextResponse.json({
      status: 'ok',
      timestamp: now,
      profiles: count,
      message: 'Supabase is alive and healthy ✅',
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[keep-alive] Error:', message);
    return NextResponse.json({ status: 'error', error: message }, { status: 500 });
  }
}
