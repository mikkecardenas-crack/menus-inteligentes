// ================================================================
// Tipos compartidos para el sistema de personalización global
// ================================================================

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
