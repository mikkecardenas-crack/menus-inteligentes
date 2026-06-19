'use client';

import { useState, useEffect } from 'react';
import { 
  ShoppingCart, Plus, Minus, ChevronRight, MapPin, 
  UtensilsCrossed, Store, User, MessageCircle, Trash2, ShieldAlert
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface ClientMenuProps {
  profile: any;
  initialProducts: any[];
}

interface CartItem {
  product: any;
  quantity: number;
  notes: string;
}

type DeliveryType = 'delivery' | 'table' | 'pickup';
type CheckoutStep = 'cart' | 'name' | 'delivery-type' | 'delivery-details' | 'table' | 'confirm';

export default function ClientMenu({ profile, initialProducts }: ClientMenuProps) {
  const [activeCategory, setActiveCategory] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [productNotes, setProductNotes] = useState('');

  // Estados del carrito
  const [items, setItems] = useState<CartItem[]>([]);
  const [mounted, setMounted] = useState(false);

  // Estados del Checkout
  const [showCheckout, setShowCheckout] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState<CheckoutStep>('cart');
  const [customerName, setCustomerName] = useState('');
  const [deliveryType, setDeliveryType] = useState<DeliveryType>('delivery');
  const [deliveryDetails, setDeliveryDetails] = useState({
    address: '', neighborhood: '', apartment: '', floor: '', reference: ''
  });
  const [tableNumber, setTableNumber] = useState('');

  const rawCategories = Array.from(new Set(initialProducts.map(p => p.category)));
  const savedOrder = profile.category_order || [];
  const categories = [
    ...savedOrder.filter((c: string) => rawCategories.includes(c)),
    ...rawCategories.filter((c: string) => !savedOrder.includes(c))
  ];

  // Cargar carrito de sessionStorage al montar (evita errores de hidratación de SSR)
  useEffect(() => {
    setMounted(true);
    const saved = sessionStorage.getItem(`cart_${profile.id}`);
    if (saved) {
      try {
        setItems(JSON.parse(saved));
      } catch {
        setItems([]);
      }
    }
  }, [profile.id]);

  // Guardar carrito en sessionStorage
  useEffect(() => {
    if (mounted) {
      sessionStorage.setItem(`cart_${profile.id}`, JSON.stringify(items));
    }
  }, [items, mounted, profile.id]);

  useEffect(() => {
    if (categories.length > 0 && !activeCategory) {
      setActiveCategory(categories[0]);
    }
  }, [categories, activeCategory]);

  const addToCart = (product: any, notes = '') => {
    setItems(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1, notes }];
    });
  };

  const removeFromCart = (productId: string) => {
    setItems(prev => prev.filter(item => item.product.id !== productId));
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setItems(prev =>
      prev.map(item =>
        item.product.id === productId ? { ...item, quantity } : item
      )
    );
  };

  const clearCart = () => setItems([]);

  const total = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(price);
  };

  const handleAddProduct = () => {
    if (selectedProduct) {
      addToCart(selectedProduct, productNotes);
      setSelectedProduct(null);
      setProductNotes('');
    }
  };

  const startCheckout = () => {
    setShowCheckout(true);
    setCheckoutStep('cart');
  };

  const nextStep = () => {
    const steps: CheckoutStep[] = ['cart', 'name', 'delivery-type'];
    if (deliveryType === 'delivery') steps.push('delivery-details');
    if (deliveryType === 'table') steps.push('table');
    steps.push('confirm');
    
    const currentIndex = steps.indexOf(checkoutStep);
    if (currentIndex < steps.length - 1) {
      setCheckoutStep(steps[currentIndex + 1]);
    }
  };

  const prevStep = () => {
    const steps: CheckoutStep[] = ['cart', 'name', 'delivery-type'];
    if (deliveryType === 'delivery') steps.push('delivery-details');
    if (deliveryType === 'table') steps.push('table');
    steps.push('confirm');
    
    const currentIndex = steps.indexOf(checkoutStep);
    if (currentIndex > 0) {
      setCheckoutStep(steps[currentIndex - 1]);
    }
  };

  const sendToWhatsApp = () => {
    let message = `🌮 *NUEVO PEDIDO DE ${profile.name.toUpperCase()}*\n`;
    message += `━━━━━━━━━━━━━━━\n\n`;
    message += `👤 *Cliente:* ${customerName}\n\n`;
    message += `📦 *Productos:*\n`;
    
    items.forEach(item => {
      message += `• ${item.quantity}x ${item.product.name} - ${formatPrice(item.product.price * item.quantity)}\n`;
      if (item.notes) message += `   _"${item.notes}"_\n`;
    });
    
    message += `\n💰 *TOTAL: ${formatPrice(total)}*\n\n`;
    
    if (deliveryType === 'delivery') {
      message += `🚗 *Tipo:* Domicilio\n`;
      message += `📍 *Dirección:* ${deliveryDetails.address}\n`;
      if (deliveryDetails.neighborhood) message += `🏘️ *Barrio:* ${deliveryDetails.neighborhood}\n`;
      if (deliveryDetails.apartment) message += `🏢 *Apto/Piso:* ${deliveryDetails.apartment} ${deliveryDetails.floor}\n`;
      if (deliveryDetails.reference) message += `📝 *Referencia:* ${deliveryDetails.reference}\n`;
      message += `\n_El costo del domicilio será confirmado por el restaurante._`;
    } else if (deliveryType === 'table') {
      message += `🍽️ *Tipo:* Para mesa\n`;
      message += `🪑 *Mesa #:* ${tableNumber}\n`;
    } else {
      message += `🏪 *Tipo:* Recoger en local\n`;
    }

    const whatsappNumber = profile.whatsapp.replace(/\+/g, '').trim();
    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
    
    clearCart();
    setShowCheckout(false);
    setCheckoutStep('cart');
    setCustomerName('');
    setDeliveryDetails({ address: '', neighborhood: '', apartment: '', floor: '', reference: '' });
    setTableNumber('');
  };

  const categoryProducts = initialProducts.filter(p => p.category === activeCategory);

  // Si el restaurante está cerrado
  if (!profile.is_open) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 p-6 text-white text-center">
        <div className="space-y-6 max-w-md bg-slate-900 border border-slate-850 p-8 rounded-3xl shadow-xl">
          <div className="w-20 h-20 bg-red-500/10 border border-red-500/30 text-red-500 rounded-full flex items-center justify-center mx-auto">
            <Store className="w-10 h-10" />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-extrabold">{profile.name}</h1>
            <p className="text-slate-400">El restaurante se encuentra cerrado en este momento.</p>
          </div>
          <p className="text-xs text-slate-500 bg-slate-950/60 p-3 rounded-lg border border-slate-850">
            Horarios y pedidos disponibles próximamente. ¡Vuelve pronto!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans pb-24">
      {/* Header Banner */}
      <header 
        className="sticky top-0 z-45 text-white p-5 shadow-lg border-b border-white/10"
        style={{ background: `linear-gradient(135deg, ${profile.primary_color}, ${profile.primary_color}cc)`, backdropFilter: 'blur(10px)' }}
      >
        <div className="max-w-2xl mx-auto flex items-center gap-4">
          {profile.logo_url ? (
            <img 
              src={profile.logo_url} 
              alt="Logo" 
              className="w-12 h-12 rounded-full object-cover border border-white/30 shadow-md flex-shrink-0"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-white/20 border border-white/30 flex items-center justify-center font-bold text-lg text-white shadow-md flex-shrink-0">
              {profile.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="text-left">
            <h1 className="font-extrabold text-xl tracking-tight">{profile.name}</h1>
            <p className="text-xs text-white/80 font-medium">Menú Digital Autogestionado</p>
          </div>
        </div>
      </header>

      {/* Categories Horizontal Slider */}
      <div className="sticky top-[89px] z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-900 py-3 shadow-md">
        <div className="max-w-2xl mx-auto px-4">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide py-1">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  activeCategory === cat 
                    ? 'text-white shadow-lg' 
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-850 hover:bg-slate-850'
                }`}
                style={activeCategory === cat ? { backgroundColor: profile.primary_color } : {}}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Product List */}
      <main className="max-w-2xl mx-auto p-4 space-y-4">
        <h2 className="text-lg font-bold text-slate-300 mb-2 border-l-4 pl-3 text-left" style={{ borderColor: profile.primary_color }}>
          {activeCategory}
        </h2>
        
        <div className="grid gap-3">
          {categoryProducts.map(product => {
            const cartItem = items.find(i => i.product.id === product.id);
            return (
              <div 
                key={product.id} 
                className="bg-slate-900/60 border border-slate-850 rounded-2xl overflow-hidden flex shadow-sm group hover:border-slate-700 transition-colors"
              >
                {product.image_url && product.image_url.trim() !== '' && product.image_url !== 'null' && (
                  <img 
                    src={product.image_url} 
                    alt={product.name} 
                    className="w-28 h-28 object-cover flex-shrink-0"
                  />
                )}
                <div className="flex-1 p-4 flex flex-col justify-between text-left min-w-0">
                  <div>
                    <h3 className="font-bold text-sm text-white truncate">{product.name}</h3>
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2">{product.description}</p>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="font-extrabold text-sm" style={{ color: profile.primary_color }}>
                      {formatPrice(product.price)}
                    </span>
                    
                    {cartItem ? (
                      <div className="flex items-center gap-2 bg-slate-950 border border-slate-850 rounded-full px-1.5 py-0.5 shadow-md">
                        <button 
                          onClick={() => updateQuantity(product.id, cartItem.quantity - 1)}
                          className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="font-bold text-xs w-4 text-center">{cartItem.quantity}</span>
                        <button 
                          onClick={() => updateQuantity(product.id, cartItem.quantity + 1)}
                          className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button 
                        onClick={() => setSelectedProduct(product)}
                        className="w-8 h-8 rounded-full text-white flex items-center justify-center shadow-lg transition-transform hover:scale-110 cursor-pointer"
                        style={{ backgroundColor: profile.primary_color }}
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* Floating Cart Button (shows when items > 0) */}
      {itemCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-slate-950 via-slate-950 to-transparent z-50 flex justify-center">
          <button
            onClick={startCheckout}
            className="w-full max-w-2xl flex items-center justify-between text-white font-bold py-4.5 px-6 rounded-2xl shadow-2xl transition-all active:scale-98 cursor-pointer"
            style={{ 
              backgroundColor: '#25D366',
              boxShadow: '0 8px 30px rgba(37, 211, 102, 0.4)'
            }}
          >
            <div className="flex items-center gap-3">
              <ShoppingCart className="w-6 h-6" />
              <span>Realizar pedido</span>
            </div>
            <div className="flex items-center gap-2 bg-white/20 px-3.5 py-1 rounded-full text-xs">
              <span>{itemCount} productos</span>
              <span>•</span>
              <span>{formatPrice(total)}</span>
            </div>
          </button>
        </div>
      )}

      {/* DIALOG AGREGAR NOTAS AL PRODUCTO */}
      <Dialog open={!!selectedProduct} onOpenChange={() => setSelectedProduct(null)}>
        <DialogContent className="max-w-sm bg-slate-950 border border-slate-850 text-white p-0 overflow-hidden">
          {selectedProduct && (
            <>
              {selectedProduct.image_url && selectedProduct.image_url.trim() !== '' && selectedProduct.image_url !== 'null' && (
                <img src={selectedProduct.image_url} alt={selectedProduct.name} className="w-full h-48 object-cover" />
              )}
              <div className="p-5 space-y-4 text-left">
                <div>
                  <h2 className="text-lg font-bold text-white">{selectedProduct.name}</h2>
                  <p className="text-slate-400 text-xs mt-1">{selectedProduct.description}</p>
                  <p className="text-lg font-extrabold mt-2" style={{ color: profile.primary_color }}>{formatPrice(selectedProduct.price)}</p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-350 block mb-1">Notas u Observaciones (opcional)</label>
                  <Input 
                    value={productNotes}
                    onChange={(e) => setProductNotes(e.target.value)}
                    placeholder="Ej: Sin cebolla, salsas aparte..."
                    className="bg-slate-900 border-slate-850 text-white"
                  />
                </div>
                <Button 
                  onClick={handleAddProduct}
                  className="w-full text-white font-bold py-6 cursor-pointer"
                  style={{ backgroundColor: profile.primary_color }}
                >
                  Agregar al pedido
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* DIALOG CHECKOUT MULTIPASO */}
      <Dialog open={showCheckout} onOpenChange={setShowCheckout}>
        <DialogContent className="max-w-md bg-slate-950 border border-slate-850 text-white p-6 max-h-[90vh] overflow-y-auto scrollbar-hide">
          {/* STEP 1: REVIEW CART */}
          {checkoutStep === 'cart' && (
            <div className="space-y-4 text-left">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5 text-green-500" /> Confirmar Pedido
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-1 scrollbar-hide">
                {items.map(item => (
                  <div key={item.product.id} className="flex gap-3 p-3 bg-slate-900 border border-slate-850 rounded-xl relative">
                    {item.product.image_url && item.product.image_url.trim() !== '' && item.product.image_url !== 'null' && (
                      <img src={item.product.image_url} alt={item.product.name} className="w-14 h-14 rounded-lg object-cover flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-sm text-white truncate">{item.product.name}</h4>
                      {item.notes && <p className="text-[10px] text-slate-400 italic mt-0.5">"{item.notes}"</p>}
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-2 bg-slate-950 border border-slate-850 rounded-full px-1 py-0.5">
                          <button onClick={() => updateQuantity(item.product.id, item.quantity - 1)} className="w-5 h-5 flex items-center justify-center text-slate-400 hover:text-white">
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="text-xs font-bold w-4 text-center">{item.quantity}</span>
                          <button onClick={() => updateQuantity(item.product.id, item.quantity + 1)} className="w-5 h-5 flex items-center justify-center text-slate-400 hover:text-white">
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                        <span className="font-bold text-sm" style={{ color: profile.primary_color }}>
                          {formatPrice(item.product.price * item.quantity)}
                        </span>
                      </div>
                    </div>
                    <button onClick={() => removeFromCart(item.product.id)} className="text-slate-500 hover:text-red-400 absolute top-3 right-3 cursor-pointer">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex justify-between items-center py-3 border-t border-slate-900 font-bold text-md">
                <span>Total</span>
                <span style={{ color: profile.primary_color }}>{formatPrice(total)}</span>
              </div>
              <Button onClick={nextStep} className="w-full text-white font-bold py-6 cursor-pointer" style={{ backgroundColor: profile.primary_color }}>
                Continuar <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          )}

          {/* STEP 2: CUSTOMER NAME */}
          {checkoutStep === 'name' && (
            <div className="space-y-4 text-left">
              <div className="text-center py-2 px-4 bg-slate-900 border border-slate-850 rounded-xl">
                <span className="text-xs text-slate-400">Total:</span>
                <span className="ml-2 font-bold" style={{ color: profile.primary_color }}>{formatPrice(total)}</span>
              </div>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <User className="w-5 h-5 text-green-500" /> ¿Cuál es tu nombre?
                </DialogTitle>
              </DialogHeader>
              <Input 
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Tu nombre completo *"
                className="bg-slate-900 border-slate-850 text-white"
                autoFocus
              />
              <div className="flex gap-3">
                <Button variant="outline" onClick={prevStep} className="flex-1 border-slate-800 text-slate-350 cursor-pointer">
                  Atrás
                </Button>
                <Button 
                  onClick={nextStep} 
                  disabled={!customerName.trim()}
                  className="flex-1 text-white font-bold cursor-pointer" 
                  style={{ backgroundColor: profile.primary_color }}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          )}

          {/* STEP 3: DELIVERY TYPE */}
          {checkoutStep === 'delivery-type' && (
            <div className="space-y-4 text-left">
              <div className="text-center py-2 px-4 bg-slate-900 border border-slate-850 rounded-xl">
                <span className="text-xs text-slate-400">Total:</span>
                <span className="ml-2 font-bold" style={{ color: profile.primary_color }}>{formatPrice(total)}</span>
              </div>
              <DialogHeader>
                <DialogTitle>¿Cómo deseas recibir tu pedido?</DialogTitle>
              </DialogHeader>
              <div className="space-y-2">
                {[
                  { id: 'delivery', icon: MapPin, label: 'Domicilio', desc: 'Te lo llevamos a casa' },
                  { id: 'table', icon: UtensilsCrossed, label: 'Para mesa', desc: 'Estoy en el restaurante' },
                  { id: 'pickup', icon: Store, label: 'Recoger en local', desc: 'Paso yo a buscarlo' }
                ].map(option => (
                  <button
                    key={option.id}
                    onClick={() => setDeliveryType(option.id as DeliveryType)}
                    className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left cursor-pointer ${
                      deliveryType === option.id ? 'bg-orange-500/10' : 'border-slate-850 hover:border-slate-700 bg-slate-900'
                    }`}
                    style={deliveryType === option.id ? { borderColor: profile.primary_color, color: profile.primary_color } : { borderColor: '#1e293b' }}
                  >
                    <option.icon className="w-6 h-6" />
                    <div>
                      <p className="font-bold text-sm text-white">{option.label}</p>
                      <p className="text-xs text-slate-500">{option.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={prevStep} className="flex-1 border-slate-800 text-slate-350 cursor-pointer">
                  Atrás
                </Button>
                <Button onClick={nextStep} className="flex-1 text-white font-bold cursor-pointer" style={{ backgroundColor: profile.primary_color }}>
                  Siguiente
                </Button>
              </div>
            </div>
          )}

          {/* STEP 4: DETAILS */}
          {checkoutStep === 'delivery-details' && (
            <div className="space-y-4 text-left">
              <div className="text-center py-2 px-4 bg-slate-900 border border-slate-850 rounded-xl">
                <span className="text-xs text-slate-400">Total:</span>
                <span className="ml-2 font-bold" style={{ color: profile.primary_color }}>{formatPrice(total)}</span>
              </div>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-green-500" /> Dirección de Entrega
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <Input 
                  value={deliveryDetails.address}
                  onChange={(e) => setDeliveryDetails({ ...deliveryDetails, address: e.target.value })}
                  placeholder="Dirección completa *"
                  className="bg-slate-900 border-slate-850 text-white"
                  required
                />
                <Input 
                  value={deliveryDetails.neighborhood}
                  onChange={(e) => setDeliveryDetails({ ...deliveryDetails, neighborhood: e.target.value })}
                  placeholder="Barrio (Opcional)"
                  className="bg-slate-900 border-slate-850 text-white"
                />
                <div className="grid grid-cols-2 gap-2">
                  <Input 
                    value={deliveryDetails.apartment}
                    onChange={(e) => setDeliveryDetails({ ...deliveryDetails, apartment: e.target.value })}
                    placeholder="Apartamento / Oficina"
                    className="bg-slate-900 border-slate-850 text-white"
                  />
                  <Input 
                    value={deliveryDetails.floor}
                    onChange={(e) => setDeliveryDetails({ ...deliveryDetails, floor: e.target.value })}
                    placeholder="Bloque / Piso"
                    className="bg-slate-900 border-slate-850 text-white"
                  />
                </div>
                <Input 
                  value={deliveryDetails.reference}
                  onChange={(e) => setDeliveryDetails({ ...deliveryDetails, reference: e.target.value })}
                  placeholder="Indicación o punto de referencia"
                  className="bg-slate-900 border-slate-850 text-white"
                />
              </div>
              <p className="text-[11px] text-orange-400 bg-orange-500/10 p-3 rounded-lg border border-orange-500/20">
                💡 El costo del domicilio será confirmado por el restaurante en WhatsApp.
              </p>
              <div className="flex gap-3">
                <Button variant="outline" onClick={prevStep} className="flex-1 border-slate-800 text-slate-350 cursor-pointer">
                  Atrás
                </Button>
                <Button 
                  onClick={nextStep} 
                  disabled={!deliveryDetails.address.trim()}
                  className="flex-1 text-white font-bold cursor-pointer" 
                  style={{ backgroundColor: profile.primary_color }}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          )}

          {/* STEP 4 MESA: TABLE NUMBER */}
          {checkoutStep === 'table' && (
            <div className="space-y-4 text-left">
              <div className="text-center py-2 px-4 bg-slate-900 border border-slate-850 rounded-xl">
                <span className="text-xs text-slate-400">Total:</span>
                <span className="ml-2 font-bold" style={{ color: profile.primary_color }}>{formatPrice(total)}</span>
              </div>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <UtensilsCrossed className="w-5 h-5 text-green-500" /> ¿En qué mesa te encuentras?
                </DialogTitle>
              </DialogHeader>
              <Input 
                value={tableNumber}
                onChange={(e) => setTableNumber(e.target.value)}
                placeholder="Número de mesa *"
                type="number"
                className="bg-slate-900 border-slate-850 text-white text-lg py-5 text-center font-bold"
                required
                autoFocus
              />
              <div className="flex gap-3">
                <Button variant="outline" onClick={prevStep} className="flex-1 border-slate-800 text-slate-350 cursor-pointer">
                  Atrás
                </Button>
                <Button 
                  onClick={nextStep} 
                  disabled={!tableNumber.trim()}
                  className="flex-1 text-white font-bold cursor-pointer" 
                  style={{ backgroundColor: profile.primary_color }}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          )}

          {/* STEP 5: CONFIRM AND SEND */}
          {checkoutStep === 'confirm' && (
            <div className="space-y-4 text-left">
              <DialogHeader>
                <DialogTitle>Confirma tu Pedido</DialogTitle>
              </DialogHeader>
              <div className="space-y-2.5 p-4 bg-slate-900 border border-slate-850 rounded-xl text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Cliente:</span>
                  <span className="font-bold text-white">{customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Entrega:</span>
                  <span className="font-bold text-white">
                    {deliveryType === 'delivery' ? '🚗 Domicilio' : deliveryType === 'table' ? '🍽️ Para mesa' : '🏪 Recoger'}
                  </span>
                </div>
                {deliveryType === 'delivery' && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Dirección:</span>
                    <span className="font-bold text-white text-right max-w-[70%] truncate">{deliveryDetails.address}</span>
                  </div>
                )}
                {deliveryType === 'table' && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Mesa:</span>
                    <span className="font-bold text-white">#{tableNumber}</span>
                  </div>
                )}
              </div>
              
              <div className="border-t border-slate-900 pt-3 space-y-2 max-h-[25vh] overflow-y-auto pr-1 scrollbar-hide">
                {items.map(item => (
                  <div key={item.product.id} className="flex justify-between text-xs text-slate-300">
                    <span>{item.quantity}x {item.product.name}</span>
                    <span className="font-bold">{formatPrice(item.product.price * item.quantity)}</span>
                  </div>
                ))}
              </div>

              <div className="flex justify-between py-3 border-t border-slate-900 font-extrabold text-md">
                <span>TOTAL</span>
                <span style={{ color: profile.primary_color }}>{formatPrice(total)}</span>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={prevStep} className="flex-1 border-slate-800 text-slate-355 cursor-pointer">
                  Atrás
                </Button>
                <Button 
                  onClick={sendToWhatsApp}
                  className="flex-1 gap-2 text-white font-bold cursor-pointer hover:shadow-lg hover:shadow-emerald-500/20"
                  style={{ backgroundColor: '#25D366' }}
                >
                  <MessageCircle className="w-5 h-5" /> Enviar Pedido
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Botón flotante de WhatsApp para dudas */}
      <a
        href={`https://wa.me/${profile.whatsapp.replace(/\+/g, '').trim()}?text=${encodeURIComponent(
          'Hola, vengo del menu Digital y no termine mi pedido por que tengo una duda...'
        )}`}
        target="_blank"
        rel="noopener noreferrer"
        className="fixed right-6 z-40 w-14 h-14 bg-[#25D366] text-white rounded-full flex items-center justify-center transition-all duration-300 hover:bg-[#22c35e] active:scale-95 cursor-pointer whatsapp-btn-help shadow-2xl"
        style={{
          bottom: itemCount > 0 ? '104px' : '24px',
        }}
        title="¿Tienes alguna duda?"
      >
        <svg 
          viewBox="0 0 24 24" 
          className="w-7 h-7 fill-current"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.458L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.37 9.864-9.799.002-2.63-1.023-5.101-2.885-6.968C16.592 1.97 14.12.946 11.5 .946c-5.44 0-9.866 4.372-9.87 9.802 0 1.96.52 3.878 1.503 5.58l-1.01 3.692 3.793-.984zm11.089-6.49c-.277-.139-1.64-.81-1.894-.902-.255-.093-.44-.139-.626.139-.185.277-.718.902-.88 1.088-.163.186-.324.208-.602.069-.277-.14-1.172-.433-2.234-1.38-.826-.738-1.384-1.65-1.547-1.928-.163-.277-.017-.427.121-.565.125-.124.277-.324.416-.486.14-.162.185-.278.277-.463.093-.185.046-.347-.023-.486-.069-.139-.626-1.505-.858-2.063-.226-.543-.45-.47-.626-.479-.162-.008-.348-.01-.534-.01-.186 0-.487.07-.743.348-.256.278-.976.954-.976 2.329 0 1.375.998 2.701 1.137 2.887.14.186 1.966 3.003 4.763 4.207.666.287 1.185.457 1.59.587.67.213 1.28.183 1.761.111.537-.08 1.64-.67 1.871-1.317.23-.647.23-1.203.162-1.317-.069-.11-.255-.185-.532-.324z"/>
        </svg>
      </a>

      {/* Estilos CSS específicos para animaciones del botón */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes whatsapp-pulse {
          0% {
            box-shadow: 0 0 0 0 rgba(37, 211, 102, 0.7);
            transform: scale(1);
          }
          70% {
            box-shadow: 0 0 0 14px rgba(37, 211, 102, 0);
            transform: scale(1.05);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(37, 211, 102, 0);
            transform: scale(1);
          }
        }
        @keyframes float-help {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
        .whatsapp-btn-help {
          animation: float-help 3s ease-in-out infinite, whatsapp-pulse 2.5s infinite;
        }
      `}} />
    </div>
  );
}
