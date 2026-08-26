import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function isAuthorized(req: NextRequest) {
  const phone = req.headers.get('x-admin-phone');
  const password = req.headers.get('x-admin-password');
  return phone === '3132382592' && password === 'Administrador$';
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Faltan variables de entorno de Supabase' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // 1. Obtener perfiles de restaurantes
    const { data: profiles, error: pError } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (pError) throw pError;

    // 2. Obtener lista de usuarios de Auth para obtener correos
    const { data: usersData, error: uError } = await supabase.auth.admin.listUsers();
    const emails: Record<string, string> = {};
    if (!uError && usersData?.users) {
      usersData.users.forEach(u => {
        emails[u.id] = u.email || '';
      });
    }

    // 3. Obtener productos para contar cantidad por negocio
    const { data: products, error: prodError } = await supabase
      .from('products')
      .select('id, restaurant_id');

    const counts: Record<string, number> = {};
    if (!prodError && products) {
      products.forEach(p => {
        counts[p.restaurant_id] = (counts[p.restaurant_id] || 0) + 1;
      });
    }

    const result = (profiles || []).map(prof => ({
      ...prof,
      email: emails[prof.id] || 'Sin email',
      productsCount: counts[prof.id] || 0
    }));

    return NextResponse.json({ businesses: result });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error al obtener negocios' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const { id } = await req.json();
    if (!id) {
      return NextResponse.json({ error: 'ID de negocio requerido' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Faltan variables de entorno de Supabase' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    console.log(`[Admin] Iniciando eliminación de negocio: ${id}`);

    // 1. Eliminar archivos del storage para liberar espacio en disco
    try {
      // Listar y borrar logos
      const { data: logos } = await supabase.storage.from('restaurant-assets').list(`logos/${id}`);
      if (logos && logos.length > 0) {
        const files = logos.map(f => `logos/${id}/${f.name}`);
        await supabase.storage.from('restaurant-assets').remove(files);
        console.log(`[Admin] Logos eliminados para ${id}:`, files);
      }

      // Listar y borrar imágenes de platos
      const { data: prods } = await supabase.storage.from('restaurant-assets').list(`products/${id}`);
      if (prods && prods.length > 0) {
        const files = prods.map(f => `products/${id}/${f.name}`);
        await supabase.storage.from('restaurant-assets').remove(files);
        console.log(`[Admin] Productos en almacenamiento eliminados para ${id}:`, files);
      }
    } catch (storageErr) {
      console.error('[Admin] Error limpiando storage:', storageErr);
    }

    // 2. Eliminar el usuario en auth.users (esto provocará ON DELETE CASCADE en profiles, products, customization_groups, etc.)
    const { error: deleteError } = await supabase.auth.admin.deleteUser(id);
    if (deleteError) throw deleteError;

    console.log(`[Admin] Negocio ${id} eliminado con éxito de auth.users`);

    return NextResponse.json({ success: true, message: 'Negocio eliminado correctamente' });
  } catch (err: any) {
    console.error('[Admin] Error en proceso de eliminación:', err);
    return NextResponse.json({ error: err.message || 'Error al eliminar negocio' }, { status: 500 });
  }
}
