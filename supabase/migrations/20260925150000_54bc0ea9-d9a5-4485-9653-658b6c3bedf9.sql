-- Horaires d'ouverture des lieux, récupérés via l'API Google Places (New).
ALTER TABLE public.museums
  ADD COLUMN IF NOT EXISTS google_place_id TEXT,
  ADD COLUMN IF NOT EXISTS opening_hours JSONB,
  ADD COLUMN IF NOT EXISTS opening_hours_synced_at TIMESTAMPTZ;

COMMENT ON COLUMN public.museums.opening_hours IS 'Objet {periods, weekdayDescriptions} renvoyé par Google Places (regularOpeningHours), en français.';
