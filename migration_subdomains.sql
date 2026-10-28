-- Subdominio propio por negocio: <subdomain>.menuinteligente.site
-- Opcional: si es NULL, el menú sigue disponible solo en /menu/<slug>.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS subdomain text;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_subdomain_format;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_subdomain_format
  CHECK (
    subdomain IS NULL OR (
      subdomain ~ '^[a-z0-9]([a-z0-9-]{0,38}[a-z0-9])?$'
      AND subdomain NOT IN ('www', 'app', 'admin', 'api', 'dashboard', 'login', 'menu', 'mail')
    )
  );

CREATE UNIQUE INDEX IF NOT EXISTS profiles_subdomain_key
  ON public.profiles (subdomain);
