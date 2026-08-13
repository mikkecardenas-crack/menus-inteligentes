import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import ClientMenu from './ClientMenu';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();

  if (!profile) {
    return {
      title: 'Restaurante no encontrado',
    };
  }

  return {
    title: `${profile.name} - Menú Digital`,
    description: `Ordena en línea en ${profile.name} y envía tu pedido directo por WhatsApp.`,
  };
}

export default async function MenuPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();

  if (!profile) {
    notFound();
  }

  const { data: products } = await supabase
    .from('products')
    .select(`
      *,
      product_customization_groups (
        id,
        display_order,
        customization_groups (
          id, name, description, required, min_selections, max_selections,
          customization_options (id, label, price, display_order)
        )
      ),
      customization_rules (
        id, trigger_group_id, trigger_option_id, target_group_id, effect_type, effect_value
      )
    `)
    .eq('restaurant_id', profile.id)
    .eq('available', true)
    .order('display_order', { ascending: true });

  return <ClientMenu profile={profile} initialProducts={products || []} />;
}
