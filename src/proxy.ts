import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { ROOT_DOMAIN, getSubdomainFromHost } from '@/lib/subdomain';

// <subdomain>.menuinteligente.site muestra el menú de ese negocio sin cambiar la URL.
// Cualquier otra ruta en un subdominio (login, dashboard...) se manda al dominio principal.
export function proxy(request: NextRequest) {
  const host = request.headers.get('host');
  const subdomain = getSubdomainFromHost(host);
  if (!subdomain) return NextResponse.next();

  const url = request.nextUrl.clone();
  if (url.pathname === '/') {
    url.pathname = `/m/${subdomain}`;
    return NextResponse.rewrite(url);
  }

  const isLocal = host?.split(':')[0].endsWith('localhost');
  const mainOrigin = isLocal ? `http://localhost${url.port ? `:${url.port}` : ''}` : `https://www.${ROOT_DOMAIN}`;
  return NextResponse.redirect(new URL(`${url.pathname}${url.search}`, mainOrigin));
}

export const config = {
  // Deja pasar API, archivos internos de Next y archivos estáticos (con extensión)
  matcher: ['/((?!api/|_next/|.*\\..*).*)'],
};
