'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { getPlaceholderImage, STOCK_IMAGES } from '@/lib/stockImages';
import { buildProductDescription, extractProductCustomization } from '@/lib/productCustomization';
import { migrateEmbeddedCustomizations, isMigrationDone, markMigrationDone } from '@/lib/migrateCustomizations';
import type { CustomizationGroup, CustomizationOption, CustomizationRule } from '@/lib/types';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Store, Package, Settings, QrCode, Plus, Pencil, Trash2,
  Eye, Copy, Phone, Palette, Check, LogOut, Upload, Loader2,
  AlertCircle, ShieldAlert, ChevronRight, CheckCircle2, RefreshCw,
  Image as ImageIcon, ArrowLeft, ArrowUp, ArrowDown, Sparkles,
  GripVertical, CopyPlus, FolderInput, Layers
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

// Comprimir imágenes en el cliente para evitar pasar el límite de 4.5MB de Vercel
const compressImage = (file: File, maxWidth = 1600, quality = 0.8): Promise<File> => {
  return new Promise((resolve) => {
    if (!file.type.startsWith('image/')) {
      resolve(file);
      return;
    }
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(file);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob((blob) => {
          if (blob) {
            const compressedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          } else {
            resolve(file);
          }
        }, 'image/jpeg', quality);
      };
      img.onerror = () => resolve(file);
    };
    reader.onerror = () => resolve(file);
  });
};

// ─── Componente SortableProduct ───────────────────────────────────────────────
function SortableProduct({
  product,
  catProducts,
  formatPrice,
  onEdit,
  onDelete,
  onDuplicate,
  onMoveCategory,
  onMovePosition,
  toggleAvailability,
}: {
  product: any;
  catProducts: any[];
  formatPrice: (p: number) => string;
  onEdit: (p: any) => void;
  onDelete: (id: string) => void;
  onDuplicate: (p: any) => void;
  onMoveCategory: (p: any) => void;
  onMovePosition: (id: string, dir: 'up' | 'down') => void;
  toggleAvailability: (id: string, cur: boolean) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: product.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : undefined,
  };
  const idx = catProducts.findIndex(p => p.id === product.id);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-slate-900/70 border border-slate-850 p-4 rounded-xl flex items-center justify-between gap-4"
    >
      {/* Drag handle */}
      <button
        {...listeners}
        {...attributes}
        className="text-slate-600 hover:text-slate-400 cursor-grab active:cursor-grabbing flex-shrink-0 p-1"
        title="Arrastrar para reordenar"
        type="button"
      >
        <GripVertical className="w-4 h-4" />
      </button>

      <div className="flex items-center gap-4 flex-1 truncate">
        {product.image_url ? (
          <img src={product.image_url} alt={product.name} className="w-14 h-14 rounded-lg object-cover flex-shrink-0" />
        ) : (
          <div className="w-14 h-14 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center flex-shrink-0 text-slate-500 text-xs font-semibold">
            Sin Foto
          </div>
        )}
        <div className="truncate text-left">
          <h5 className="font-bold text-sm text-white truncate">{product.name}</h5>
          <p className="text-xs text-slate-400 truncate max-w-[200px]">
            {extractProductCustomization(product.description).cleanDescription || product.description}
          </p>
          <span className="text-xs font-bold text-orange-400">{formatPrice(product.price)}</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Toggle disponibilidad */}
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-slate-500 hidden sm:block">{product.available ? 'Activo' : 'Pausado'}</span>
          <Switch
            checked={product.available}
            onCheckedChange={() => toggleAvailability(product.id, product.available)}
          />
        </div>

        {/* ↑↓ */}
        <div className="flex flex-col gap-0.5">
          <button
            type="button"
            onClick={() => onMovePosition(product.id, 'up')}
            disabled={idx === 0}
            className="p-1.5 rounded bg-slate-950 hover:bg-slate-850 disabled:opacity-30 disabled:cursor-not-allowed text-slate-300 cursor-pointer"
            title="Subir"
          >
            <ArrowUp className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={() => onMovePosition(product.id, 'down')}
            disabled={idx === catProducts.length - 1}
            className="p-1.5 rounded bg-slate-950 hover:bg-slate-850 disabled:opacity-30 disabled:cursor-not-allowed text-slate-300 cursor-pointer"
            title="Bajar"
          >
            <ArrowDown className="w-3 h-3" />
          </button>
        </div>

        {/* Acciones */}
        <div className="flex gap-1">
          <button
            onClick={() => onDuplicate(product)}
            className="p-2 rounded-lg bg-slate-950 text-amber-400 hover:text-amber-300 hover:bg-slate-850 cursor-pointer"
            title="Duplicar plato"
            type="button"
          >
            <CopyPlus className="w-4 h-4" />
          </button>
          <button
            onClick={() => onMoveCategory(product)}
            className="p-2 rounded-lg bg-slate-950 text-sky-400 hover:text-sky-300 hover:bg-slate-850 cursor-pointer"
            title="Mover a otra categoría"
            type="button"
          >
            <FolderInput className="w-4 h-4" />
          </button>
          <button
            onClick={() => onEdit(product)}
            className="p-2 rounded-lg bg-slate-950 text-slate-400 hover:text-white hover:bg-slate-850 cursor-pointer"
            title="Editar"
            type="button"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(product.id)}
            className="p-2 rounded-lg bg-slate-950 text-red-400 hover:text-red-300 hover:bg-slate-850 cursor-pointer"
            title="Eliminar"
            type="button"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Dashboard principal ──────────────────────────────────────────────────────
