import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { AppShell, EmptyState, ErrorState, LoadingList } from "@/components/artesia/AppShell";
import { ExhibitionCard } from "@/components/artesia/ExhibitionCard";
import { useFavorites } from "@/hooks/use-favorites";
import { fetchFavoriteExhibitions, isoDate } from "@/lib/artesia";

export const Route = createFileRoute("/_authenticated/favorites")({
  head: () => ({
    meta: [
      { title: "Mes favoris — Artesia" },
      { name: "description", content: "Les expositions parisiennes que vous avez sauvegardées." },
      { property: "og:title", content: "Mes favoris — Artesia" },
      { property: "og:description", content: "Vos expositions mises de côté sur Artesia." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: FavoritesPage,
});

function FavoritesPage() {
  const today = isoDate(0);
  const { isFavorite, toggle } = useFavorites();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["favorites", "list"],
    queryFn: fetchFavoriteExhibitions,
  });

  return (
    <AppShell>
      <h1 className="mb-6 text-3xl">Mes favoris</h1>
      {isError ? (
        <ErrorState />
      ) : isLoading ? (
        <LoadingList count={3} />
      ) : (data ?? []).length === 0 ? (
        <EmptyState
          title="Aucun favori enregistré"
          description="Touchez le cœur sur une exposition pour la retrouver ici."
        />
      ) : (
        <div className="space-y-3">
          {(data ?? []).map((exhibition) => (
            <ExhibitionCard
              key={exhibition.id}
              exhibition={exhibition}
              day={today}
              isFavorite={isFavorite(exhibition.id)}
              onToggleFavorite={toggle}
            />
          ))}
        </div>
      )}
    </AppShell>
  );
}
