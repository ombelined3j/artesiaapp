import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { ArrowLeft, CalendarDays, Clock, ExternalLink, Landmark, MapPin, Share2 } from "lucide-react";
import { useEffect } from "react";
import { toast } from "sonner";

import { EmptyState, ErrorState, LoadingList, SectionTitle } from "@/components/artesia/AppShell";
import { BottomNav } from "@/components/artesia/BottomNav";
import { MuseumMap } from "@/components/artesia/MuseumMap";
import { Button } from "@/components/ui/button";
import {
  fetchExhibition,
  formatDateFr,
  formatTime,
  priceLabel,
  trackExhibitionView,
} from "@/lib/artesia";
import { exhibitionImage } from "@/lib/museum-images";
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

function InfoRow({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-4 border-b py-4 last:border-b-0">
      <span className="text-muted-foreground">{icon}</span>
      <div className="min-w-0 flex-1 text-[15px]">{children}</div>
    </div>
  );
}

function ExhibitionDetail() {
  const { exhibitionId } = Route.useParams();
  const router = useRouter();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["exhibition", exhibitionId],
    queryFn: () => fetchExhibition(exhibitionId),
  });

  useEffect(() => {
    void trackExhibitionView(exhibitionId);
  }, [exhibitionId]);

  const handleShare = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: data?.title ?? "Artesia", url });
        return;
      }
      await navigator.clipboard.writeText(url);
      toast.success("Lien copié");
    } catch {
      /* partage annulé */
    }
  };

  const heroImage = exhibitionImage(data);


  return (
    <div className="min-h-screen bg-background pb-40">
      <div className="mx-auto max-w-2xl">
        <div className="relative">
          <div className="aspect-[4/3] w-full overflow-hidden bg-muted sm:aspect-[16/9] sm:rounded-b-3xl">
            {heroImage ? (
              <img
                src={heroImage}
                alt={data?.title ?? "Exposition"}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-secondary to-muted px-6 text-center text-sm font-medium text-muted-foreground">
                {data?.museums?.name ?? data?.title}
              </div>
            )}

          </div>
          <div className="absolute inset-x-4 top-4 flex items-center justify-between">
            <button
              type="button"
              aria-label="Retour"
              onClick={() => router.history.back()}
              className="rounded-full bg-background/85 p-2.5 shadow-sm backdrop-blur"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              aria-label="Partager"
              onClick={() => void handleShare()}
              className="rounded-full bg-background/85 p-2.5 shadow-sm backdrop-blur"
            >
              <Share2 className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="px-4 pt-5">
          {isError ? (
            <ErrorState />
          ) : isLoading ? (
            <LoadingList count={1} />
          ) : !data ? (
            <EmptyState title="Exposition introuvable" />
          ) : (
            <article>
              <h1 className="text-3xl leading-tight">{data.title}</h1>
              <p className="mt-1 text-lg text-muted-foreground">{data.museums?.name}</p>


              <div className="mt-6">
                <InfoRow icon={<CalendarDays className="h-5 w-5" />}>
                  <span className="text-primary">Du {formatDateFr(data.start_date)}</span>{" "}
                  <span className="text-muted-foreground">au</span>{" "}
                  {formatDateFr(data.end_date)}
                </InfoRow>
                <InfoRow icon={<Clock className="h-5 w-5" />}>
                  {formatTime(data.opening_time) ?? "Horaires à confirmer"}
                  {data.closing_time ? ` – ${formatTime(data.closing_time)}` : ""}
                </InfoRow>
                <InfoRow icon={<Landmark className="h-5 w-5" />}>{data.museums?.name}</InfoRow>
                {data.museums?.address ? (
                  <InfoRow icon={<MapPin className="h-5 w-5" />}>{data.museums.address}</InfoRow>
                ) : null}
              </div>

              {data.description ? (
                <section className="mt-8">
                  <SectionTitle>Description</SectionTitle>
                  <p className="leading-relaxed whitespace-pre-line">{data.description}</p>
                </section>
              ) : null}

              {data.exhibition_type || data.mood ? (
                <section className="mt-8">
                  <SectionTitle>Univers</SectionTitle>
                  <div className="flex flex-wrap gap-2">
                    {data.exhibition_type ? (
                      <span className="rounded-full border px-4 py-2 text-sm">
                        {data.exhibition_type}
                      </span>
                    ) : null}
                    {data.mood ? (
                      <span className="rounded-full border px-4 py-2 text-sm">{data.mood}</span>
                    ) : null}
                  </div>
                </section>
              ) : null}

              {data.museums ? (
                <section className="mt-8">
                  <SectionTitle>Lieu</SectionTitle>
                  <MuseumMap museum={data.museums} />
                </section>
              ) : null}
            </article>
          )}
        </div>
      </div>

      {data ? (
        <div className="fixed inset-x-0 bottom-16 z-40 border-t bg-background/95 px-4 py-3 backdrop-blur">
          <div className="mx-auto max-w-2xl">
            {data.bookable ? (
              <Button asChild size="lg" className="w-full">
                <Link to="/exhibition/$exhibitionId/book" params={{ exhibitionId: data.id }}>
                  Réserver — {priceLabel(data)}
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
                Réservation non disponible — {priceLabel(data)}
              </p>
            )}
          </div>
        </div>
      ) : null}

      <BottomNav />
    </div>
  );
}
