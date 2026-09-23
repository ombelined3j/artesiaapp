import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { fr } from "date-fns/locale";
import { Building2, CalendarDays, MapPin, Palette, Tag, User } from "lucide-react";
import { useMemo, useState } from "react";

import {
  AppShell,
  EmptyState,
  ErrorState,
  LoadingList,
  SectionTitle,
} from "@/components/artesia/AppShell";
import { ExhibitionCard } from "@/components/artesia/ExhibitionCard";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { fetchAllExhibitions, formatDayShort, isoDate, type Exhibition } from "@/lib/artesia";

export const Route = createFileRoute("/_authenticated/upcoming")({
  head: () => ({
    meta: [
      { title: "Explorer — Artesia" },
      {
        name: "description",
        content:
          "Toutes les expositions parisiennes du jour, de demain et à venir, filtrées par univers, date et prix.",
      },
      { property: "og:title", content: "Explorer — Artesia" },
      {
        property: "og:description",
        content: "Aujourd'hui, demain et à venir : trouvez et réservez vos expositions à Paris.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DiscoverPage,
});

type VenueKind = "musee" | "galerie" | "atelier";
const VENUE_LABELS: Record<VenueKind, string> = {
  musee: "Musée",
  galerie: "Galerie",
  atelier: "Atelier",
};

/** Type de lieu déduit du nom (aucune colonne dédiée en base). */
function venueKind(name: string | undefined | null): VenueKind {
  const n = (name ?? "").toLowerCase();
  if (n.includes("galerie") || n.includes("gallery")) return "galerie";
  if (n.includes("atelier") || n.includes("studio")) return "atelier";
  return "musee";
}

type PriceMode = "all" | "free" | "max15" | "custom";

/** Filtre de date actif : un jour précis (calendrier) ou une plage nommée (semaine). */
type DateFilter =
  { kind: "day"; value: string } | { kind: "range"; start: string; end: string; label: string };

const INITIAL_COUNT = 3;
/** Nombre de sections hebdomadaires affichées après "Ce week-end" avant le bloc "Plus tard". */
const MAX_WEEKS_AHEAD = 6;

/** Conversion Date -> chaîne ISO locale (aucun décalage de fuseau). */
function toIso(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;
}

/** Lundi de la semaine contenant la date donnée. */
function mondayOf(date: Date) {
  const d = new Date(date);
  const shift = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - shift);
  return d;
}

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

type Bucket = { key: string; label: string; day: string; exhibitions: Exhibition[] };

/**
 * Regroupe les expositions encore ouvertes en Aujourd'hui / Demain / Ce week-end,
 * puis en tranches hebdomadaires datées, sans doublon d'une section à l'autre.
 */
function bucketByWeek(
  exhibitions: Exhibition[],
  today: string,
): { buckets: Bucket[]; later: Exhibition[] } {
  const used = new Set<string>();
  const take = (predicate: (e: Exhibition) => boolean) => {
    const matched = exhibitions.filter((e) => !used.has(e.id) && predicate(e));
    matched.forEach((e) => used.add(e.id));
    return matched;
  };
  const openOnDay = (day: string) => (e: Exhibition) => e.start_date <= day && e.end_date >= day;
  const openInRange = (start: string, end: string) => (e: Exhibition) =>
    e.start_date <= end && e.end_date >= start;

  const tomorrow = isoDate(1);
  const buckets: Bucket[] = [
    { key: "today", label: "Aujourd'hui", day: today, exhibitions: take(openOnDay(today)) },
    { key: "tomorrow", label: "Demain", day: tomorrow, exhibitions: take(openOnDay(tomorrow)) },
  ];

  const monday = mondayOf(new Date(`${today}T12:00:00`));
  const saturday = toIso(addDays(monday, 5));
  const sunday = toIso(addDays(monday, 6));
  buckets.push({
    key: "weekend",
    label: "Ce week-end",
    day: saturday,
    exhibitions: take(openInRange(saturday, sunday)),
  });

  for (let week = 1; week <= MAX_WEEKS_AHEAD; week += 1) {
    const start = toIso(addDays(monday, week * 7));
    const end = toIso(addDays(monday, week * 7 + 6));
    buckets.push({
      key: `week-${week}`,
      label: `Semaine du ${formatDayShort(start)} au ${formatDayShort(end)}`,
      day: start,
      exhibitions: take(openInRange(start, end)),
    });
  }

  const later = exhibitions.filter((e) => !used.has(e.id));
  return { buckets, later };
}

function DaySection({
  label,
  day,
  exhibitions,
}: {
  label: string;
  day: string;
  exhibitions: Exhibition[];
}) {
  const [expanded, setExpanded] = useState(false);

  if (exhibitions.length === 0) return null;

  const visible = expanded ? exhibitions : exhibitions.slice(0, INITIAL_COUNT);
  const remaining = exhibitions.length - visible.length;

  return (
    <section className="mb-10">
      <SectionTitle>{label}</SectionTitle>
      <div className="divide-y">
        {visible.map((exhibition) => (
          <div key={exhibition.id} className="py-4 first:pt-0">
            <ExhibitionCard exhibition={exhibition} day={day} variant="poster" />
          </div>
        ))}
      </div>
      {remaining > 0 ? (
        <Button variant="outline" className="mt-4 w-full" onClick={() => setExpanded(true)}>
          Voir {remaining} de plus
        </Button>
      ) : null}
    </section>
  );
}

function DiscoverPage() {
  const today = isoDate(0);

  const [district, setDistrict] = useState("all");
  const [venue, setVenue] = useState<"all" | VenueKind>("all");
  const [dateFilter, setDateFilter] = useState<DateFilter | null>(null);
  const [universes, setUniverses] = useState<string[]>([]);
  const [priceMode, setPriceMode] = useState<PriceMode>("all");
  const [maxPrice, setMaxPrice] = useState(30);

  const [agendaOpen, setAgendaOpen] = useState(false);
  const [universOpen, setUniversOpen] = useState(false);
  const [priceOpen, setPriceOpen] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["exhibitions", "all"],
    queryFn: fetchAllExhibitions,
  });

  const exhibitions = data ?? [];
  const types = useMemo(
    () => [
      ...new Set(exhibitions.map((e) => e.exhibition_type).filter((v): v is string => Boolean(v))),
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
  const priceCeiling = useMemo(
    () => Math.max(30, ...exhibitions.map((e) => Math.ceil(Number(e.price)))),
    [exhibitions],
  );

  const results = useMemo(() => {
    const filtered = exhibitions.filter((exhibition) => {
      const matchesDay = !dateFilter
        ? exhibition.end_date >= today
        : dateFilter.kind === "day"
          ? exhibition.start_date <= dateFilter.value && exhibition.end_date >= dateFilter.value
          : exhibition.start_date <= dateFilter.end && exhibition.end_date >= dateFilter.start;
      const matchesUnivers =
        universes.length === 0 ||
        (exhibition.exhibition_type && universes.includes(exhibition.exhibition_type));
      const price = Number(exhibition.price);
      const matchesPrice =
        priceMode === "all" ||
        (priceMode === "free" && exhibition.is_free) ||
        (priceMode === "max15" && (exhibition.is_free || (price > 0 && price <= 15))) ||
        (priceMode === "custom" && (exhibition.is_free || (price > 0 && price <= maxPrice)));
      const matchesDistrict = district === "all" || exhibition.museums?.district === district;
      const matchesVenue = venue === "all" || venueKind(exhibition.museums?.name) === venue;
      return matchesDay && matchesUnivers && matchesPrice && matchesDistrict && matchesVenue;
    });

    return [...filtered].sort((a, b) => b.popularity - a.popularity);
  }, [exhibitions, dateFilter, universes, priceMode, maxPrice, district, venue, today]);

  const { buckets, later } = useMemo(() => bucketByWeek(results, today), [results, today]);

  const pill =
    "inline-flex h-10 w-auto shrink-0 items-center gap-1.5 rounded-full border bg-transparent px-4 text-sm whitespace-nowrap";
  const pillActive = "border-primary bg-primary text-primary-foreground";
  const chip = "rounded-full border px-4 py-2 text-sm transition-colors";
  const chipActive = "border-primary bg-primary text-primary-foreground";

  const priceLabelText =
    priceMode === "free"
      ? "Gratuit"
      : priceMode === "max15"
        ? "Max 15 €"
        : priceMode === "custom"
          ? `Max ${maxPrice} €`
          : "Prix";

  /** "Cette semaine" part de aujourd'hui ; "Semaine prochaine" couvre lundi -> dimanche suivant. */
  const jumpToWeek = (offsetWeeks: number, label: string) => {
    const monday = mondayOf(new Date());
    monday.setDate(monday.getDate() + offsetWeeks * 7);
    const start = offsetWeeks === 0 ? today : toIso(monday);
    const end = toIso(addDays(monday, 6));
    setDateFilter({ kind: "range", start, end, label });
    setAgendaOpen(false);
  };

  /** Samedi -> dimanche de la semaine courante (ou suivante), sans remonter avant aujourd'hui. */
  const jumpToWeekend = (offsetWeeks: number, label: string) => {
    const monday = addDays(mondayOf(new Date()), offsetWeeks * 7);
    const saturday = toIso(addDays(monday, 5));
    const start = saturday < today ? today : saturday;
    const end = toIso(addDays(monday, 6));
    setDateFilter({ kind: "range", start, end, label });
    setAgendaOpen(false);
  };

  const rangeChip = (label: string, onClick: () => void) => (
    <button
      key={label}
      type="button"
      className={cn(
        chip,
        dateFilter?.kind === "range" && dateFilter.label === label && chipActive,
      )}
      onClick={onClick}
    >
      {label}
    </button>
  );

  return (
    <AppShell>
      <header className="mb-4 flex items-center justify-between">
        <h1 className="text-3xl">Explorer</h1>
        <Button asChild variant="ghost" size="icon" aria-label="Mon profil">
          <Link to="/profile">
            <User className="h-5 w-5" />
          </Link>
        </Button>
      </header>

      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        <Select value={district} onValueChange={setDistrict}>
          <SelectTrigger
            aria-label="Quartier"
            className={cn(pill, district !== "all" && pillActive)}
          >
            <MapPin className="h-4 w-4" />
            <SelectValue placeholder="Paris">{district === "all" ? "Paris" : district}</SelectValue>
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

        <Drawer open={agendaOpen} onOpenChange={setAgendaOpen}>
          <DrawerTrigger asChild>
            <button
              type="button"
              aria-label="Agenda"
              className={cn(pill, dateFilter && pillActive)}
            >
              <CalendarDays className="h-4 w-4" />
              {!dateFilter
                ? "Agenda"
                : dateFilter.kind === "day"
                  ? formatDayShort(dateFilter.value)
                  : dateFilter.label}
            </button>
          </DrawerTrigger>
          <DrawerContent>
            <DrawerHeader className="text-left">
              <DrawerTitle>Aller à</DrawerTitle>
            </DrawerHeader>
            <div className="flex flex-wrap gap-2 px-4">
              {rangeChip("Ce week-end", () => jumpToWeekend(0, "Ce week-end"))}
              {rangeChip("Le week-end prochain", () => jumpToWeekend(1, "Le week-end prochain"))}
              {rangeChip("Cette semaine", () => jumpToWeek(0, "Cette semaine"))}
              {rangeChip("Semaine prochaine", () => jumpToWeek(1, "Semaine prochaine"))}
              {dateFilter ? (
                <button
                  type="button"
                  className={chip}
                  onClick={() => {
                    setDateFilter(null);
                    setAgendaOpen(false);
                  }}
                >
                  Effacer
                </button>
              ) : null}
            </div>
            <div className="flex justify-center px-2 pb-8">
              <Calendar
                mode="single"
                locale={fr}
                selected={
                  dateFilter?.kind === "day" ? new Date(`${dateFilter.value}T12:00:00`) : undefined
                }
                disabled={{ before: new Date(`${today}T00:00:00`) }}
                onSelect={(value) => {
                  if (!value) return;
                  setDateFilter({ kind: "day", value: toIso(value) });
                  setAgendaOpen(false);
                }}
                className="pointer-events-auto p-3"
              />
            </div>
          </DrawerContent>
        </Drawer>

        <Drawer open={universOpen} onOpenChange={setUniversOpen}>
          <DrawerTrigger asChild>
            <button
              type="button"
              aria-label="Univers"
              className={cn(pill, universes.length > 0 && pillActive)}
            >
              <Palette className="h-4 w-4" />
              {universes.length > 0 ? `Univers (${universes.length})` : "Univers"}
            </button>
          </DrawerTrigger>
          <DrawerContent>
            <DrawerHeader className="flex flex-row items-center justify-between text-left">
              <DrawerTitle>Filtrer par univers</DrawerTitle>
              <button
                type="button"
                className="text-sm text-muted-foreground underline"
                onClick={() => setUniverses([])}
              >
                Effacer
              </button>
            </DrawerHeader>
            <div className="flex flex-wrap gap-2 px-4">
              {types.map((value) => (
                <button
                  key={value}
                  type="button"
                  className={cn(chip, universes.includes(value) && chipActive)}
                  onClick={() =>
                    setUniverses((current) =>
                      current.includes(value)
                        ? current.filter((v) => v !== value)
                        : [...current, value],
                    )
                  }
                >
                  {value}
                </button>
              ))}
            </div>
            <div className="p-4 pb-8">
              <Button className="w-full" onClick={() => setUniversOpen(false)}>
                Voir {results.length} exposition{results.length > 1 ? "s" : ""}
              </Button>
            </div>
          </DrawerContent>
        </Drawer>

        <Drawer open={priceOpen} onOpenChange={setPriceOpen}>
          <DrawerTrigger asChild>
            <button
              type="button"
              aria-label="Prix"
              className={cn(pill, priceMode !== "all" && pillActive)}
            >
              <Tag className="h-4 w-4" />
              {priceLabelText}
            </button>
          </DrawerTrigger>
          <DrawerContent>
            <DrawerHeader className="flex flex-row items-center justify-between text-left">
              <DrawerTitle>Filtrer par prix</DrawerTitle>
              <button
                type="button"
                className="text-sm text-muted-foreground underline"
                onClick={() => setPriceMode("all")}
              >
                Effacer
              </button>
            </DrawerHeader>
            <div className="flex flex-wrap gap-2 px-4">
              <button
                type="button"
                className={cn(chip, priceMode === "free" && chipActive)}
                onClick={() => setPriceMode("free")}
              >
                Gratuit
              </button>
              <button
                type="button"
                className={cn(chip, priceMode === "max15" && chipActive)}
                onClick={() => setPriceMode("max15")}
              >
                Max 15 €
              </button>
              <button
                type="button"
                className={cn(chip, priceMode === "custom" && chipActive)}
                onClick={() => setPriceMode("custom")}
              >
                Personnalisé
              </button>
            </div>
            {priceMode === "custom" ? (
              <div className="px-4 pt-6">
                <p className="mb-3 text-sm text-muted-foreground">Jusqu'à {maxPrice} €</p>
                <Slider
                  value={[maxPrice]}
                  min={0}
                  max={priceCeiling}
                  step={1}
                  onValueChange={([value]) => setMaxPrice(value ?? 0)}
                />
              </div>
            ) : null}
            <div className="p-4 pb-8">
              <Button className="w-full" onClick={() => setPriceOpen(false)}>
                Voir {results.length} exposition{results.length > 1 ? "s" : ""}
              </Button>
            </div>
          </DrawerContent>
        </Drawer>


        <Select value={venue} onValueChange={(v) => setVenue(v as "all" | VenueKind)}>
          <SelectTrigger aria-label="Lieux" className={cn(pill, venue !== "all" && pillActive)}>
            <Building2 className="h-4 w-4" />
            <SelectValue placeholder="Lieux">
              {venue === "all" ? "Lieux" : VENUE_LABELS[venue]}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les lieux</SelectItem>
            <SelectItem value="musee">Musée</SelectItem>
            <SelectItem value="galerie">Galerie</SelectItem>
            <SelectItem value="atelier">Atelier</SelectItem>
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
            description="Essayez une autre date ou élargissez vos filtres."
          />
        ) : dateFilter ? (
          <>
            <SectionTitle>
              {results.length} exposition{results.length > 1 ? "s" : ""}
            </SectionTitle>
            <div className="divide-y">
              {results.map((exhibition) => (
                <div key={exhibition.id} className="py-4 first:pt-0">
                  <ExhibitionCard
                    exhibition={exhibition}
                    day={dateFilter.kind === "day" ? dateFilter.value : dateFilter.start}
                    variant="poster"
                  />
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            {buckets.map((bucket) => (
              <DaySection
                key={bucket.key}
                label={bucket.label}
                day={bucket.day}
                exhibitions={bucket.exhibitions}
              />
            ))}
            {later.length > 0 ? (
              <section className="mb-10">
                <SectionTitle>
                  Plus tard · {later.length} exposition{later.length > 1 ? "s" : ""}
                </SectionTitle>
                <div className="divide-y">
                  {later.map((exhibition) => (
                    <div key={exhibition.id} className="py-4 first:pt-0">
                      <ExhibitionCard
                        exhibition={exhibition}
                        day={exhibition.start_date}
                        variant="poster"
                      />
                    </div>
                  ))}
                </div>
              </section>
            ) : null}
          </>
        )}
      </div>
    </AppShell>
  );
}
