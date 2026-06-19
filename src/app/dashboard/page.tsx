'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { getPlaceholderImage, STOCK_IMAGES } from '@/lib/stockImages';
import { 
  Store, Package, Settings, QrCode, Plus, Pencil, Trash2, 
  Eye, Copy, Phone, Palette, Check, LogOut, Upload, Loader2,
  AlertCircle, ShieldAlert, ChevronRight, CheckCircle2, RefreshCw,
  Image as ImageIcon, ArrowLeft, ArrowUp, ArrowDown, Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const THEMES = [
  { name: 'Rojo Picante', color: '#E53E3E', label: '🍅 Ideal para Tacos, Carnes, Pizzerías' },
  { name: 'Verde Orgánico', color: '#2F855A', label: '🥑 Ideal para Saludable, Ensaladas, Vegano' },
  { name: 'Naranja Bistro', color: '#DD6B20', label: '🍔 Ideal para Hamburguesas, Fast Food' },
  { name: 'Ámbar Parrilla', color: '#D69E2E', label: '🥩 Ideal para Asados, Cafés, Rústicos' },
  { name: 'Azul Bistro', color: '#3182CE', label: '🍣 Ideal para Mariscos, Sushi, Heladerías' },
  { name: 'Negro Elegante', color: '#1A202C', label: '🍷 Ideal para Gourmet, Bistro, Vinos' }
];

export default function Dashboard() {
  const router = useRouter();
  const supabase = createClient();
  
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);

  // Estados del Onboarding
  const [onboardingStep, setOnboardingStep] = useState(1);
  const [restaurantName, setRestaurantName] = useState('');
  const [slug, setSlug] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#E53E3E');
  const [logoFile, setLogoFile] = useState<File | null>(null); // Archivo de logo en Onboarding
  const [menuFile, setMenuFile] = useState<File | null>(null);
  const [onboardingError, setOnboardingError] = useState<string | null>(null);
  
  // IA Loader
  const [isExtracting, setIsExtracting] = useState(false);
  const [iaProgress, setIaProgress] = useState('');
  const [parsedProducts, setParsedProducts] = useState<any[]>([]);

  // Estados del Dashboard
  const [activeTab, setActiveTab] = useState<'overview' | 'products' | 'settings'>('overview');
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [copied, setCopied] = useState(false);
  
  // Form de agregar/editar producto
  const [prodName, setProdName] = useState('');
  const [prodDesc, setProdDesc] = useState('');
  const [prodPrice, setProdPrice] = useState(0);
  const [prodCategory, setProdCategory] = useState('');
  const [prodAvailable, setProdAvailable] = useState(true);
  const [prodError, setProdError] = useState<string | null>(null);
  const [prodLoading, setProdLoading] = useState(false);

  // Funciones de Fotos y Carga en Producto
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [selectedStockUrl, setSelectedStockUrl] = useState<string>('');
  const [showStockGallery, setShowStockGallery] = useState(false);

  // Asistente de Fotos ("Encuesta/Módulo")
  const [isPhotoWizardOpen, setIsPhotoWizardOpen] = useState(false);
  const [currentWizardIndex, setCurrentWizardIndex] = useState(0);
  const [wizardImageFile, setWizardImageFile] = useState<File | null>(null);
  const [wizardSelectedStockUrl, setWizardSelectedStockUrl] = useState<string>('');
  const [wizardShowStockGallery, setWizardShowStockGallery] = useState(false);
  const [wizardLoading, setWizardLoading] = useState(false);

  // Ordenador de Categorías
  const [isOrderCategoriesOpen, setIsOrderCategoriesOpen] = useState(false);
  const [categoryOrderList, setCategoryOrderList] = useState<string[]>([]);

  const [wizardSelectedCategory, setWizardSelectedCategory] = useState<string | null>(null);
  const [wizardEditingProduct, setWizardEditingProduct] = useState<any | null>(null);

  // Carga de logo en settings
  const [settingsLogoFile, setSettingsLogoFile] = useState<File | null>(null);
  const [settingsLogoUploading, setSettingsLogoUploading] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }
      setUser(session.user);
      
      const { data: prof } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .maybeSingle();

      if (prof) {
        setProfile(prof);
        const { data: prods } = await supabase
          .from('products')
          .select('*')
          .eq('restaurant_id', session.user.id)
          .order('category', { ascending: true });
        
        setProducts(prods || []);
      }
      setLoading(false);
    };

    checkAuth();
  }, [router, supabase]);

  // Generar Slug automáticamente
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setRestaurantName(val);
    setSlug(
      val
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") 
        .replace(/[^a-z0-9\s-]/g, "") 
        .trim()
        .replace(/\s+/g, "-") 
    );
  };

  // Subir logotipo a Supabase Storage
  const handleUploadLogo = async (file: File) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `logo-${Date.now()}.${fileExt}`;
    const filePath = `logos/${user.id}/${fileName}`;
    
    const { error: uploadError } = await supabase.storage
      .from('restaurant-assets')
      .upload(filePath, file, { upsert: true });
    
    if (uploadError) throw uploadError;
    
    const { data: { publicUrl } } = supabase.storage
      .from('restaurant-assets')
      .getPublicUrl(filePath);
    
    return publicUrl;
  };

  // Subir imagen de producto a Supabase Storage
  const handleUploadImage = async (file: File) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
    const filePath = `products/${user.id}/${fileName}`;
    
    const { error: uploadError } = await supabase.storage
      .from('restaurant-assets')
      .upload(filePath, file, { upsert: true });
    
    if (uploadError) throw uploadError;
    
    const { data: { publicUrl } } = supabase.storage
      .from('restaurant-assets')
      .getPublicUrl(filePath);
    
    return publicUrl;
  };

  // Onboarding: Ejecutar OCR / IA
  const handleAnalyzeMenu = async () => {
    if (!menuFile) return;
    setIsExtracting(true);
    setOnboardingError(null);
    setIaProgress('Subiendo archivo y conectando con la IA de Gemini...');

    try {
      const formData = new FormData();
      formData.append('file', menuFile);

      setTimeout(() => setIaProgress('Gemini está analizando la estructura de tu menú...'), 2000);
      setTimeout(() => setIaProgress('Identificando platos, precios y organizando categorías...'), 4500);

      const res = await fetch('/api/parse-menu', {
        method: 'POST',
        body: formData
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo analizar la imagen');

      if (data.products && Array.isArray(data.products)) {
        setParsedProducts(data.products);
        setOnboardingStep(3); 
      } else {
        throw new Error('La IA no pudo estructurar correctamente los platos del menú. Intenta con una imagen más clara.');
      }
    } catch (err: any) {
      setOnboardingError(err.message || 'Error al procesar el menú');
    } finally {
      setIsExtracting(false);
    }
  };

  // Onboarding: Guardar Restaurante y Productos parsed a Supabase
  const handlePublishMenu = async () => {
    setOnboardingError(null);
    setLoading(true);

    try {
      // Subir el logo si el usuario seleccionó uno
      let uploadedLogoUrl = null;
      if (logoFile) {
        uploadedLogoUrl = await handleUploadLogo(logoFile);
      }

      const uniqueCats = Array.from(new Set(parsedProducts.map(p => p.category || 'Varios')));
      
      const { error: profError } = await supabase.from('profiles').insert({
        id: user.id,
        name: restaurantName,
        slug,
        logo_url: uploadedLogoUrl,
        whatsapp,
        primary_color: primaryColor,
        is_open: true,
        category_order: uniqueCats
      });

      if (profError) {
        if (profError.code === '23505') {
          throw new Error('Ya existe un restaurante registrado con esta URL (slug). Intenta cambiar el nombre o el slug en el Paso 1.');
        }
        throw profError;
      }

      if (parsedProducts.length > 0) {
        // NOTA: Por requerimiento, los platos no llevarán imagen por defecto ('') 
        // a menos que el usuario les asigne una explícitamente más tarde.
        const prodsToInsert = parsedProducts.map(p => ({
          restaurant_id: user.id,
          name: p.name,
          description: p.description || '',
          price: Number(p.price) || 0,
          category: p.category || 'Varios',
          image_url: '', // Sin foto por defecto
          available: true
        }));

        const { error: prodsError } = await supabase.from('products').insert(prodsToInsert);
        if (prodsError) throw prodsError;
      }

      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      const { data: prods } = await supabase.from('products').select('*').eq('restaurant_id', user.id);
      
      setProfile(prof);
      setProducts(prods || []);
    } catch (err: any) {
      setOnboardingError(err.message || 'Error al guardar la información');
      setOnboardingStep(3);
    } finally {
      setLoading(false);
    }
  };

  // Settings: Subir y cambiar logo del restaurante
  const handleSettingsLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setSettingsLogoUploading(true);
    try {
      const publicUrl = await handleUploadLogo(file);
      
      // Actualizar en base de datos
      const { error } = await supabase
        .from('profiles')
        .update({ logo_url: publicUrl })
        .eq('id', user.id);

      if (error) throw error;
      
      setProfile({ ...profile, logo_url: publicUrl });
      alert('Logo actualizado correctamente.');
    } catch (err: any) {
      alert('Error al subir logo: ' + err.message);
    } finally {
      setSettingsLogoUploading(false);
    }
  };

  // Dashboard: Guardar Ajustes del restaurante
  const handleSaveSettings = async () => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          name: profile.name,
          whatsapp: profile.whatsapp,
          primary_color: profile.primary_color,
          is_open: profile.is_open
        })
        .eq('id', user.id);

      if (error) throw error;
      alert('Configuración guardada correctamente.');
    } catch (err: any) {
      alert('Error al guardar ajustes: ' + err.message);
    }
  };

  // Dashboard: Agregar/Editar Producto
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setProdError(null);
    setProdLoading(true);

    try {
      let final_image_url = editingProduct?.image_url || '';
      
      if (imageFile) {
        final_image_url = await handleUploadImage(imageFile);
      } else if (selectedStockUrl) {
        final_image_url = selectedStockUrl;
      }

      if (editingProduct) {
        const { error } = await supabase
          .from('products')
          .update({
            name: prodName,
            description: prodDesc,
            price: prodPrice,
            category: prodCategory,
            available: prodAvailable,
            image_url: final_image_url
          })
          .eq('id', editingProduct.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('products')
          .insert({
            restaurant_id: user.id,
            name: prodName,
            description: prodDesc,
            price: prodPrice,
            category: prodCategory,
            available: prodAvailable,
            image_url: final_image_url
          });

        if (error) throw error;
      }

      const { data: prods } = await supabase
        .from('products')
        .select('*')
        .eq('restaurant_id', user.id)
        .order('category', { ascending: true });
      
      setProducts(prods || []);
      setIsAddingProduct(false);
      setEditingProduct(null);
      setImageFile(null);
      setSelectedStockUrl('');
    } catch (err: any) {
      setProdError(err.message || 'Error al guardar el producto');
    } finally {
      setProdLoading(false);
    }
  };

  // Dashboard: Eliminar Producto
  const handleDeleteProduct = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este producto de tu menú?')) return;
    try {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
      setProducts(products.filter(p => p.id !== id));
    } catch (err: any) {
      alert('Error al eliminar producto: ' + err.message);
    }
  };

  // Dashboard: Cambiar disponibilidad
  const toggleAvailability = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('products')
        .update({ available: !currentStatus })
        .eq('id', id);

      if (error) throw error;
      setProducts(products.map(p => p.id === id ? { ...p, available: !currentStatus } : p));
    } catch (err: any) {
      alert('Error al actualizar disponibilidad: ' + err.message);
    }
  };

  // Dashboard: Cerrar Sesión
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  // Asistente de Fotos: Obtener imágenes de stock recomendadas
  const getRecommendedImages = (prodName: string, category: string) => {
    const nameLower = prodName.toLowerCase();
    const catLower = category.toLowerCase();
    
    const scored = STOCK_IMAGES.map(img => {
      let score = 0;
      const keywords = [img.id, img.name, ...img.category.split(' ')];
      keywords.forEach(kw => {
        const keyword = kw.toLowerCase();
        if (nameLower.includes(keyword)) score += 10;
        if (catLower.includes(keyword)) score += 5;
      });
      return { img, score };
    });

    const sorted = scored.sort((a, b) => b.score - a.score);
    return sorted.slice(0, 4).map(item => item.img);
  };

  // Guardar foto para el producto seleccionado en el wizard
  const handleWizardSave = async () => {
    if (!wizardEditingProduct) return;
    
    setWizardLoading(true);
    try {
      let final_image_url = wizardEditingProduct.image_url || '';

      if (wizardImageFile) {
        final_image_url = await handleUploadImage(wizardImageFile);
      } else if (wizardSelectedStockUrl) {
        final_image_url = wizardSelectedStockUrl;
      } else {
        setWizardEditingProduct(null);
        setWizardImageFile(null);
        setWizardSelectedStockUrl('');
        return;
      }

      const { error } = await supabase
        .from('products')
        .update({ image_url: final_image_url })
        .eq('id', wizardEditingProduct.id);

      if (error) throw error;

      setProducts(products.map(p => p.id === wizardEditingProduct.id ? { ...p, image_url: final_image_url } : p));
      
      setWizardEditingProduct(null);
      setWizardImageFile(null);
      setWizardSelectedStockUrl('');
      alert('Foto guardada correctamente.');
    } catch (err: any) {
      alert('Error al guardar foto: ' + err.message);
    } finally {
      setWizardLoading(false);
    }
  };

  // Quitar foto de un producto en el listado del wizard
  const handleWizardRemovePhoto = async (product: any) => {
    if (!confirm(`¿Estás seguro de quitar la foto de "${product.name}"? El plato se mostrará solo con texto.`)) return;
    
    setWizardLoading(true);
    try {
      const { error } = await supabase
        .from('products')
        .update({ image_url: '' })
        .eq('id', product.id);

      if (error) throw error;

      setProducts(products.map(p => p.id === product.id ? { ...p, image_url: '' } : p));
    } catch (err: any) {
      alert('Error al quitar foto: ' + err.message);
    } finally {
      setWizardLoading(false);
    }
  };

  // Limpiar todas las fotos del menú de una vez
  const handleClearAllPhotos = async () => {
    if (!confirm('⚠️ ¿Estás seguro de que deseas eliminar las fotos de TODOS los productos del menú? Los platos aparecerán únicamente con su nombre, precio y descripción.')) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from('products')
        .update({ image_url: '' })
        .eq('restaurant_id', user.id);

      if (error) throw error;

      setProducts(products.map(p => ({ ...p, image_url: '' })));
      alert('Se han eliminado todas las fotos de los productos de tu menú.');
    } catch (err: any) {
      alert('Error al limpiar las fotos: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Ordenador de Categorías: Abrir
  const handleOpenOrderCategories = () => {
    const uniqueCats = Array.from(new Set(products.map(p => p.category)));
    const savedOrder = profile.category_order || [];
    
    const filteredSaved = savedOrder.filter((c: string) => uniqueCats.includes(c));
    const remaining = uniqueCats.filter((c: string) => !filteredSaved.includes(c));
    
    const finalOrder = [...filteredSaved, ...remaining];
    setCategoryOrderList(finalOrder);
    setIsOrderCategoriesOpen(true);
  };

  // Ordenador de Categorías: Mover
  const handleMoveCategory = (index: number, direction: 'up' | 'down') => {
    const newOrder = [...categoryOrderList];
    const target = direction === 'up' ? index - 1 : index + 1;
    
    if (target >= 0 && target < newOrder.length) {
      const temp = newOrder[index];
      newOrder[index] = newOrder[target];
      newOrder[target] = temp;
      setCategoryOrderList(newOrder);
    }
  };

  // Ordenador de Categorías: Guardar
  const handleSaveCategoryOrder = async () => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ category_order: categoryOrderList })
        .eq('id', user.id);

      if (error) throw error;

      setProfile({ ...profile, category_order: categoryOrderList });
      setIsOrderCategoriesOpen(false);
      alert('El orden de las categorías se guardó correctamente.');
    } catch (err: any) {
      alert('Error al guardar el orden: ' + err.message);
    }
  };

  // URL del menú digital público
  const publicUrl = profile ? `${window.location.origin}/menu/${profile.slug}` : '';

  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadQR = () => {
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(publicUrl)}`;
    const link = document.createElement('a');
    link.href = qrUrl;
    link.download = `qr-${profile.slug}.png`;
    link.click();
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(price);
  };

  // Agrupar categorías según el orden
  const uniqueCats = Array.from(new Set(products.map(p => p.category)));
  const savedOrder = profile?.category_order || [];
  const orderedCategories = [
    ...savedOrder.filter((c: string) => uniqueCats.includes(c)),
    ...uniqueCats.filter((c: string) => !savedOrder.includes(c))
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white">
        <Loader2 className="w-10 h-10 text-orange-500 animate-spin mb-4" />
        <p className="text-slate-400 font-medium">Cargando plataforma...</p>
      </div>
    );
  }

  // ================= ONBOARDING WIZARD =================
  if (!profile) {
    return (
      <div className="min-h-screen bg-slate-950 text-white font-sans flex flex-col justify-between">
        <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur-md py-4 px-6">
          <div className="max-w-4xl mx-auto flex justify-between items-center">
            <span className="text-xl font-bold text-orange-500">MenusInteligentes</span>
            <button onClick={handleLogout} className="text-slate-400 hover:text-white flex items-center gap-2 text-sm font-medium cursor-pointer">
              <LogOut className="w-4 h-4" /> Cerrar Sesión
            </button>
          </div>
        </header>

        <main className="max-w-4xl w-full mx-auto px-6 py-12 flex-1 flex flex-col justify-center">
          <div className="max-w-2xl mx-auto w-full">
            <div className="flex justify-between items-center mb-8 relative">
              <div className="absolute left-0 right-0 h-1 bg-slate-800 top-1/2 -translate-y-1/2 z-0" />
              <div 
                className="absolute left-0 h-1 bg-gradient-to-r from-red-500 to-orange-500 top-1/2 -translate-y-1/2 z-0 transition-all duration-300"
                style={{ width: `${((onboardingStep - 1) / 2) * 100}%` }}
              />
              {[1, 2, 3].map(step => (
                <div 
                  key={step}
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold z-10 border transition-all ${
                    onboardingStep >= step 
                      ? 'bg-orange-500 border-orange-500 text-white shadow-lg shadow-orange-500/25' 
                      : 'bg-slate-900 border-slate-880 text-slate-500'
                  }`}
                >
                  {step}
                </div>
              ))}
            </div>

            {onboardingError && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-200 p-4 rounded-xl flex items-start gap-3 mb-6 text-sm">
                <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-400" />
                <p>{onboardingError}</p>
              </div>
            )}

            {onboardingStep === 1 && (
              <div className="bg-slate-900/60 border border-slate-850 p-8 rounded-3xl space-y-6">
                <div>
                  <h2 className="text-2xl font-bold">Paso 1: Registra tu Restaurante</h2>
                  <p className="text-slate-400 mt-1">Completa los datos iniciales y sube tu logo.</p>
                </div>

                <div className="space-y-4">
                  {/* CARGA DE LOGOTIPO EN ONBOARDING */}
                  <div className="flex flex-col items-center space-y-3 p-4 bg-slate-950 border border-slate-850 rounded-2xl">
                    {logoFile ? (
                      <img 
                        src={URL.createObjectURL(logoFile)} 
                        alt="Vista previa logo" 
                        className="w-20 h-20 rounded-full object-cover border-2 border-orange-500 shadow-md"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500">
                        <Store className="w-8 h-8" />
                      </div>
                    )}
                    <div className="flex flex-col items-center gap-1.5 w-full">
                      <Button 
                        type="button" 
                        variant="outline" 
                        className="border-slate-850 text-xs text-slate-300 relative group cursor-pointer w-full"
                      >
                        <Upload className="w-4 h-4 mr-1 text-orange-500" /> {logoFile ? 'Cambiar Logo' : 'Subir Logo'}
                        <input 
                          type="file" 
                          accept="image/*"
                          onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
                          className="absolute inset-0 opacity-0 cursor-pointer"
                        />
                      </Button>
                      {logoFile && (
                        <button 
                          type="button"
                          onClick={() => setLogoFile(null)}
                          className="text-[10px] text-red-450 hover:text-red-400 font-bold transition-colors cursor-pointer mt-1"
                        >
                          Quitar Logo
                        </button>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-2">Nombre del Restaurante *</label>
                    <Input 
                      value={restaurantName}
                      onChange={handleNameChange}
                      placeholder="Ej: El Mariachi Picante"
                      className="bg-slate-950 border-slate-850 text-white"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-2">URL de tu Menú (Slug)</label>
                    <div className="flex items-center gap-1 bg-slate-950 border border-slate-850 rounded-xl px-4 py-2.5">
                      <span className="text-slate-500 text-sm">menusinteligentes.com/menu/</span>
                      <input 
                        value={slug}
                        onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                        className="bg-transparent border-none outline-none text-white text-sm flex-1 font-semibold"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-2">Número de WhatsApp para Pedidos *</label>
                    <Input 
                      value={whatsapp}
                      onChange={(e) => setWhatsapp(e.target.value)}
                      placeholder="Ej: +573132382592"
                      className="bg-slate-950 border-slate-850 text-white"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-2">Tema de color principal</label>
                    <div className="grid grid-cols-3 gap-2">
                      {THEMES.map(t => (
                        <button
                          key={t.color}
                          type="button"
                          onClick={() => setPrimaryColor(t.color)}
                          className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all text-xs text-center cursor-pointer ${
                            primaryColor === t.color 
                              ? 'border-white bg-white/10' 
                              : 'border-slate-850 hover:border-slate-700 bg-slate-950'
                          }`}
                        >
                          <span className="w-5 h-5 rounded-full" style={{ backgroundColor: t.color }} />
                          <span className="font-semibold">{t.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <Button 
                  onClick={() => setOnboardingStep(2)} 
                  disabled={!restaurantName.trim() || !whatsapp.trim()}
                  className="w-full bg-gradient-to-r from-red-600 to-orange-500 font-bold py-6 text-white cursor-pointer"
                >
                  Continuar al Paso 2 <ChevronRight className="w-5 h-5 ml-1" />
                </Button>
              </div>
            )}

            {onboardingStep === 2 && (
              <div className="bg-slate-900/60 border border-slate-850 p-8 rounded-3xl space-y-6">
                <div>
                  <h2 className="text-2xl font-bold">Paso 2: Sube tu carta física (Foto o PDF)</h2>
                  <p className="text-slate-400 mt-1">Nuestra IA Gemini extraerá automáticamente los productos de la imagen.</p>
                </div>

                {isExtracting ? (
                  <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
                    <Loader2 className="w-12 h-12 text-orange-500 animate-spin" />
                    <p className="text-lg font-bold">Gemini está analizando tu menú...</p>
                    <p className="text-sm text-slate-400 bg-slate-950/60 px-4 py-2 rounded-xl animate-pulse">
                      {iaProgress}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="border-2 border-dashed border-slate-800 rounded-3xl p-8 text-center bg-slate-950/50 hover:border-orange-500/50 transition-colors relative group">
                      <input 
                        type="file" 
                        accept="image/*,application/pdf"
                        onChange={(e) => setMenuFile(e.target.files?.[0] || null)}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                      <div className="flex flex-col items-center justify-center space-y-3">
                        <Upload className="w-12 h-12 text-slate-500 group-hover:text-orange-500 transition-colors" />
                        <p className="font-semibold text-white">Haz clic o arrastra una imagen o PDF</p>
                        <p className="text-xs text-slate-500">Soporta JPG, PNG y PDF. Asegúrate de que los precios se lean claramente.</p>
                      </div>
                    </div>

                    {menuFile && (
                      <div className="bg-slate-950/80 border border-slate-850 p-4 rounded-xl flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Package className="w-8 h-8 text-orange-500" />
                          <div className="text-left">
                            <p className="font-semibold text-sm max-w-[200px] truncate">{menuFile.name}</p>
                            <p className="text-xs text-slate-500">{(menuFile.size / 1024 / 1024).toFixed(2)} MB</p>
                          </div>
                        </div>
                        <button onClick={() => setMenuFile(null)} className="text-xs text-red-400 hover:text-red-300 font-semibold cursor-pointer">
                          Quitar
                        </button>
                      </div>
                    )}

                    <div className="flex gap-3">
                      <Button variant="outline" onClick={() => setOnboardingStep(1)} className="border-slate-800 text-slate-300 cursor-pointer">
                        Atrás
                      </Button>
                      <Button 
                        onClick={handleAnalyzeMenu}
                        disabled={!menuFile}
                        className="flex-1 bg-gradient-to-r from-red-600 to-orange-500 font-bold text-white cursor-pointer"
                      >
                        Analizar con IA <ChevronRight className="w-5 h-5 ml-1" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {onboardingStep === 3 && (
              <div className="bg-slate-900/60 border border-slate-850 p-8 rounded-3xl space-y-6">
                <div>
                  <h2 className="text-2xl font-bold">Paso 3: Revisa y confirma tus productos</h2>
                  <p className="text-slate-400 mt-1">La IA detectó estos platos y precios. Puedes corregirlos o agregar más antes de publicar.</p>
                </div>

                <div className="space-y-4 max-h-[40vh] overflow-y-auto pr-2 scrollbar-hide">
                  {parsedProducts.map((p, index) => (
                    <div key={index} className="bg-slate-950 p-4 rounded-xl border border-slate-850 grid grid-cols-1 sm:grid-cols-4 gap-3 relative">
                      <div className="sm:col-span-2">
                        <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Nombre</label>
                        <input 
                          value={p.name}
                          onChange={(e) => {
                            const updated = [...parsedProducts];
                            updated[index].name = e.target.value;
                            setParsedProducts(updated);
                          }}
                          className="w-full bg-slate-900 border border-slate-850 px-3 py-1.5 rounded-lg text-sm text-white"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Precio</label>
                        <input 
                          type="number"
                          value={p.price}
                          onChange={(e) => {
                            const updated = [...parsedProducts];
                            updated[index].price = Number(e.target.value);
                            setParsedProducts(updated);
                          }}
                          className="w-full bg-slate-900 border border-slate-850 px-3 py-1.5 rounded-lg text-sm text-white"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Categoría</label>
                        <input 
                          value={p.category}
                          onChange={(e) => {
                            const updated = [...parsedProducts];
                            updated[index].category = e.target.value;
                            setParsedProducts(updated);
                          }}
                          className="w-full bg-slate-900 border border-slate-850 px-3 py-1.5 rounded-lg text-sm text-white"
                        />
                      </div>
                      <button 
                        onClick={() => setParsedProducts(parsedProducts.filter((_, i) => i !== index))}
                        className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-600 border border-red-500 text-white flex items-center justify-center hover:bg-red-500 transition-colors shadow-md text-xs font-bold cursor-pointer"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex justify-between items-center py-2">
                  <button 
                    onClick={() => setParsedProducts([...parsedProducts, { name: '', price: 0, category: 'Varios', description: '' }])}
                    className="text-xs text-orange-500 hover:text-orange-400 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" /> Agregar Plato Manual
                  </button>
                  <span className="text-xs text-slate-400">{parsedProducts.length} platos detectados</span>
                </div>

                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setOnboardingStep(2)} className="border-slate-800 text-slate-300 cursor-pointer">
                    Atrás
                  </Button>
                  <Button 
                    onClick={handlePublishMenu}
                    className="flex-1 bg-gradient-to-r from-red-600 to-orange-500 font-bold text-white cursor-pointer"
                  >
                    ¡Crear mi Menú Digital! 🚀
                  </Button>
                </div>
              </div>
            )}
          </div>
        </main>
        
        <footer className="py-6 text-center text-xs text-slate-600 border-t border-slate-900">
          MenusInteligentes © {new Date().getFullYear()}
        </footer>
      </div>
    );
  }

  // ================= MAIN SAAS DASHBOARD UI =================
  const wizardProducts = products.filter(p => !p.image_url);

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans flex">
      {/* Sidebar Layout */}
      <aside className="w-64 border-r border-slate-900 bg-slate-950 flex flex-col justify-between hidden md:flex">
        <div className="p-6">
          <div className="flex items-center gap-2 mb-8">
            <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center">
              <Store className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg">Panel de Control</span>
          </div>

          <nav className="space-y-1">
            <button 
              onClick={() => setActiveTab('overview')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
                activeTab === 'overview' ? 'bg-orange-500/10 text-orange-500 border-l-4 border-orange-500' : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <QrCode className="w-5 h-5" /> Mi Menú & QR
            </button>
            <button 
              onClick={() => setActiveTab('products')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
                activeTab === 'products' ? 'bg-orange-500/10 text-orange-500 border-l-4 border-orange-500' : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Package className="w-5 h-5" /> Productos ({products.length})
            </button>
            <button 
              onClick={() => setActiveTab('settings')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
                activeTab === 'settings' ? 'bg-orange-500/10 text-orange-500 border-l-4 border-orange-500' : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Settings className="w-5 h-5" /> Configuración
            </button>
          </nav>
        </div>

        <div className="p-6 border-t border-slate-900">
          <div className="flex items-center justify-between mb-4">
            <div className="truncate pr-2">
              <p className="text-xs text-slate-500">Sesión iniciada</p>
              <p className="text-xs font-semibold truncate text-slate-350">{user?.email}</p>
            </div>
            <button onClick={handleLogout} className="text-slate-500 hover:text-red-400 cursor-pointer">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col bg-slate-950 overflow-y-auto">
        <header className="h-20 border-b border-slate-900 bg-slate-950/50 backdrop-blur-sm flex items-center justify-between px-8">
          <div className="flex items-center gap-3 text-left">
            {profile.logo_url && (
              <img src={profile.logo_url} alt="Logo" className="w-10 h-10 rounded-full object-cover border border-slate-800" />
            )}
            <h1 className="text-xl font-bold">{profile.name}</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 ${
              profile.is_open ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
            }`}>
              <span className={`w-2 h-2 rounded-full ${profile.is_open ? 'bg-emerald-400' : 'bg-red-400'}`} />
              {profile.is_open ? 'Abierto' : 'Cerrado'}
            </span>
            <a 
              href={`/menu/${profile.slug}`} 
              target="_blank" 
              className="text-xs font-semibold text-slate-400 hover:text-white border border-slate-880 px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors"
            >
              <Eye className="w-4 h-4" /> Ver Menú Público
            </a>
          </div>
        </header>

        {/* Tab Content */}
        <div className="p-8 max-w-5xl w-full mx-auto">
          {/* TAB 1: OVERVIEW / QR */}
          {activeTab === 'overview' && (
            <div className="grid md:grid-cols-2 gap-8">
              <div className="bg-slate-900 border border-slate-850 p-8 rounded-3xl flex flex-col items-center text-center space-y-6 shadow-xl">
                <h3 className="text-xl font-bold">Código QR de tu Menú</h3>
                
                <div className="w-56 h-56 bg-white p-3 rounded-2xl shadow-inner flex items-center justify-center">
                  <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(publicUrl)}`} 
                    alt="QR Code"
                    className="w-full h-full"
                  />
                </div>

                <div className="w-full space-y-3">
                  <p className="text-xs text-slate-400">Escanea o descarga este código QR para colocar en mesas, flyers o domicilios.</p>
                  
                  <div className="flex gap-2">
                    <Button onClick={handleCopyLink} variant="outline" className="flex-1 border-slate-800 text-slate-300 text-xs">
                      {copied ? <Check className="w-4 h-4 mr-1 text-emerald-500" /> : <Copy className="w-4 h-4 mr-1" />}
                      {copied ? 'Copiado' : 'Copiar Enlace'}
                    </Button>
                    <Button onClick={handleDownloadQR} className="flex-1 bg-orange-500 text-white font-semibold text-xs">
                      <QrCode className="w-4 h-4 mr-1" /> Descargar PNG
                    </Button>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                {/* Panel de Estadísticas Rápidas */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-900 border border-slate-850 p-5 rounded-2xl flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-orange-500/10 text-orange-500 flex items-center justify-center flex-shrink-0">
                      <Package className="w-5 h-5" />
                    </div>
                    <div className="truncate text-left">
                      <h4 className="text-[11px] text-slate-400 uppercase tracking-wider font-bold">Platos</h4>
                      <p className="text-xl font-extrabold">{products.length}</p>
                    </div>
                  </div>
                  <div className="bg-slate-900 border border-slate-850 p-5 rounded-2xl flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-green-500/10 text-green-500 flex items-center justify-center flex-shrink-0">
                      <Phone className="w-5 h-5" />
                    </div>
                    <div className="truncate text-left">
                      <h4 className="text-[11px] text-slate-400 uppercase tracking-wider font-bold">WhatsApp</h4>
                      <p className="text-sm font-bold truncate">{profile.whatsapp}</p>
                    </div>
                  </div>
                </div>

                {/* Siguientes Tareas (Checklist de Configuración) */}
                <div className="bg-slate-900 border border-slate-850 p-6 rounded-3xl space-y-5 text-left shadow-xl">
                  <div>
                    <h3 className="font-extrabold text-base text-white flex items-center gap-2">
                      <span>📋 Siguientes tareas sugeridas</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">Completa estos pasos para que tu menú digital luzca profesional.</p>
                  </div>

                  <div className="space-y-4">
                    {/* Tarea 1: Organizar las fotos */}
                    <div className="p-4 bg-slate-950/80 border border-slate-850 rounded-2xl space-y-3 relative overflow-hidden">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <span className="text-[10px] uppercase font-bold text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded-full">Tarea 1</span>
                          <h4 className="font-bold text-sm text-white mt-1">Organizar las fotos de tu menú</h4>
                          <p className="text-xs text-slate-400 leading-relaxed">
                            Configura fotos reales o de stock organizadas sección por sección (ej: Entradas, Bebidas).
                          </p>
                        </div>
                      </div>
                      <Button 
                        onClick={() => {
                          setWizardSelectedCategory(null);
                          setCurrentWizardIndex(0);
                          setIsPhotoWizardOpen(true);
                        }}
                        className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs py-4 cursor-pointer"
                      >
                        Organizar Fotos por Sección
                      </Button>
                    </div>

                    {/* Tarea 2: Organizar tus secciones */}
                    <div className="p-4 bg-slate-950/80 border border-slate-850 rounded-2xl space-y-3 relative overflow-hidden">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <span className="text-[10px] uppercase font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">Tarea 2</span>
                          <h4 className="font-bold text-sm text-white mt-1">Organizar tus secciones / categorías</h4>
                          <p className="text-xs text-slate-400 leading-relaxed">
                            Organiza y arrastra el orden de tus secciones (ej: 1. Entradas, 2. Platos Fuertes).
                          </p>
                        </div>
                      </div>
                      <Button 
                        onClick={handleOpenOrderCategories}
                        variant="outline"
                        className="w-full border-slate-850 hover:bg-slate-850 text-slate-300 font-bold text-xs py-4 cursor-pointer"
                      >
                        Organizar Orden de Secciones
                      </Button>
                    </div>

                    {/* Tarea de Limpieza Opcional */}
                    {products.some(p => p.image_url && p.image_url.trim() !== '' && p.image_url !== 'null') && (
                      <div className="p-4 bg-red-950/10 border border-red-950/30 rounded-2xl space-y-2 text-left">
                        <h4 className="font-bold text-xs text-red-400">¿Deseas que tu menú no tenga ninguna imagen?</h4>
                        <p className="text-[11px] text-slate-400 leading-relaxed">
                          Si prefieres un estilo minimalista limpio con solo nombres y precios, puedes limpiar todas las imágenes de un solo clic.
                        </p>
                        <button
                          onClick={handleClearAllPhotos}
                          className="text-xs text-red-450 hover:text-red-400 font-bold underline cursor-pointer"
                        >
                          Eliminar todas las fotos del menú
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PRODUCTS TABLE */}
          {activeTab === 'products' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold">Listado de Platos y Productos</h3>
                <div className="flex gap-2">
                  <Button 
                    onClick={handleOpenOrderCategories} 
                    variant="outline"
                    className="border-slate-800 text-slate-300 text-xs"
                  >
                    <Palette className="w-4 h-4 mr-1 text-orange-500" /> Ordenar Secciones
                  </Button>
                  <Button 
                    onClick={() => {
                      setEditingProduct(null);
                      setProdName('');
                      setProdDesc('');
                      setProdPrice(0);
                      setProdCategory(orderedCategories[0] || 'Platos');
                      setProdAvailable(true);
                      setProdError(null);
                      setImageFile(null);
                      setSelectedStockUrl('');
                      setIsAddingProduct(true);
                    }}
                    className="bg-orange-500 text-white font-bold text-xs"
                  >
                    <Plus className="w-4 h-4 mr-1" /> Agregar Producto
                  </Button>
                </div>
              </div>

              <div className="space-y-8">
                {orderedCategories.map((cat, catIdx) => {
                  const catProducts = products.filter(p => p.category === cat);
                  return (
                    <div key={cat} className="space-y-3">
                      <h4 className="font-bold text-slate-300 border-b border-slate-900 pb-2 text-md flex items-center justify-between">
                        <span>{catIdx + 1}. {cat}</span>
                        <span className="text-xs text-slate-500 font-normal">{catProducts.length} productos</span>
                      </h4>
                      <div className="grid gap-3">
                        {catProducts.map(p => (
                          <div 
                            key={p.id} 
                            className="bg-slate-900/70 border border-slate-850 p-4 rounded-xl flex items-center justify-between gap-4"
                          >
                            <div className="flex items-center gap-4 flex-1 truncate">
                              {p.image_url ? (
                                <img src={p.image_url} alt={p.name} className="w-16 h-16 rounded-lg object-cover flex-shrink-0" />
                              ) : (
                                <div className="w-16 h-16 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center flex-shrink-0 text-slate-500 text-xs font-semibold">
                                  Sin Foto
                                </div>
                              )}
                              <div className="truncate text-left">
                                <h5 className="font-bold text-sm text-white truncate">{p.name}</h5>
                                <p className="text-xs text-slate-400 truncate max-w-[250px]">{p.description}</p>
                                <span className="text-xs font-bold text-orange-400">{formatPrice(p.price)}</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-4">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] text-slate-500">{p.available ? 'Activo' : 'Pausado'}</span>
                                <Switch 
                                  checked={p.available}
                                  onCheckedChange={() => toggleAvailability(p.id, p.available)}
                                />
                              </div>

                              <div className="flex gap-1">
                                <button 
                                  onClick={() => {
                                    setEditingProduct(p);
                                    setProdName(p.name);
                                    setProdDesc(p.description || '');
                                    setProdPrice(p.price);
                                    setProdCategory(p.category);
                                    setProdAvailable(p.available);
                                    setImageFile(null);
                                    setSelectedStockUrl(p.image_url || '');
                                    setProdError(null);
                                    setIsAddingProduct(true);
                                  }}
                                  className="p-2 rounded-lg bg-slate-950 text-slate-400 hover:text-white hover:bg-slate-850 cursor-pointer"
                                >
                                  <Pencil className="w-4 h-4" />
                                </button>
                                <button 
                                  onClick={() => handleDeleteProduct(p.id)}
                                  className="p-2 rounded-lg bg-slate-950 text-red-400 hover:text-red-300 hover:bg-slate-850 cursor-pointer"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}

                {products.length === 0 && (
                  <div className="text-center py-12 bg-slate-900 rounded-3xl border border-dashed border-slate-800 text-slate-500 text-sm">
                    No tienes productos agregados aún. Haz clic en "Agregar Producto".
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: SETTINGS */}
          {activeTab === 'settings' && (
            <div className="bg-slate-900 border border-slate-850 p-8 rounded-3xl space-y-6 max-w-2xl text-left">
              <div>
                <h3 className="text-xl font-bold">Configuración del Restaurante</h3>
                <p className="text-slate-400 mt-1">Administra el perfil de tu negocio.</p>
              </div>

              <div className="space-y-4">
                {/* LOGO UPLOADER IN SETTINGS */}
                <div className="flex flex-col items-center space-y-3 p-4 bg-slate-950 border border-slate-850 rounded-2xl">
                  {settingsLogoUploading ? (
                    <div className="w-20 h-20 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center">
                      <Loader2 className="w-6 h-6 text-orange-500 animate-spin" />
                    </div>
                  ) : profile.logo_url ? (
                    <img 
                      src={profile.logo_url} 
                      alt="Logo Restaurante" 
                      className="w-20 h-20 rounded-full object-cover border-2 border-orange-500 shadow-md"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500">
                      <Store className="w-8 h-8" />
                    </div>
                  )}
                  <div className="flex flex-col items-center gap-1.5 w-full">
                    <Button 
                      type="button" 
                      variant="outline" 
                      className="border-slate-850 text-xs text-slate-300 relative group cursor-pointer w-full"
                      disabled={settingsLogoUploading}
                    >
                      <Upload className="w-4 h-4 mr-1 text-orange-500" /> {profile.logo_url ? 'Cambiar Logo' : 'Subir Logo'}
                      <input 
                        type="file" 
                        accept="image/*"
                        onChange={handleSettingsLogoChange}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                        disabled={settingsLogoUploading}
                      />
                    </Button>
                    {profile.logo_url && (
                      <button 
                        type="button"
                        onClick={async () => {
                          if (!confirm('¿Estás seguro de eliminar el logo?')) return;
                          setSettingsLogoUploading(true);
                          try {
                            const { error } = await supabase
                              .from('profiles')
                              .update({ logo_url: null })
                              .eq('id', user.id);
                            if (error) throw error;
                            setProfile({ ...profile, logo_url: null });
                            alert('Logo eliminado correctamente.');
                          } catch (err: any) {
                            alert('Error al eliminar logo: ' + err.message);
                          } finally {
                            setSettingsLogoUploading(false);
                          }
                        }}
                        className="text-[10px] text-red-450 hover:text-red-400 font-bold transition-colors cursor-pointer mt-1"
                        disabled={settingsLogoUploading}
                      >
                        Quitar Logo
                      </button>
                    )}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-2">Nombre del Restaurante</label>
                  <Input 
                    value={profile.name}
                    onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                    className="bg-slate-950 border-slate-850 text-white"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-2">Slug (URL única)</label>
                  <Input 
                    value={profile.slug}
                    disabled
                    className="bg-slate-950/50 border-slate-850 text-slate-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-2">Número de WhatsApp</label>
                  <Input 
                    value={profile.whatsapp}
                    onChange={(e) => setProfile({ ...profile, whatsapp: e.target.value })}
                    className="bg-slate-950 border-slate-850 text-white"
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-950 border border-slate-850 rounded-xl">
                  <div>
                    <h5 className="text-sm font-bold">Estado de atención</h5>
                    <p className="text-xs text-slate-500">Indica a tus clientes si el restaurante está aceptando pedidos.</p>
                  </div>
                  <Switch 
                    checked={profile.is_open}
                    onCheckedChange={(checked) => setProfile({ ...profile, is_open: checked })}
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-2">Color de Marca principal</label>
                  <div className="flex gap-3">
                    <input 
                      type="color" 
                      value={profile.primary_color}
                      onChange={(e) => setProfile({ ...profile, primary_color: e.target.value })}
                      className="w-12 h-12 bg-transparent border border-slate-850 rounded-xl cursor-pointer"
                    />
                    <Input 
                      value={profile.primary_color}
                      onChange={(e) => setProfile({ ...profile, primary_color: e.target.value })}
                      className="bg-slate-950 border-slate-850 text-white flex-1"
                    />
                  </div>
                </div>
              </div>

              <Button 
                onClick={handleSaveSettings}
                className="bg-orange-500 hover:bg-orange-650 text-white font-bold w-full py-6 cursor-pointer"
              >
                Guardar Ajustes
              </Button>
            </div>
          )}
        </div>
      </main>

      {/* DIALOG AGREGAR/EDITAR PRODUCTO */}
      <Dialog open={isAddingProduct} onOpenChange={setIsAddingProduct}>
        <DialogContent className="max-w-md bg-slate-950 border border-slate-850 text-white p-6 max-h-[90vh] overflow-y-auto scrollbar-hide">
          <DialogHeader>
            <DialogTitle>{editingProduct ? 'Editar Producto' : 'Agregar Producto'}</DialogTitle>
          </DialogHeader>

          {prodError && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-200 p-3 rounded-lg text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400" />
              <span>{prodError}</span>
            </div>
          )}

          <form onSubmit={handleSaveProduct} className="space-y-4 text-left">
            {/* Visualización de la imagen actual */}
            <div className="flex flex-col items-center space-y-3 p-4 bg-slate-900 border border-slate-850 rounded-2xl">
              {(selectedStockUrl || imageFile || editingProduct?.image_url) ? (
                <img 
                  src={selectedStockUrl || (imageFile ? URL.createObjectURL(imageFile) : editingProduct?.image_url)}
                  alt="Vista previa" 
                  className="w-32 h-32 object-cover rounded-xl shadow-lg border border-slate-800"
                />
              ) : (
                <div className="w-32 h-32 rounded-xl bg-slate-950 border border-slate-800 flex flex-col items-center justify-center text-slate-500 text-xs font-semibold gap-1">
                  <ImageIcon className="w-8 h-8" />
                  <span>Sin Foto</span>
                </div>
              )}
              <div className="flex gap-2 w-full">
                <Button 
                  type="button" 
                  variant="outline" 
                  className="flex-1 border-slate-850 text-xs text-slate-300 relative group cursor-pointer"
                >
                  <Upload className="w-4 h-4 mr-1 text-orange-500" /> Subir Foto
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={(e) => {
                      setImageFile(e.target.files?.[0] || null);
                      setSelectedStockUrl('');
                    }}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                </Button>
                <Button 
                  type="button" 
                  onClick={() => setShowStockGallery(true)}
                  className="flex-1 bg-slate-950 border border-slate-850 text-xs font-semibold cursor-pointer"
                >
                  <ImageIcon className="w-4 h-4 mr-1 text-amber-500" /> Galería Stock
                </Button>
              </div>
              {(imageFile || selectedStockUrl || editingProduct?.image_url) && (
                <button 
                  type="button"
                  onClick={() => {
                    setImageFile(null);
                    setSelectedStockUrl('');
                    if (editingProduct) {
                      editingProduct.image_url = '';
                    }
                  }}
                  className="text-[10px] text-red-400 hover:text-red-300 font-bold"
                >
                  Quitar foto y dejar sin imagen
                </button>
              )}
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Nombre *</label>
              <Input 
                required
                value={prodName}
                onChange={(e) => setProdName(e.target.value)}
                placeholder="Ej: Tacos al Pastor"
                className="bg-slate-900 border-slate-850 text-white"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Descripción</label>
              <textarea 
                value={prodDesc}
                onChange={(e) => setProdDesc(e.target.value)}
                placeholder="Ingredientes o descripción..."
                className="w-full bg-slate-900 border border-slate-850 p-3 rounded-xl text-sm focus:outline-none focus:border-orange-500 text-white h-20 resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Precio ($ COP) *</label>
                <Input 
                  required
                  type="number"
                  value={prodPrice}
                  onChange={(e) => setProdPrice(Number(e.target.value))}
                  className="bg-slate-900 border-slate-850 text-white"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Categoría *</label>
                <Input 
                  required
                  value={prodCategory}
                  onChange={(e) => setProdCategory(e.target.value)}
                  placeholder="Ej: Tacos"
                  className="bg-slate-900 border-slate-850 text-white"
                />
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-900 border border-slate-850 rounded-xl">
              <div>
                <h6 className="text-xs font-bold">Disponible</h6>
                <p className="text-[10px] text-slate-500">¿El producto está a la venta hoy?</p>
              </div>
              <Switch 
                checked={prodAvailable}
                onCheckedChange={setProdAvailable}
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsAddingProduct(false)}
                className="flex-1 border-slate-800 text-slate-300 cursor-pointer"
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={prodLoading}
                className="flex-1 bg-orange-500 text-white font-bold cursor-pointer"
              >
                {prodLoading ? 'Guardando...' : 'Guardar'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIALOG GALERÍA DE IMÁGENES DE STOCK */}
      <Dialog open={showStockGallery} onOpenChange={setShowStockGallery}>
        <DialogContent className="max-w-2xl bg-slate-950 border border-slate-850 text-white p-6 max-h-[85vh] overflow-y-auto scrollbar-hide">
          <DialogHeader>
            <DialogTitle>Galería de Fotos de Stock</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-slate-400 mb-4 text-left">Selecciona una imagen profesional para tu plato:</p>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {STOCK_IMAGES.map(img => (
              <button
                key={img.id}
                type="button"
                onClick={() => {
                  setSelectedStockUrl(img.url);
                  setImageFile(null);
                  setShowStockGallery(false);
                }}
                className="group relative rounded-2xl overflow-hidden border border-slate-850 hover:border-orange-500/50 bg-slate-900 text-left transition-all cursor-pointer"
              >
                <img src={img.url} alt={img.name} className="w-full h-28 object-cover group-hover:scale-105 transition-transform" />
                <div className="p-3">
                  <p className="font-bold text-xs truncate">{img.name}</p>
                  <span className="text-[10px] text-slate-500 font-medium">{img.category}</span>
                </div>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* ================= MODAL ASISTENTE DE FOTOS ("ENCUESTA") ================= */}
      <Dialog open={isPhotoWizardOpen} onOpenChange={(open) => {
        setIsPhotoWizardOpen(open);
        if (!open) {
          setWizardSelectedCategory(null);
          setWizardEditingProduct(null);
        }
      }}>
        <DialogContent className="max-w-md bg-slate-950 border border-slate-850 text-white p-6 max-h-[90vh] overflow-y-auto scrollbar-hide">
          {isPhotoWizardOpen && !wizardSelectedCategory && (
            <div className="space-y-4 text-left">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-orange-400">
                  <Sparkles className="w-5 h-5" /> Organizar Fotos de tu Menú
                </DialogTitle>
              </DialogHeader>
              <p className="text-xs text-slate-400">
                Elige una sección de tu menú para ver sus productos uno por uno y organizar sus fotografías de forma interactiva:
              </p>
              <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1 scrollbar-hide">
                {orderedCategories.map(cat => {
                  const catProducts = products.filter(p => p.category === cat);
                  const missingCount = catProducts.filter(p => !p.image_url || p.image_url.trim() === '' || p.image_url === 'null').length;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => {
                        setWizardSelectedCategory(cat);
                        setWizardEditingProduct(null);
                      }}
                      className="w-full bg-slate-900 border border-slate-850 p-4 rounded-xl flex justify-between items-center hover:border-orange-500/50 hover:bg-slate-850 transition-colors text-left cursor-pointer"
                    >
                      <div className="truncate pr-2">
                        <span className="font-bold text-sm text-white">{cat}</span>
                        <p className="text-xs text-slate-500 mt-0.5">{catProducts.length} productos</p>
                      </div>
                      <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold whitespace-nowrap flex-shrink-0 ${
                        missingCount > 0 ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      }`}>
                        {missingCount > 0 ? `${missingCount} sin foto` : 'Completo ✓'}
                      </span>
                    </button>
                  );
                })}
              </div>
              <div className="pt-2">
                <Button 
                  type="button"
                  onClick={() => setIsPhotoWizardOpen(false)}
                  className="w-full bg-slate-950 border border-slate-850 text-white cursor-pointer"
                >
                  Cerrar Asistente
                </Button>
              </div>
            </div>
          )}

          {isPhotoWizardOpen && wizardSelectedCategory && !wizardEditingProduct && (() => {
            const catProducts = products.filter(p => p.category === wizardSelectedCategory);
            return (
              <div className="space-y-4 text-left">
                <DialogHeader className="flex flex-row items-center justify-between border-b border-slate-900 pb-3">
                  <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-orange-400" /> Sección: {wizardSelectedCategory}
                  </DialogTitle>
                  <button 
                    type="button"
                    onClick={() => setWizardSelectedCategory(null)}
                    className="text-xs text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer font-semibold"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" /> Secciones
                  </button>
                </DialogHeader>
                <p className="text-xs text-slate-400">
                  Selecciona a qué plato deseas configurarle o cambiarle la foto de esta sección:
                </p>

                <div className="space-y-2 max-h-[55vh] overflow-y-auto pr-1 scrollbar-hide">
                  {catProducts.map(p => {
                    const hasPhoto = p.image_url && p.image_url.trim() !== '' && p.image_url !== 'null';
                    return (
                      <div 
                        key={p.id} 
                        className="bg-slate-900/60 border border-slate-850 p-3.5 rounded-xl flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3 truncate flex-1">
                          {hasPhoto ? (
                            <img src={p.image_url} alt={p.name} className="w-12 h-12 rounded-lg object-cover flex-shrink-0 border border-slate-800" />
                          ) : (
                            <div className="w-12 h-12 rounded-lg bg-slate-950 border border-slate-850 flex items-center justify-center flex-shrink-0 text-[10px] text-slate-500 font-bold">
                              Sin Foto
                            </div>
                          )}
                          <div className="truncate text-left">
                            <h5 className="font-bold text-xs text-white truncate">{p.name}</h5>
                            <p className="text-[10px] text-slate-500 truncate max-w-[150px]">{p.description || 'Sin descripción'}</p>
                            <span className="text-[10px] font-extrabold text-orange-400">{formatPrice(p.price)}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <Button
                            type="button"
                            onClick={() => {
                              setWizardEditingProduct(p);
                              setWizardImageFile(null);
                              setWizardSelectedStockUrl(p.image_url || '');
                            }}
                            className={`px-3 py-1.5 h-8 text-[11px] font-bold cursor-pointer ${
                              hasPhoto 
                                ? 'bg-slate-950 hover:bg-slate-855 text-slate-300 border border-slate-800' 
                                : 'bg-orange-500 hover:bg-orange-600 text-white'
                            }`}
                          >
                            {hasPhoto ? 'Editar' : 'Agregar Foto'}
                          </Button>
                          {hasPhoto && (
                            <button
                              type="button"
                              onClick={() => handleWizardRemovePhoto(p)}
                              className="p-2 rounded bg-slate-950 hover:bg-slate-850 text-red-400 hover:text-red-300 border border-slate-800 cursor-pointer"
                              title="Quitar foto"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {catProducts.length === 0 && (
                    <p className="text-xs text-slate-500 text-center py-4">No hay platos registrados en esta categoría.</p>
                  )}
                </div>

                <div className="pt-2 flex gap-2">
                  <Button 
                    type="button"
                    onClick={() => setWizardSelectedCategory(null)}
                    className="flex-1 bg-slate-950 border border-slate-850 text-slate-350 text-xs font-semibold cursor-pointer"
                  >
                    Volver a Secciones
                  </Button>
                  <Button 
                    type="button"
                    onClick={() => setIsPhotoWizardOpen(false)}
                    className="flex-1 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold cursor-pointer"
                  >
                    Finalizar
                  </Button>
                </div>
              </div>
            );
          })()}

          {isPhotoWizardOpen && wizardSelectedCategory && wizardEditingProduct && (() => {
            const currentProd = wizardEditingProduct;
            const suggestedImages = getRecommendedImages(currentProd.name, currentProd.category);

            return (
              <div className="space-y-4 text-left">
                <DialogHeader className="flex flex-row items-center justify-between border-b border-slate-900 pb-3">
                  <DialogTitle className="text-base font-bold text-white flex items-center gap-1.5 font-sans">
                    <Sparkles className="w-5 h-5 text-orange-400 animate-pulse" /> Configurar Foto: {currentProd.name}
                  </DialogTitle>
                  <button 
                    type="button"
                    onClick={() => {
                      setWizardEditingProduct(null);
                      setWizardImageFile(null);
                      setWizardSelectedStockUrl('');
                    }}
                    className="text-xs text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer font-semibold"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" /> Plato Listado
                  </button>
                </DialogHeader>

                <div className="bg-slate-900 border border-slate-850 p-4 rounded-xl space-y-1">
                  <span className="text-[9px] bg-orange-500/10 text-orange-400 border border-orange-500/20 px-2 py-0.5 rounded-full font-bold uppercase">
                    {currentProd.category}
                  </span>
                  <h4 className="text-sm font-bold text-white mt-1">{currentProd.name}</h4>
                  <p className="text-[11px] text-slate-400 truncate">{currentProd.description || 'Sin descripción.'}</p>
                </div>

                {/* Subida de Imagen */}
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-350 block">1. Sube una foto real desde tu dispositivo:</label>
                    <div className="border border-dashed border-slate-800 rounded-xl p-4 text-center bg-slate-900 hover:border-orange-500/50 transition-all relative">
                      <input 
                        type="file" 
                        accept="image/*"
                        onChange={(e) => {
                          setWizardImageFile(e.target.files?.[0] || null);
                          setWizardSelectedStockUrl('');
                        }}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                      <div className="flex flex-col items-center justify-center space-y-1">
                        <Upload className="w-7 h-7 text-slate-500" />
                        <p className="text-xs text-slate-300 font-semibold font-sans">
                          {wizardImageFile ? wizardImageFile.name : 'Subir archivo de imagen'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-350 block">2. O selecciona una imagen de stock sugerida:</label>
                    <div className="grid grid-cols-2 gap-2">
                      {suggestedImages.map(img => (
                        <button
                          key={img.id}
                          type="button"
                          onClick={() => {
                            setWizardSelectedStockUrl(img.url);
                            setWizardImageFile(null);
                          }}
                          className={`group relative rounded-xl overflow-hidden border bg-slate-900 text-left transition-all cursor-pointer ${
                            wizardSelectedStockUrl === img.url ? 'border-orange-500 ring-2 ring-orange-500/30' : 'border-slate-850 hover:border-slate-750'
                          }`}
                        >
                          <img src={img.url} alt={img.name} className="w-full h-14 object-cover" />
                          <div className="p-1.5">
                            <p className="font-bold text-[9px] truncate text-white">{img.name}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Previsualización elegida */}
                  {(wizardImageFile || (wizardSelectedStockUrl && wizardSelectedStockUrl !== currentProd.image_url)) && (
                    <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl flex items-center justify-between text-xs">
                      <span>✓ Nueva foto seleccionada</span>
                      <button 
                        type="button"
                        onClick={() => {
                          setWizardImageFile(null);
                          setWizardSelectedStockUrl(currentProd.image_url || '');
                        }}
                        className="font-bold hover:underline cursor-pointer"
                      >
                        Deshacer
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 pt-3 border-t border-slate-900">
                  <Button 
                    type="button"
                    variant="outline" 
                    onClick={() => {
                      setWizardEditingProduct(null);
                      setWizardImageFile(null);
                      setWizardSelectedStockUrl('');
                    }} 
                    className="flex-1 border-slate-800 text-slate-400 cursor-pointer"
                  >
                    Cancelar
                  </Button>
                  <Button 
                    type="button"
                    onClick={handleWizardSave}
                    disabled={wizardLoading || (!wizardImageFile && (!wizardSelectedStockUrl || wizardSelectedStockUrl === currentProd.image_url))}
                    className="flex-1 bg-orange-500 text-white font-bold cursor-pointer"
                  >
                    {wizardLoading ? 'Guardando...' : 'Guardar Foto'}
                  </Button>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* ================= MODAL ORDENAR CATEGORÍAS ================= */}
      <Dialog open={isOrderCategoriesOpen} onOpenChange={setIsOrderCategoriesOpen}>
        <DialogContent className="max-w-md bg-slate-950 border border-slate-850 text-white p-6 max-h-[85vh] overflow-y-auto scrollbar-hide">
          <DialogHeader>
            <DialogTitle>Ordenar Secciones del Menú</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-slate-400 mb-4 text-left">
            Usa los botones para ordenar las secciones del menú digital de tus clientes. Aparecerán listadas en este orden:
          </p>

          <div className="space-y-2 text-left mb-6">
            {categoryOrderList.map((cat, index) => (
              <div 
                key={cat} 
                className="bg-slate-900 border border-slate-850 p-4 rounded-xl flex justify-between items-center"
              >
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-slate-950 border border-slate-800 text-slate-400 flex items-center justify-center font-bold text-xs">
                    {index + 1}
                  </span>
                  <span className="font-bold text-sm text-white">{cat}</span>
                </div>
                <div className="flex gap-1">
                  <button 
                    disabled={index === 0}
                    onClick={() => handleMoveCategory(index, 'up')}
                    className="p-1.5 rounded bg-slate-950 hover:bg-slate-850 disabled:opacity-30 disabled:hover:bg-slate-950 text-slate-350 cursor-pointer"
                  >
                    <ArrowUp className="w-4 h-4" />
                  </button>
                  <button 
                    disabled={index === categoryOrderList.length - 1}
                    onClick={() => handleMoveCategory(index, 'down')}
                    className="p-1.5 rounded bg-slate-950 hover:bg-slate-850 disabled:opacity-30 disabled:hover:bg-slate-950 text-slate-350 cursor-pointer"
                  >
                    <ArrowDown className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setIsOrderCategoriesOpen(false)}
              className="flex-1 border-slate-800 text-slate-300 cursor-pointer"
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleSaveCategoryOrder}
              className="flex-1 bg-orange-500 text-white font-bold cursor-pointer"
            >
              Guardar Orden
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
