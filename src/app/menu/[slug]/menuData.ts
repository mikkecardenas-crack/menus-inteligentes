import { createClient } from '@/lib/supabase/server';

// Busca el negocio por su slug (/menu/<slug>) o por su subdominio (<subdomain>.menuinteligente.site).
// Si la columna subdomain aún no existe en la base, la consulta falla y se trata como "no encontrado".
export async function getMenuProfile(column: 'slug' | 'subdomain', value: string) {
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq(column, value)
    .maybeSingle();
  return profile;
}

export async function getMenuProducts(restaurantId: string) {
  const supabase = await createClient();
  const { data: products } = await supabase
    .from('products')
    .select(`
      *,
      product_customization_groups (
        id,
        display_order,
        customization_groups (
          id, name, description, required, min_selections, max_selections, pricing_role,
          customization_options (id, label, price, display_order)
        )
      ),
      customization_rules (
        id, trigger_group_id, trigger_option_id, target_group_id, effect_type, effect_value
      )
    `)
    .eq('restaurant_id', restaurantId)
    .eq('available', true)
    .order('display_order', { ascending: true });
  return products || [];
}

export function menuMetadata(profile: { name: string } | null) {
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
