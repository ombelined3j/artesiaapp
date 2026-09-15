import { supabase } from "@/integrations/supabase/client";

export type Museum = {
  id: string;
  name: string;
  address: string;
  district: string | null;
  latitude: number | null;
  longitude: number | null;
  website_url: string | null;
  image_url: string | null;
};

export type Exhibition = {
  id: string;
  museum_id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  start_date: string;
  end_date: string;
  opening_time: string | null;
  closing_time: string | null;
  price: number;
  is_free: boolean;
  booking_url: string | null;
  bookable: boolean;
  exhibition_type: string | null;
  mood: string | null;
  popularity: number;
  museums: Museum | null;
};

export type Reservation = {
  id: string;
  exhibition_id: string;
  date: string;
  time_slot: string;
  number_of_visitors: number;
  ticket_type: string;
  total_price: number;
  status: string;
  booking_reference: string;
  created_at: string;
  exhibitions: Exhibition | null;
};

const EXHIBITION_SELECT = "*, museums(*)";

export function isoDate(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function formatDateFr(value: string) {
  return new Date(`${value}T12:00:00`).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export function formatTime(value: string | null) {
  if (!value) return null;
  return value.slice(0, 5).replace(":", "h");
}

export function priceLabel(exhibition: Pick<Exhibition, "is_free" | "price">) {
  return exhibition.is_free || Number(exhibition.price) === 0
    ? "Gratuit"
    : `${Number(exhibition.price).toFixed(2).replace(".", ",")} €`;
}

export function statusLabel(exhibition: Exhibition, day: string) {
  if (exhibition.end_date === day) return "Dernier jour";
  if (exhibition.start_date === day) return "Nouveau";
  return null;
}

export async function fetchExhibitionsForDay(day: string) {
  const { data, error } = await supabase
    .from("exhibitions")
    .select(EXHIBITION_SELECT)
    .lte("start_date", day)
    .gte("end_date", day)
    .order("popularity", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as Exhibition[];
}

export async function fetchAllExhibitions() {
  const { data, error } = await supabase
    .from("exhibitions")
    .select(EXHIBITION_SELECT)
    .order("popularity", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as Exhibition[];
}

export async function fetchExhibition(id: string) {
  const { data, error } = await supabase
    .from("exhibitions")
    .select(EXHIBITION_SELECT)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data ?? null) as unknown as Exhibition | null;
}

export async function fetchMuseums() {
  const { data, error } = await supabase.from("museums").select("*").order("name");
  if (error) throw error;
  return (data ?? []) as unknown as Museum[];
}

export async function fetchFavoriteIds() {
  const { data, error } = await supabase.from("favorites").select("exhibition_id");
  if (error) throw error;
  return (data ?? []).map((row) => row.exhibition_id as string);
}

export async function fetchFavoriteExhibitions() {
  const { data, error } = await supabase
    .from("favorites")
    .select(`exhibition_id, created_at, exhibitions(${EXHIBITION_SELECT})`)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return ((data ?? []) as unknown as { exhibitions: Exhibition | null }[])
    .map((row) => row.exhibitions)
    .filter((e): e is Exhibition => Boolean(e));
}

export async function toggleFavorite(exhibitionId: string, isFavorite: boolean) {
  if (isFavorite) {
    const { error } = await supabase
      .from("favorites")
      .delete()
      .eq("exhibition_id", exhibitionId);
    if (error) throw error;
    return false;
  }
  const { error } = await supabase.from("favorites").insert({ exhibition_id: exhibitionId });
  if (error) throw error;
  return true;
}

export async function trackExhibitionView(exhibitionId: string) {
  await supabase.from("exhibition_views").insert({ exhibition_id: exhibitionId });
}

export async function fetchReservations() {
  const { data, error } = await supabase
    .from("reservations")
    .select(`*, exhibitions(${EXHIBITION_SELECT})`)
    .order("date", { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as Reservation[];
}

export async function fetchReservation(id: string) {
  const { data, error } = await supabase
    .from("reservations")
    .select(`*, exhibitions(${EXHIBITION_SELECT})`)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data ?? null) as unknown as Reservation | null;
}

export type ReservationInput = {
  exhibition_id: string;
  date: string;
  time_slot: string;
  number_of_visitors: number;
  ticket_type: string;
  total_price: number;
};

export async function createReservation(input: ReservationInput) {
  const { data, error } = await supabase
    .from("reservations")
    .insert(input)
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

/** Signaux d'usage utilisés par les recommandations « Pour vous ». */
export type Signals = {
  favoriteIds: string[];
  viewedIds: string[];
  reservedIds: string[];
  preferredTypes: string[];
  preferredMoods: string[];
};

export async function fetchSignals(): Promise<Signals> {
  const [favorites, views, reservations] = await Promise.all([
    supabase.from("favorites").select(`exhibition_id, exhibitions(exhibition_type, mood)`),
    supabase
      .from("exhibition_views")
      .select(`exhibition_id, exhibitions(exhibition_type, mood)`)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase.from("reservations").select(`exhibition_id, exhibitions(exhibition_type, mood)`),
  ]);

  type Row = {
    exhibition_id: string;
    exhibitions: { exhibition_type: string | null; mood: string | null } | null;
  };
  const favRows = (favorites.data ?? []) as unknown as Row[];
  const viewRows = (views.data ?? []) as unknown as Row[];
  const resRows = (reservations.data ?? []) as unknown as Row[];

  const types = new Set<string>();
  const moods = new Set<string>();
  for (const row of [...favRows, ...resRows, ...viewRows]) {
    if (row.exhibitions?.exhibition_type) types.add(row.exhibitions.exhibition_type);
    if (row.exhibitions?.mood) moods.add(row.exhibitions.mood);
  }

  return {
    favoriteIds: favRows.map((r) => r.exhibition_id),
    viewedIds: viewRows.map((r) => r.exhibition_id),
    reservedIds: resRows.map((r) => r.exhibition_id),
    preferredTypes: [...types],
    preferredMoods: [...moods],
  };
}

/**
 * Score de recommandation volontairement simple et isolé ici,
 * pour pouvoir enrichir l'algorithme sans toucher aux écrans.
 */
export function scoreExhibition(exhibition: Exhibition, signals: Signals, today: string) {
  let score = exhibition.popularity / 20;
  const isOpen = exhibition.start_date <= today && exhibition.end_date >= today;
  if (isOpen) score += 4;
  if (exhibition.exhibition_type && signals.preferredTypes.includes(exhibition.exhibition_type))
    score += 6;
  if (exhibition.mood && signals.preferredMoods.includes(exhibition.mood)) score += 3;
  if (exhibition.is_free) score += 1;
  if (signals.favoriteIds.includes(exhibition.id)) score -= 12;
  if (signals.reservedIds.includes(exhibition.id)) score -= 20;
  if (signals.viewedIds.includes(exhibition.id)) score -= 2;
  return score;
}

export function recommend(exhibitions: Exhibition[], signals: Signals, today: string) {
  return [...exhibitions]
    .map((exhibition) => ({ exhibition, score: scoreExhibition(exhibition, signals, today) }))
    .sort((a, b) => b.score - a.score)
    .map((row) => row.exhibition);
}