export default function Dashboard() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);

  // Grupos globales de personalización
  const [customizationGroups, setCustomizationGroups] = useState<CustomizationGroup[]>([]);
  const [migrating, setMigrating] = useState(false);

  // Estados del Onboarding
  const [onboardingStep, setOnboardingStep] = useState(1);
  const [restaurantName, setRestaurantName] = useState('');
  const [slug, setSlug] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#E53E3E');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [menuFiles, setMenuFiles] = useState<File[]>([]);
  const [onboardingError, setOnboardingError] = useState<string | null>(null);

  // Estados para importar platos con IA desde el Dashboard
  const [isAiImportOpen, setIsAiImportOpen] = useState(false);
  const [aiImportFiles, setAiImportFiles] = useState<File[]>([]);
  const [aiImportExtracting, setAiImportExtracting] = useState(false);
  const [aiImportProgress, setAiImportProgress] = useState('');
  const [aiImportParsedProducts, setAiImportParsedProducts] = useState<any[]>([]);
  const [aiImportError, setAiImportError] = useState<string | null>(null);

  // IA Loader
  const [isExtracting, setIsExtracting] = useState(false);
  const [iaProgress, setIaProgress] = useState('');
  const [parsedProducts, setParsedProducts] = useState<any[]>([]);

  // Estados del Dashboard
  const [activeTab, setActiveTab] = useState<'overview' | 'products' | 'groups' | 'settings'>('overview');
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
  // Grupos seleccionados para el producto en edición
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);

  // Fotos
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [selectedStockUrl, setSelectedStockUrl] = useState<string>('');
  const [showStockGallery, setShowStockGallery] = useState(false);

  // Asistente de Fotos
  const [isPhotoWizardOpen, setIsPhotoWizardOpen] = useState(false);
  const [currentWizardIndex, setCurrentWizardIndex] = useState(0);
  const [wizardImageFile, setWizardImageFile] = useState<File | null>(null);
  const [wizardSelectedStockUrl, setWizardSelectedStockUrl] = useState<string>('');
  const [wizardShowStockGallery, setWizardShowStockGallery] = useState(false);
  const [wizardLoading, setWizardLoading] = useState(false);
  const [wizardSelectedCategory, setWizardSelectedCategory] = useState<string | null>(null);
  const [wizardEditingProduct, setWizardEditingProduct] = useState<any | null>(null);

  // Ordenador de Categorías
  const [isOrderCategoriesOpen, setIsOrderCategoriesOpen] = useState(false);
  const [categoryOrderList, setCategoryOrderList] = useState<string[]>([]);

  // Modal mover categoría
  const [movingProduct, setMovingProduct] = useState<any | null>(null);
  const [moveTargetCategory, setMoveTargetCategory] = useState('');

  // Logo en settings
  const [settingsLogoFile, setSettingsLogoFile] = useState<File | null>(null);
  const [settingsLogoUploading, setSettingsLogoUploading] = useState(false);

  // ─── Editor de Grupos Globales ───────────────────────────────────────────
  const [editingGroup, setEditingGroup] = useState<CustomizationGroup | null>(null);
  const [isGroupEditorOpen, setIsGroupEditorOpen] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [groupRequired, setGroupRequired] = useState(false);
  const [groupMin, setGroupMin] = useState(0);
  const [groupMax, setGroupMax] = useState(1);
  const [groupOptions, setGroupOptions] = useState<{ id: string; label: string; price: number }[]>([]);
  const [groupSaving, setGroupSaving] = useState(false);
  const [groupError, setGroupError] = useState<string | null>(null);

  // ─── Sistema de Reglas Condicionales (pizzas, productos complejos) ────────────
  // Reglas del producto que se está editando actualmente
  const [productRules, setProductRules] = useState<CustomizationRule[]>([]);

  // Mapa: groupId → nombres de platos que lo usan (para mostrar "Usado en X platos")
  const [groupUsageMap, setGroupUsageMap] = useState<Record<string, string[]>>({});

  // Búsqueda de grupos en el editor de producto
  const [groupSearch, setGroupSearch] = useState('');

  // Form para agregar una nueva regla
  const [newRuleTriggerGroupId, setNewRuleTriggerGroupId] = useState('');
  const [newRuleTriggerOptionId, setNewRuleTriggerOptionId] = useState('');
  const [newRuleTargetGroupId, setNewRuleTargetGroupId] = useState('');
  const [newRuleEffectType, setNewRuleEffectType] = useState<'set_max' | 'set_min'>('set_max');
  const [newRuleEffectValue, setNewRuleEffectValue] = useState(1);

  // dnd-kit sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // ─── Carga inicial ───────────────────────────────────────────────────────
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

        const [{ data: prods }, { data: groups }] = await Promise.all([
          supabase
            .from('products')
            .select('*')
            .eq('restaurant_id', session.user.id)
            .order('category', { ascending: true }),
          supabase
            .from('customization_groups')
            .select('*, options:customization_options(*)')
            .eq('restaurant_id', session.user.id)
            .order('display_order', { ascending: true }),
        ]);

        let activeProducts = prods || [];
        setProducts(activeProducts);
        setCustomizationGroups(groups || []);

        // Migración automática (una sola vez)
        if (!isMigrationDone() && activeProducts.some((p: any) => p.description?.includes('__MENU_CUSTOMIZATION__'))) {
          setMigrating(true);
          try {
            await migrateEmbeddedCustomizations(supabase, session.user.id, activeProducts);
            // Recargar datos migrados
            const [{ data: freshProds }, { data: freshGroups }] = await Promise.all([
              supabase.from('products').select('*').eq('restaurant_id', session.user.id).order('category', { ascending: true }),
              supabase.from('customization_groups').select('*, options:customization_options(*)').eq('restaurant_id', session.user.id).order('display_order', { ascending: true }),
            ]);
            activeProducts = freshProds || [];
            setProducts(activeProducts);
            setCustomizationGroups(freshGroups || []);
          } catch (e) {
            console.error('Error en migración:', e);
          } finally {
            markMigrationDone();
            setMigrating(false);
          }
        }

        // Construir mapa de uso de grupos por producto
        const { data: allLinks } = await supabase
          .from('product_customization_groups')
          .select('group_id, product_id');
        const usageMap: Record<string, string[]> = {};
        const prods2 = activeProducts;
        for (const link of allLinks || []) {
          const prod = prods2.find((p: any) => p.id === link.product_id);
          if (prod) {
            if (!usageMap[link.group_id]) usageMap[link.group_id] = [];
            if (!usageMap[link.group_id].includes(prod.name)) {
              usageMap[link.group_id].push(prod.name);
            }
          }
        }
        setGroupUsageMap(usageMap);
      }
      setLoading(false);
    };

    checkAuth();
  }, [router, supabase]);

  // ─── Helpers de carga de archivos ────────────────────────────────────────
  const handleUploadLogo = async (file: File) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `logo-${Date.now()}.${fileExt}`;
    const filePath = `logos/${user.id}/${fileName}`;
    const { error: uploadError } = await supabase.storage.from('restaurant-assets').upload(filePath, file, { upsert: true });
    if (uploadError) throw uploadError;
    const { data: { publicUrl } } = supabase.storage.from('restaurant-assets').getPublicUrl(filePath);
    return publicUrl;
  };

  const handleUploadImage = async (file: File) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
    const filePath = `products/${user.id}/${fileName}`;
    const { error: uploadError } = await supabase.storage.from('restaurant-assets').upload(filePath, file, { upsert: true });
    if (uploadError) throw uploadError;
    const { data: { publicUrl } } = supabase.storage.from('restaurant-assets').getPublicUrl(filePath);
    return publicUrl;
  };

  const handleUploadTempMenu = async (file: File | Blob, fallbackName?: string) => {
    const resolvedName = file instanceof File ? file.name : (fallbackName || 'menu-upload');
    const fileExt = resolvedName.split('.').pop() || 'jpg';
    const fileName = `temp-menu-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${fileExt}`;
    const filePath = `products/${user.id}/${fileName}`;
    const { error: uploadError } = await supabase.storage.from('restaurant-assets').upload(filePath, file, { upsert: true });
    if (uploadError) throw uploadError;
    const { data: { publicUrl } } = supabase.storage.from('restaurant-assets').getPublicUrl(filePath);
    return publicUrl;
  };

  // ─── IA: Parse menu ──────────────────────────────────────────────────────
  const parseMenuFile = async (file: File) => {
    let fileToSend: File | Blob = file;
    if (file.type.startsWith('image/')) {
      setIaProgress('Optimizando imagen para la IA...');
      try { fileToSend = await compressImage(file); } catch (e) { console.error(e); }
    }
    setIaProgress('Subiendo archivo temporal a almacenamiento seguro...');
    const fileUrl = await handleUploadTempMenu(fileToSend, file.name);
    const res = await fetch('/api/parse-menu', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileUrl, mimeType: file.type })
    });
    if (!res.ok) {
      let errMsg = 'No se pudo analizar el archivo';
      try {
        const errorData = await res.json();
        errMsg = errorData.error || errMsg;
      } catch {
        if (res.status === 413) errMsg = 'El archivo es demasiado grande. Intenta reducir el peso de la imagen.';
        else errMsg = `Error del servidor (${res.status}): No se pudo procesar la carta.`;
      }
      throw new Error(errMsg);
    }
    const data = await res.json();
    if (!data.products || !Array.isArray(data.products) || data.products.length === 0) {
      throw new Error('La IA no pudo estructurar correctamente los platos. Intenta con otra imagen o PDF más clara.');
    }
    return data.products;
  };

  const handleAnalyzeMenu = async () => {
    if (!menuFiles.length) return;
    setIsExtracting(true);
    setOnboardingError(null);
    setIaProgress('Conectando con la IA de Gemini...');
    try {
      const extractedProducts: any[] = [];
      for (let index = 0; index < menuFiles.length; index += 1) {
        setIaProgress(`Analizando archivo ${index + 1} de ${menuFiles.length}...`);
        const products = await parseMenuFile(menuFiles[index]);
        extractedProducts.push(...products);
      }
      if (extractedProducts.length === 0) throw new Error('No se encontró ningún plato válido.');
      setParsedProducts(prev => [...prev, ...extractedProducts]);
      setOnboardingStep(3);
    } catch (err: any) {
      setOnboardingError(err.message || 'Error al procesar el menú');
    } finally {
      setIsExtracting(false);
      setMenuFiles([]);
    }
  };

  const handleAddProductsFromImages = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (!selectedFiles.length) return;
    setIsExtracting(true);
    setOnboardingError(null);
    setIaProgress('Agregando platos desde nuevas imágenes o PDFs...');
    try {
      const extraProducts: any[] = [];
      for (let index = 0; index < selectedFiles.length; index += 1) {
        setIaProgress(`Procesando archivo adicional ${index + 1} de ${selectedFiles.length}...`);
        const prods = await parseMenuFile(selectedFiles[index]);
        extraProducts.push(...prods);
      }
      if (extraProducts.length === 0) throw new Error('No se detectaron platos válidos.');
      setParsedProducts(prev => [...prev, ...extraProducts]);
    } catch (err: any) {
      setOnboardingError(err.message || 'Error al agregar platos');
    } finally {
      setIsExtracting(false);
      e.target.value = '';
    }
  };

  // ─── Onboarding: Publicar menú ───────────────────────────────────────────
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setRestaurantName(val);
    setSlug(val.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-'));
  };

  const handlePublishMenu = async () => {
    setOnboardingError(null);
    setLoading(true);
    try {
      let uploadedLogoUrl = null;
      if (logoFile) uploadedLogoUrl = await handleUploadLogo(logoFile);
      const uniqueCats = Array.from(new Set(parsedProducts.map(p => p.category || 'Varios')));
      const { error: profError } = await supabase.from('profiles').insert({
        id: user.id, name: restaurantName, slug, logo_url: uploadedLogoUrl,
        whatsapp, primary_color: primaryColor, is_open: true, category_order: uniqueCats
      });
      if (profError) {
        if (profError.code === '23505') throw new Error('Ya existe un restaurante con esta URL. Cambia el nombre o el slug.');
        throw profError;
      }
      if (parsedProducts.length > 0) {
        const prodsToInsert = parsedProducts.map(p => ({
          restaurant_id: user.id, name: p.name, description: p.description || '',
          price: Number(p.price) || 0, category: p.category || 'Varios', image_url: '', available: true
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

  // ─── IA Dashboard: Importar platos adicionales ────────────────────────────
  const handleDashboardAnalyzeMenu = async () => {
    if (!aiImportFiles.length) return;
    setAiImportExtracting(true);
    setAiImportError(null);
    setAiImportProgress('Conectando con la IA de Gemini...');
    try {
      const extractedProducts: any[] = [];
      for (let index = 0; index < aiImportFiles.length; index += 1) {
        setAiImportProgress(`Analizando archivo ${index + 1} de ${aiImportFiles.length}...`);
        const products = await parseMenuFile(aiImportFiles[index]);
        extractedProducts.push(...products);
      }
      if (extractedProducts.length === 0) throw new Error('No se encontró ningún plato válido.');
      setAiImportParsedProducts(prev => [...prev, ...extractedProducts]);
      setAiImportFiles([]);
    } catch (err: any) {
      setAiImportError(err.message || 'Error al procesar el menú');
    } finally {
      setAiImportExtracting(false);
    }
  };

  const handleDashboardPublishImport = async () => {
    setAiImportError(null);
    setAiImportExtracting(true);
    setAiImportProgress('Guardando platos en tu carta...');
    try {
      if (aiImportParsedProducts.length > 0) {
        const prodsToInsert = aiImportParsedProducts.map(p => ({
          restaurant_id: user.id,
          name: p.name,
          description: p.description || '',
          price: Number(p.price) || 0,
          category: p.category || 'Varios',
          image_url: '',
          available: true
        }));
        
        const { error: prodsError } = await supabase.from('products').insert(prodsToInsert);
        if (prodsError) throw prodsError;
        
        // Actualizar category_order si hay categorías nuevas
        const currentCats = Array.from(new Set(products.map(p => p.category)));
        const newCats = Array.from(new Set(aiImportParsedProducts.map(p => p.category || 'Varios')));
        const addedCats = newCats.filter(c => !currentCats.includes(c));
        
        if (addedCats.length > 0) {
          const updatedCatsOrder = [...(profile.category_order || []), ...addedCats];
          await supabase.from('profiles').update({ category_order: updatedCatsOrder }).eq('id', user.id);
          setProfile({ ...profile, category_order: updatedCatsOrder });
        }
      }
      
      // Recargar platos
      const { data: freshProds } = await supabase
        .from('products')
        .select('*')
        .eq('restaurant_id', user.id)
        .order('category', { ascending: true });
        
      setProducts(freshProds || []);
      setIsAiImportOpen(false);
      setAiImportParsedProducts([]);
      alert('¡Los platos se anexaron correctamente a tu menú inteligente! 🚀');
    } catch (err: any) {
      setAiImportError(err.message || 'Error al guardar la información');
    } finally {
      setAiImportExtracting(false);
    }
  };

  const handleDashboardAddProductsFromImages = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (!selectedFiles.length) return;
    setAiImportExtracting(true);
    setAiImportError(null);
    setAiImportProgress('Agregando platos desde nuevas imágenes o PDFs...');
    try {
      const extraProducts: any[] = [];
      for (let index = 0; index < selectedFiles.length; index += 1) {
        setAiImportProgress(`Procesando archivo adicional ${index + 1} de ${selectedFiles.length}...`);
        const prods = await parseMenuFile(selectedFiles[index]);
        extraProducts.push(...prods);
      }
      if (extraProducts.length === 0) throw new Error('No se detectaron platos válidos.');
      setAiImportParsedProducts(prev => [...prev, ...extraProducts]);
    } catch (err: any) {
      setAiImportError(err.message || 'Error al agregar platos');
    } finally {
      setAiImportExtracting(false);
      e.target.value = '';
    }
  };

  // ─── Settings ────────────────────────────────────────────────────────────
  const handleSettingsLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSettingsLogoUploading(true);
    try {
      const publicUrl = await handleUploadLogo(file);
      const { error } = await supabase.from('profiles').update({ logo_url: publicUrl }).eq('id', user.id);
      if (error) throw error;
      setProfile({ ...profile, logo_url: publicUrl });
      alert('Logo actualizado correctamente.');
    } catch (err: any) {
      alert('Error al subir logo: ' + err.message);
    } finally {
      setSettingsLogoUploading(false);
    }
  };

  const handleSaveSettings = async () => {
    try {
      const payload = {
        name: profile.name, whatsapp: profile.whatsapp, primary_color: profile.primary_color,
        is_open: profile.is_open, menu_cover_image_url: profile.menu_cover_image_url || '',
        menu_cover_title: profile.menu_cover_title || '', menu_cover_description: profile.menu_cover_description || '',
      };
      const { error } = await supabase.from('profiles').update(payload).eq('id', user.id);
      if (error) throw error;
      const { data: updatedProfile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      setProfile(updatedProfile);
      alert('Configuración guardada correctamente.');
    } catch (err: any) {
      alert('Error al guardar ajustes: ' + err.message);
    }
  };

  // ─── Productos ───────────────────────────────────────────────────────────
  const getProductsForCategory = useCallback((category: string) => {
    return [...products.filter(p => p.category === category)].sort((a, b) => {
      const aO = Number(a.display_order ?? 0);
      const bO = Number(b.display_order ?? 0);
      return aO - bO;
    });
  }, [products]);

  const reorderProductsInCategory = async (category: string, orderedIds: string[]) => {
    const updatedProducts = products.map(product => {
      if (product.category !== category) return product;
      const newIndex = orderedIds.indexOf(product.id);
      return { ...product, display_order: newIndex >= 0 ? newIndex + 1 : product.display_order };
    });
    setProducts(updatedProducts);
    try {
      await Promise.all(
        orderedIds.map((id, index) =>
          supabase.from('products').update({ display_order: index + 1 }).eq('id', id)
        )
      );
    } catch {
      alert('No se pudo guardar el nuevo orden. Asegúrate de que la columna display_order exista en la tabla products.');
    }
  };

  const moveProductPosition = async (productId: string, direction: 'up' | 'down') => {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    const catProds = getProductsForCategory(product.category);
    const currentIndex = catProds.findIndex(p => p.id === productId);
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (currentIndex === -1 || targetIndex < 0 || targetIndex >= catProds.length) return;
    const newOrder = [...catProds];
    const [moved] = newOrder.splice(currentIndex, 1);
    newOrder.splice(targetIndex, 0, moved);
    await reorderProductsInCategory(product.category, newOrder.map(p => p.id));
  };

  const handleDragEnd = async (event: DragEndEvent, category: string) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const catProds = getProductsForCategory(category);
    const oldIndex = catProds.findIndex(p => p.id === active.id);
    const newIndex = catProds.findIndex(p => p.id === over.id);
    const newOrder = arrayMove(catProds, oldIndex, newIndex).map(p => p.id);
    await reorderProductsInCategory(category, newOrder);
  };

  const openProductForm = (product: any | null) => {
    setEditingProduct(product);
    if (product) {
      const { cleanDescription } = extractProductCustomization(product.description);
      setProdName(product.name);
      setProdDesc(cleanDescription || '');
      setProdPrice(product.price);
      setProdCategory(product.category);
      setProdAvailable(product.available);
      setSelectedStockUrl(product.image_url || '');
    } else {
      setProdName('');
      setProdDesc('');
      setProdPrice(0);
      setProdCategory(orderedCategories[0] || 'Platos');
      setProdAvailable(true);
      setSelectedStockUrl('');
    }
    setImageFile(null);
    setProdError(null);
    // Cargar grupos vinculados al producto
    if (product) {
      loadProductGroupLinks(product.id);
    } else {
      setSelectedGroupIds([]);
    }
    setIsAddingProduct(true);
    // Cargar reglas del producto en edición
    if (product) {
      loadProductRules(product.id);
    } else {
      setProductRules([]);
    }
    // Resetear form de nueva regla
    setNewRuleTriggerGroupId('');
    setNewRuleTriggerOptionId('');
    setNewRuleTargetGroupId('');
    setNewRuleEffectType('set_max');
    setNewRuleEffectValue(1);
    setGroupSearch('');
  };

  const loadProductGroupLinks = async (productId: string) => {
    const { data } = await supabase
      .from('product_customization_groups')
      .select('group_id')
      .eq('product_id', productId);
    setSelectedGroupIds((data || []).map((r: any) => r.group_id));
  };

  /** Carga las reglas condicionales del producto siendo editado */
  const loadProductRules = async (productId: string) => {
    const { data } = await supabase
      .from('customization_rules')
      .select('*')
      .eq('product_id', productId)
      .order('display_order', { ascending: true });
    setProductRules((data || []) as CustomizationRule[]);
  };

  /** Agrega una nueva regla al estado local (se guarda al guardar el producto) */
  const handleAddProductRule = () => {
    if (!newRuleTriggerGroupId || !newRuleTriggerOptionId || !newRuleTargetGroupId) {
      alert('Selecciona el grupo de activación, la opción y el grupo objetivo.');
      return;
    }
    if (newRuleTriggerGroupId === newRuleTargetGroupId) {
      alert('El grupo de activación y el grupo objetivo no pueden ser el mismo.');
      return;
    }
    const newRule: CustomizationRule = {
      id: `new-${Date.now()}`,
      product_id: editingProduct?.id || '',
      trigger_group_id: newRuleTriggerGroupId,
      trigger_option_id: newRuleTriggerOptionId,
      target_group_id: newRuleTargetGroupId,
      effect_type: newRuleEffectType,
      effect_value: newRuleEffectValue,
      display_order: productRules.length,
    };
    setProductRules(prev => [...prev, newRule]);
    setNewRuleTriggerGroupId('');
    setNewRuleTriggerOptionId('');
    setNewRuleTargetGroupId('');
    setNewRuleEffectValue(1);
  };

  const handleRemoveProductRule = (ruleId: string) => {
    setProductRules(prev => prev.filter(r => r.id !== ruleId));
  };

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

      let productId = editingProduct?.id;

      if (editingProduct) {
        const { error } = await supabase.from('products').update({
          name: prodName, description: prodDesc, price: prodPrice,
          category: prodCategory, available: prodAvailable, image_url: final_image_url
        }).eq('id', editingProduct.id);
        if (error) throw error;
      } else {
        const { data: newProd, error } = await supabase.from('products').insert({
          restaurant_id: user.id, name: prodName, description: prodDesc, price: prodPrice,
          category: prodCategory, available: prodAvailable, image_url: final_image_url
        }).select('id').single();
        if (error) throw error;
        productId = newProd.id;
      }

      // Sincronizar grupos seleccionados
      if (productId) {
        await supabase.from('product_customization_groups').delete().eq('product_id', productId);
        if (selectedGroupIds.length > 0) {
          await supabase.from('product_customization_groups').insert(
            selectedGroupIds.map((gid, idx) => ({
              product_id: productId,
              group_id: gid,
              is_copy: false,
              display_order: idx,
            }))
          );
        }

        // Sincronizar reglas condicionales
        await supabase.from('customization_rules').delete().eq('product_id', productId);
        const validRules = productRules.filter(r => r.trigger_group_id && r.trigger_option_id && r.target_group_id);
        if (validRules.length > 0) {
          await supabase.from('customization_rules').insert(
            validRules.map((r, idx) => ({
              product_id: productId,
              trigger_group_id: r.trigger_group_id,
              trigger_option_id: r.trigger_option_id,
              target_group_id: r.target_group_id,
              effect_type: r.effect_type,
              effect_value: r.effect_value,
              display_order: idx,
            }))
          );
        }
      }

      const { data: prods } = await supabase
        .from('products').select('*').eq('restaurant_id', user.id).order('category', { ascending: true });
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

  const handleDuplicateProduct = async (product: any) => {
    try {
      const { cleanDescription } = extractProductCustomization(product.description);
      const { data: newProd, error } = await supabase.from('products').insert({
        restaurant_id: user.id,
        name: `Copia de ${product.name}`,
        description: cleanDescription || product.description || '',
        price: product.price,
        category: product.category,
        image_url: product.image_url || '',
        available: false, // pausado por defecto para que el admin lo revise
        display_order: (product.display_order || 0) + 1,
      }).select('id').single();
      if (error) throw error;

      // Copiar vínculos de grupos
      const { data: links } = await supabase
        .from('product_customization_groups')
        .select('group_id, display_order')
        .eq('product_id', product.id);
      if (links && links.length > 0) {
        await supabase.from('product_customization_groups').insert(
          links.map((l: any) => ({
            product_id: newProd.id,
            group_id: l.group_id,
            is_copy: false,
            display_order: l.display_order,
          }))
        );
      }

      const { data: prods } = await supabase
        .from('products').select('*').eq('restaurant_id', user.id).order('category', { ascending: true });
      setProducts(prods || []);
    } catch (err: any) {
      alert('Error al duplicar: ' + err.message);
    }
  };

  const handleMoveProductToCategory = async () => {
    if (!movingProduct || !moveTargetCategory.trim()) return;
    try {
      const { error } = await supabase
        .from('products')
        .update({ category: moveTargetCategory.trim() })
        .eq('id', movingProduct.id);
      if (error) throw error;
      setProducts(products.map(p => p.id === movingProduct.id ? { ...p, category: moveTargetCategory.trim() } : p));
      setMovingProduct(null);
      setMoveTargetCategory('');
    } catch (err: any) {
      alert('Error al mover el plato: ' + err.message);
    }
  };

  const toggleAvailability = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase.from('products').update({ available: !currentStatus }).eq('id', id);
      if (error) throw error;
      setProducts(products.map(p => p.id === id ? { ...p, available: !currentStatus } : p));
    } catch (err: any) {
      alert('Error al actualizar disponibilidad: ' + err.message);
    }
  };

  // ─── Grupos globales ─────────────────────────────────────────────────────
  const openGroupEditor = (group: CustomizationGroup | null) => {
    setEditingGroup(group);
    if (group) {
      setGroupName(group.name);
      setGroupDescription(group.description);
      setGroupRequired(group.required);
      setGroupMin(group.min_selections);
      setGroupMax(group.max_selections);
      setGroupOptions((group.options || []).map(o => ({ id: o.id, label: o.label, price: o.price })));
    } else {
      setGroupName('');
      setGroupDescription('');
      setGroupRequired(false);
      setGroupMin(0);
      setGroupMax(1);
      setGroupOptions([{ id: `new-${Date.now()}`, label: '', price: 0 }]);
    }
    setGroupError(null);
    setIsGroupEditorOpen(true);
  };

  const handleSaveGroup = async () => {
    if (!groupName.trim()) { setGroupError('El nombre del grupo es obligatorio.'); return; }
    setGroupSaving(true);
    setGroupError(null);
    try {
      const validOptions = groupOptions.filter(o => o.label.trim());
      let savedGroupId = editingGroup?.id;

      if (editingGroup) {
        const { error } = await supabase.from('customization_groups').update({
          name: groupName.trim(), description: groupDescription.trim(),
          required: groupRequired, min_selections: groupMin, max_selections: groupMax,
        }).eq('id', editingGroup.id);
        if (error) throw error;
        // Eliminar opciones viejas y re-insertar
        await supabase.from('customization_options').delete().eq('group_id', editingGroup.id);
      } else {
        const { data: newGroup, error } = await supabase.from('customization_groups').insert({
          restaurant_id: user.id, name: groupName.trim(), description: groupDescription.trim(),
          required: groupRequired, min_selections: groupMin, max_selections: groupMax, display_order: customizationGroups.length,
        }).select('id').single();
        if (error) throw error;
        savedGroupId = newGroup.id;
      }

      if (savedGroupId && validOptions.length > 0) {
        await supabase.from('customization_options').insert(
          validOptions.map((o, idx) => ({
            group_id: savedGroupId, label: o.label.trim(), price: Number(o.price) || 0, display_order: idx
          }))
        );
      }

      // Recargar grupos
      const { data: freshGroups } = await supabase
        .from('customization_groups')
        .select('*, options:customization_options(*)')
        .eq('restaurant_id', user.id)
        .order('display_order', { ascending: true });
      setCustomizationGroups(freshGroups || []);
      setIsGroupEditorOpen(false);
    } catch (err: any) {
      setGroupError(err.message || 'Error al guardar el grupo');
    } finally {
      setGroupSaving(false);
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    const usedIn = await supabase
      .from('product_customization_groups')
      .select('product_id')
      .eq('group_id', groupId);
    const count = usedIn.data?.length || 0;
    const msg = count > 0
      ? `Este grupo está usado en ${count} plato(s). Al eliminarlo, se desvinculará de todos ellos. ¿Continuar?`
      : '¿Estás seguro de eliminar este grupo?';
    if (!confirm(msg)) return;
    try {
      const { error } = await supabase.from('customization_groups').delete().eq('id', groupId);
      if (error) throw error;
      setCustomizationGroups(customizationGroups.filter(g => g.id !== groupId));
      // Actualizar mapa de uso
      setGroupUsageMap(prev => { const next = { ...prev }; delete next[groupId]; return next; });
    } catch (err: any) {
      alert('Error al eliminar: ' + err.message);
    }
  };

  /** Duplica un grupo global con todas sus opciones (sin vincular a ningún plato) */
  const handleDuplicateGroup = async (group: CustomizationGroup) => {
    if (!confirm(`¿Duplicar el grupo "${group.name}"? Se creará una copia independiente sin vincular a ningún plato.`)) return;
    try {
      const { data: newGroup, error } = await supabase.from('customization_groups').insert({
        restaurant_id: user.id,
        name: `Copia de ${group.name}`,
        description: group.description,
        required: group.required,
        min_selections: group.min_selections,
        max_selections: group.max_selections,
        display_order: customizationGroups.length,
      }).select('id').single();
      if (error) throw error;

      // Copiar opciones del grupo original
      const opts = group.options || [];
      if (opts.length > 0) {
        await supabase.from('customization_options').insert(
          opts.map((o: any, idx: number) => ({
            group_id: newGroup.id,
            label: o.label,
            price: o.price || 0,
            display_order: idx,
          }))
        );
      }

      // Recargar grupos
      const { data: freshGroups } = await supabase
        .from('customization_groups')
        .select('*, options:customization_options(*)')
        .eq('restaurant_id', user.id)
        .order('display_order', { ascending: true });
      setCustomizationGroups(freshGroups || []);
    } catch (err: any) {
      alert('Error al duplicar grupo: ' + err.message);
    }
  };

  // ─── Misc ────────────────────────────────────────────────────────────────
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

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
    return scored.sort((a, b) => b.score - a.score).slice(0, 4).map(item => item.img);
  };

  const handleWizardSave = async () => {
    if (!wizardEditingProduct) return;
    setWizardLoading(true);
    try {
      let final_image_url = wizardEditingProduct.image_url || '';
      if (wizardImageFile) final_image_url = await handleUploadImage(wizardImageFile);
      else if (wizardSelectedStockUrl) final_image_url = wizardSelectedStockUrl;
      else {
        setWizardEditingProduct(null);
        setWizardImageFile(null);
        setWizardSelectedStockUrl('');
        return;
      }
      const { error } = await supabase.from('products').update({ image_url: final_image_url }).eq('id', wizardEditingProduct.id);
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

  const handleWizardRemovePhoto = async (product: any) => {
    if (!confirm(`¿Estás seguro de quitar la foto de "${product.name}"?`)) return;
    setWizardLoading(true);
    try {
      const { error } = await supabase.from('products').update({ image_url: '' }).eq('id', product.id);
      if (error) throw error;
      setProducts(products.map(p => p.id === product.id ? { ...p, image_url: '' } : p));
    } catch (err: any) {
      alert('Error al quitar foto: ' + err.message);
    } finally {
      setWizardLoading(false);
    }
  };

  const handleClearAllPhotos = async () => {
    if (!confirm('⚠️ ¿Estás seguro de que deseas eliminar las fotos de TODOS los productos?')) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('products').update({ image_url: '' }).eq('restaurant_id', user.id);
      if (error) throw error;
      setProducts(products.map(p => ({ ...p, image_url: '' })));
      alert('Se han eliminado todas las fotos.');
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenOrderCategories = () => {
    const uniqueCats = Array.from(new Set(products.map(p => p.category)));
    const savedOrder = profile.category_order || [];
    const filteredSaved = savedOrder.filter((c: string) => uniqueCats.includes(c));
    const remaining = uniqueCats.filter((c: string) => !filteredSaved.includes(c));
    setCategoryOrderList([...filteredSaved, ...remaining]);
    setIsOrderCategoriesOpen(true);
  };

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

  const handleSaveCategoryOrder = async () => {
    try {
      const { error } = await supabase.from('profiles').update({ category_order: categoryOrderList }).eq('id', user.id);
      if (error) throw error;
      setProfile({ ...profile, category_order: categoryOrderList });
      setIsOrderCategoriesOpen(false);
      alert('El orden de las categorías se guardó correctamente.');
    } catch (err: any) {
      alert('Error al guardar el orden: ' + err.message);
    }
  };

  const publicUrl = profile ? `${typeof window !== 'undefined' ? window.location.origin : ''}/menu/${profile.slug}` : '';

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

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(price);

  const uniqueCats = Array.from(new Set(products.map(p => p.category)));
  const savedOrder = profile?.category_order || [];
  const orderedCategories = [
    ...savedOrder.filter((c: string) => uniqueCats.includes(c)),
    ...uniqueCats.filter((c: string) => !savedOrder.includes(c))
  ];

  // ─── Loading ─────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white">
        <Loader2 className="w-10 h-10 text-orange-500 animate-spin mb-4" />
        <p className="text-slate-400 font-medium">Cargando plataforma...</p>
      </div>
    );
  }

  // ─── Migración en curso ──────────────────────────────────────────────────
  if (migrating) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white gap-4">
        <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
        <p className="text-white font-bold">Actualizando tu menú...</p>
        <p className="text-slate-400 text-sm text-center max-w-xs">
          Estamos migrando tus grupos de personalización al nuevo sistema. Solo ocurre una vez.
        </p>
      </div>
    );
  }

  // ─── ONBOARDING ──────────────────────────────────────────────────────────
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
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold z-10 border transition-all ${onboardingStep >= step
                    ? 'bg-orange-500 border-orange-500 text-white shadow-lg shadow-orange-500/25'
                    : 'bg-slate-900 border-slate-800 text-slate-500'
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
                  <div className="flex flex-col items-center space-y-3 p-4 bg-slate-950 border border-slate-850 rounded-2xl">
                    {logoFile ? (
                      <img src={URL.createObjectURL(logoFile)} alt="Vista previa logo" className="w-20 h-20 rounded-full object-cover border-2 border-orange-500 shadow-md" />
                    ) : (
                      <div className="w-20 h-20 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500">
                        <Store className="w-8 h-8" />
                      </div>
                    )}
                    <div className="flex flex-col items-center gap-1.5 w-full">
                      <Button type="button" variant="outline" className="border-slate-850 text-xs text-slate-300 relative group cursor-pointer w-full">
                        <Upload className="w-4 h-4 mr-1 text-orange-500" /> {logoFile ? 'Cambiar Logo' : 'Subir Logo'}
                        <input type="file" accept="image/*" onChange={(e) => setLogoFile(e.target.files?.[0] || null)} className="absolute inset-0 opacity-0 cursor-pointer" />
                      </Button>
                      {logoFile && (
                        <button type="button" onClick={() => setLogoFile(null)} className="text-[10px] text-red-400 hover:text-red-300 font-bold transition-colors cursor-pointer mt-1">
                          Quitar Logo
                        </button>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-2">Nombre del Restaurante *</label>
                    <Input value={restaurantName} onChange={handleNameChange} placeholder="Ej: El Mariachi Picante" className="bg-slate-950 border-slate-850 text-white" />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-2">URL de tu Menú (Slug)</label>
                    <div className="flex items-center gap-1 bg-slate-950 border border-slate-850 rounded-xl px-4 py-2.5">
                      <span className="text-slate-500 text-sm">menusinteligentes.com/menu/</span>
                      <input value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))} className="bg-transparent border-none outline-none text-white text-sm flex-1 font-semibold" />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-2">Número de WhatsApp para Pedidos *</label>
                    <Input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="Ej: +573132382592" className="bg-slate-950 border-slate-850 text-white" />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-2">Tema de color principal</label>
                    <div className="grid grid-cols-3 gap-2">
                      {THEMES.map(t => (
                        <button key={t.color} type="button" onClick={() => setPrimaryColor(t.color)}
                          className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all text-xs text-center cursor-pointer ${primaryColor === t.color ? 'border-white bg-white/10' : 'border-slate-850 hover:border-slate-700 bg-slate-950'}`}>
                          <span className="w-5 h-5 rounded-full" style={{ backgroundColor: t.color }} />
                          <span className="font-semibold">{t.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <Button onClick={() => setOnboardingStep(2)} disabled={!restaurantName.trim() || !whatsapp.trim()}
                  className="w-full bg-gradient-to-r from-red-600 to-orange-500 font-bold py-6 text-white cursor-pointer">
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
                    <p className="text-sm text-slate-400 bg-slate-950/60 px-4 py-2 rounded-xl animate-pulse">{iaProgress}</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="border-2 border-dashed border-slate-800 rounded-3xl p-8 text-center bg-slate-950/50 hover:border-orange-500/50 transition-colors relative group">
                      <input type="file" multiple accept="image/*,application/pdf" onChange={(e) => { const files = Array.from(e.target.files || []); setMenuFiles(prev => [...prev, ...files]); e.target.value = ''; }} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                      <div className="flex flex-col items-center justify-center space-y-3">
                        <Upload className="w-12 h-12 text-slate-500 group-hover:text-orange-500 transition-colors" />
                        <p className="font-semibold text-white">Haz clic o arrastra una o varias imágenes/PDF</p>
                        <p className="text-xs text-slate-500">Soporta JPG, PNG y PDF. Puedes subir varias fotos una por una.</p>
                      </div>
                    </div>

                    {menuFiles.length > 0 && (
                      <div className="space-y-3 text-left">
                        <p className="text-xs font-semibold text-slate-400">Archivos seleccionados ({menuFiles.length}):</p>
                        {menuFiles.map((file, index) => (
                          <div key={`${file.name}-${index}`} className="bg-slate-950/80 border border-slate-850 p-4 rounded-xl flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <Package className="w-8 h-8 text-orange-500" />
                              <div>
                                <p className="font-semibold text-sm max-w-[200px] truncate">{file.name}</p>
                                <p className="text-xs text-slate-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                              </div>
                            </div>
                            <button onClick={() => setMenuFiles(prev => prev.filter((_, i) => i !== index))} className="p-2 text-slate-500 hover:text-red-400 cursor-pointer transition-colors" title="Eliminar archivo">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                        <button onClick={() => setMenuFiles([])} className="text-xs text-red-400 hover:text-red-300 font-semibold cursor-pointer">
                          Quitar todas
                        </button>
                      </div>
                    )}

                    <div className="flex gap-3">
                      <Button variant="outline" onClick={() => setOnboardingStep(1)} className="border-slate-800 text-slate-300 cursor-pointer">Atrás</Button>
                      <Button onClick={handleAnalyzeMenu} disabled={!menuFiles.length || isExtracting} className="flex-1 bg-gradient-to-r from-red-600 to-orange-500 font-bold text-white cursor-pointer">
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
                  <p className="text-slate-400 mt-1">La IA detectó estos platos. Puedes corregirlos antes de publicar.</p>
                </div>
                <div className="space-y-4 max-h-[40vh] overflow-y-auto pr-2 scrollbar-hide">
                  {parsedProducts.map((p, index) => (
                    <div key={index} className="bg-slate-950 p-4 rounded-xl border border-slate-850 grid grid-cols-1 sm:grid-cols-4 gap-3 relative">
                      <div className="sm:col-span-2">
                        <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Nombre</label>
                        <input value={p.name} onChange={(e) => { const u = [...parsedProducts]; u[index].name = e.target.value; setParsedProducts(u); }} className="w-full bg-slate-900 border border-slate-850 px-3 py-1.5 rounded-lg text-sm text-white" />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Precio</label>
                        <input type="number" value={p.price} onChange={(e) => { const u = [...parsedProducts]; u[index].price = Number(e.target.value); setParsedProducts(u); }} className="w-full bg-slate-900 border border-slate-850 px-3 py-1.5 rounded-lg text-sm text-white" />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Categoría</label>
                        <input value={p.category} onChange={(e) => { const u = [...parsedProducts]; u[index].category = e.target.value; setParsedProducts(u); }} className="w-full bg-slate-900 border border-slate-850 px-3 py-1.5 rounded-lg text-sm text-white" />
                      </div>
                      <button onClick={() => setParsedProducts(parsedProducts.filter((_, i) => i !== index))} className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-600 border border-red-500 text-white flex items-center justify-center hover:bg-red-500 transition-colors shadow-md text-xs font-bold cursor-pointer">×</button>
                    </div>
                  ))}
                </div>

                <div className="flex justify-between items-center py-2 gap-3 flex-wrap">
                  <div className="flex items-center gap-3 flex-wrap">
                    <button onClick={() => setParsedProducts([...parsedProducts, { name: '', price: 0, category: 'Varios', description: '' }])} className="text-xs text-orange-500 hover:text-orange-400 font-bold flex items-center gap-1 cursor-pointer">
                      <Plus className="w-4 h-4" /> Agregar Plato Manual
                    </button>
                    <label className="text-xs text-sky-400 hover:text-sky-300 font-bold flex items-center gap-1 cursor-pointer">
                      <input type="file" multiple accept="image/*,application/pdf" className="hidden" onChange={handleAddProductsFromImages} />
                      <Upload className="w-4 h-4" /> Agregar platos por imagen/PDF
                    </label>
                  </div>
                  <span className="text-xs text-slate-400">{parsedProducts.length} platos detectados</span>
                </div>

                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setOnboardingStep(2)} className="border-slate-800 text-slate-300 cursor-pointer">Atrás</Button>
                  <Button onClick={handlePublishMenu} className="flex-1 bg-gradient-to-r from-red-600 to-orange-500 font-bold text-white cursor-pointer">¡Crear mi Menú Digital! 🚀</Button>
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

  // ─── MAIN DASHBOARD ──────────────────────────────────────────────────────
  const wizardProducts = products.filter(p => !p.image_url);

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans flex">
      {/* Sidebar */}
      <aside className="w-64 border-r border-slate-900 bg-slate-950 flex-col justify-between hidden md:flex">
        <div className="p-6">
          <div className="flex items-center gap-2 mb-8">
            <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center">
              <Store className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg">Panel de Control</span>
          </div>

          <nav className="space-y-1">
            {([
              { id: 'overview', icon: QrCode, label: 'Mi Menú & QR' },
              { id: 'products', icon: Package, label: `Productos (${products.length})` },
              { id: 'groups', icon: Layers, label: `Grupos (${customizationGroups.length})` },
              { id: 'settings', icon: Settings, label: 'Configuración' },
            ] as const).map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors cursor-pointer ${activeTab === tab.id ? 'bg-orange-500/10 text-orange-500 border-l-4 border-orange-500' : 'text-slate-400 hover:text-white hover:bg-slate-900'}`}
              >
                <tab.icon className="w-5 h-5" /> {tab.label}
              </button>
            ))}
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

      {/* Main Content */}
      <main className="flex-1 flex flex-col bg-slate-950 overflow-y-auto">
        <header className="h-20 border-b border-slate-900 bg-slate-950/50 backdrop-blur-sm flex items-center justify-between px-8">
          <div className="flex items-center gap-3 text-left">
            {profile.logo_url && (
              <img src={profile.logo_url} alt="Logo" className="w-10 h-10 rounded-full object-cover border border-slate-800" />
            )}
            <h1 className="text-xl font-bold">{profile.name}</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 ${profile.is_open ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
              <span className={`w-2 h-2 rounded-full ${profile.is_open ? 'bg-emerald-400' : 'bg-red-400'}`} />
              {profile.is_open ? 'Abierto' : 'Cerrado'}
            </span>
            <a href={`/menu/${profile.slug}`} target="_blank"
              className="text-xs font-semibold text-slate-400 hover:text-white border border-slate-800 px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors">
              <Eye className="w-4 h-4" /> Ver Menú Público
            </a>
          </div>
        </header>

        <div className="p-8 max-w-5xl w-full mx-auto">
          {/* ─── TAB: OVERVIEW ─── */}
          {activeTab === 'overview' && (
            <div className="grid md:grid-cols-2 gap-8">
              <div className="bg-slate-900 border border-slate-850 p-8 rounded-3xl flex flex-col items-center text-center space-y-6 shadow-xl">
                <h3 className="text-xl font-bold">Código QR de tu Menú</h3>
                <div className="w-56 h-56 bg-white p-3 rounded-2xl shadow-inner flex items-center justify-center">
                  <img src={`https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(publicUrl)}`} alt="QR Code" className="w-full h-full" />
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

                <div className="bg-slate-900 border border-slate-850 p-6 rounded-3xl space-y-5 text-left shadow-xl">
                  <div>
                    <h3 className="font-extrabold text-base text-white flex items-center gap-2">📋 Siguientes tareas sugeridas</h3>
                    <p className="text-xs text-slate-400 mt-1">Completa estos pasos para que tu menú luzca profesional.</p>
                  </div>
                  <div className="space-y-4">
                    <div className="p-4 bg-slate-950/80 border border-slate-850 rounded-2xl space-y-3">
                      <div className="space-y-1">
                        <span className="text-[10px] uppercase font-bold text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded-full">Tarea 1</span>
                        <h4 className="font-bold text-sm text-white mt-1">Organizar las fotos de tu menú</h4>
                        <p className="text-xs text-slate-400 leading-relaxed">Configura fotos reales o de stock organizadas sección por sección.</p>
                      </div>
                      <Button onClick={() => { setWizardSelectedCategory(null); setCurrentWizardIndex(0); setIsPhotoWizardOpen(true); }}
                        className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs py-4 cursor-pointer">
                        Organizar Fotos por Sección
                      </Button>
                    </div>

                    <div className="p-4 bg-slate-950/80 border border-slate-850 rounded-2xl space-y-3">
                      <div className="space-y-1">
                        <span className="text-[10px] uppercase font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">Tarea 2</span>
                        <h4 className="font-bold text-sm text-white mt-1">Organizar tus secciones / categorías</h4>
                        <p className="text-xs text-slate-400 leading-relaxed">Organiza el orden de tus secciones (ej: 1. Entradas, 2. Platos Fuertes).</p>
                      </div>
                      <Button onClick={handleOpenOrderCategories} variant="outline" className="w-full border-slate-850 hover:bg-slate-850 text-slate-300 font-bold text-xs py-4 cursor-pointer">
                        Organizar Orden de Secciones
                      </Button>
                    </div>

                    <div className="p-4 bg-slate-950/80 border border-slate-850 rounded-2xl space-y-3">
                      <div className="space-y-1">
                        <span className="text-[10px] uppercase font-bold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full">Tarea 3</span>
                        <h4 className="font-bold text-sm text-white mt-1">Anexar platos con IA</h4>
                        <p className="text-xs text-slate-400 leading-relaxed">Sube más fotos de tu carta física o fototeca para extraer platos con IA.</p>
                      </div>
                      <Button onClick={() => setIsAiImportOpen(true)} className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-xs py-4 cursor-pointer">
                        <Sparkles className="w-4 h-4 mr-1 text-yellow-300 animate-pulse" /> Anexar Platos con IA
                      </Button>
                    </div>

                    {products.some(p => p.image_url && p.image_url.trim() !== '' && p.image_url !== 'null') && (
                      <div className="p-4 bg-red-950/10 border border-red-950/30 rounded-2xl space-y-2 text-left">
                        <h4 className="font-bold text-xs text-red-400">¿Deseas que tu menú no tenga ninguna imagen?</h4>
                        <p className="text-[11px] text-slate-400 leading-relaxed">Si prefieres un estilo minimalista, puedes limpiar todas las imágenes de un solo clic.</p>
                        <button onClick={handleClearAllPhotos} className="text-xs text-red-400 hover:text-red-300 font-bold underline cursor-pointer">
                          Eliminar todas las fotos del menú
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ─── TAB: PRODUCTS ─── */}
          {activeTab === 'products' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold">Listado de Platos y Productos</h3>
                <div className="flex gap-2">
                  <Button onClick={() => setIsAiImportOpen(true)} className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-xs">
                    <Sparkles className="w-4 h-4 mr-1 text-yellow-300 animate-pulse" /> Anexar platos con IA
                  </Button>
                  <Button onClick={handleOpenOrderCategories} variant="outline" className="border-slate-800 text-slate-300 text-xs">
                    <Palette className="w-4 h-4 mr-1 text-orange-500" /> Ordenar Secciones
                  </Button>
                  <Button onClick={() => openProductForm(null)} className="bg-orange-500 text-white font-bold text-xs">
                    <Plus className="w-4 h-4 mr-1" /> Agregar Producto
                  </Button>
                </div>
              </div>

              <div className="space-y-8">
                {orderedCategories.map((cat) => {
                  const catProducts = getProductsForCategory(cat);
                  return (
                    <div key={cat} className="space-y-3">
                      <h4 className="font-bold text-slate-300 border-b border-slate-900 pb-2 text-md flex items-center justify-between">
                        <span>{cat}</span>
                        <span className="text-xs text-slate-500 font-normal">{catProducts.length} productos</span>
                      </h4>
                      <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={(event) => handleDragEnd(event, cat)}
                      >
                        <SortableContext items={catProducts.map(p => p.id)} strategy={verticalListSortingStrategy}>
                          <div className="grid gap-3">
                            {catProducts.map(p => (
                              <SortableProduct
                                key={p.id}
                                product={p}
                                catProducts={catProducts}
                                formatPrice={formatPrice}
                                onEdit={openProductForm}
                                onDelete={handleDeleteProduct}
                                onDuplicate={handleDuplicateProduct}
                                onMoveCategory={(prod) => { setMovingProduct(prod); setMoveTargetCategory(prod.category); }}
                                onMovePosition={moveProductPosition}
                                toggleAvailability={toggleAvailability}
                              />
                            ))}
                          </div>
                        </SortableContext>
                      </DndContext>
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

          {/* ─── TAB: GROUPS ─── */}
          {activeTab === 'groups' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-bold">Grupos de Personalización</h3>
                  <p className="text-sm text-slate-400 mt-1">Crea grupos reutilizables (Salsas, Tamaño, Extras…) y asígnalos a múltiples platos.</p>
                </div>
                <Button onClick={() => openGroupEditor(null)} className="bg-orange-500 text-white font-bold text-xs">
                  <Plus className="w-4 h-4 mr-1" /> Crear Grupo
                </Button>
              </div>

              {customizationGroups.length === 0 ? (
                <div className="text-center py-16 bg-slate-900 rounded-3xl border border-dashed border-slate-800 text-slate-500 text-sm space-y-3">
                  <Layers className="w-10 h-10 mx-auto text-slate-700" />
                  <p>Aún no tienes grupos de personalización.</p>
                  <p className="text-xs">Crea grupos como "Elige tu salsa", "Tamaño", "Extras", etc. y después asígnalos a tus platos.</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {customizationGroups.map(group => {
                    return (
                      <div key={group.id} className="bg-slate-900 border border-slate-850 p-5 rounded-2xl">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-bold text-white">{group.name}</h4>
                              {group.required && (
                                <span className="text-[10px] bg-orange-500/10 text-orange-400 border border-orange-500/20 px-2 py-0.5 rounded-full font-bold">Obligatorio</span>
                              )}
                              <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full font-semibold">
                                {group.min_selections === 0 ? 'Opcional' : `Mín. ${group.min_selections}`} · Máx. {group.max_selections}
                              </span>
                            </div>
                            {group.description && <p className="text-xs text-slate-400 mt-1">{group.description}</p>}

                            {/* Opciones */}
                            <div className="flex flex-wrap gap-1.5 mt-3">
                              {(group.options || []).map(opt => (
                                <span key={opt.id} className="text-xs bg-slate-800 border border-slate-700 px-2.5 py-1 rounded-full text-slate-300">
                                  {opt.label}{opt.price > 0 ? ` +${formatPrice(opt.price)}` : ''}
                                </span>
                              ))}
                            </div>
                          </div>

                          <div className="flex gap-2 flex-shrink-0">
                            <button onClick={() => openGroupEditor(group)}
                              className="p-2 rounded-lg bg-slate-950 text-slate-400 hover:text-white hover:bg-slate-850 cursor-pointer" title="Editar grupo">
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleDuplicateGroup(group)}
                              className="p-2 rounded-lg bg-slate-950 text-amber-400 hover:text-amber-300 hover:bg-slate-850 cursor-pointer" title="Duplicar grupo">
                              <CopyPlus className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleDeleteGroup(group.id)}
                              className="p-2 rounded-lg bg-slate-950 text-red-400 hover:text-red-300 hover:bg-slate-850 cursor-pointer" title="Eliminar grupo">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ─── TAB: SETTINGS ─── */}
          {activeTab === 'settings' && (
            <div className="bg-slate-900 border border-slate-850 p-8 rounded-3xl space-y-6 max-w-2xl text-left">
              <div>
                <h3 className="text-xl font-bold">Configuración del Restaurante</h3>
                <p className="text-slate-400 mt-1">Administra el perfil de tu negocio.</p>
              </div>

              <div className="space-y-4">
                <div className="flex flex-col items-center space-y-3 p-4 bg-slate-950 border border-slate-850 rounded-2xl">
                  {settingsLogoUploading ? (
                    <div className="w-20 h-20 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center">
                      <Loader2 className="w-6 h-6 text-orange-500 animate-spin" />
                    </div>
                  ) : profile.logo_url ? (
                    <img src={profile.logo_url} alt="Logo Restaurante" className="w-20 h-20 rounded-full object-cover border-2 border-orange-500 shadow-md" />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500">
                      <Store className="w-8 h-8" />
                    </div>
                  )}
                  <div className="flex flex-col items-center gap-1.5 w-full">
                    <Button type="button" variant="outline" className="border-slate-850 text-xs text-slate-300 relative group cursor-pointer w-full" disabled={settingsLogoUploading}>
                      <Upload className="w-4 h-4 mr-1 text-orange-500" /> {profile.logo_url ? 'Cambiar Logo' : 'Subir Logo'}
                      <input type="file" accept="image/*" onChange={handleSettingsLogoChange} className="absolute inset-0 opacity-0 cursor-pointer" disabled={settingsLogoUploading} />
                    </Button>
                    {profile.logo_url && (
                      <button type="button" onClick={async () => {
                        if (!confirm('¿Estás seguro de eliminar el logo?')) return;
                        setSettingsLogoUploading(true);
                        try {
                          const { error } = await supabase.from('profiles').update({ logo_url: null }).eq('id', user.id);
                          if (error) throw error;
                          setProfile({ ...profile, logo_url: null });
                          alert('Logo eliminado correctamente.');
                        } catch (err: any) {
                          alert('Error al eliminar logo: ' + err.message);
                        } finally {
                          setSettingsLogoUploading(false);
                        }
                      }} className="text-[10px] text-red-400 hover:text-red-300 font-bold transition-colors cursor-pointer mt-1" disabled={settingsLogoUploading}>
                        Quitar Logo
                      </button>
                    )}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-2">Nombre del Restaurante</label>
                  <Input value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} className="bg-slate-950 border-slate-850 text-white" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-2">Slug (URL única)</label>
                  <Input value={profile.slug} disabled className="bg-slate-950/50 border-slate-850 text-slate-500" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-2">Número de WhatsApp</label>
                  <Input value={profile.whatsapp} onChange={(e) => setProfile({ ...profile, whatsapp: e.target.value })} className="bg-slate-950 border-slate-850 text-white" />
                </div>

                <div className="space-y-3 rounded-2xl border border-slate-850 bg-slate-950/70 p-4">
                  <div>
                    <h5 className="text-sm font-bold text-white">Portada del menú</h5>
                    <p className="text-xs text-slate-500">Define la imagen, texto y botón que verán tus clientes al entrar al menú.</p>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-2">Imagen de portada (URL)</label>
                    <Input value={profile.menu_cover_image_url || ''} onChange={(e) => setProfile({ ...profile, menu_cover_image_url: e.target.value })} placeholder="https://..." className="bg-slate-950 border-slate-850 text-white" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-2">Título de portada</label>
                    <Input value={profile.menu_cover_title || ''} onChange={(e) => setProfile({ ...profile, menu_cover_title: e.target.value })} placeholder="Ej: Pizzas artesanales" className="bg-slate-950 border-slate-850 text-white" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-2">Descripción de portada</label>
                    <textarea value={profile.menu_cover_description || ''} onChange={(e) => setProfile({ ...profile, menu_cover_description: e.target.value })} placeholder="Describe lo que vende tu restaurante" className="w-full bg-slate-950 border border-slate-850 p-3 rounded-xl text-sm focus:outline-none focus:border-orange-500 text-white h-20 resize-none" />
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-950 border border-slate-850 rounded-xl">
                  <div>
                    <h5 className="text-sm font-bold">Estado de atención</h5>
                    <p className="text-xs text-slate-500">Indica si el restaurante está aceptando pedidos.</p>
                  </div>
                  <Switch checked={profile.is_open} onCheckedChange={(checked) => setProfile({ ...profile, is_open: checked })} />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-2">Color de Marca principal</label>
                  <div className="flex gap-3">
                    <input type="color" value={profile.primary_color} onChange={(e) => setProfile({ ...profile, primary_color: e.target.value })} className="w-12 h-12 bg-transparent border border-slate-850 rounded-xl cursor-pointer" />
                    <Input value={profile.primary_color} onChange={(e) => setProfile({ ...profile, primary_color: e.target.value })} className="bg-slate-950 border-slate-850 text-white flex-1" />
                  </div>
                </div>
              </div>

              <Button onClick={handleSaveSettings} className="bg-orange-500 hover:bg-orange-600 text-white font-bold w-full py-6 cursor-pointer">
                Guardar Ajustes
              </Button>
            </div>
          )}
        </div>
      </main>

      {/* ─── DIALOG: AGREGAR/EDITAR PRODUCTO ─── */}
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
            {/* Imagen */}
            <div className="flex flex-col items-center space-y-3 p-4 bg-slate-900 border border-slate-850 rounded-2xl">
              {(selectedStockUrl || imageFile || editingProduct?.image_url) ? (
                <img
                  src={selectedStockUrl || (imageFile ? URL.createObjectURL(imageFile) : editingProduct?.image_url)}
                  alt="Vista previa"
                  className="w-32 h-32 object-cover rounded-xl shadow-lg border border-slate-800"
                />
              ) : (
                <div className="w-32 h-32 rounded-xl bg-slate-950 border border-slate-800 flex flex-col items-center justify-center text-slate-500 text-xs font-semibold gap-1">
                  <ImageIcon className="w-8 h-8" /><span>Sin Foto</span>
                </div>
              )}
              <div className="flex gap-2 w-full">
                <Button type="button" variant="outline" className="flex-1 border-slate-850 text-xs text-slate-300 relative group cursor-pointer">
                  <Upload className="w-4 h-4 mr-1 text-orange-500" /> Subir Foto
                  <input type="file" accept="image/*" onChange={(e) => { setImageFile(e.target.files?.[0] || null); setSelectedStockUrl(''); }} className="absolute inset-0 opacity-0 cursor-pointer" />
                </Button>
                <Button type="button" onClick={() => setShowStockGallery(true)} className="flex-1 bg-slate-950 border border-slate-850 text-xs font-semibold cursor-pointer">
                  <ImageIcon className="w-4 h-4 mr-1 text-amber-500" /> Galería Stock
                </Button>
              </div>
              {(imageFile || selectedStockUrl || editingProduct?.image_url) && (
                <button type="button" onClick={() => { setImageFile(null); setSelectedStockUrl(''); if (editingProduct) editingProduct.image_url = ''; }} className="text-[10px] text-red-400 hover:text-red-300 font-bold">
                  Quitar foto y dejar sin imagen
                </button>
              )}
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Nombre *</label>
              <Input required value={prodName} onChange={(e) => setProdName(e.target.value)} placeholder="Ej: Tacos al Pastor" className="bg-slate-900 border-slate-850 text-white" />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Descripción</label>
              <textarea value={prodDesc} onChange={(e) => setProdDesc(e.target.value)} placeholder="Ingredientes o descripción..." className="w-full bg-slate-900 border border-slate-850 p-3 rounded-xl text-sm focus:outline-none focus:border-orange-500 text-white h-20 resize-none" />
            </div>

            {/* Grupos de personalización */}
            <div className="space-y-3 rounded-2xl border border-slate-850 bg-slate-900/50 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-0.5">Grupos de personalización</label>
                  <p className="text-[11px] text-slate-500">Selecciona los grupos globales que aplican a este producto.</p>
                </div>
                <button
                  type="button"
                  onClick={() => { setIsAddingProduct(false); setActiveTab('groups'); openGroupEditor(null); }}
                  className="text-[10px] text-orange-400 hover:text-orange-300 font-bold cursor-pointer whitespace-nowrap"
                >
                  + Crear grupo
                </button>
              </div>

              {customizationGroups.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-800 bg-slate-950/60 p-4 text-center text-[11px] text-slate-500">
                  No hay grupos creados aún. Ve a la pestaña "Grupos" para crear uno.
                </div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1 scrollbar-hide">
                  {customizationGroups.map(group => {
                    const isSelected = selectedGroupIds.includes(group.id);
                    return (
                      <label key={group.id}
                        className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${isSelected ? 'bg-orange-500/10 border-orange-500/40' : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'}`}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {
                            setSelectedGroupIds(prev =>
                              isSelected ? prev.filter(id => id !== group.id) : [...prev, group.id]
                            );
                          }}
                          className="mt-0.5 accent-orange-500"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-white">{group.name}</p>
                          {group.description && <p className="text-[10px] text-slate-400 mt-0.5">{group.description}</p>}
                          <p className="text-[10px] text-slate-500 mt-0.5">
                            {(group.options || []).map(o => o.label).join(', ')}
                          </p>
                        </div>
                        {group.required && (
                          <span className="text-[9px] bg-orange-500/10 text-orange-400 border border-orange-500/20 px-1.5 py-0.5 rounded-full font-bold flex-shrink-0">Oblig.</span>
                        )}
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Precio ($ COP) *</label>
                <Input required type="number" value={prodPrice} onChange={(e) => setProdPrice(Number(e.target.value))} className="bg-slate-900 border-slate-850 text-white" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Categoría *</label>
                <Input required value={prodCategory} onChange={(e) => setProdCategory(e.target.value)} placeholder="Ej: Tacos" className="bg-slate-900 border-slate-850 text-white" list="category-options" />
                <datalist id="category-options">
                  {orderedCategories.map(cat => <option key={cat} value={cat} />)}
                </datalist>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-900 border border-slate-850 rounded-xl">
              <div>
                <h6 className="text-xs font-bold">Disponible</h6>
                <p className="text-[10px] text-slate-500">¿El producto está a la venta hoy?</p>
              </div>
              <Switch checked={prodAvailable} onCheckedChange={setProdAvailable} />
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setIsAddingProduct(false)} className="flex-1 border-slate-800 text-slate-300 cursor-pointer">Cancelar</Button>
              <Button type="submit" disabled={prodLoading} className="flex-1 bg-orange-500 text-white font-bold cursor-pointer">
                {prodLoading ? 'Guardando...' : 'Guardar'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── DIALOG: GALERÍA DE STOCK ─── */}
      <Dialog open={showStockGallery} onOpenChange={setShowStockGallery}>
        <DialogContent className="max-w-2xl bg-slate-950 border border-slate-850 text-white p-6 max-h-[85vh] overflow-y-auto scrollbar-hide">
          <DialogHeader>
            <DialogTitle>Galería de Fotos de Stock</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-slate-400 mb-4 text-left">Selecciona una imagen profesional para tu plato:</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {STOCK_IMAGES.map(img => (
              <button key={img.id} type="button"
                onClick={() => { setSelectedStockUrl(img.url); setImageFile(null); setShowStockGallery(false); }}
                className="group relative rounded-2xl overflow-hidden border border-slate-850 hover:border-orange-500/50 bg-slate-900 text-left transition-all cursor-pointer">
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

      {/* ─── DIALOG: EDITOR DE GRUPO ─── */}
      <Dialog open={isGroupEditorOpen} onOpenChange={setIsGroupEditorOpen}>
        <DialogContent className="max-w-md bg-slate-950 border border-slate-850 text-white p-6 max-h-[90vh] overflow-y-auto scrollbar-hide">
          <DialogHeader>
            <DialogTitle>{editingGroup ? 'Editar Grupo' : 'Nuevo Grupo de Personalización'}</DialogTitle>
          </DialogHeader>

          {groupError && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-200 p-3 rounded-lg text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400" /><span>{groupError}</span>
            </div>
          )}

          <div className="space-y-4 text-left">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Nombre del grupo *</label>
              <Input value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="Ej: Elige tu salsa" className="bg-slate-900 border-slate-850 text-white" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Descripción (opcional)</label>
              <Input value={groupDescription} onChange={(e) => setGroupDescription(e.target.value)} placeholder="Ej: Selecciona 1 salsa para tu pedido" className="bg-slate-900 border-slate-850 text-white" />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="flex items-center justify-between p-3 bg-slate-900 border border-slate-850 rounded-xl col-span-1">
                <div>
                  <p className="text-[10px] font-bold text-white">Obligatorio</p>
                </div>
                <Switch checked={groupRequired} onCheckedChange={setGroupRequired} />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-slate-300 block mb-1">Mín.</label>
                <Input type="number" min={0} value={groupMin} onChange={(e) => setGroupMin(Number(e.target.value) || 0)} className="bg-slate-900 border-slate-850 text-white" />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-slate-300 block mb-1">Máx.</label>
                <Input type="number" min={1} value={groupMax} onChange={(e) => setGroupMax(Number(e.target.value) || 1)} className="bg-slate-900 border-slate-850 text-white" />
              </div>
            </div>

            {/* Opciones */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase text-slate-400">Opciones ({groupOptions.length})</span>
                <button type="button"
                  onClick={() => setGroupOptions(prev => [...prev, { id: `new-${Date.now()}`, label: '', price: 0 }])}
                  className="text-[10px] text-orange-400 hover:text-orange-300 font-bold cursor-pointer">
                  + Agregar opción
                </button>
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {groupOptions.map((opt, idx) => (
                  <div key={opt.id} className="flex items-center gap-2">
                    <Input
                      value={opt.label}
                      onChange={(e) => setGroupOptions(prev => prev.map((o, i) => i === idx ? { ...o, label: e.target.value } : o))}
                      placeholder={`Opción ${idx + 1}`}
                      className="bg-slate-900 border-slate-850 text-white flex-1 text-xs"
                    />
                    <div className="relative w-28">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs">$</span>
                      <Input
                        type="number"
                        min={0}
                        value={opt.price}
                        onChange={(e) => setGroupOptions(prev => prev.map((o, i) => i === idx ? { ...o, price: Number(e.target.value) || 0 } : o))}
                        placeholder="0"
                        className="bg-slate-900 border-slate-850 text-white pl-6 text-xs"
                      />
                    </div>
                    <button type="button"
                      onClick={() => setGroupOptions(prev => prev.filter((_, i) => i !== idx))}
                      className="p-1.5 text-red-400 hover:text-red-300 text-xs font-bold cursor-pointer"
                      title="Eliminar opción">✕</button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setIsGroupEditorOpen(false)} className="flex-1 border-slate-800 text-slate-300 cursor-pointer">Cancelar</Button>
              <Button type="button" onClick={handleSaveGroup} disabled={groupSaving} className="flex-1 bg-orange-500 text-white font-bold cursor-pointer">
                {groupSaving ? 'Guardando...' : 'Guardar Grupo'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── DIALOG: MOVER PLATO A OTRA CATEGORÍA ─── */}
      <Dialog open={!!movingProduct} onOpenChange={() => setMovingProduct(null)}>
        <DialogContent className="max-w-sm bg-slate-950 border border-slate-850 text-white p-6">
          <DialogHeader>
            <DialogTitle>Mover plato a otra categoría</DialogTitle>
          </DialogHeader>
          {movingProduct && (
            <div className="space-y-4 text-left">
              <p className="text-sm text-slate-400">
                Mover <strong className="text-white">"{movingProduct.name}"</strong> a:
              </p>
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Categoría destino *</label>
                <Input
                  value={moveTargetCategory}
                  onChange={(e) => setMoveTargetCategory(e.target.value)}
                  list="move-category-options"
                  placeholder="Selecciona o escribe una categoría"
                  className="bg-slate-900 border-slate-850 text-white"
                />
                <datalist id="move-category-options">
                  {orderedCategories.map(cat => <option key={cat} value={cat} />)}
                </datalist>
              </div>
              <div className="flex gap-3">
                <Button type="button" variant="outline" onClick={() => setMovingProduct(null)} className="flex-1 border-slate-800 text-slate-300 cursor-pointer">Cancelar</Button>
                <Button type="button" onClick={handleMoveProductToCategory}
                  disabled={!moveTargetCategory.trim() || moveTargetCategory.trim() === movingProduct.category}
                  className="flex-1 bg-orange-500 text-white font-bold cursor-pointer">
                  Mover
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ─── DIALOG: ASISTENTE DE FOTOS ─── */}
      <Dialog open={isPhotoWizardOpen} onOpenChange={(open) => { setIsPhotoWizardOpen(open); if (!open) { setWizardSelectedCategory(null); setWizardEditingProduct(null); } }}>
        <DialogContent className="max-w-md bg-slate-950 border border-slate-850 text-white p-6 max-h-[90vh] overflow-y-auto scrollbar-hide">
          {isPhotoWizardOpen && !wizardSelectedCategory && (
            <div className="space-y-4 text-left">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-orange-400">
                  <Sparkles className="w-5 h-5" /> Organizar Fotos de tu Menú
                </DialogTitle>
              </DialogHeader>
              <p className="text-xs text-slate-400">Elige una sección para ver sus productos y organizar sus fotografías:</p>
              <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1 scrollbar-hide">
                {orderedCategories.map(cat => {
                  const catProds = products.filter(p => p.category === cat);
                  const missingCount = catProds.filter(p => !p.image_url || p.image_url.trim() === '' || p.image_url === 'null').length;
                  return (
                    <button key={cat} type="button" onClick={() => { setWizardSelectedCategory(cat); setWizardEditingProduct(null); }}
                      className="w-full bg-slate-900 border border-slate-850 p-4 rounded-xl flex justify-between items-center hover:border-orange-500/50 hover:bg-slate-850 transition-colors text-left cursor-pointer">
                      <div className="truncate pr-2">
                        <span className="font-bold text-sm text-white">{cat}</span>
                        <p className="text-xs text-slate-500 mt-0.5">{catProds.length} productos</p>
                      </div>
                      <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold whitespace-nowrap flex-shrink-0 ${missingCount > 0 ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}`}>
                        {missingCount > 0 ? `${missingCount} sin foto` : 'Completo ✓'}
                      </span>
                    </button>
                  );
                })}
              </div>
              <Button type="button" onClick={() => setIsPhotoWizardOpen(false)} className="w-full bg-slate-950 border border-slate-850 text-white cursor-pointer">Cerrar Asistente</Button>
            </div>
          )}

          {isPhotoWizardOpen && wizardSelectedCategory && !wizardEditingProduct && (() => {
            const catProds = products.filter(p => p.category === wizardSelectedCategory);
            return (
              <div className="space-y-4 text-left">
                <DialogHeader className="flex flex-row items-center justify-between border-b border-slate-900 pb-3">
                  <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-orange-400" /> Sección: {wizardSelectedCategory}
                  </DialogTitle>
                  <button type="button" onClick={() => setWizardSelectedCategory(null)} className="text-xs text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer font-semibold">
                    <ArrowLeft className="w-3.5 h-3.5" /> Secciones
                  </button>
                </DialogHeader>
                <div className="space-y-2 max-h-[55vh] overflow-y-auto pr-1 scrollbar-hide">
                  {catProds.map(p => {
                    const hasPhoto = p.image_url && p.image_url.trim() !== '' && p.image_url !== 'null';
                    return (
                      <div key={p.id} className="bg-slate-900/60 border border-slate-850 p-3.5 rounded-xl flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 truncate flex-1">
                          {hasPhoto ? (
                            <img src={p.image_url} alt={p.name} className="w-12 h-12 rounded-lg object-cover flex-shrink-0 border border-slate-800" />
                          ) : (
                            <div className="w-12 h-12 rounded-lg bg-slate-950 border border-slate-850 flex items-center justify-center flex-shrink-0 text-[10px] text-slate-500 font-bold">Sin Foto</div>
                          )}
                          <div className="truncate">
                            <h5 className="font-bold text-xs text-white truncate">{p.name}</h5>
                            <span className="text-[10px] font-extrabold text-orange-400">{formatPrice(p.price)}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <Button type="button" onClick={() => { setWizardEditingProduct(p); setWizardImageFile(null); setWizardSelectedStockUrl(p.image_url || ''); }}
                            className={`px-3 py-1.5 h-8 text-[11px] font-bold cursor-pointer ${hasPhoto ? 'bg-slate-950 hover:bg-slate-855 text-slate-300 border border-slate-800' : 'bg-orange-500 hover:bg-orange-600 text-white'}`}>
                            {hasPhoto ? 'Editar' : 'Agregar Foto'}
                          </Button>
                          {hasPhoto && (
                            <button type="button" onClick={() => handleWizardRemovePhoto(p)} className="p-2 rounded bg-slate-950 hover:bg-slate-850 text-red-400 hover:text-red-300 border border-slate-800 cursor-pointer" title="Quitar foto">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="pt-2 flex gap-2">
                  <Button type="button" onClick={() => setWizardSelectedCategory(null)} className="flex-1 bg-slate-950 border border-slate-850 text-slate-350 text-xs font-semibold cursor-pointer">Volver</Button>
                  <Button type="button" onClick={() => setIsPhotoWizardOpen(false)} className="flex-1 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold cursor-pointer">Finalizar</Button>
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
                  <DialogTitle className="text-base font-bold text-white flex items-center gap-1.5">
                    <Sparkles className="w-5 h-5 text-orange-400 animate-pulse" /> {currentProd.name}
                  </DialogTitle>
                  <button type="button" onClick={() => { setWizardEditingProduct(null); setWizardImageFile(null); setWizardSelectedStockUrl(''); }} className="text-xs text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer font-semibold">
                    <ArrowLeft className="w-3.5 h-3.5" /> Plato Listado
                  </button>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-350 block">1. Sube una foto real desde tu dispositivo:</label>
                    <div className="border border-dashed border-slate-800 rounded-xl p-4 text-center bg-slate-900 hover:border-orange-500/50 transition-all relative">
                      <input type="file" accept="image/*" onChange={(e) => { setWizardImageFile(e.target.files?.[0] || null); setWizardSelectedStockUrl(''); }} className="absolute inset-0 opacity-0 cursor-pointer" />
                      <div className="flex flex-col items-center justify-center space-y-1">
                        <Upload className="w-7 h-7 text-slate-500" />
                        <p className="text-xs text-slate-300 font-semibold">{wizardImageFile ? wizardImageFile.name : 'Subir archivo de imagen'}</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-350 block">2. O selecciona una imagen de stock sugerida:</label>
                    <div className="grid grid-cols-2 gap-2">
                      {suggestedImages.map(img => (
                        <button key={img.id} type="button" onClick={() => { setWizardSelectedStockUrl(img.url); setWizardImageFile(null); }}
                          className={`group relative rounded-xl overflow-hidden border bg-slate-900 text-left transition-all cursor-pointer ${wizardSelectedStockUrl === img.url ? 'border-orange-500 ring-2 ring-orange-500/30' : 'border-slate-850 hover:border-slate-750'}`}>
                          <img src={img.url} alt={img.name} className="w-full h-14 object-cover" />
                          <div className="p-1.5"><p className="font-bold text-[9px] truncate text-white">{img.name}</p></div>
                        </button>
                      ))}
                    </div>
                  </div>
                  {(wizardImageFile || (wizardSelectedStockUrl && wizardSelectedStockUrl !== currentProd.image_url)) && (
                    <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl flex items-center justify-between text-xs">
                      <span>✓ Nueva foto seleccionada</span>
                      <button type="button" onClick={() => { setWizardImageFile(null); setWizardSelectedStockUrl(currentProd.image_url || ''); }} className="font-bold hover:underline cursor-pointer">Deshacer</button>
                    </div>
                  )}
                </div>
                <div className="flex gap-2 pt-3 border-t border-slate-900">
                  <Button type="button" variant="outline" onClick={() => { setWizardEditingProduct(null); setWizardImageFile(null); setWizardSelectedStockUrl(''); }} className="flex-1 border-slate-800 text-slate-400 cursor-pointer">Cancelar</Button>
                  <Button type="button" onClick={handleWizardSave} disabled={wizardLoading || (!wizardImageFile && (!wizardSelectedStockUrl || wizardSelectedStockUrl === currentProd.image_url))} className="flex-1 bg-orange-500 text-white font-bold cursor-pointer">
                    {wizardLoading ? 'Guardando...' : 'Guardar Foto'}
                  </Button>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* ─── DIALOG: ORDENAR CATEGORÍAS ─── */}
      <Dialog open={isOrderCategoriesOpen} onOpenChange={setIsOrderCategoriesOpen}>
        <DialogContent className="max-w-md bg-slate-950 border border-slate-850 text-white p-6 max-h-[85vh] overflow-y-auto scrollbar-hide">
          <DialogHeader>
            <DialogTitle>Ordenar Secciones del Menú</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-slate-400 mb-4 text-left">Usa los botones para ordenar las secciones del menú:</p>
          <div className="space-y-2 text-left mb-6">
            {categoryOrderList.map((cat, index) => (
              <div key={cat} className="bg-slate-900 border border-slate-850 p-4 rounded-xl flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-slate-950 border border-slate-800 text-slate-400 flex items-center justify-center font-bold text-xs">{index + 1}</span>
                  <span className="font-bold text-sm text-white">{cat}</span>
                </div>
                <div className="flex gap-1">
                  <button disabled={index === 0} onClick={() => handleMoveCategory(index, 'up')} className="p-1.5 rounded bg-slate-950 hover:bg-slate-850 disabled:opacity-30 text-slate-350 cursor-pointer">
                    <ArrowUp className="w-4 h-4" />
                  </button>
                  <button disabled={index === categoryOrderList.length - 1} onClick={() => handleMoveCategory(index, 'down')} className="p-1.5 rounded bg-slate-950 hover:bg-slate-850 disabled:opacity-30 text-slate-350 cursor-pointer">
                    <ArrowDown className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={() => setIsOrderCategoriesOpen(false)} className="flex-1 border-slate-800 text-slate-300 cursor-pointer">Cancelar</Button>
            <Button onClick={handleSaveCategoryOrder} className="flex-1 bg-orange-500 text-white font-bold cursor-pointer">Guardar Orden</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── DIALOG: ANEXAR PLATOS CON IA (DASHBOARD) ─── */}
      <Dialog open={isAiImportOpen} onOpenChange={(open) => { if (!aiImportExtracting) setIsAiImportOpen(open); }}>
        <DialogContent className="max-w-2xl bg-slate-950 border border-slate-850 text-white p-6 max-h-[90vh] overflow-y-auto scrollbar-hide flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-400" /> Anexar Platos con IA
            </DialogTitle>
          </DialogHeader>

          {aiImportError && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-200 p-4 rounded-xl flex items-start gap-3 my-3 text-sm text-left">
              <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-400" />
              <p>{aiImportError}</p>
            </div>
          )}

          {aiImportExtracting ? (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
              <Loader2 className="w-12 h-12 text-purple-500 animate-spin" />
              <p className="text-lg font-bold">Gemini está analizando tu menú...</p>
              <p className="text-sm text-slate-400 bg-slate-950/60 px-4 py-2 rounded-xl animate-pulse">{aiImportProgress}</p>
            </div>
          ) : (
            <div className="space-y-6 flex-1 flex flex-col min-h-0">
              {aiImportParsedProducts.length === 0 ? (
                // Paso 1: Subir archivos
                <div className="space-y-6 text-left">
                  <p className="text-sm text-slate-400">
                    Sube una o varias fotos de tu carta física o capturas de pantalla de tu fototeca. La IA de Gemini extraerá los nombres, precios, descripciones y categorías para anexarlos directamente.
                  </p>
                  
                  <div className="border-2 border-dashed border-slate-800 rounded-3xl p-8 text-center bg-slate-950/50 hover:border-purple-500/50 transition-colors relative group">
                    <input type="file" multiple accept="image/*,application/pdf" onChange={(e) => { const files = Array.from(e.target.files || []); setAiImportFiles(prev => [...prev, ...files]); e.target.value = ''; }} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <Upload className="w-12 h-12 text-slate-500 group-hover:text-purple-500 transition-colors" />
                      <p className="font-semibold text-white">Haz clic, toma una foto o arrastra imágenes/PDF</p>
                      <p className="text-xs text-slate-500">Puedes subir múltiples fotos una por una o a la vez.</p>
                    </div>
                  </div>

                  {aiImportFiles.length > 0 && (
                    <div className="space-y-3">
                      <p className="text-xs font-semibold text-slate-400">Fotos seleccionadas ({aiImportFiles.length}):</p>
                      <div className="grid gap-2 max-h-48 overflow-y-auto pr-1">
                        {aiImportFiles.map((file, index) => (
                          <div key={`${file.name}-${index}`} className="bg-slate-900 border border-slate-850 p-3 rounded-xl flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <Package className="w-6 h-6 text-purple-400" />
                              <div>
                                <p className="font-semibold text-xs max-w-[250px] truncate">{file.name}</p>
                                <p className="text-[10px] text-slate-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                              </div>
                            </div>
                            <button onClick={() => setAiImportFiles(prev => prev.filter((_, i) => i !== index))} className="p-1.5 text-slate-500 hover:text-red-400 cursor-pointer" title="Eliminar archivo">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                      <button onClick={() => setAiImportFiles([])} className="text-xs text-red-400 hover:text-red-300 font-semibold cursor-pointer">
                        Quitar todas
                      </button>
                    </div>
                  )}

                  <div className="flex gap-3 pt-4 border-t border-slate-900">
                    <Button type="button" variant="outline" onClick={() => setIsAiImportOpen(false)} className="flex-1 border-slate-800 text-slate-300 cursor-pointer">Cancelar</Button>
                    <Button onClick={handleDashboardAnalyzeMenu} disabled={!aiImportFiles.length} className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 font-bold text-white cursor-pointer">
                      Analizar con IA <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                </div>
              ) : (
                // Paso 2: Revisar productos extraídos
                <div className="space-y-6 text-left flex-1 flex flex-col min-h-0">
                  <p className="text-sm text-slate-400">
                    La IA detectó estos platos. Revisa y edita los datos antes de anexarlos a tu menú.
                  </p>

                  <div className="space-y-4 overflow-y-auto max-h-[45vh] pr-2 scrollbar-hide flex-1">
                    {aiImportParsedProducts.map((p, index) => (
                      <div key={index} className="bg-slate-900 p-4 rounded-xl border border-slate-850 grid grid-cols-1 sm:grid-cols-4 gap-3 relative">
                        <div className="sm:col-span-2">
                          <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Nombre</label>
                          <input value={p.name} onChange={(e) => { const u = [...aiImportParsedProducts]; u[index].name = e.target.value; setAiImportParsedProducts(u); }} className="w-full bg-slate-950 border border-slate-850 px-3 py-1.5 rounded-lg text-sm text-white" />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Precio</label>
                          <input type="number" value={p.price} onChange={(e) => { const u = [...aiImportParsedProducts]; u[index].price = Number(e.target.value); setAiImportParsedProducts(u); }} className="w-full bg-slate-950 border border-slate-850 px-3 py-1.5 rounded-lg text-sm text-white" />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Categoría</label>
                          <input value={p.category} onChange={(e) => { const u = [...aiImportParsedProducts]; u[index].category = e.target.value; setAiImportParsedProducts(u); }} className="w-full bg-slate-950 border border-slate-850 px-3 py-1.5 rounded-lg text-sm text-white" />
                        </div>
                        <button onClick={() => setAiImportParsedProducts(aiImportParsedProducts.filter((_, i) => i !== index))} className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-600 border border-red-500 text-white flex items-center justify-center hover:bg-red-500 transition-colors shadow-md text-xs font-bold cursor-pointer">×</button>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-between items-center py-2 gap-3 flex-wrap border-t border-slate-900 pt-4">
                    <div className="flex items-center gap-3 flex-wrap">
                      <button onClick={() => setAiImportParsedProducts([...aiImportParsedProducts, { name: '', price: 0, category: 'Varios', description: '' }])} className="text-xs text-purple-400 hover:text-purple-300 font-bold flex items-center gap-1 cursor-pointer">
                        <Plus className="w-4 h-4" /> Agregar Plato Manual
                      </button>
                      <label className="text-xs text-sky-400 hover:text-sky-300 font-bold flex items-center gap-1 cursor-pointer">
                        <input type="file" multiple accept="image/*,application/pdf" className="hidden" onChange={handleDashboardAddProductsFromImages} />
                        <Upload className="w-4 h-4" /> Tomar/Subir más fotos
                      </label>
                    </div>
                    <span className="text-xs text-slate-400">{aiImportParsedProducts.length} platos listos</span>
                  </div>

                  <div className="flex gap-3">
                    <Button variant="outline" onClick={() => { setAiImportParsedProducts([]); setAiImportFiles([]); }} className="flex-1 border-slate-800 text-slate-350 cursor-pointer">Atrás</Button>
                    <Button onClick={handleDashboardPublishImport} className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 font-bold text-white cursor-pointer">Anexar a mi Menú 🚀</Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
