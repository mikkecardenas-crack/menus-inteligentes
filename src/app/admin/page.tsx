'use client';

import { useEffect, useState } from 'react';
import { Store, Trash2, Key, Phone, ShieldAlert, LogOut, Loader2, AlertCircle, Eye, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function AdminPage() {
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);

  // Estados del Dashboard Admin
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Verificar sesión admin
  useEffect(() => {
    const savedPhone = sessionStorage.getItem('adminPhone');
    const savedPassword = sessionStorage.getItem('adminPassword');
    if (savedPhone === '3132382592' && savedPassword === 'Administrador$') {
      setIsAdminLoggedIn(true);
      fetchBusinesses(savedPhone, savedPassword);
    }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    if (phone.trim() === '3132382592' && password === 'Administrador$') {
      sessionStorage.setItem('adminPhone', phone);
      sessionStorage.setItem('adminPassword', password);
      setIsAdminLoggedIn(true);
      fetchBusinesses(phone, password);
    } else {
      setLoginError('Número de celular o contraseña de administrador incorrectos.');
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('adminPhone');
    sessionStorage.removeItem('adminPassword');
    setIsAdminLoggedIn(false);
    setBusinesses([]);
  };

  const fetchBusinesses = async (adminPhone: string, adminPass: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/businesses', {
        headers: {
          'x-admin-phone': adminPhone,
          'x-admin-password': adminPass,
        },
      });

      if (!res.ok) {
        throw new Error('Fallo al obtener la lista de negocios');
      }

      const data = await res.json();
      setBusinesses(data.businesses || []);
    } catch (err: any) {
      setError(err.message || 'Error al conectar con la base de datos');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBusiness = async (business: any) => {
    const confirmMsg = `¿Estás seguro de eliminar el negocio "${business.name}"?\n\n¡ADVERTENCIA: Esta acción es irreversible!\n- Se eliminará la cuenta del usuario.\n- Se borrarán todos sus platos y categorías.\n- Se eliminarán sus grupos de personalización.\n- Se borrarán permanentemente todos sus archivos (logos, fotos) del servidor de almacenamiento para liberar espacio.`;
    
    if (!confirm(confirmMsg)) return;

    const adminPhone = sessionStorage.getItem('adminPhone') || '';
    const adminPass = sessionStorage.getItem('adminPassword') || '';

    setDeletingId(business.id);
    try {
      const res = await fetch('/api/admin/businesses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-phone': adminPhone,
          'x-admin-password': adminPass,
        },
        body: JSON.stringify({ id: business.id }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Error al eliminar el negocio');
      }

      alert(`Negocio "${business.name}" y todos sus archivos asociados eliminados correctamente.`);
      // Actualizar lista local
      setBusinesses(prev => prev.filter(b => b.id !== business.id));
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('es-CO', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  // ─── VISTA LOGIN ───
  if (!isAdminLoggedIn) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-white font-sans">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-950/20 via-slate-950 to-slate-950 blur-2xl pointer-events-none" />
        <div className="w-full max-w-md bg-slate-900/60 border border-slate-850 p-8 rounded-3xl shadow-2xl relative z-10 text-left">
          <div className="flex flex-col items-center text-center mb-8">
            <div className="w-12 h-12 bg-purple-500/10 border border-purple-500/20 text-purple-400 rounded-2xl flex items-center justify-center mb-4">
              <ShieldAlert className="w-6 h-6 animate-pulse" />
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight">Panel de Administrador</h1>
            <p className="text-xs text-slate-400 mt-1.5">Inicia sesión con tus credenciales de control general</p>
          </div>

          {loginError && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-200 p-4 rounded-xl flex items-start gap-3 mb-6 text-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-400" />
              <p>{loginError}</p>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="text-[11px] font-semibold text-slate-350 uppercase tracking-wider block mb-2">
                Número de Celular
              </label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <Input
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="3132382592"
                  className="bg-slate-950 border-slate-850 py-6 pl-12 pr-4 text-white text-sm"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-350 uppercase tracking-wider block mb-2">
                Contraseña
              </label>
              <div className="relative">
                <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <Input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="bg-slate-950 border-slate-850 py-6 pl-12 pr-4 text-white text-sm"
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold py-6 rounded-xl transition-all cursor-pointer shadow-lg shadow-purple-500/10"
            >
              Ingresar al Control General
            </Button>
          </form>
        </div>
      </div>
    );
  }

  // ─── VISTA PANEL ADMINISTRADOR ───
  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans flex flex-col">
      {/* Header */}
      <header className="h-20 border-b border-slate-900 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-500/10 border border-purple-500/20 text-purple-400 rounded-xl flex items-center justify-center">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <span className="text-lg font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent block">
                Control General
              </span>
              <span className="text-[10px] text-purple-400 uppercase tracking-widest font-bold">Admin Platform</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={handleLogout}
              className="bg-slate-900 border border-slate-850 hover:border-red-500/30 hover:text-red-400 px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Cerrar Sesión</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl w-full mx-auto px-6 py-10 flex-1 flex flex-col">
        <div className="mb-8 text-left">
          <h2 className="text-2xl font-extrabold">Negocios Registrados</h2>
          <p className="text-sm text-slate-400 mt-1">Monitorea las cuentas de restaurantes activas en la plataforma y gestiona su almacenamiento.</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-200 p-4 rounded-xl flex items-start gap-3 mb-6 text-sm text-left">
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-400" />
            <p>{error}</p>
          </div>
        )}

        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center py-20">
            <Loader2 className="w-10 h-10 text-purple-500 animate-spin mb-4" />
            <p className="text-slate-400 text-sm">Cargando negocios...</p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col">
            {businesses.length === 0 ? (
              <div className="text-center py-20 bg-slate-900/40 rounded-3xl border border-dashed border-slate-850 text-slate-500 text-sm space-y-3 flex-1 flex flex-col items-center justify-center">
                <Store className="w-12 h-12 text-slate-700" />
                <p className="font-semibold text-white">No hay negocios registrados aún</p>
                <p className="text-xs">Los nuevos restaurantes aparecerán aquí una vez que completen su onboarding.</p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {businesses.map((b) => {
                  const menuLink = typeof window !== 'undefined' ? `${window.location.origin}/menu/${b.slug}` : `/menu/${b.slug}`;
                  const isDeleting = deletingId === b.id;
                  return (
                    <div
                      key={b.id}
                      className="bg-slate-900/60 border border-slate-850 p-6 rounded-2xl flex flex-col justify-between hover:border-slate-800 transition-colors shadow-sm relative overflow-hidden text-left"
                    >
                      {/* Borde sutil del color primario del negocio */}
                      <div className="absolute top-0 left-0 right-0 h-1" style={{ backgroundColor: b.primary_color }} />
                      
                      <div>
                        <div className="flex items-start justify-between gap-3 mb-4">
                          <div className="flex items-center gap-3">
                            {b.logo_url ? (
                              <img src={b.logo_url} alt={b.name} className="w-11 h-11 rounded-full object-cover border border-slate-800" />
                            ) : (
                              <div className="w-11 h-11 rounded-full bg-slate-950 border border-slate-800 flex items-center justify-center font-bold text-sm text-purple-400">
                                {b.name.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div>
                              <h3 className="font-extrabold text-sm text-white truncate max-w-[150px]">{b.name}</h3>
                              <p className="text-[10px] text-slate-500 font-medium">Registrado: {formatDate(b.created_at)}</p>
                            </div>
                          </div>
                          <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold border ${b.is_open ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                            {b.is_open ? 'Abierto' : 'Cerrado'}
                          </span>
                        </div>

                        <div className="space-y-2 border-t border-slate-850/60 pt-4 text-xs">
                          <div className="flex justify-between items-center gap-2">
                            <span className="text-slate-400">Platos:</span>
                            <span className="font-bold text-white bg-slate-950 px-2 py-0.5 rounded border border-slate-850">{b.productsCount}</span>
                          </div>
                          <div className="flex justify-between items-center gap-2">
                            <span className="text-slate-400">Email:</span>
                            <span className="font-semibold text-slate-200 truncate max-w-[170px]" title={b.email}>{b.email}</span>
                          </div>
                          <div className="flex justify-between items-center gap-2">
                            <span className="text-slate-400">WhatsApp:</span>
                            <a
                              href={`https://wa.me/${b.whatsapp.replace(/[^0-9]/g, '')}`}
                              target="_blank"
                              rel="noreferrer"
                              className="font-semibold text-orange-400 hover:text-orange-300 flex items-center gap-0.5"
                            >
                              <span>{b.whatsapp}</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                          <div className="flex justify-between items-center gap-2">
                            <span className="text-slate-400">Enlace:</span>
                            <a
                              href={menuLink}
                              target="_blank"
                              rel="noreferrer"
                              className="font-bold text-sky-400 hover:text-sky-300 flex items-center gap-0.5 max-w-[170px] truncate"
                            >
                              <span>/{b.slug}</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        </div>
                      </div>

                      <div className="mt-6 pt-4 border-t border-slate-850/60 flex items-center justify-between">
                        <span className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">ID: {b.id.substring(0, 8)}...</span>
                        <Button
                          onClick={() => handleDeleteBusiness(b)}
                          disabled={isDeleting}
                          className="bg-slate-950 hover:bg-red-950/20 border border-slate-850 hover:border-red-500/40 text-slate-400 hover:text-red-400 text-xs py-1.5 px-3 rounded-lg flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                          {isDeleting ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5" />
                          )}
                          <span>{isDeleting ? 'Borrando...' : 'Eliminar'}</span>
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
