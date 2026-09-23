import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ENDPOINT = "https://apicollections.parismusees.paris.fr/graphql";
const ARTWORKS_PER_MUSEUM = 12;

/**
 * Les 14 musées municipaux couverts par l'API Paris Musées, avec le terme de
 * taxonomie « musée » (tid) qui leur correspond côté API, et un mot-clé
 * permettant de retrouver la ou les lignes correspondantes dans `museums`
 * (les noms diffèrent légèrement entre les deux sources).
 */
const MUSEE_ALIASES: { tid: string; label: string; keyword: string }[] = [
  { tid: "10", label: "Maison de Balzac", keyword: "balzac" },
  { tid: "11", label: "Musée Bourdelle", keyword: "bourdelle" },
  { tid: "12", label: "Musée Carnavalet, Histoire de Paris", keyword: "carnavalet" },
  { tid: "13", label: "Musée Cernuschi", keyword: "cernuschi" },
  { tid: "14", label: "Musée Cognacq-Jay", keyword: "cognacq" },
  { tid: "15", label: "Palais Galliera", keyword: "galliera" },
  { tid: "16", label: "Musée d'Art moderne de Paris", keyword: "art moderne" },
  { tid: "17", label: "Musée de la Libération de Paris", keyword: "liberation" },
  { tid: "18", label: "Maison de Victor Hugo", keyword: "victor hugo" },
  { tid: "19", label: "Musée de la Vie romantique", keyword: "vie romantique" },
  { tid: "20", label: "Petit Palais", keyword: "petit palais" },
  { tid: "21", label: "Musée Zadkine", keyword: "zadkine" },
  { tid: "165363", label: "Crypte archéologique de l'Ile de la Cité", keyword: "crypte" },
  { tid: "383380", label: "Catacombes de Paris", keyword: "catacombes" },
];

type GraphqlEntity = Record<string, unknown> | null;

type OeuvreNode = {
  nid: number;
  title: string;
  fieldOeuvreAuteurs?: { entity: GraphqlEntity }[] | null;
  fieldDateProduction?: { processed?: string | null } | null;
  fieldOeuvreStyleMouvement?: { entity: GraphqlEntity }[] | null;
  fieldVisuels?: { entity: GraphqlEntity }[] | null;
};

type GraphqlResponse<T> = {
  data?: T;
  errors?: { message: string }[];
};

function normalize(value: string) {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/** Un seul appel GraphQL, avec le header auth-token requis par l'API Paris Musées. */
async function graphqlRequest<T>(query: string, apiKey: string): Promise<GraphqlResponse<T>> {
  const response = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", "auth-token": apiKey },
    body: JSON.stringify({ query }),
  });
  const text = await response.text();
  try {
    return JSON.parse(text) as GraphqlResponse<T>;
  } catch {
    // L'API renvoie parfois une page HTML « Service indisponible » plutôt que du JSON.
    throw new Error(`Réponse non-JSON de l'API Paris Musées (HTTP ${response.status})`);
  }
}

