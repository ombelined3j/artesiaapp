import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const DATASET =
  "https://opendata.paris.fr/api/explore/v2.1/catalog/datasets/que-faire-a-paris-/records";
const SOURCE = "que-faire-a-paris";
const PAGE_SIZE = 100;
const MAX_RECORDS = 400;

/** Univers artistiques retenus parmi les étiquettes de l'agenda de la Ville. */
const UNIVERSE_TAGS = [
  "Art contemporain",
  "Peinture",
  "Photo",
  "Histoire",
  "Nature",
  "Sciences",
  "Littérature",
  "BD",
  "Danse",
  "Ecrans",
  "Enfants",
  "Festival",
  "Mode",
  "Street art",
];

type QfapRecord = {
  id: string;
  title: string | null;
  lead_text: string | null;
  description: string | null;
  date_start: string | null;
  date_end: string | null;
  cover_url: string | null;
  address_name: string | null;
  address_street: string | null;
  address_zipcode: string | null;
  lat_lon: { lat: number; lon: number } | null;
  price_type: string | null;
  price_detail: string | null;
  access_link: string | null;
  url: string | null;
  qfap_tags: string | null;
  rank: number | null;
};

function stripHtml(value: string | null | undefined) {
  if (!value) return null;
  const text = value
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#39;|&rsquo;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return text.length > 0 ? text : null;
}

function slug(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function districtFromZip(zip: string | null | undefined) {
  if (!zip || !/^75\d{3}$/.test(zip)) return null;
  const n = Number(zip.slice(3));
  if (!n) return null;
  return n === 1 ? "1er" : `${n}e`;
}

function tagsOf(record: QfapRecord) {
  return (record.qfap_tags ?? "")
    .split(";")
    .map((t) => t.trim())
    .filter((t) => t.length > 0 && t.toLowerCase() !== "expo");
}

function universeOf(record: QfapRecord) {
  const tags = tagsOf(record);
  const match = UNIVERSE_TAGS.find((u) => tags.some((t) => slug(t) === slug(u)));
  return match ?? tags[0] ?? null;
}

async function fetchRecords() {
  const today = new Date().toISOString().slice(0, 10);
  const records: QfapRecord[] = [];
  for (let offset = 0; offset < MAX_RECORDS; offset += PAGE_SIZE) {
    const url = new URL(DATASET);
    url.searchParams.set("limit", String(PAGE_SIZE));
    url.searchParams.set("offset", String(offset));
    url.searchParams.set("order_by", "date_start");
    url.searchParams.set("where", `qfap_tags LIKE "Expo" AND date_end >= "${today}"`);
    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`Agenda de Paris indisponible (${response.status})`);
    }
    const payload = (await response.json()) as { results?: QfapRecord[] };
    const page = payload.results ?? [];
    records.push(...page);
    if (page.length < PAGE_SIZE) break;
  }
  return records;
}

/**
 * Importe les expositions parisiennes réelles depuis l'agenda ouvert de la Ville
 * de Paris. Les expositions saisies à la main (source « manual ») ne sont jamais
 * modifiées.
 */
export const syncParisExhibitions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const records = (await fetchRecords()).filter(
      (record) => record.title && record.date_start && record.date_end && record.address_name,
    );

    // 1. Univers artistiques réels.
    const universes = new Set<string>();
    for (const record of records) {
      const universe = universeOf(record);
      if (universe) universes.add(universe);
    }
    if (universes.size > 0) {
      await supabaseAdmin
        .from("art_universes")
        .upsert(
          [...universes].map((name) => ({ name })),
          { onConflict: "name" },
        );
    }

    // 2. Lieux : on réutilise les musées existants quand le nom correspond.
    const { data: existingMuseums } = await supabaseAdmin
      .from("museums")
      .select("id, name, qfap_address_name");
    const byKey = new Map<string, string>();
    for (const museum of existingMuseums ?? []) {
      byKey.set(slug(museum.name), museum.id);
      if (museum.qfap_address_name) byKey.set(slug(museum.qfap_address_name), museum.id);
    }

    const venues = new Map<string, QfapRecord>();
    for (const record of records) {
      const key = slug(record.address_name!);
      if (!venues.has(key)) venues.set(key, record);
    }

    const newVenues: Array<{
      name: string;
      qfap_address_name: string;
      address: string;
      district: string | null;
      latitude: number | null;
      longitude: number | null;
    }> = [];
    for (const [key, record] of venues) {
      if (byKey.has(key)) continue;
      newVenues.push({
        name: record.address_name!,
        qfap_address_name: record.address_name!,
        address: [record.address_street, record.address_zipcode, "Paris"]
          .filter(Boolean)
          .join(", "),
        district: districtFromZip(record.address_zipcode),
        latitude: record.lat_lon?.lat ?? null,
        longitude: record.lat_lon?.lon ?? null,
      });
    }
    if (newVenues.length > 0) {
      const { data: inserted } = await supabaseAdmin
        .from("museums")
        .insert(newVenues)
        .select("id, name");
      for (const museum of inserted ?? []) byKey.set(slug(museum.name), museum.id);
    }

    // 3. Expositions : import ou mise à jour par lots, sans toucher aux saisies manuelles.
    const now = new Date().toISOString();
    const rows = records
      .map((record) => {
        const museumId = byKey.get(slug(record.address_name!));
        if (!museumId) return null;
        return {
          museum_id: museumId,
          title: record.title!,
          description: stripHtml(record.description) ?? record.lead_text,
          image_url: record.cover_url,
          start_date: record.date_start!.slice(0, 10),
          end_date: record.date_end!.slice(0, 10),
          price: 0,
          is_free: (record.price_type ?? "").toLowerCase() === "gratuit",
          price_detail: stripHtml(record.price_detail),
          booking_url: record.access_link ?? record.url,
          bookable: false,
          exhibition_type: universeOf(record),
          popularity: Math.round(record.rank ?? 0),
          source: SOURCE,
          source_id: record.id,
          last_synced_at: now,
        };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null);

    let imported = 0;
    for (let i = 0; i < rows.length; i += 50) {
      const chunk = rows.slice(i, i + 50);
      const { error } = await supabaseAdmin
        .from("exhibitions")
        .upsert(chunk, { onConflict: "source,source_id" });
      if (error) throw new Error(error.message);
      imported += chunk.length;
    }

    return { imported, venues: byKey.size, universes: universes.size };

  });
