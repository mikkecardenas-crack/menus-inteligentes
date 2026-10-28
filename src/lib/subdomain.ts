// Subdominios por negocio: <subdomain>.menuinteligente.site
// En local también funciona con <subdomain>.localhost:3000.
export const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'menuinteligente.site';

// Igual que la restricción profiles_subdomain_format de migration_subdomains.sql
export const RESERVED_SUBDOMAINS = ['www', 'app', 'admin', 'api', 'dashboard', 'login', 'menu', 'mail'];
const SUBDOMAIN_RE = /^[a-z0-9]([a-z0-9-]{0,38}[a-z0-9])?$/;

export function normalizeSubdomain(value: string) {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
}

export function isValidSubdomain(value: string) {
  return SUBDOMAIN_RE.test(value) && !RESERVED_SUBDOMAINS.includes(value);
}

// Devuelve el subdominio del negocio a partir del Host, o null si es el dominio principal.
export function getSubdomainFromHost(host: string | null) {
  if (!host) return null;
  const hostname = host.split(':')[0].toLowerCase();
  const suffix = [`.${ROOT_DOMAIN}`, '.localhost'].find(s => hostname.endsWith(s));
  if (!suffix) return null;
  const sub = hostname.slice(0, -suffix.length);
  if (sub.includes('.') || !isValidSubdomain(sub)) return null;
  return sub;
}

// Enlace público del menú: el subdominio si el negocio tiene uno, si no /menu/<slug>.
export function getMenuUrl(profile: { slug: string; subdomain?: string | null }, origin: string) {
  if (!profile.subdomain) return `${origin}/menu/${profile.slug}`;
  if (origin.includes('localhost')) {
    const url = new URL(origin);
    return `${url.protocol}//${profile.subdomain}.localhost${url.port ? `:${url.port}` : ''}`;
  }
  return `https://${profile.subdomain}.${ROOT_DOMAIN}`;
}
