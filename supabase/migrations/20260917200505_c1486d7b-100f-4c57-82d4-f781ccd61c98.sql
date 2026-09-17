DROP INDEX IF EXISTS public.exhibitions_source_id_key;
CREATE UNIQUE INDEX IF NOT EXISTS exhibitions_source_source_id_key ON public.exhibitions (source, source_id);