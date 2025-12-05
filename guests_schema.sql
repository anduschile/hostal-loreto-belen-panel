-- Asegurar que la tabla 'hostal_guests' existe
CREATE TABLE IF NOT EXISTS public.hostal_guests (
  id bigserial PRIMARY KEY,
  full_name text NOT NULL,
  document_id text,
  email text,
  phone text,
  country text,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Añadir columnas faltantes a 'hostal_guests'
ALTER TABLE public.hostal_guests ADD COLUMN IF NOT EXISTS full_name text NOT NULL;
ALTER TABLE public.hostal_guests ADD COLUMN IF NOT EXISTS document_id text;
ALTER TABLE public.hostal_guests ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE public.hostal_guests ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE public.hostal_guests ADD COLUMN IF NOT EXISTS country text;
ALTER TABLE public.hostal_guests ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE public.hostal_guests ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;
ALTER TABLE public.hostal_guests ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.hostal_guests ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
