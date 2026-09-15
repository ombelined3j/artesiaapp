import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";

import { AppShell, ErrorState } from "@/components/artesia/AppShell";
import { priceLabel } from "@/lib/artesia";
import { cn } from "@/lib/utils";
import { fetchAllExhibitions, fetchMuseums, type Museum } from "@/lib/artesia";

export const Route = createFileRoute("/_authenticated/map")({
  head: () => ({
    meta: [
      { title: "Carte des musées — Artesia" },
      {
        name: "description",
        content: "Situez les musées parisiens sur la carte et découvrez leurs expositions.",
      },
      { property: "og:title", content: "Carte des musées — Artesia" },
      {
        property: "og:description",
        content: "Une carte de Paris pour repérer les musées et leurs expositions du moment.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MapPage,
});

// Bornes approximatives de Paris intra-muros, utilisées pour projeter les marqueurs.
const BOUNDS = { minLat: 48.815, maxLat: 48.905, minLng: 2.25, maxLng: 2.42 };

function project(museum: Museum) {
  const lat = museum.latitude ?? (BOUNDS.minLat + BOUNDS.maxLat) / 2;
  const lng = museum.longitude ?? (BOUNDS.minLng + BOUNDS.maxLng) / 2;
  const x = ((lng - BOUNDS.minLng) / (BOUNDS.maxLng - BOUNDS.minLng)) * 100;
  const y = ((BOUNDS.maxLat - lat) / (BOUNDS.maxLat - BOUNDS.minLat)) * 100;
  return { x: Math.min(96, Math.max(4, x)), y: Math.min(94, Math.max(6, y)) };
}

function MapPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const museumsQuery = useQuery({ queryKey: ["museums"], queryFn: fetchMuseums });
  const exhibitionsQuery = useQuery({
    queryKey: ["exhibitions", "all"],
    queryFn: fetchAllExhibitions,
  });

  const museums = museumsQuery.data ?? [];
  const selected = museums.find((museum) => museum.id === selectedId) ?? null;
  const selectedExhibitions = (exhibitionsQuery.data ?? []).filter(
    (exhibition) => exhibition.museum_id === selectedId,
  );

  return (
    <AppShell>
      <h1 className="mb-4 text-3xl">Carte des musées</h1>
      {museumsQuery.isError ? (
        <ErrorState />
      ) : (
        <div className="relative aspect-[4/5] w-full overflow-hidden rounded-3xl bg-secondary sm:aspect-[4/3]">
          <div className="absolute inset-0 opacity-40">
            <div className="absolute top-1/2 left-0 h-1.5 w-full -translate-y-1/2 bg-petrol/30" />
            <div className="absolute top-0 left-1/2 h-full w-1.5 -translate-x-1/2 bg-petrol/20" />
          </div>
          <span className="absolute bottom-3 left-4 text-xs tracking-[0.18em] text-muted-foreground uppercase">
            Paris
          </span>
          {museums.map((museum) => {
            const { x, y } = project(museum);
            const active = museum.id === selectedId;
            return (
              <button
                key={museum.id}
                type="button"
                onClick={() => setSelectedId(museum.id)}
                aria-label={museum.name}
                style={{ left: `${x}%`, top: `${y}%` }}
                className={cn(
                  "absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-card transition-transform",
                  active ? "h-5 w-5 scale-125 bg-primary" : "h-4 w-4 bg-ink",
                )}
              />
            );
          })}
        </div>
      )}

      <div className="mt-5">
        {selected ? (
          <div className="rounded-2xl bg-card p-4">
            <h2 className="text-xl">{selected.name}</h2>
            <p className="text-sm text-muted-foreground">{selected.address}</p>
            {selected.website_url ? (
              <a
                href={selected.website_url}
                target="_blank"
                rel="noreferrer"
                className="mt-1 inline-block text-sm text-primary underline"
              >
                Site officiel
              </a>
            ) : null}
            <div className="mt-4 space-y-2">
              {selectedExhibitions.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Aucune exposition référencée pour ce lieu.
                </p>
              ) : (
                selectedExhibitions.map((exhibition) => (
                  <Link
                    key={exhibition.id}
                    to="/exhibition/$exhibitionId"
                    params={{ exhibitionId: exhibition.id }}
                    className="flex items-center justify-between gap-3 rounded-xl bg-background p-3"
                  >
                    <span className="min-w-0 truncate font-medium">{exhibition.title}</span>
                    <span className="shrink-0 text-sm text-muted-foreground">
                      {priceLabel(exhibition)}
                    </span>
                  </Link>
                ))
              )}
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Touchez un marqueur pour voir le musée et ses expositions.
          </p>
        )}
      </div>
    </AppShell>
  );
}
