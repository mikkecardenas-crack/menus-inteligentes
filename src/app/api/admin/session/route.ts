import { NextRequest, NextResponse } from 'next/server';
import {
  ADMIN_COOKIE,
  adminCookieOptions,
  checkAdminCredentials,
  createAdminSession,
  isAdminConfigured,
  isAdminRequest,
} from '@/lib/adminAuth';

// ¿Hay una sesión de administrador activa?
export async function GET(req: NextRequest) {
  return NextResponse.json({ authenticated: isAdminRequest(req) });
}

// Iniciar sesión: valida en el servidor y deja una cookie httpOnly firmada
export async function POST(req: NextRequest) {
  if (!isAdminConfigured()) {
    return NextResponse.json(
      { error: 'El panel de administrador no está configurado. Define ADMIN_PHONE, ADMIN_PASSWORD y ADMIN_SESSION_SECRET en Vercel.' },
      { status: 500 }
    );
  }

  const { phone, password } = await req.json().catch(() => ({}));
  if (typeof phone !== 'string' || typeof password !== 'string' || !checkAdminCredentials(phone, password)) {
    // Frena los intentos repetidos de adivinar la contraseña
    await new Promise(resolve => setTimeout(resolve, 1000));
    return NextResponse.json({ error: 'Número de celular o contraseña de administrador incorrectos.' }, { status: 401 });
  }

  const res = NextResponse.json({ authenticated: true });
  res.cookies.set(ADMIN_COOKIE, createAdminSession(), adminCookieOptions);
  return res;
}

// Cerrar sesión
export async function DELETE() {
  const res = NextResponse.json({ authenticated: false });
  res.cookies.set(ADMIN_COOKIE, '', { ...adminCookieOptions, maxAge: 0 });
  return res;
}
