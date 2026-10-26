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

test('string prices and missing notes still match the same line', () => {
  const saved = [{ product: { ...product, price: '15000' }, notes: undefined, quantity: 1 }];
  const cart = addCartItem(saved, line('  ', null, 15000));
  assert.equal(cart.length, 1);
  assert.equal(cart[0].quantity, 2);
  assert.equal(getCartTotal(cart), 30000);
});

test('Palacio: voladoras with and without notes stay split from Jugo Hit', () => {
  const voladora = { id: 'voladora', name: 'La Voladora', price: 49900 };
  const jugo = { id: 'jugo', name: 'Jugo Hit', price: 2500 };
  const add = (cart, product, notes) => addCartItem(cart, { product, notes, unitPrice: product.price });

  let cart = add(add([], voladora, ''), voladora, '');
  cart = add(add(cart, voladora, 'Sin salsa QA'), voladora, 'Sin salsa QA');
  cart = add(cart, jugo, '');

  assert.equal(cart.length, 3);
  assert.equal(getCartTotal(cart), 202100);

  const plain = cart.find(item => item.product.id === 'voladora' && item.notes === '');
  const noted = cart.find(item => item.notes === 'Sin salsa QA');
  cart = setCartItemQuantity(cart, getCartItemKey(noted), noted.quantity - 1);
  cart = removeCartItem(cart, getCartItemKey(plain));
  assert.equal(getCartTotal(cart), 52400);

  cart = add(cart, voladora, '');
  assert.equal(cart.length, 3);
  assert.equal(getCartTotal(cart), 102300);
});

test('same base price with different options stays split and identical options merge', () => {
  const burger = { id: 'clasica', name: 'Clásica', price: 12000 };
  const meat = value => ({ groups: [{ label: 'Elige tu carne', values: [value] }] });
  let cart = addCartItem([], { product: burger, notes: '', customization: meat('Res') });
  cart = addCartItem(cart, { product: burger, notes: '', customization: meat('Pollo') });
  cart = addCartItem(cart, { product: burger, notes: '', customization: meat('Res') });
  assert.deepEqual(cart.map(item => [item.customization.groups[0].values[0], item.quantity]), [['Res', 2], ['Pollo', 1]]);
  assert.equal(getCartTotal(cart), 36000);
});
