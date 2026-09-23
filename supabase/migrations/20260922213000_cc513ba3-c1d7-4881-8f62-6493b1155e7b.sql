-- Capture the full "que-faire-a-paris-" record instead of the current subset,
-- so richer data (schedule, accessibility, contact, media credit, programs) is
-- available for exhibitions synced from source = 'que-faire-a-paris'.
ALTER TABLE public.exhibitions
  ADD COLUMN IF NOT EXISTS source_event_id INTEGER,
  ADD COLUMN IF NOT EXISTS source_updated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS date_description TEXT,
  ADD COLUMN IF NOT EXISTS occurrences JSONB,
  ADD COLUMN IF NOT EXISTS locations JSONB,
  ADD COLUMN IF NOT EXISTS access_type TEXT,
  ADD COLUMN IF NOT EXISTS access_link_text TEXT,
  ADD COLUMN IF NOT EXISTS contact_url TEXT,
  ADD COLUMN IF NOT EXISTS contact_phone TEXT,
  ADD COLUMN IF NOT EXISTS contact_mail TEXT,
  ADD COLUMN IF NOT EXISTS contact_organisation_name TEXT,
  ADD COLUMN IF NOT EXISTS socials JSONB,
  ADD COLUMN IF NOT EXISTS cover_alt TEXT,
  ADD COLUMN IF NOT EXISTS cover_credit TEXT,
  ADD COLUMN IF NOT EXISTS programs JSONB,
  ADD COLUMN IF NOT EXISTS audience TEXT,
  ADD COLUMN IF NOT EXISTS organizer_group TEXT,
  ADD COLUMN IF NOT EXISTS universe_tags_raw TEXT,
  ADD COLUMN IF NOT EXISTS childrens BOOLEAN,
  ADD COLUMN IF NOT EXISTS event_indoor BOOLEAN,
  ADD COLUMN IF NOT EXISTS event_pets_allowed BOOLEAN,
  ADD COLUMN IF NOT EXISTS accessibility JSONB,
  ADD COLUMN IF NOT EXISTS transport TEXT,
  ADD COLUMN IF NOT EXISTS weight INTEGER;

COMMENT ON COLUMN public.exhibitions.occurrences IS 'Array of {start, end} ISO timestamps for every recurring time slot (source: occurrences).';
COMMENT ON COLUMN public.exhibitions.locations IS 'Array of venue objects for multi-venue events (source: locations); the primary venue stays in museums via museum_id.';
COMMENT ON COLUMN public.exhibitions.socials IS 'Object of non-empty contact_* social links keyed by platform (facebook, instagram, tiktok, ...).';
COMMENT ON COLUMN public.exhibitions.programs IS 'Array of {name, url} for the festival/programme series this event belongs to, if any.';
COMMENT ON COLUMN public.exhibitions.accessibility IS 'Object of boolean accessibility flags: pmr, blind, deaf, sign_language, mental.';
