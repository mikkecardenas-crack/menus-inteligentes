// Sesión del panel de administrador. Solo se usa en el servidor (rutas /api/admin/*).
// Credenciales en variables de entorno de Vercel (sin NEXT_PUBLIC_, para que nunca lleguen al navegador):
//   ADMIN_PHONE, ADMIN_PASSWORD y ADMIN_SESSION_SECRET (texto aleatorio largo para firmar la cookie).
import { createHmac, timingSafeEqual } from 'node:crypto';
import type { NextRequest } from 'next/server';

export const ADMIN_COOKIE = 'admin_session';
export const ADMIN_SESSION_SECONDS = 60 * 60 * 8;

export const adminCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path: '/api/admin',
  maxAge: ADMIN_SESSION_SECONDS,
};

function getConfig() {
  const phone = process.env.ADMIN_PHONE;
  const password = process.env.ADMIN_PASSWORD;
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!phone || !password || !secret || secret.length < 32) return null;
  return { phone, password, secret };
}

export function isAdminConfigured() {
  return getConfig() !== null;
}

function safeEqual(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

function sign(payload: string, secret: string) {
  return createHmac('sha256', secret).update(payload).digest('base64url');
}

export function checkAdminCredentials(phone: string, password: string) {
  const config = getConfig();
  if (!config) return false;
  // Se evalúan ambas para no revelar cuál de las dos falló
  const phoneOk = safeEqual(phone.trim(), config.phone);
  const passwordOk = safeEqual(password, config.password);
  return phoneOk && passwordOk;
}

// Token = <expira>.<firma>. Cambiar ADMIN_SESSION_SECRET invalida todas las sesiones.
export function createAdminSession() {
  const config = getConfig();
  if (!config) throw new Error('El panel de administrador no está configurado.');
  const expires = String(Math.floor(Date.now() / 1000) + ADMIN_SESSION_SECONDS);
  return `${expires}.${sign(expires, config.secret)}`;
}

export function isValidAdminSession(token: string | undefined) {
  const config = getConfig();
  if (!config || !token) return false;
  const [expires, signature] = token.split('.');
  if (!expires || !signature || !safeEqual(signature, sign(expires, config.secret))) return false;
  return Number(expires) > Date.now() / 1000;
}

export function isAdminRequest(req: NextRequest) {
  return isValidAdminSession(req.cookies.get(ADMIN_COOKIE)?.value);
}
