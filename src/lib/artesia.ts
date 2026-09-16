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

/** Date courte type « 15 sept ». */
export function formatDayShort(value: string) {
  return new Date(`${value}T12:00:00`)
    .toLocaleDateString("fr-FR", { day: "numeric", month: "short" })
    .replace(".", "");
}

/** Période d'affichage d'une exposition, relative au jour donné. */
export function dateRangeLabel(
  exhibition: Pick<Exhibition, "start_date" | "end_date">,
  today: string,
) {
  if (exhibition.end_date === today) return "Dernier jour";
  if (exhibition.start_date > today) {
    return `${formatDayShort(exhibition.start_date)} – ${formatDayShort(exhibition.end_date)}`;
  }
  return `Jusqu'au ${formatDayShort(exhibition.end_date)}`;
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

/** Identifiant de l'utilisateur connecté, requis par les règles d'accès. */
export async function requireUserId() {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error("Vous devez être connecté.");
  return data.user.id;
}

export async function trackExhibitionView(exhibitionId: string) {
  try {
    const userId = await requireUserId();
    await supabase
      .from("exhibition_views")
      .insert({ exhibition_id: exhibitionId, user_id: userId });
  } catch {
    // La consultation est un signal secondaire : on ignore l'échec.
  }
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
  const userId = await requireUserId();
  const { data, error } = await supabase
    .from("reservations")
    .insert({ ...input, user_id: userId })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

/** Signaux d'usage utilisés par les recommandations « Pour vous ». */
export type Signals = {
  viewedIds: string[];
  reservedIds: string[];
  preferredTypes: string[];
  preferredMoods: string[];
};

export async function fetchSignals(): Promise<Signals> {
  const [views, reservations] = await Promise.all([
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
  const viewRows = (views.data ?? []) as unknown as Row[];
  const resRows = (reservations.data ?? []) as unknown as Row[];

  const types = new Set<string>();
  const moods = new Set<string>();
  for (const row of [...resRows, ...viewRows]) {
    if (row.exhibitions?.exhibition_type) types.add(row.exhibitions.exhibition_type);
    if (row.exhibitions?.mood) moods.add(row.exhibitions.mood);
  }

  return {
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
