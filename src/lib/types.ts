// ================================================================
// Tipos compartidos para el sistema de personalización global
// ================================================================

// ─── Modos de cálculo de precio por producto ─────────────────────────────────
// 'standard'           → precio base del producto, sin modificaciones (comportamiento por defecto)
// 'base_plus_options'  → precio base + suma de opciones con precio (grupos con role=additive)
// 'max_selected_option'→ MAX(precio de opciones en grupos role=dominant) + suma de grupos role=additive
export type PricingMode = 'standard' | 'base_plus_options' | 'max_selected_option';

// ─── Rol del grupo en el cálculo de precio ────────────────────────────────────
// 'additive'  → su precio se suma siempre (complementos, extras)
// 'dominant'  → participa en el MAX (sabores de pizza, tamaños con precios diferentes)
// 'free'      → no afecta el precio (observaciones, elecciones sin costo extra)
export type PricingRole = 'additive' | 'dominant' | 'free';

export interface CustomizationOption {
  id: string;
  group_id: string;
  label: string;
  price: number;
  display_order: number;
}

export interface CustomizationGroup {
  id: string;
  restaurant_id: string;
  name: string;
  description: string;
  required: boolean;
  min_selections: number;
  max_selections: number;
  display_order: number;
  created_at?: string;
  options: CustomizationOption[];
  pricing_role?: PricingRole; // 'additive' por defecto (retrocompatible)
}

export interface ProductCustomizationGroupLink {
  id: string;
  product_id: string;
  group_id: string;
  is_copy: boolean;
  display_order: number;
  group?: CustomizationGroup;
}

export interface Product {
  id: string;
  restaurant_id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  category: string;
  available: boolean;
  display_order: number;
  created_at: string;
  pricing_mode?: PricingMode; // 'standard' por defecto (retrocompatible)
  // Relación con grupos (viene del join en el menú público)
  customization_links?: ProductCustomizationGroupLink[];
}

// Formato legado (embebido en description con __MENU_CUSTOMIZATION__)
// Se mantiene para compatibilidad durante la migración
export interface LegacyCustomizationOption {
  id: string;
  label: string;
  description?: string;
  price?: number;
}

export interface LegacyCustomizationGroup {
  id: string;
  label: string;
  description?: string;
  minSelections?: number;
  maxSelections?: number;
  required?: boolean;
  options: LegacyCustomizationOption[];
}

export interface LegacyCustomizationConfig {
  title?: string;
  description?: string;
  groups: LegacyCustomizationGroup[];
}

// ================================================================
// Reglas condicionales entre grupos
// Ejemplo: Si Tamaño=Grande → Sabores máx_selecciones=3
// ================================================================
export interface CustomizationRule {
  id: string;
  product_id: string;
  trigger_group_id: string;   // grupo que activa la regla (ej: Tamaño)
  trigger_option_id: string;  // opción específica que activa (ej: Grande)
  target_group_id: string;    // grupo afectado por la regla (ej: Sabores)
  effect_type: 'set_max' | 'set_min' | 'show' | 'hide';
  effect_value: number;       // valor del efecto (ej: 3 para máx=3)
  display_order: number;
}

