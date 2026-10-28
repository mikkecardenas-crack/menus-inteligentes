import test from 'node:test';
import assert from 'node:assert/strict';
import { addCartItem, getCartItemKey, getCartTotal, removeCartItem, setCartItemQuantity } from '../src/lib/cart.ts';

const product = { id: 'picada', name: 'Picada', price: 15000 };
const line = (notes = '', customization = null, unitPrice) => ({ product, notes, customization, unitPrice });
const options = values => ({ groups: [{ label: 'Extras', values }] });

test('same notes merge quantities; different notes stay separate', () => {
  let cart = addCartItem([], line('Sin salsa'));
  cart = addCartItem(cart, line('Sin salsa'));
  cart = addCartItem(cart, line('Con salsa'));
  assert.deepEqual(cart.map(x => [x.notes, x.quantity]), [['Sin salsa', 2], ['Con salsa', 1]]);
  assert.equal(getCartTotal(cart), 45000);
});

test('same selections merge regardless of selection order; different options and prices stay separate', () => {
  let cart = addCartItem([], line('', options(['Queso', 'Papa']), 20000));
  cart = addCartItem(cart, line('', options(['Papa', 'Queso']), 20000));
  cart = addCartItem(cart, line('', options(['Papa']), 18000));
  cart = addCartItem(cart, line('', options(['Papa']), 19000));
  assert.deepEqual(cart.map(x => x.quantity), [2, 1, 1]);
  assert.equal(getCartTotal(cart), 77000);
  assert.deepEqual(cart[0].customization.groups[0].values, ['Queso', 'Papa']);
});

test('quantity updates, delete and re-add affect only the selected variant', () => {
  let cart = addCartItem(addCartItem([], line('Sin salsa')), line('Con salsa', options(['Papa']), 18000));
  const first = getCartItemKey(cart[0]);
  const second = getCartItemKey(cart[1]);
  cart = setCartItemQuantity(cart, second, 3);
  assert.equal(getCartTotal(cart), 69000);
  assert.equal(cart[0].quantity, 1);
  cart = removeCartItem(cart, first);
  assert.equal(getCartTotal(cart), 54000);
  cart = addCartItem(cart, line('Sin salsa'));
  assert.equal(getCartTotal(cart), 69000);
  cart = setCartItemQuantity(cart, second, 0);
  assert.deepEqual(cart.map(x => x.notes), ['Sin salsa']);
  assert.equal(getCartTotal(cart), 15000);
});

test('legacy saved carts need no new IDs and empty customization equals no options', () => {
  const saved = JSON.parse(JSON.stringify([{ product, notes: 'Sin salsa', quantity: 2 }]));
  let cart = addCartItem(saved, line(' Sin salsa ', { pricing_mode: 'standard', groups: [] }, 15000));
  assert.equal(cart.length, 1);
  assert.equal(cart[0].quantity, 3);
  cart = setCartItemQuantity(cart, getCartItemKey(cart[0]), 1);
  assert.equal(getCartTotal(cart), 15000);
  assert.equal(getCartTotal(removeCartItem(cart, getCartItemKey(cart[0]))), 0);
});

test('zero calculated price is preserved, and different products remain distinct', () => {
  let cart = addCartItem([], line('', options(['Cortesía']), 0));
  cart = addCartItem(cart, { product: { ...product, id: 'otra' }, notes: '' });
  assert.equal(cart.length, 2);
  assert.equal(getCartTotal(cart), 15000);
});
