import { extractProductCustomization } from './productCustomization';
import type { CustomizationGroup, CustomizationOption } from './types';

// ================================================================
// Migración automática: convierte grupos embebidos en description
// (formato __MENU_CUSTOMIZATION__) a las nuevas tablas globales
// ================================================================

const MIGRATION_FLAG_KEY = 'menu_customization_migrated_v1';

export function isMigrationDone(): boolean {
  try {
    return localStorage.getItem(MIGRATION_FLAG_KEY) === 'true';
  } catch {
    return false;
  }
}

export function markMigrationDone(): void {
  try {
    localStorage.setItem(MIGRATION_FLAG_KEY, 'true');
  } catch {
    // ignore
  }
}

interface MigrationResult {
  migratedCount: number;
  skippedCount: number;
  error?: string;
}

export async function migrateEmbeddedCustomizations(
  supabase: any,
  restaurantId: string,
  products: any[]
): Promise<MigrationResult> {
  const productsWithCustomizations = products.filter(p => {
    const { config } = extractProductCustomization(p.description);
    return config && config.groups && config.groups.length > 0;
  });

  if (productsWithCustomizations.length === 0) {
    return { migratedCount: 0, skippedCount: 0 };
  }

  let migratedCount = 0;
  let skippedCount = 0;

  // Mapa para deduplicar grupos por nombre dentro del restaurante
  const groupNameToId: Record<string, string> = {};

  // Cargar grupos existentes para no duplicar
  const { data: existingGroups } = await supabase
    .from('customization_groups')
    .select('id, name')
    .eq('restaurant_id', restaurantId);

  (existingGroups || []).forEach((g: any) => {
    groupNameToId[g.name.toLowerCase()] = g.id;
  });

  for (const product of productsWithCustomizations) {
    const { cleanDescription, config } = extractProductCustomization(product.description);

    if (!config || !config.groups?.length) {
      skippedCount++;
      continue;
    }

    try {
      let linkOrder = 0;

      for (const legacyGroup of config.groups) {
        const groupName = legacyGroup.label || 'Grupo sin nombre';
        const groupNameKey = groupName.toLowerCase();

        let groupId = groupNameToId[groupNameKey];

        if (!groupId) {
          // Crear el grupo global
          const { data: newGroup, error: groupError } = await supabase
            .from('customization_groups')
            .insert({
              restaurant_id: restaurantId,
              name: groupName,
              description: legacyGroup.description || '',
              required: Boolean(legacyGroup.required),
              min_selections: Number(legacyGroup.minSelections) || 0,
              max_selections: Number(legacyGroup.maxSelections) || 1,
              display_order: 0,
            })
            .select('id')
            .single();

          if (groupError) throw groupError;

          groupId = newGroup.id;
          groupNameToId[groupNameKey] = groupId;

          // Insertar opciones
          const options = (legacyGroup.options || []).map((opt: any, idx: number) => ({
            group_id: groupId,
            label: opt.label || '',
            price: Number(opt.price) || 0,
            display_order: idx,
          }));

          if (options.length > 0) {
            const { error: optError } = await supabase
              .from('customization_options')
              .insert(options);
            if (optError) throw optError;
          }
        }

        // Vincular el grupo al producto (ignorar si ya existe)
        await supabase
          .from('product_customization_groups')
          .upsert({
            product_id: product.id,
            group_id: groupId,
            is_copy: false,
            display_order: linkOrder++,
          }, { onConflict: 'product_id,group_id' });
      }

      // Limpiar el campo description (dejar solo el texto limpio)
      await supabase
        .from('products')
        .update({ description: cleanDescription })
        .eq('id', product.id);

      migratedCount++;
    } catch (err: any) {
      console.error(`Error migrando producto ${product.id}:`, err.message);
      skippedCount++;
    }
  }

  return { migratedCount, skippedCount };
}
