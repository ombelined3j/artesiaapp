ALTER TABLE public.exhibitions
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS source_id TEXT,
  ADD COLUMN IF NOT EXISTS price_detail TEXT,
  ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS exhibitions_source_id_key ON public.exhibitions (source, source_id) WHERE source_id IS NOT NULL;

ALTER TABLE public.museums
  ADD COLUMN IF NOT EXISTS qfap_address_name TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS museums_qfap_address_name_key ON public.museums (qfap_address_name) WHERE qfap_address_name IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.artworks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  museum_id UUID REFERENCES public.museums(id) ON DELETE CASCADE,
  museum_label TEXT,
  source_id TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  author TEXT,
  production_date TEXT,
  style TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.artworks TO anon, authenticated;
GRANT ALL ON public.artworks TO service_role;
ALTER TABLE public.artworks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "artworks_public_read" ON public.artworks FOR SELECT TO anon, authenticated USING (true);
CREATE INDEX IF NOT EXISTS artworks_museum_idx ON public.artworks (museum_id);

CREATE TABLE IF NOT EXISTS public.art_universes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  source_id TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.art_universes TO anon, authenticated;
GRANT ALL ON public.art_universes TO service_role;
ALTER TABLE public.art_universes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "art_universes_public_read" ON public.art_universes FOR SELECT TO anon, authenticated USING (true);