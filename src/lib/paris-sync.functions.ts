import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Json } from "@/integrations/supabase/types";

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

type QfapLocation = {
  address_street?: string | null;
  address_zipCode?: string | null;
  address_name?: string | null;
  address_lat_lon?: string | null;
  [key: string]: unknown;
};

type QfapRecord = {
  id: string;
  event_id: number | null;
  title: string | null;
  lead_text: string | null;
  description: string | null;
  date_start: string | null;
  date_end: string | null;
  occurrences: string | null;
  date_description: string | null;
  cover_url: string | null;
  cover_alt: string | null;
  cover_credit: string | null;
  locations: QfapLocation[] | null;
  address_name: string | null;
  address_street: string | null;
  address_zipcode: string | null;
  lat_lon: { lat: number; lon: number } | null;
  pmr: number | boolean | null;
  blind: number | boolean | null;
  deaf: number | boolean | null;
  sign_language: number | boolean | null;
  mental: number | boolean | null;
  transport: string | null;
  contact_url: string | null;
  contact_phone: string | null;
  contact_mail: string | null;
  contact_organisation_name: string | null;
  contact_facebook: string | null;
  contact_twitter: string | null;
  contact_instagram: string | null;
  contact_tiktok: string | null;
  contact_youtube: string | null;
  contact_linkedin: string | null;
  contact_snapchat: string | null;
  contact_whatsapp: string | null;
  contact_messenger: string | null;
  contact_pinterest: string | null;
  contact_soundcloud: string | null;
  contact_spotify: string | null;
  contact_deezer: string | null;
  contact_vimeo: string | null;
  contact_twitch: string | null;
  contact_bandcamp: string | null;
  price_type: string | null;
  price_detail: string | null;
  access_type: string | null;
  access_link: string | null;
  access_link_text: string | null;
  url: string | null;
  programs: string | null;
  audience: string | null;
  childrens: number | boolean | null;
  group: string | null;
  universe_tags: string | null;
  univers: string | null;
  event_indoor: number | boolean | null;
  event_pets_allowed: number | boolean | null;
  updated_at: string | null;
  weight: number | null;
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

function toBool(value: number | boolean | null | undefined) {
  if (value === null || value === undefined) return null;
  if (typeof value === "boolean") return value;
  return value === 1;
}

/** « 2026-10-24T20:00:00+02:00_2026-10-24T22:00:00+02:00;... » → [{start, end}]. */
function parseOccurrences(value: string | null) {
  if (!value) return null;
  const slots = value
    .split(";")
    .map((pair) => pair.trim())
    .filter(Boolean)
    .map((pair) => {
      const [start, end] = pair.split("_");
      return start ? { start, end: end ?? start } : null;
    })
    .filter((slot): slot is { start: string; end: string } => slot !== null);
  return slots.length > 0 ? slots : null;
}

/** « Nom du programme (https://…);Autre programme (https://…) » → [{name, url}]. */
function parsePrograms(value: string | null) {
  if (!value) return null;
  const items = value
    .split(";")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const match = /^(.*?)\s*\(([^)]+)\)$/.exec(entry);
      return match ? { name: match[1], url: match[2] } : { name: entry, url: null };
    });
  return items.length > 0 ? items : null;
}

const SOCIAL_FIELDS = [
  "facebook",
  "twitter",
  "instagram",
  "tiktok",
  "youtube",
  "linkedin",
  "snapchat",
  "whatsapp",
  "messenger",
  "pinterest",
  "soundcloud",
  "spotify",
  "deezer",
  "vimeo",
  "twitch",
  "bandcamp",
] as const;

function socialsOf(record: QfapRecord) {
  const socials: Record<string, string> = {};
  for (const platform of SOCIAL_FIELDS) {
    const value = record[`contact_${platform}` as keyof QfapRecord];
    if (typeof value === "string" && value.trim()) socials[platform] = value.trim();
  }
  return Object.keys(socials).length > 0 ? socials : null;
}

function accessibilityOf(record: QfapRecord) {
  const accessibility = {
    pmr: toBool(record.pmr),
    blind: toBool(record.blind),
    deaf: toBool(record.deaf),
    sign_language: toBool(record.sign_language),
    mental: toBool(record.mental),
  };
  return Object.values(accessibility).some((v) => v !== null) ? accessibility : null;
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
      await supabaseAdmin.from("art_universes").upsert(
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
          // Full record capture beyond the fields above.
          source_event_id: record.event_id ?? null,
          source_updated_at: record.updated_at ?? null,
          date_description: stripHtml(record.date_description),
          occurrences: parseOccurrences(record.occurrences),
          locations:
            record.locations && record.locations.length > 0
              ? (record.locations as unknown as Json)
              : null,
          access_type: record.access_type,
          access_link_text: record.access_link_text,
          contact_url: record.contact_url,
          contact_phone: record.contact_phone,
          contact_mail: record.contact_mail,
          contact_organisation_name: record.contact_organisation_name,
          socials: socialsOf(record),
          cover_alt: record.cover_alt,
          cover_credit: record.cover_credit,
          programs: parsePrograms(record.programs),
          audience: stripHtml(record.audience),
          organizer_group: record.group,
          universe_tags_raw: record.universe_tags ?? record.univers,
          childrens: toBool(record.childrens),
          event_indoor: toBool(record.event_indoor),
          event_pets_allowed: toBool(record.event_pets_allowed),
          accessibility: accessibilityOf(record),
          transport: stripHtml(record.transport),
          weight: record.weight ?? null,
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
