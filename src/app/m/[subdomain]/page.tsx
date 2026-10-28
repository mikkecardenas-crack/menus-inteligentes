import { notFound } from 'next/navigation';
import ClientMenu from '../../menu/[slug]/ClientMenu';
import { getMenuProducts, getMenuProfile, menuMetadata } from '../../menu/[slug]/menuData';

// Destino interno de <subdomain>.menuinteligente.site (ver src/proxy.ts).
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function generateMetadata({ params }: { params: Promise<{ subdomain: string }> }) {
  const { subdomain } = await params;
  return menuMetadata(await getMenuProfile('subdomain', subdomain));
}

export default async function SubdomainMenuPage({ params }: { params: Promise<{ subdomain: string }> }) {
  const { subdomain } = await params;
  const profile = await getMenuProfile('subdomain', subdomain);

  if (!profile) {
    notFound();
  }

  const products = await getMenuProducts(profile.id);

  return <ClientMenu profile={profile} initialProducts={products} />;
}