function entityLabel(entity: GraphqlEntity): string | null {
  if (!entity) return null;
  const value = entity["entityLabel"];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function entityId(entity: GraphqlEntity): string | null {
  if (!entity) return null;
  const value = entity["entityId"];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function imageUrlOf(entity: GraphqlEntity): string | null {
  if (!entity) return null;
  const media = entity["fieldMediaImage"] as { entity?: GraphqlEntity } | undefined;
  const url = media?.entity?.["url"];
  return typeof url === "string" && url.trim() ? url.trim() : null;
}

const OEUVRE_FIELDS_WITH_IMAGE = `
  nid
  title
  fieldOeuvreAuteurs { entity { entityLabel } }
  fieldDateProduction { processed }
  fieldOeuvreStyleMouvement { entity { entityId entityLabel } }
  fieldVisuels { entity { entityLabel fieldMediaImage { entity { url } } } }
`;

const OEUVRE_FIELDS_NO_IMAGE = `
  nid
  title
  fieldOeuvreAuteurs { entity { entityLabel } }
  fieldDateProduction { processed }
  fieldOeuvreStyleMouvement { entity { entityId entityLabel } }
`;

function oeuvreQuery(museeTid: string, fields: string) {
  return `query {
    nodeQuery(
      filter: { conditions: [
        { field: "type", value: ["oeuvre"] }
        { field: "field_musee", value: ["${museeTid}"] }
      ] }
      limit: ${ARTWORKS_PER_MUSEUM}
    ) {
      count
      entities { ... on NodeOeuvre { ${fields} } }
    }
  }`;
}

/** Interroge les œuvres d'un musée ; si le champ image casse le schéma, on retente sans lui. */
async function fetchOeuvresForMuseum(tid: string, apiKey: string) {
  type Result = { nodeQuery: { count: number; entities: OeuvreNode[] } };
  let result = await graphqlRequest<Result>(oeuvreQuery(tid, OEUVRE_FIELDS_WITH_IMAGE), apiKey);
  if (result.errors?.length) {
    result = await graphqlRequest<Result>(oeuvreQuery(tid, OEUVRE_FIELDS_NO_IMAGE), apiKey);
  }
  if (result.errors?.length) {
    throw new Error(result.errors.map((e) => e.message).join("; "));
  }
  return result.data?.nodeQuery.entities ?? [];
}

/**
 * Synchronise des œuvres des collections Paris Musées (jusqu'à
 * ARTWORKS_PER_MUSEUM par musée reconnu) dans `artworks`, et les
 * styles/mouvements rencontrés dans `art_universes`. Un musée en échec
 * (API indisponible, aucune correspondance) n'interrompt pas les suivants.
 */
export const syncParisMuseesArtworks = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const apiKey = process.env["PARIS_MUSEES_API_KEY"];
    if (!apiKey) {
      throw new Error("PARIS_MUSEES_API_KEY manquante (voir .env.local).");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: museums } = await supabaseAdmin.from("museums").select("id, name");
    const museumsByAlias = MUSEE_ALIASES.map((alias) => ({
      ...alias,
      museumIds: (museums ?? [])
        .filter((m) => normalize(m.name).includes(alias.keyword))
        .map((m) => m.id),
    }));

    const universes = new Map<string, string | null>();
    const artworkRows: {
      museum_id: string;
      museum_label: string;
      source_id: string;
      title: string;
      author: string | null;
      production_date: string | null;
      style: string | null;
      image_url: string | null;
    }[] = [];

    const failures: string[] = [];
    let matchedMuseums = 0;

    for (const alias of museumsByAlias) {
      const museumId = alias.museumIds[0];
      if (!museumId) continue;
      matchedMuseums += 1;
      try {
        const oeuvres = await fetchOeuvresForMuseum(alias.tid, apiKey);
        for (const oeuvre of oeuvres) {
          const author =
            oeuvre.fieldOeuvreAuteurs
              ?.map((a) => entityLabel(a.entity))
              .filter(Boolean)
              .join(", ") || null;
          const styleEntity = oeuvre.fieldOeuvreStyleMouvement?.[0]?.entity ?? null;
          const style = entityLabel(styleEntity);
          const styleId = entityId(styleEntity);
          if (style) universes.set(style, styleId);
          const image = oeuvre.fieldVisuels?.map((v) => imageUrlOf(v.entity)).find(Boolean) ?? null;

          // `source_id` est UNIQUE : une seule ligne par œuvre, même si plusieurs
          // lignes `museums` correspondent au même musée (doublons de sync).
          artworkRows.push({
            museum_id: museumId,
            museum_label: alias.label,
            source_id: String(oeuvre.nid),
            title: oeuvre.title,
            author,
            production_date: oeuvre.fieldDateProduction?.processed ?? null,
            style,
            image_url: image,
          });
        }
      } catch (error) {
        failures.push(`${alias.label}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    if (universes.size > 0) {
      await supabaseAdmin.from("art_universes").upsert(
        [...universes.entries()].map(([name, source_id]) => ({ name, source_id })),
        { onConflict: "name" },
      );
    }

    let imported = 0;
    for (let i = 0; i < artworkRows.length; i += 50) {
      const chunk = artworkRows.slice(i, i + 50);
      const { error } = await supabaseAdmin
        .from("artworks")
        .upsert(chunk, { onConflict: "source_id" });
      if (error) throw new Error(error.message);
      imported += chunk.length;
    }

    return { imported, matchedMuseums, universes: universes.size, failures };
  });
