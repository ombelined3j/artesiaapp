import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { fr } from "date-fns/locale";
import { CalendarDays, MapPin, Palette, Tag, User } from "lucide-react";
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

type PriceMode = "all" | "free" | "max15" | "custom";

const INITIAL_COUNT = 3;

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
  const tomorrow = isoDate(1);

  const [district, setDistrict] = useState("all");
  const [date, setDate] = useState<string | null>(null);
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
  const priceCeiling = useMemo(
    () => Math.max(30, ...exhibitions.map((e) => Math.ceil(Number(e.price)))),
    [exhibitions],
  );

  const results = useMemo(() => {
    const day = date ?? today;
    const filtered = exhibitions.filter((exhibition) => {
      const matchesDay = date
        ? exhibition.start_date <= day && exhibition.end_date >= day
        : exhibition.end_date >= today;
      const matchesUnivers =
        universes.length === 0 ||
        (exhibition.exhibition_type && universes.includes(exhibition.exhibition_type));
      const price = Number(exhibition.price);
      const matchesPrice =
        priceMode === "all" ||
        (priceMode === "free" && (exhibition.is_free || price === 0)) ||
        (priceMode === "max15" && price <= 15) ||
        (priceMode === "custom" && price <= maxPrice);
      const matchesDistrict = district === "all" || exhibition.museums?.district === district;
      return matchesDay && matchesUnivers && matchesPrice && matchesDistrict;
    });

    return [...filtered].sort((a, b) => b.popularity - a.popularity);
  }, [exhibitions, date, universes, priceMode, maxPrice, district, today]);

  const openOn = (day: string) =>
    results.filter((e) => e.start_date <= day && e.end_date >= day);

  const todayList = date ? [] : openOn(today);
  const tomorrowList = date ? [] : openOn(tomorrow);
  const restList = date
    ? []
    : results.filter(
        (e) => !todayList.includes(e) && !tomorrowList.includes(e),
      );

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

  const jumpTo = (offsetWeeks: number) => {
    const monday = mondayOf(new Date());
    monday.setDate(monday.getDate() + offsetWeeks * 7);
    const target = offsetWeeks === 0 && monday < new Date() ? new Date() : monday;
    setDate(toIso(target));
    setAgendaOpen(false);
  };

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
        <Drawer open={agendaOpen} onOpenChange={setAgendaOpen}>
          <DrawerTrigger asChild>
            <button type="button" aria-label="Agenda" className={cn(pill, date && pillActive)}>
              <CalendarDays className="h-4 w-4" />
              {date ? formatDayShort(date) : "Agenda"}
            </button>
          </DrawerTrigger>
          <DrawerContent>
            <DrawerHeader className="text-left">
              <DrawerTitle>Aller à</DrawerTitle>
            </DrawerHeader>
            <div className="flex flex-wrap gap-2 px-4">
              <button type="button" className={chip} onClick={() => jumpTo(0)}>
                Cette semaine
              </button>
              <button type="button" className={chip} onClick={() => jumpTo(1)}>
                Semaine prochaine
              </button>
              {date ? (
                <button
                  type="button"
                  className={chip}
                  onClick={() => {
                    setDate(null);
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
                selected={date ? new Date(`${date}T12:00:00`) : undefined}
                disabled={{ before: new Date(`${today}T00:00:00`) }}
                onSelect={(value) => {
                  if (!value) return;
                  setDate(toIso(value));
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
        ) : date ? (
          <>
            <SectionTitle>
              {results.length} exposition{results.length > 1 ? "s" : ""}
            </SectionTitle>
            <div className="divide-y">
              {results.map((exhibition) => (
                <div key={exhibition.id} className="py-4 first:pt-0">
                  <ExhibitionCard exhibition={exhibition} day={date} variant="poster" />
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            <DaySection label="Aujourd'hui" day={today} exhibitions={todayList} />
            <DaySection label="Demain" day={tomorrow} exhibitions={tomorrowList} />
            {restList.length > 0 ? (
              <section className="mb-10">
                <SectionTitle>
                  Tout à venir · {restList.length} exposition{restList.length > 1 ? "s" : ""}
                </SectionTitle>
                <div className="divide-y">
                  {restList.map((exhibition) => (
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
