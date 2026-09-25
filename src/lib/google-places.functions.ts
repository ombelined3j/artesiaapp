import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Json } from "@/integrations/supabase/types";

const SEARCH_ENDPOINT = "https://places.googleapis.com/v1/places:searchText";
const FIELD_MASK = "places.id,places.regularOpeningHours";

type PlacesSearchResponse = {
  places?: {
    id: string;
    regularOpeningHours?: {
      periods?: unknown;
      weekdayDescriptions?: string[];
    };
  }[];
  error?: { message: string };
};

async function findOpeningHours(name: string, apiKey: string) {
  const response = await fetch(SEARCH_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": FIELD_MASK,
    },
    body: JSON.stringify({ textQuery: `${name}, Paris`, languageCode: "fr" }),
  });
  const payload = (await response.json()) as PlacesSearchResponse;
  if (!response.ok || payload.error) {
    throw new Error(payload.error?.message ?? `HTTP ${response.status}`);
  }
  const place = payload.places?.[0];
  if (!place) return null;
  return {
    placeId: place.id,
    hours: place.regularOpeningHours
      ? {
          periods: place.regularOpeningHours.periods ?? [],
          weekdayDescriptions: place.regularOpeningHours.weekdayDescriptions ?? [],
        }
      : null,
  };
}

/**
 * Récupère les horaires d'ouverture de chaque lieu (`museums`) via l'API Google
 * Places (New) Text Search — un musée, une bibliothèque ou un jardin sans fiche
 * Google, ou sans horaires publiés, n'interrompt pas les suivants.
 */
export const syncMuseumOpeningHours = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const apiKey = process.env["GOOGLE_PLACES_API_KEY"];
    if (!apiKey) {
      throw new Error("GOOGLE_PLACES_API_KEY manquante (voir .env.local).");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: museums, error: fetchError } = await supabaseAdmin
      .from("museums")
      .select("id, name");
    if (fetchError) throw new Error(fetchError.message);

    let updated = 0;
    let withoutHours = 0;
    let notFound = 0;
    const failures: string[] = [];

    const rows: {
      id: string;
      google_place_id: string;
      opening_hours: Json | null;
      opening_hours_synced_at: string;
    }[] = [];

    for (const museum of museums ?? []) {
      try {
        const result = await findOpeningHours(museum.name, apiKey);
        if (!result) {
          notFound += 1;
          continue;
        }
        if (!result.hours) withoutHours += 1;
        rows.push({
          id: museum.id,
          google_place_id: result.placeId,
          opening_hours: result.hours as unknown as Json,
          opening_hours_synced_at: new Date().toISOString(),
        });
        updated += 1;
      } catch (error) {
        failures.push(`${museum.name}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    for (const row of rows) {
      const { id, ...changes } = row;
      const { error } = await supabaseAdmin.from("museums").update(changes).eq("id", id);
      if (error) throw new Error(error.message);
    }

    return { updated, withoutHours, notFound, total: museums?.length ?? 0, failures };
  });
