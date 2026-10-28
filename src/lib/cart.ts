export interface CartItem {
  product: { id: string; name: string; price: number; image_url?: string };
  quantity: number;
  notes: string;
  customization?: {
    pricing_mode?: string;
    groups?: { label: string; pricing_role?: string; values: string[] }[];
  } | null;
  unitPrice?: number;
}

/** Line identity includes the instructions, selected options and actual unit price.
 * Derived rather than stored so carts saved by earlier versions remain editable.
 */
export function getCartItemKey(item: Omit<CartItem, 'quantity'>): string {
  const groups = (item.customization?.groups || [])
    .filter(group => group.values?.length)
    .map(group => [group.label, group.pricing_role || 'additive', [...group.values].sort()])
    .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
  return JSON.stringify([
    item.product.id,
    item.notes.trim(),
    groups,
    item.unitPrice ?? item.product.price,
  ]);
}

export function addCartItem(items: CartItem[], item: Omit<CartItem, 'quantity'>): CartItem[] {
  const key = getCartItemKey(item);
  const existing = items.find(line => getCartItemKey(line) === key);
  if (!existing) return [...items, { ...item, notes: item.notes.trim(), quantity: 1 }];
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
  return items.reduce((sum, item) => sum + (item.unitPrice ?? item.product.price) * item.quantity, 0);
}
