import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { CalendarDays, MapPin, SlidersHorizontal } from "lucide-react";
import { useMemo, useState } from "react";

import {
  AppShell,
  EmptyState,
  ErrorState,
  LoadingList,
  SectionTitle,
} from "@/components/artesia/AppShell";
import { ExhibitionCard } from "@/components/artesia/ExhibitionCard";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useFavorites } from "@/hooks/use-favorites";
import { cn } from "@/lib/utils";
import { fetchAllExhibitions, isoDate } from "@/lib/artesia";

export const Route = createFileRoute("/_authenticated/search")({
  head: () => ({
    meta: [
      { title: "Recherche — Artesia" },
      {
        name: "description",
        content: "Cherchez une exposition, un musée ou un quartier parisien sur Artesia.",
      },
      { property: "og:title", content: "Recherche — Artesia" },
      {
        property: "og:description",
        content: "Explorez les expositions ouvertes, à venir et gratuites à Paris.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SearchPage,
});

type Status = "all" | "open" | "soon" | "free";

const statusChips: { value: Status; label: string }[] = [
  { value: "all", label: "Tout" },
  { value: "open", label: "Actuellement ouvertes" },
  { value: "soon", label: "À venir" },
  { value: "free", label: "Gratuites" },
];

function SearchPage() {
  const today = isoDate(0);
  const { isFavorite, toggle } = useFavorites();
  const [term, setTerm] = useState("");
  const [status, setStatus] = useState<Status>("all");
  const [type, setType] = useState("all");
  const [district, setDistrict] = useState("all");
  const [sort, setSort] = useState("popularity");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["exhibitions", "all"],
    queryFn: fetchAllExhibitions,
  });

  const exhibitions = data ?? [];
  const types = useMemo(
    () => [
      ...new Set(
        exhibitions.map((e) => e.exhibition_type).filter((v): v is string => Boolean(v)),
      ),
    ],
    [exhibitions],
  );
  const districts = useMemo(
    () => [
      ...new Set(
        exhibitions.map((e) => e.museums?.district).filter((v): v is string => Boolean(v)),
      ),
    ],
    [exhibitions],
  );

  const results = useMemo(() => {
    const needle = term.trim().toLowerCase();
    const filtered = exhibitions.filter((exhibition) => {
      const matchesTerm =
        !needle ||
        exhibition.title.toLowerCase().includes(needle) ||
        (exhibition.museums?.name ?? "").toLowerCase().includes(needle) ||
        (exhibition.museums?.district ?? "").toLowerCase().includes(needle);
      const matchesStatus =
        status === "all" ||
        (status === "open" && exhibition.start_date <= today && exhibition.end_date >= today) ||
        (status === "soon" && exhibition.start_date > today) ||
        (status === "free" && exhibition.is_free);
      const matchesType = type === "all" || exhibition.exhibition_type === type;
      const matchesDistrict = district === "all" || exhibition.museums?.district === district;
      return matchesTerm && matchesStatus && matchesType && matchesDistrict;
    });

    return [...filtered].sort((a, b) => {
      if (sort === "price") return Number(a.price) - Number(b.price);
      if (sort === "end") return a.end_date.localeCompare(b.end_date);
      if (sort === "title") return a.title.localeCompare(b.title, "fr");
      return b.popularity - a.popularity;
    });
  }, [exhibitions, term, status, type, district, sort, today]);

  const pill =
    "inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full border bg-transparent px-4 text-sm whitespace-nowrap";
  const pillActive = "border-primary bg-primary text-primary-foreground";

  return (
    <AppShell>
      <header className="mb-4">
        <h1 className="text-3xl">Explorer</h1>
      </header>

      <Input
        value={term}
        onChange={(e) => setTerm(e.target.value)}
        placeholder="Exposition, musée, quartier…"
        aria-label="Rechercher une exposition"
      />

      <div className="no-scrollbar -mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1">
        <Select value={district} onValueChange={setDistrict}>
          <SelectTrigger
            aria-label="Quartier"
            className={cn(pill, district !== "all" && pillActive)}
          >
            <MapPin className="h-4 w-4" />
            <SelectValue placeholder="Paris">
              {district === "all" ? "Paris" : district}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tout Paris</SelectItem>
            {districts.map((value) => (
              <SelectItem key={value} value={value}>
                {value}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {statusChips.map((chip) => (
          <button
            key={chip.value}
            type="button"
            onClick={() => setStatus(chip.value)}
            className={cn(pill, status === chip.value && pillActive)}
          >
            {chip.value === "all" ? <CalendarDays className="h-4 w-4" /> : null}
            {chip.label}
          </button>
        ))}

        <Select value={type} onValueChange={setType}>
          <SelectTrigger aria-label="Type d'exposition" className={cn(pill, type !== "all" && pillActive)}>
            <SelectValue placeholder="Type">{type === "all" ? "Type" : type}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous types</SelectItem>
            {types.map((value) => (
              <SelectItem key={value} value={value}>
                {value}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={sort} onValueChange={setSort}>
          <SelectTrigger aria-label="Trier" className={cn(pill, sort !== "popularity" && pillActive)}>
            <SlidersHorizontal className="h-4 w-4" />
            <SelectValue placeholder="Trier">
              {sort === "popularity"
                ? "Trier"
                : sort === "price"
                  ? "Prix"
                  : sort === "end"
                    ? "Bientôt fini"
                    : "A → Z"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="popularity">Populaires</SelectItem>
            <SelectItem value="price">Prix croissant</SelectItem>
            <SelectItem value="end">Se termine bientôt</SelectItem>
            <SelectItem value="title">A → Z</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="mt-7">
        {isError ? (
          <ErrorState />
        ) : isLoading ? (
          <LoadingList count={4} />
        ) : results.length === 0 ? (
          <EmptyState
            title="Aucun résultat"
            description="Essayez un autre mot-clé ou élargissez vos filtres."
          />
        ) : (
          <>
            <SectionTitle>
              {results.length} exposition{results.length > 1 ? "s" : ""}
            </SectionTitle>
            <div className="divide-y">
              {results.map((exhibition) => (
                <div key={exhibition.id} className="py-4 first:pt-0">
                  <ExhibitionCard
                    exhibition={exhibition}
                    day={today}
                    variant="poster"
                    isFavorite={isFavorite(exhibition.id)}
                    onToggleFavorite={toggle}
                  />
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
