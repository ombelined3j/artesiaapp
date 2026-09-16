
-- PROFILES
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- MUSEUMS
CREATE TABLE public.museums (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  district TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  website_url TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.museums TO anon, authenticated;
GRANT ALL ON public.museums TO service_role;
ALTER TABLE public.museums ENABLE ROW LEVEL SECURITY;
CREATE POLICY "museums_public_read" ON public.museums FOR SELECT TO anon, authenticated USING (true);

-- EXHIBITIONS
CREATE TABLE public.exhibitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  museum_id UUID NOT NULL REFERENCES public.museums(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  opening_time TIME,
  closing_time TIME,
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  is_free BOOLEAN NOT NULL DEFAULT false,
  booking_url TEXT,
  bookable BOOLEAN NOT NULL DEFAULT true,
  exhibition_type TEXT,
  mood TEXT,
  popularity INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.exhibitions TO anon, authenticated;
GRANT ALL ON public.exhibitions TO service_role;
ALTER TABLE public.exhibitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "exhibitions_public_read" ON public.exhibitions FOR SELECT TO anon, authenticated USING (true);
CREATE INDEX exhibitions_dates_idx ON public.exhibitions (start_date, end_date);

-- FAVORITES
CREATE TABLE public.favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT auth.uid(),
  exhibition_id UUID NOT NULL REFERENCES public.exhibitions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, exhibition_id)
);
GRANT SELECT, INSERT, DELETE ON public.favorites TO authenticated;
GRANT ALL ON public.favorites TO service_role;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "favorites_select_own" ON public.favorites FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "favorites_insert_own" ON public.favorites FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "favorites_delete_own" ON public.favorites FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- RESERVATIONS
CREATE TABLE public.reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT auth.uid(),
  exhibition_id UUID NOT NULL REFERENCES public.exhibitions(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  time_slot TEXT NOT NULL,
  number_of_visitors INTEGER NOT NULL DEFAULT 1,
  ticket_type TEXT NOT NULL DEFAULT 'standard',
  total_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'confirmed',
  booking_reference TEXT NOT NULL DEFAULT upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reservations TO authenticated;
GRANT ALL ON public.reservations TO service_role;
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reservations_select_own" ON public.reservations FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "reservations_insert_own" ON public.reservations FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "reservations_update_own" ON public.reservations FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "reservations_delete_own" ON public.reservations FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- EXHIBITION VIEWS (recommendation signals)
CREATE TABLE public.exhibition_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT auth.uid(),
  exhibition_id UUID NOT NULL REFERENCES public.exhibitions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.exhibition_views TO authenticated;
GRANT ALL ON public.exhibition_views TO service_role;
ALTER TABLE public.exhibition_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "views_select_own" ON public.exhibition_views FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "views_insert_own" ON public.exhibition_views FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql SET search_path = public;
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER reservations_updated_at BEFORE UPDATE ON public.reservations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- profile auto-creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email) VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- SEED DATA
INSERT INTO public.museums (id, name, address, district, latitude, longitude, website_url, image_url) VALUES
('11111111-1111-1111-1111-111111111101', 'Musée d''Orsay', '1 Rue de la Légion d''Honneur, 75007 Paris', '7e', 48.8600, 2.3266, 'https://www.musee-orsay.fr', 'https://res.cloudinary.com/ncu7idmv/image/upload/f_auto,q_auto/A'),
('11111111-1111-1111-1111-111111111102', 'Centre Pompidou', 'Place Georges-Pompidou, 75004 Paris', '4e', 48.8607, 2.3522, 'https://www.centrepompidou.fr', 'https://res.cloudinary.com/ncu7idmv/image/upload/f_auto,q_auto/A'),
('11111111-1111-1111-1111-111111111103', 'Musée du Louvre', 'Rue de Rivoli, 75001 Paris', '1er', 48.8606, 2.3376, 'https://www.louvre.fr', 'https://res.cloudinary.com/ncu7idmv/image/upload/f_auto,q_auto/A'),
('11111111-1111-1111-1111-111111111104', 'Fondation Louis Vuitton', '8 Av. du Mahatma Gandhi, 75116 Paris', '16e', 48.8767, 2.2633, 'https://www.fondationlouisvuitton.fr', 'https://res.cloudinary.com/ncu7idmv/image/upload/f_auto,q_auto/A'),
('11111111-1111-1111-1111-111111111105', 'Musée Picasso', '5 Rue de Thorigny, 75003 Paris', '3e', 48.8598, 2.3626, 'https://www.museepicassoparis.fr', 'https://res.cloudinary.com/ncu7idmv/image/upload/f_auto,q_auto/A'),
('11111111-1111-1111-1111-111111111106', 'Palais de Tokyo', '13 Av. du Président Wilson, 75116 Paris', '16e', 48.8638, 2.2965, 'https://palaisdetokyo.com', 'https://res.cloudinary.com/ncu7idmv/image/upload/f_auto,q_auto/A'),
('11111111-1111-1111-1111-111111111107', 'Jeu de Paume', '1 Place de la Concorde, 75008 Paris', '8e', 48.8659, 2.3245, 'https://jeudepaume.org', 'https://res.cloudinary.com/ncu7idmv/image/upload/f_auto,q_auto/A'),
('11111111-1111-1111-1111-111111111108', 'Petit Palais', 'Av. Winston Churchill, 75008 Paris', '8e', 48.8661, 2.3145, 'https://www.petitpalais.paris.fr', 'https://res.cloudinary.com/ncu7idmv/image/upload/f_auto,q_auto/A');

