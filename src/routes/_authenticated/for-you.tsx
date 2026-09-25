import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Eye, User } from "lucide-react";
import { useMemo } from "react";

import { AppShell, ErrorState, LoadingList, SectionTitle } from "@/components/artesia/AppShell";
import { ExhibitionCard } from "@/components/artesia/ExhibitionCard";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchAllExhibitions,
  fetchMostViewedExhibition,
  fetchSignals,
  isoDate,
  recommend,
} from "@/lib/artesia";
import { isExhibitionFreeThisMonth, nextMonthReference } from "@/lib/free-museums";

export const Route = createFileRoute("/_authenticated/for-you")({
  head: () => ({
    meta: [
      { title: "Pour vous — Artesia" },
      {
        name: "description",
        content: "Des expositions parisiennes recommandées selon vos visites.",
      },
      { property: "og:title", content: "Pour vous — Artesia" },
      {
        property: "og:description",
        content: "Vos recommandations d'expositions à Paris, affinées au fil de vos visites.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ForYouPage,
});

function ForYouPage() {
  const today = isoDate(0);
  const referenceMonth = useMemo(() => nextMonthReference(), []);
  const referenceMonthLabel = useMemo(() => {
    const label = referenceMonth.toLocaleDateString("fr-FR", { month: "long" });
    return label.charAt(0).toUpperCase() + label.slice(1);
  }, [referenceMonth]);

  const userQuery = useQuery({
    queryKey: ["auth", "user"],
    queryFn: async () => (await supabase.auth.getUser()).data.user,
  });
  const exhibitionsQuery = useQuery({
    queryKey: ["exhibitions", "all"],
    queryFn: fetchAllExhibitions,
  });
  const signalsQuery = useQuery({ queryKey: ["signals"], queryFn: fetchSignals });
  const mostViewedQuery = useQuery({
    queryKey: ["exhibitions", "most-viewed"],
    queryFn: fetchMostViewedExhibition,
  });

  const isLoading = exhibitionsQuery.isLoading || signalsQuery.isLoading;
  const signals = signalsQuery.data;
  const exhibitions = exhibitionsQuery.data;
  const recommendations =
    exhibitions && signals ? recommend(exhibitions, signals, today).slice(0, 10) : [];
  const hasHistory = (signals?.viewedIds.length ?? 0) + (signals?.reservedIds.length ?? 0) > 0;

  const freeThisMonth = useMemo(() => {
    if (!exhibitions) return [];
    return exhibitions
      .map((exhibition) => ({
        exhibition,
        info: isExhibitionFreeThisMonth(exhibition, referenceMonth),
      }))
      .filter(
        (
          row,
        ): row is {
          exhibition: (typeof exhibitions)[number];
          info: NonNullable<typeof row.info>;
        } => Boolean(row.info),
      );
  }, [exhibitions, referenceMonth]);

  const firstName = userQuery.data?.email?.split("@")[0];

  return (
    <AppShell>
      <header className="mb-6">
        <div className="mb-2 flex items-center justify-end">
          <Link to="/profile" aria-label="Mon profil" className="rounded-full border p-2">
            <User className="h-5 w-5" />
          </Link>
        </div>
        <h1 className="text-3xl">Bonjour{firstName ? ` ${firstName}` : ""}</h1>
        <p className="mt-1 text-muted-foreground">
          {hasHistory
            ? "Une sélection affinée d'après vos visites et vos réservations."
            : "Pour commencer, voici une sélection d'expositions parisiennes incontournables."}
        </p>
      </header>

      {mostViewedQuery.data ? (
        <section className="mb-8">
          <SectionTitle>
            <span className="inline-flex items-center gap-1.5">
              <Eye className="h-4 w-4" /> L'exposition la plus vue
            </span>
          </SectionTitle>
          <ExhibitionCard exhibition={mostViewedQuery.data} day={today} />
        </section>
      ) : null}

      {freeThisMonth.length > 0 ? (
        <section className="mb-8">
          <SectionTitle>Musées gratuits en {referenceMonthLabel}</SectionTitle>
          <div className="space-y-3">
            {freeThisMonth.map(({ exhibition, info }) => (
              <ExhibitionCard
                key={exhibition.id}
                exhibition={exhibition}
                day={today}
                note={info.reason}
              />
            ))}
          </div>
        </section>
      ) : null}

      <SectionTitle>{hasHistory ? "Recommandé pour vous" : "Populaire à Paris"}</SectionTitle>
      {exhibitionsQuery.isError || signalsQuery.isError ? (
        <ErrorState />
      ) : isLoading ? (
        <LoadingList count={4} />
      ) : (
        <div className="space-y-3">
          {recommendations.map((exhibition) => (
            <ExhibitionCard key={exhibition.id} exhibition={exhibition} day={today} />
          ))}
        </div>
      )}
    </AppShell>
  );
}
