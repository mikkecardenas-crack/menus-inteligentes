export interface CartItem {
  product: { id: string; name: string; price: number; image_url?: string | null };
  quantity: number;
  notes: string;
  customization?: {
    pricing_mode?: string;
    groups?: { label: string; pricing_role?: string; values: string[] }[];
  } | null;
  unitPrice?: number;
}

/**
 * Identidad de la línea: producto, instrucciones, opciones y precio unitario.
 * Se calcula al vuelo para que un carrito guardado por una versión anterior
 * siga pudiendo editarse sin un id nuevo.
 */
export function getCartItemKey(item: Omit<CartItem, 'quantity'>): string {
  const groups = (item.customization?.groups || [])
    .filter(group => Array.isArray(group.values) && group.values.length > 0)
    .map(group => [group.label, group.pricing_role || 'additive', [...group.values].sort()])
    .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));

  return JSON.stringify([
    item.product.id,
    normalizeNotes(item.notes),
    groups,
    getCartItemUnitPrice(item),
  ]);
}

export function getCartItemUnitPrice(item: Pick<CartItem, 'unitPrice' | 'product'>): number {
  const raw = item.unitPrice ?? item.product?.price;
  const price = typeof raw === 'number' ? raw : Number(raw);
  return Number.isFinite(price) ? price : 0;
}

export function addCartItem(items: CartItem[], item: Omit<CartItem, 'quantity'>): CartItem[] {
  const notes = normalizeNotes(item.notes);
  const nextItem = { ...item, notes };
  const key = getCartItemKey(nextItem);
  const existing = items.find(line => getCartItemKey(line) === key);
  if (!existing) return [...items, { ...nextItem, quantity: 1 }];
  return items.map(line => line === existing ? { ...line, quantity: line.quantity + 1 } : line);
}

export function removeCartItem(items: CartItem[], key: string): CartItem[] {
  return items.filter(item => getCartItemKey(item) !== key);
}

export function setCartItemQuantity(items: CartItem[], key: string, quantity: number): CartItem[] {
  if (quantity <= 0) return removeCartItem(items, key);
  return items.map(item => getCartItemKey(item) === key ? { ...item, quantity } : item);
}

export function getCartTotal(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + getCartItemUnitPrice(item) * item.quantity, 0);
}

function normalizeNotes(notes: string | null | undefined): string {
  return String(notes ?? '').trim();
}