INSERT INTO public.exhibitions (museum_id, title, description, image_url, start_date, end_date, opening_time, closing_time, price, is_free, booking_url, bookable, exhibition_type, mood, popularity) VALUES
('11111111-1111-1111-1111-111111111101', 'Lumières impressionnistes', 'Un parcours à travers les grandes toiles impressionnistes et la façon dont la lumière a bouleversé la peinture du XIXe siècle.', 'https://res.cloudinary.com/ncu7idmv/image/upload/f_auto,q_auto/A', CURRENT_DATE - 20, CURRENT_DATE + 40, '09:30', '18:00', 16.00, false, 'https://www.musee-orsay.fr/fr/billetterie', true, 'Peinture', 'Contemplatif', 95),
('11111111-1111-1111-1111-111111111101', 'Photographies du Paris disparu', 'Archives photographiques rares montrant le Paris des grands travaux et de ses passages oubliés.', 'https://res.cloudinary.com/ncu7idmv/image/upload/f_auto,q_auto/A', CURRENT_DATE - 5, CURRENT_DATE, '09:30', '18:00', 0, true, NULL, true, 'Photographie', 'Intimiste', 60),
('11111111-1111-1111-1111-111111111102', 'Abstraction radicale', 'Grande rétrospective consacrée aux pionnières de l''abstraction et à leurs héritières contemporaines.', 'https://res.cloudinary.com/ncu7idmv/image/upload/f_auto,q_auto/A', CURRENT_DATE - 10, CURRENT_DATE + 60, '11:00', '21:00', 15.00, false, 'https://www.centrepompidou.fr/fr/billetterie', true, 'Art moderne', 'Audacieux', 88),
('11111111-1111-1111-1111-111111111102', 'Nuit des installations sonores', 'Une soirée d''installations sonores immersives dans les espaces du Centre, entre performance et écoute collective.', 'https://res.cloudinary.com/ncu7idmv/image/upload/f_auto,q_auto/Black_and_White_Minimalist_Behind_the_Scenes_Instagram_Reel', CURRENT_DATE + 1, CURRENT_DATE + 1, '19:00', '23:30', 12.00, false, NULL, true, 'Installation', 'Festif', 72),
('11111111-1111-1111-1111-111111111103', 'Dessins de la Renaissance', 'Une sélection exceptionnelle de dessins de maîtres italiens, rarement montrés au public.', 'https://res.cloudinary.com/ncu7idmv/image/upload/f_auto,q_auto/A', CURRENT_DATE - 30, CURRENT_DATE + 5, '09:00', '18:00', 22.00, false, 'https://www.ticketlouvre.fr', false, 'Dessin', 'Classique', 91),
('11111111-1111-1111-1111-111111111104', 'Couleurs contemporaines', 'Un dialogue entre peinture contemporaine et architecture de verre, pensé pour les espaces de la Fondation.', 'https://res.cloudinary.com/ncu7idmv/image/upload/f_auto,q_auto/A', CURRENT_DATE, CURRENT_DATE + 90, '11:00', '20:00', 18.00, false, 'https://www.fondationlouisvuitton.fr/fr/billetterie', true, 'Art contemporain', 'Audacieux', 84),
('11111111-1111-1111-1111-111111111105', 'Picasso et le trait', 'Le geste graphique de Picasso, du carnet d''atelier aux grandes compositions.', 'https://res.cloudinary.com/ncu7idmv/image/upload/f_auto,q_auto/A', CURRENT_DATE - 15, CURRENT_DATE + 25, '10:30', '18:00', 14.00, false, 'https://www.museepicassoparis.fr/fr/billetterie', true, 'Peinture', 'Contemplatif', 76),
('11111111-1111-1111-1111-111111111106', 'Jeunes scènes émergentes', 'Carte blanche à une génération d''artistes qui investissent le Palais avec vidéo, textile et sculpture.', 'https://res.cloudinary.com/ncu7idmv/image/upload/f_auto,q_auto/A', CURRENT_DATE, CURRENT_DATE + 45, '12:00', '22:00', 0, true, NULL, true, 'Art contemporain', 'Festif', 68),
('11111111-1111-1111-1111-111111111107', 'Regards documentaires', 'Photographie documentaire internationale : sept séries sur la ville et ses habitants.', 'https://res.cloudinary.com/ncu7idmv/image/upload/f_auto,q_auto/A', CURRENT_DATE + 1, CURRENT_DATE + 70, '11:00', '19:00', 12.00, false, 'https://jeudepaume.org/billetterie', true, 'Photographie', 'Intimiste', 55),
('11111111-1111-1111-1111-111111111108', 'Sculptures dans le jardin', 'Parcours de sculptures en plein air dans le jardin intérieur du Petit Palais, entrée libre.', 'https://res.cloudinary.com/ncu7idmv/image/upload/f_auto,q_auto/A', CURRENT_DATE - 3, CURRENT_DATE + 12, '10:00', '18:00', 0, true, NULL, true, 'Sculpture', 'Contemplatif', 49),
('11111111-1111-1111-1111-111111111108', 'Nocturne au Petit Palais', 'Visite nocturne des collections permanentes, accompagnée de médiations courtes.', 'https://res.cloudinary.com/ncu7idmv/image/upload/f_auto,q_auto/Black_and_White_Minimalist_Behind_the_Scenes_Instagram_Reel', CURRENT_DATE + 1, CURRENT_DATE + 1, '18:30', '22:00', 8.00, false, NULL, true, 'Patrimoine', 'Festif', 63),
('11111111-1111-1111-1111-111111111106', 'Vidéos nocturnes', 'Programmation de courts formats vidéo projetés en continu dans la nef basse.', 'https://res.cloudinary.com/ncu7idmv/image/upload/f_auto,q_auto/Black_and_White_Minimalist_Behind_the_Scenes_Instagram_Reel', CURRENT_DATE, CURRENT_DATE + 2, '18:00', '23:00', 6.00, false, NULL, true, 'Vidéo', 'Audacieux', 58);
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;