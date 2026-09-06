import { PricingMode, PricingRole } from './types';

export interface PricingOption {
  id: string;
  label?: string;
  price?: number | null;
}

export interface PricingGroup {
  id: string;
  name?: string;
  pricing_role?: PricingRole;
  options?: PricingOption[];
}

export interface PricingProduct {
  id?: string;
  price: number;
  pricing_mode?: PricingMode;
  description?: string | null;
}

/**
 * Extrae el pricing_mode de un producto con fallback a descripción o 'standard'.
 */
export function getProductPricingMode(product: any): PricingMode {
  if (product?.pricing_mode) {
    return product.pricing_mode as PricingMode;
  }
  // Fallback si está embebido en description metadata
  if (product?.description && typeof product.description === 'string') {
    const match = product.description.match(/__PRICING_MODE:([a-z_]+)__/);
    if (match && match[1]) {
      return match[1] as PricingMode;
    }
  }
  return 'standard';
}

/**
 * Extrae el pricing_role de un grupo con fallback a descripción o 'additive'.
 */
export function getGroupPricingRole(group: any): PricingRole {
  if (group?.pricing_role) {
    return group.pricing_role as PricingRole;
  }
  if (group?.description && typeof group.description === 'string') {
    const match = group.description.match(/__PRICING_ROLE:([a-z_]+)__/);
    if (match && match[1]) {
      return match[1] as PricingRole;
    }
  }
  return 'additive';
}

/**
 * Calcula el precio final unitario de un producto con sus opciones seleccionadas.
 * 
 * Reglas:
 * - 'standard': El producto mantiene su precio normal. Si no tiene opciones de pago o está en standard, retorna precio base.
 * - 'base_plus_options': precioBase + suma de opciones seleccionadas en grupos aditivos.
 * - 'max_selected_option': MAX(opciones en grupos dominant) + SUM(opciones en grupos additive).
 *   Si no hay opciones dominant seleccionadas, usa el precio base + aditivos.
 */
export function calculateFinalPrice(
  product: PricingProduct,
  groups: PricingGroup[],
  selection: Record<string, string[]>
): number {
  const basePrice = Number(product.price) || 0;
  const mode = getProductPricingMode(product);

  // Modo ESTÁNDAR: precio plano
  if (mode === 'standard') {
    return basePrice;
  }

  // Modo BASE + ADICIONALES:
  if (mode === 'base_plus_options') {
    let extra = 0;
    for (const group of groups) {
      const role = getGroupPricingRole(group);
      if (role === 'free') continue;
      const selectedIds = selection[group.id] || [];
      for (const optId of selectedIds) {
        const opt = group.options?.find(o => o.id === optId);
        if (opt?.price) {
          extra += Number(opt.price);
        }
      }
    }
    return basePrice + extra;
  }

  // Modo MAX SELECTED OPTION (Ej: Pizzas con 2 sabores):
  if (mode === 'max_selected_option') {
    let dominantPrices: number[] = [];
    let additiveSum = 0;

    // Verificar si algún grupo está explícitamente marcado como 'dominant'
    const hasExplicitDominant = groups.some(g => getGroupPricingRole(g) === 'dominant');

    for (const group of groups) {
      const role = getGroupPricingRole(group);
      if (role === 'free') continue;

      const selectedIds = selection[group.id] || [];

      for (const optId of selectedIds) {
        const opt = group.options?.find(o => o.id === optId);
        const optPrice = Number(opt?.price) || 0;

        if (hasExplicitDominant) {
          if (role === 'dominant') {
            dominantPrices.push(optPrice);
          } else {
            // Es additive
            additiveSum += optPrice;
          }
        } else {
          // Si ningún grupo fue configurado como dominant, cualquier opción con precio participa en el MAX
          dominantPrices.push(optPrice);
        }
      }
    }

    // Calcular el mayor de las opciones dominantes
    let dominantMax = dominantPrices.length > 0 ? Math.max(...dominantPrices) : 0;

    // Si no se seleccionó ninguna opción dominante, o su max es 0, usamos el precio base del producto
    const mainPrice = dominantMax > 0 ? dominantMax : basePrice;

    return mainPrice + additiveSum;
  }

  // Fallback seguro
  return basePrice;
}

/**
 * Obtiene el precio mínimo para mostrar en la tarjeta de un producto ("Desde $XX.000").
 */
export function getProductDisplayStartingPrice(
  product: PricingProduct,
  groups: PricingGroup[]
): { isStartingPrice: boolean; price: number } {
  const mode = getProductPricingMode(product);

  if (mode === 'max_selected_option') {
    // Buscar opciones en grupos dominant (o todos los grupos si no hay dominant)
    const hasExplicitDominant = groups.some(g => getGroupPricingRole(g) === 'dominant');
    const candidatePrices: number[] = [];

    for (const group of groups) {
      const role = getGroupPricingRole(group);
      if (role === 'free') continue;
      if (hasExplicitDominant && role !== 'dominant') continue;

      for (const opt of group.options || []) {
        const p = Number(opt.price) || 0;
        if (p > 0) {
          candidatePrices.push(p);
        }
      }
    }

    if (candidatePrices.length > 0) {
      return {
        isStartingPrice: true,
        price: Math.min(...candidatePrices)
      };
    }
  }

  return {
    isStartingPrice: false,
    price: Number(product.price) || 0
  };
}
