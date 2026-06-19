'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { UtensilsCrossed, ArrowRight, Zap, QrCode, MessageSquare, CheckCircle, Store } from 'lucide-react';

export default function Home() {
  const supabase = createClient();
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then((result: any) => {
      setSession(result?.data?.session || null);
      setLoading(false);
    });

    const authListener: any = supabase.auth.onAuthStateChange((_event: any, session: any) => {
      setSession(session);
    });

    return () => {
      if (authListener?.data?.subscription) {
        authListener.data.subscription.unsubscribe();
      }
    };
  }, [supabase]);

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans overflow-x-hidden">
      {/* Background gradients */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[600px] bg-gradient-to-b from-orange-500/10 via-red-500/5 to-transparent blur-3xl pointer-events-none" />

      {/* Navbar */}
      <nav className="border-b border-slate-900 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-red-600 to-orange-500 rounded-xl flex items-center justify-center border border-orange-500/30">
              <UtensilsCrossed className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
              MenusInteligentes
            </span>
          </div>

          <div className="flex items-center gap-4">
            {!loading && (
              session ? (
                <Link
                  href="/dashboard"
                  className="bg-gradient-to-r from-red-600 to-orange-500 text-white px-5 py-2.5 rounded-xl font-bold hover:shadow-lg hover:shadow-orange-500/20 transition-all flex items-center gap-2"
                >
                  <Store className="w-4 h-4" />
                  <span>Ir a mi Panel</span>
                </Link>
              ) : (
                <>
                  <Link href="/login" className="text-slate-300 hover:text-white font-medium transition-colors">
                    Iniciar Sesión
                  </Link>
                  <Link
                    href="/login"
                    className="bg-white text-slate-950 px-5 py-2.5 rounded-xl font-bold hover:bg-slate-200 transition-colors"
                  >
                    Crear Menú Gratis
                  </Link>
                </>
              )
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="max-w-5xl mx-auto px-6 pt-20 pb-24 text-center relative z-10">
        <div className="inline-flex items-center gap-2 bg-orange-500/10 border border-orange-500/30 text-orange-400 px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider mb-6 animate-pulse">
          <Zap className="w-3.5 h-3.5" />
          <span>Tu menú listo en menos de 5 minutos</span>
        </div>

        <h1 className="text-5xl md:text-7xl font-extrabold leading-tight tracking-tight mb-8">
          El Menú Digital de tu restaurante,{' '}
          <span className="bg-gradient-to-r from-red-500 via-orange-500 to-amber-400 bg-clip-text text-transparent">
            automatizado con IA.
          </span>
        </h1>

        <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed mb-12">
          ¿Tienes una carta física en PDF o foto? Súbela y nuestra IA creará un menú interactivo con código QR y carrito de compras directo a tu WhatsApp. Sin configuraciones complicadas.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/login"
            className="w-full sm:w-auto bg-gradient-to-r from-red-600 to-orange-500 text-white px-8 py-4 rounded-xl font-bold hover:shadow-xl hover:shadow-orange-500/30 transition-all flex items-center justify-center gap-2 group text-lg"
          >
            <span>Crear mi Menú Ahora</span>
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
          <a
            href="#features"
            className="w-full sm:w-auto border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 px-8 py-4 rounded-xl font-bold transition-all text-lg"
          >
            Ver Características
          </a>
        </div>
      </header>

      {/* Features Grid */}
      <section id="features" className="max-w-7xl mx-auto px-6 py-20 border-t border-slate-900">
        <h2 className="text-3xl font-bold text-center mb-16">Todo lo que necesitas para vender digitalmente</h2>
        
        <div className="grid md:grid-cols-3 gap-8">
          {/* Card 1 */}
          <div className="bg-slate-950 border border-slate-900 p-8 rounded-2xl relative group overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-red-500 to-orange-500 scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-300" />
            <div className="w-12 h-12 bg-red-500/10 border border-red-500/30 text-red-500 rounded-xl flex items-center justify-center mb-6">
              <Zap className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold mb-3">Extracción por IA</h3>
            <p className="text-slate-400 leading-relaxed">
              Sube la foto de tu carta física o PDF. Nuestro motor de IA analizará y creará de inmediato tus platos, precios y categorías.
            </p>
          </div>

          {/* Card 2 */}
          <div className="bg-slate-950 border border-slate-900 p-8 rounded-2xl relative group overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-orange-500 to-amber-500 scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-300" />
            <div className="w-12 h-12 bg-orange-500/10 border border-orange-500/30 text-orange-500 rounded-xl flex items-center justify-center mb-6">
              <QrCode className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold mb-3">Código QR Personalizado</h3>
            <p className="text-slate-400 leading-relaxed">
              Genera de forma automática códigos QR descargables en alta calidad para colocar en las mesas o enviar a domicilio.
            </p>
          </div>

          {/* Card 3 */}
          <div className="bg-slate-950 border border-slate-900 p-8 rounded-2xl relative group overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-amber-500 to-yellow-500 scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-300" />
            <div className="w-12 h-12 bg-amber-500/10 border border-amber-500/30 text-amber-500 rounded-xl flex items-center justify-center mb-6">
              <MessageSquare className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold mb-3">Pedidos a WhatsApp</h3>
            <p className="text-slate-400 leading-relaxed">
              Tus clientes arman el carrito de compras y envían el pedido estructurado directamente al WhatsApp de tu negocio.
            </p>
          </div>
        </div>
      </section>

      {/* Step by Step visual */}
      <section className="bg-slate-900/50 border-y border-slate-900 py-20 px-6 text-center">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold mb-12">Cómo funciona en la vida real</h2>
          <div className="grid sm:grid-cols-3 gap-8">
            <div className="space-y-4">
              <span className="inline-block w-8 h-8 rounded-full bg-orange-500 text-white font-bold leading-8 text-center text-sm">1</span>
              <h4 className="font-bold text-lg">Regístrate</h4>
              <p className="text-slate-400 text-sm">Crea tu cuenta de restaurante en 30 segundos.</p>
            </div>
            <div className="space-y-4">
              <span className="inline-block w-8 h-8 rounded-full bg-orange-500 text-white font-bold leading-8 text-center text-sm">2</span>
              <h4 className="font-bold text-lg">Sube tu carta</h4>
              <p className="text-slate-400 text-sm">Toma una foto de tu menú impreso y la IA hace la magia.</p>
            </div>
            <div className="space-y-4">
              <span className="inline-block w-8 h-8 rounded-full bg-orange-500 text-white font-bold leading-8 text-center text-sm">3</span>
              <h4 className="font-bold text-lg">Imprime y vende</h4>
              <p className="text-slate-400 text-sm">Descarga tu QR, ponlo en las mesas y recibe pedidos.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
