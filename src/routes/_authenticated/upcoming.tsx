import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { useMemo, useState } from "react";

import {
  AppShell,
  EmptyState,
  ErrorState,
  LoadingList,
  SectionTitle,
} from "@/components/artesia/AppShell";
import { ExhibitionCard } from "@/components/artesia/ExhibitionCard";
import { FilterBar, type Filters } from "@/components/artesia/FilterBar";
import { Logo } from "@/components/artesia/Logo";
import { Button } from "@/components/ui/button";
import { useFavorites } from "@/hooks/use-favorites";
import { fetchExhibitionsForDay, isoDate, type Exhibition } from "@/lib/artesia";

export const Route = createFileRoute("/_authenticated/upcoming")({
  head: () => ({
    meta: [
      { title: "À venir — Artesia" },
      {
        name: "description",
        content: "Les expositions parisiennes d'aujourd'hui et de demain, dans un seul fil.",
      },
      { property: "og:title", content: "À venir — Artesia" },
      {
        property: "og:description",
        content: "Aujourd'hui et demain à Paris : horaires, prix et favoris en un tap.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: UpcomingPage,
});

const INITIAL_COUNT = 3;

function DaySection({
  label,
  day,
  exhibitions,
  filters,
}: {
  label: string;
  day: string;
  exhibitions: Exhibition[];
  filters: Filters;
}) {
  const [expanded, setExpanded] = useState(false);
  const { isFavorite, toggle } = useFavorites();

  const filtered = exhibitions.filter(
    (exhibition) =>
      (!filters.type || exhibition.exhibition_type === filters.type) &&
      (!filters.mood || exhibition.mood === filters.mood) &&
      (!filters.freeOnly || exhibition.is_free),
  );
  const visible = expanded ? filtered : filtered.slice(0, INITIAL_COUNT);
  const remaining = filtered.length - visible.length;

  return (
    <section className="mb-10">
      <SectionTitle>{label}</SectionTitle>
      {filtered.length === 0 ? (
        <EmptyState
          title="Rien de prévu ici"
          description="Aucune exposition ne correspond pour ce jour. Essayez d'enlever un filtre."
        />
      ) : (
        <div className="space-y-3">
          {visible.map((exhibition) => (
            <ExhibitionCard
              key={exhibition.id}
              exhibition={exhibition}
              day={day}
              isFavorite={isFavorite(exhibition.id)}
              onToggleFavorite={toggle}
            />
          ))}
          {remaining > 0 ? (
            <Button variant="outline" className="w-full" onClick={() => setExpanded(true)}>
              Voir {remaining} de plus
            </Button>
          ) : null}
        </div>
      )}
    </section>
  );
}

function UpcomingPage() {
  const today = isoDate(0);
  const tomorrow = isoDate(1);
  const [filters, setFilters] = useState<Filters>({ type: null, mood: null, freeOnly: false });

  const todayQuery = useQuery({
    queryKey: ["exhibitions", "day", today],
    queryFn: () => fetchExhibitionsForDay(today),
  });
  const tomorrowQuery = useQuery({
    queryKey: ["exhibitions", "day", tomorrow],
    queryFn: () => fetchExhibitionsForDay(tomorrow),
  });

  const all = useMemo(
    () => [...(todayQuery.data ?? []), ...(tomorrowQuery.data ?? [])],
    [todayQuery.data, tomorrowQuery.data],
  );
  const types = useMemo(
    () => [...new Set(all.map((e) => e.exhibition_type).filter((v): v is string => Boolean(v)))],
    [all],
  );
  const moods = useMemo(
    () => [...new Set(all.map((e) => e.mood).filter((v): v is string => Boolean(v)))],
    [all],
  );

  const isLoading = todayQuery.isLoading || tomorrowQuery.isLoading;
  const isError = todayQuery.isError || tomorrowQuery.isError;

  return (
    <AppShell>
      <header className="mb-4 flex items-center justify-between">
        <Logo />
        <div className="flex items-center">
          <Button asChild variant="ghost" size="icon" aria-label="Rechercher">
            <Link to="/search">
              <Search className="h-5 w-5" />
            </Link>
          </Button>
          <Button asChild variant="ghost" size="icon" aria-label="Mon profil">
            <Link to="/profile">
              <User className="h-5 w-5" />
            </Link>
          </Button>
        </div>
      </header>

      <FilterBar types={types} moods={moods} filters={filters} onChange={setFilters} />

      <div className="mt-6">
        {isError ? (
          <ErrorState />
        ) : isLoading ? (
          <LoadingList count={4} />
        ) : (
          <>
            <DaySection
              label="Aujourd'hui"
              day={today}
              exhibitions={todayQuery.data ?? []}
              filters={filters}
            />
            <DaySection
              label="Demain"
              day={tomorrow}
              exhibitions={tomorrowQuery.data ?? []}
              filters={filters}
            />
          </>
        )}
      </div>
    </AppShell>
  );
}
