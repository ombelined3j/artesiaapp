import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ExternalLink, Heart, MapPin } from "lucide-react";
import { useEffect } from "react";

import { AppShell, EmptyState, ErrorState, LoadingList } from "@/components/artesia/AppShell";
import { Button } from "@/components/ui/button";
import { useFavorites } from "@/hooks/use-favorites";
import {
  fetchExhibition,
  formatDateFr,
  formatTime,
  priceLabel,
  trackExhibitionView,
} from "@/lib/artesia";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/exhibition/$exhibitionId")({
  head: () => ({
    meta: [
      { title: "Exposition — Artesia" },
      {
        name: "description",
        content: "Détail d'une exposition parisienne : dates, prix, informations pratiques.",
      },
      { property: "og:title", content: "Exposition — Artesia" },
      {
        property: "og:description",
        content: "Toutes les informations pratiques avant de réserver votre visite.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ExhibitionDetail,
});

function ExhibitionDetail() {
  const { exhibitionId } = Route.useParams();
  const { isFavorite, toggle } = useFavorites();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["exhibition", exhibitionId],
    queryFn: () => fetchExhibition(exhibitionId),
  });

  useEffect(() => {
    void trackExhibitionView(exhibitionId);
  }, [exhibitionId]);

  return (
    <AppShell>
      <Button asChild variant="ghost" size="sm" className="mb-3 -ml-2">
        <Link to="/upcoming">
          <ArrowLeft className="mr-1 h-4 w-4" /> Retour
        </Link>
      </Button>

      {isError ? (
        <ErrorState />
      ) : isLoading ? (
        <LoadingList count={1} />
      ) : !data ? (
        <EmptyState title="Exposition introuvable" />
      ) : (
        <article>
          <div className="overflow-hidden rounded-3xl bg-muted">
            {data.image_url ? (
              <img
                src={data.image_url}
                alt={data.title}
                className="h-64 w-full object-cover sm:h-80"
              />
            ) : null}
          </div>

          <div className="mt-5 flex items-start justify-between gap-3">
            <h1 className="text-3xl leading-tight">{data.title}</h1>
            <button
              type="button"
              aria-label={isFavorite(data.id) ? "Retirer des favoris" : "Ajouter aux favoris"}
              onClick={() => toggle(data.id)}
              className="shrink-0 rounded-full border p-2.5"
            >
              <Heart
                className={cn("h-5 w-5", isFavorite(data.id) && "fill-primary text-primary")}
              />
            </button>
          </div>

          <p className="mt-2 flex items-center gap-1.5 text-muted-foreground">
            <MapPin className="h-4 w-4" />
            {data.museums?.name}
          </p>
          <p className="text-sm text-muted-foreground">{data.museums?.address}</p>

          {data.description ? <p className="mt-5 leading-relaxed">{data.description}</p> : null}

          <dl className="mt-6 grid grid-cols-2 gap-4 rounded-2xl bg-card p-4 text-sm">
            <div>
              <dt className="text-muted-foreground">Début</dt>
              <dd>{formatDateFr(data.start_date)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Fin</dt>
              <dd>{formatDateFr(data.end_date)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Horaires</dt>
              <dd>
                {formatTime(data.opening_time) ?? "—"}
                {data.closing_time ? ` – ${formatTime(data.closing_time)}` : ""}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Tarif</dt>
              <dd className={cn(data.is_free && "text-petrol font-medium")}>
                {priceLabel(data)}
              </dd>
            </div>
            {data.exhibition_type ? (
              <div>
                <dt className="text-muted-foreground">Type</dt>
                <dd>{data.exhibition_type}</dd>
              </div>
            ) : null}
            {data.mood ? (
              <div>
                <dt className="text-muted-foreground">Ambiance</dt>
                <dd>{data.mood}</dd>
              </div>
            ) : null}
          </dl>

          <div className="mt-6">
            {data.bookable ? (
              <Button asChild size="lg" className="w-full">
                <Link
                  to="/exhibition/$exhibitionId/book"
                  params={{ exhibitionId: data.id }}
                >
                  Réserver
                </Link>
              </Button>
            ) : data.booking_url ? (
              <Button asChild size="lg" variant="outline" className="w-full">
                <a href={data.booking_url} target="_blank" rel="noreferrer">
                  Réserver sur le site officiel
                  <ExternalLink className="ml-2 h-4 w-4" />
                </a>
              </Button>
            ) : (
              <p className="text-center text-sm text-muted-foreground">
                Réservation non disponible pour cette exposition.
              </p>
            )}
          </div>
        </article>
      )}
    </AppShell>
  );
}
