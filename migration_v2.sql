-- ================================================================
-- MIGRACIÓN COMPLETA v2: Grupos de personalización globales +
-- display_order + Reglas condicionales
-- ================================================================

-- 1. Agregar columna display_order a products (si no existe)
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS display_order INT DEFAULT 0;

-- ================================================================
-- 2. Tabla de Grupos de Personalización (globales por restaurante)
-- ================================================================
CREATE TABLE IF NOT EXISTS public.customization_groups (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    restaurant_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    required BOOLEAN DEFAULT false NOT NULL,
    min_selections INT DEFAULT 0 NOT NULL,
    max_selections INT DEFAULT 1 NOT NULL,
    display_order INT DEFAULT 0 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.customization_groups ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'customization_groups' AND policyname = 'Cualquiera puede ver grupos de personalización') THEN
    CREATE POLICY "Cualquiera puede ver grupos de personalización" ON public.customization_groups FOR SELECT USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'customization_groups' AND policyname = 'Restaurantes pueden insertar sus grupos') THEN
    CREATE POLICY "Restaurantes pueden insertar sus grupos" ON public.customization_groups FOR INSERT WITH CHECK (auth.uid() = restaurant_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'customization_groups' AND policyname = 'Restaurantes pueden editar sus grupos') THEN
    CREATE POLICY "Restaurantes pueden editar sus grupos" ON public.customization_groups FOR UPDATE USING (auth.uid() = restaurant_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'customization_groups' AND policyname = 'Restaurantes pueden eliminar sus grupos') THEN
    CREATE POLICY "Restaurantes pueden eliminar sus grupos" ON public.customization_groups FOR DELETE USING (auth.uid() = restaurant_id);
  END IF;
END $$;

-- ================================================================
-- 3. Tabla de Opciones de cada Grupo
-- ================================================================
CREATE TABLE IF NOT EXISTS public.customization_options (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    group_id UUID REFERENCES public.customization_groups(id) ON DELETE CASCADE NOT NULL,
    label TEXT NOT NULL,
    price NUMERIC DEFAULT 0 NOT NULL,
    display_order INT DEFAULT 0 NOT NULL
);

ALTER TABLE public.customization_options ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'customization_options' AND policyname = 'Cualquiera puede ver opciones') THEN
    CREATE POLICY "Cualquiera puede ver opciones" ON public.customization_options FOR SELECT USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'customization_options' AND policyname = 'Restaurantes pueden insertar opciones') THEN
    CREATE POLICY "Restaurantes pueden insertar opciones" ON public.customization_options
      FOR INSERT WITH CHECK (auth.uid() = (SELECT restaurant_id FROM public.customization_groups WHERE id = group_id));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'customization_options' AND policyname = 'Restaurantes pueden editar opciones') THEN
    CREATE POLICY "Restaurantes pueden editar opciones" ON public.customization_options
      FOR UPDATE USING (auth.uid() = (SELECT restaurant_id FROM public.customization_groups WHERE id = group_id));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'customization_options' AND policyname = 'Restaurantes pueden eliminar opciones') THEN
    CREATE POLICY "Restaurantes pueden eliminar opciones" ON public.customization_options
      FOR DELETE USING (auth.uid() = (SELECT restaurant_id FROM public.customization_groups WHERE id = group_id));
  END IF;
END $$;

-- ================================================================
-- 4. Tabla de Relación Plato <-> Grupo (muchos-a-muchos)
-- ================================================================
CREATE TABLE IF NOT EXISTS public.product_customization_groups (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
    group_id UUID REFERENCES public.customization_groups(id) ON DELETE CASCADE NOT NULL,
    is_copy BOOLEAN DEFAULT false NOT NULL,
    display_order INT DEFAULT 0 NOT NULL,
    UNIQUE(product_id, group_id)
);

ALTER TABLE public.product_customization_groups ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'product_customization_groups' AND policyname = 'Cualquiera puede ver relaciones producto-grupo') THEN
    CREATE POLICY "Cualquiera puede ver relaciones producto-grupo" ON public.product_customization_groups FOR SELECT USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'product_customization_groups' AND policyname = 'Restaurantes pueden insertar relaciones producto-grupo') THEN
    CREATE POLICY "Restaurantes pueden insertar relaciones producto-grupo" ON public.product_customization_groups
      FOR INSERT WITH CHECK (auth.uid() = (SELECT restaurant_id FROM public.products WHERE id = product_id));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'product_customization_groups' AND policyname = 'Restaurantes pueden editar relaciones producto-grupo') THEN
    CREATE POLICY "Restaurantes pueden editar relaciones producto-grupo" ON public.product_customization_groups
      FOR UPDATE USING (auth.uid() = (SELECT restaurant_id FROM public.products WHERE id = product_id));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'product_customization_groups' AND policyname = 'Restaurantes pueden eliminar relaciones producto-grupo') THEN
    CREATE POLICY "Restaurantes pueden eliminar relaciones producto-grupo" ON public.product_customization_groups
      FOR DELETE USING (auth.uid() = (SELECT restaurant_id FROM public.products WHERE id = product_id));
  END IF;
END $$;

-- ================================================================
-- 5. Tabla de Reglas Condicionales
-- (Para pizzas: si tamaño=grande → sabores máx=3)
-- ================================================================
CREATE TABLE IF NOT EXISTS public.customization_rules (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
    trigger_group_id UUID REFERENCES public.customization_groups(id) ON DELETE CASCADE NOT NULL,
    trigger_option_id UUID REFERENCES public.customization_options(id) ON DELETE CASCADE NOT NULL,
    target_group_id UUID REFERENCES public.customization_groups(id) ON DELETE CASCADE NOT NULL,
    effect_type TEXT NOT NULL DEFAULT 'set_max',
    -- 'set_max': cambia el máximo de selecciones del grupo objetivo
    -- 'set_min': cambia el mínimo de selecciones del grupo objetivo
    -- 'show':    muestra el grupo objetivo
    -- 'hide':    oculta el grupo objetivo
    effect_value INT DEFAULT 1,
    display_order INT DEFAULT 0 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.customization_rules ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'customization_rules' AND policyname = 'Cualquiera puede ver reglas') THEN
    CREATE POLICY "Cualquiera puede ver reglas" ON public.customization_rules FOR SELECT USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'customization_rules' AND policyname = 'Restaurantes pueden insertar reglas') THEN
    CREATE POLICY "Restaurantes pueden insertar reglas" ON public.customization_rules
      FOR INSERT WITH CHECK (auth.uid() = (SELECT restaurant_id FROM public.products WHERE id = product_id));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'customization_rules' AND policyname = 'Restaurantes pueden editar reglas') THEN
    CREATE POLICY "Restaurantes pueden editar reglas" ON public.customization_rules
      FOR UPDATE USING (auth.uid() = (SELECT restaurant_id FROM public.products WHERE id = product_id));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'customization_rules' AND policyname = 'Restaurantes pueden eliminar reglas') THEN
    CREATE POLICY "Restaurantes pueden eliminar reglas" ON public.customization_rules
      FOR DELETE USING (auth.uid() = (SELECT restaurant_id FROM public.products WHERE id = product_id));
  END IF;
END $$;

-- ================================================================
-- FIN DE LA MIGRACIÓN v2
-- ================================================================
