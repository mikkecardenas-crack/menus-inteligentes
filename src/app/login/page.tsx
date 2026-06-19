'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Mail, Lock, Store, UtensilsCrossed, AlertCircle, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    try {
      if (isSignUp) {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });

        if (signUpError) throw signUpError;

        if (data.user && data.session) {
          // Si el correo automático de confirmación está desactivado en Supabase, inicia sesión directo
          router.push('/dashboard');
        } else {
          setMessage('¡Registro exitoso! Por favor revisa tu correo electrónico para confirmar tu cuenta y poder ingresar.');
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) throw signInError;
        router.push('/dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'Ocurrió un error inesperado');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col md:flex-row text-white font-sans">
      {/* Left side: Premium branding & features */}
      <div className="flex-1 bg-gradient-to-br from-red-600 via-orange-500 to-amber-500 flex flex-col justify-between p-8 md:p-16 relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-black/10 rounded-full blur-3xl -ml-20 -mb-20 pointer-events-none" />

        <div className="flex items-center gap-3 relative z-10">
          <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/30 shadow-lg">
            <UtensilsCrossed className="w-6 h-6 text-white" />
          </div>
          <span className="text-2xl font-bold tracking-tight text-white drop-shadow-md">MenusInteligentes</span>
        </div>

        <div className="my-auto py-12 relative z-10 max-w-lg">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight text-white drop-shadow-lg mb-6">
            Tu menú digital en menos de 5 minutos.
          </h1>
          <p className="text-lg md:text-xl text-white/90 font-medium leading-relaxed mb-8">
            Digitaliza tu carta física subiendo una foto o PDF. Nuestra IA extraerá automáticamente tus productos, precios y categorías para crear tu menú web y código QR al instante.
          </p>

          <div className="flex flex-col gap-4 bg-white/10 backdrop-blur-md border border-white/20 p-6 rounded-2xl shadow-xl">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-white/25 flex items-center justify-center text-white font-bold">1</div>
              <p className="font-semibold text-white">Crea tu cuenta gratis</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-white/25 flex items-center justify-center text-white font-bold">2</div>
              <p className="font-semibold text-white">Sube foto de tu carta o menú actual</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-white/25 flex items-center justify-center text-white font-bold">3</div>
              <p className="font-semibold text-white">¡Listo! Recibe pedidos por WhatsApp</p>
            </div>
          </div>
        </div>

        <div className="text-white/70 text-sm relative z-10">
          © {new Date().getFullYear()} MenusInteligentes. Todos los derechos reservados.
        </div>
      </div>

      {/* Right side: Elegant login/signup form card */}
      <div className="flex-1 flex items-center justify-center p-8 bg-slate-900">
        <div className="w-full max-w-md bg-slate-950/80 backdrop-blur-xl border border-slate-800 p-8 rounded-3xl shadow-2xl">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-extrabold tracking-tight">
              {isSignUp ? 'Crear tu cuenta' : 'Bienvenido de nuevo'}
            </h2>
            <p className="text-slate-400 mt-2">
              {isSignUp 
                ? 'Comienza gratis hoy mismo, no requiere tarjeta.' 
                : 'Ingresa para administrar tu menú inteligente.'
              }
            </p>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-200 p-4 rounded-xl flex items-start gap-3 mb-6 text-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-400" />
              <p>{error}</p>
            </div>
          )}

          {message && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-200 p-4 rounded-xl flex items-start gap-3 mb-6 text-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0 text-emerald-400" />
              <p>{message}</p>
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-5">
            <div>
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-2">
                Correo Electrónico
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nombre@restaurante.com"
                  className="w-full bg-slate-900 border border-slate-850 py-3.5 pl-12 pr-4 rounded-xl focus:border-orange-500 focus:outline-none transition-all placeholder-slate-600 text-white"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-2">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-900 border border-slate-850 py-3.5 pl-12 pr-4 rounded-xl focus:border-orange-500 focus:outline-none transition-all placeholder-slate-600 text-white"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-red-600 to-orange-500 text-white py-3.5 rounded-xl font-bold hover:shadow-lg hover:shadow-orange-500/25 active:scale-98 transition-all flex items-center justify-center gap-2 group cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <span>Procesando...</span>
              ) : (
                <>
                  <span>{isSignUp ? 'Registrarme' : 'Iniciar Sesión'}</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="text-center mt-8 pt-6 border-t border-slate-850">
            <button
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError(null);
                setMessage(null);
              }}
              className="text-orange-500 hover:text-orange-400 font-semibold transition-colors cursor-pointer"
            >
              {isSignUp 
                ? '¿Ya tienes una cuenta? Inicia Sesión' 
                : '¿No tienes cuenta? Regístrate gratis'
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
