import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { User } from "lucide-react";

import { AppShell, ErrorState, LoadingList, SectionTitle } from "@/components/artesia/AppShell";
import { ExhibitionCard } from "@/components/artesia/ExhibitionCard";
import { supabase } from "@/integrations/supabase/client";
import { fetchAllExhibitions, fetchSignals, isoDate, recommend } from "@/lib/artesia";

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

  const userQuery = useQuery({
    queryKey: ["auth", "user"],
    queryFn: async () => (await supabase.auth.getUser()).data.user,
  });
  const exhibitionsQuery = useQuery({
    queryKey: ["exhibitions", "all"],
    queryFn: fetchAllExhibitions,
  });
  const signalsQuery = useQuery({ queryKey: ["signals"], queryFn: fetchSignals });

  const isLoading = exhibitionsQuery.isLoading || signalsQuery.isLoading;
  const signals = signalsQuery.data;
  const recommendations =
    exhibitionsQuery.data && signals
      ? recommend(exhibitionsQuery.data, signals, today).slice(0, 10)
      : [];
  const hasHistory =
    (signals?.viewedIds.length ?? 0) +
      (signals?.reservedIds.length ?? 0) >
    0;

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

      <SectionTitle>{hasHistory ? "Recommandé pour vous" : "Populaire à Paris"}</SectionTitle>
      {exhibitionsQuery.isError || signalsQuery.isError ? (
        <ErrorState />
      ) : isLoading ? (
        <LoadingList count={4} />
      ) : (
        <div className="space-y-3">
          {recommendations.map((exhibition) => (
            <ExhibitionCard
              key={exhibition.id}
              exhibition={exhibition}
              day={today}
            />
          ))}
        </div>
      )}
    </AppShell>
  );
}
