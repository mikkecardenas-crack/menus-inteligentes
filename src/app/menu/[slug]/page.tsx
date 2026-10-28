import { notFound } from 'next/navigation';
import ClientMenu from './ClientMenu';
import { getMenuProducts, getMenuProfile, menuMetadata } from './menuData';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return menuMetadata(await getMenuProfile('slug', slug));
}

export default async function MenuPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const profile = await getMenuProfile('slug', slug);

  if (!profile) {
    notFound();
  }

  const products = await getMenuProducts(profile.id);

  return <ClientMenu profile={profile} initialProducts={products} />;
}
