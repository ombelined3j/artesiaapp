import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2 } from "lucide-react";

import { AppShell, EmptyState, ErrorState, LoadingList } from "@/components/artesia/AppShell";
import { Button } from "@/components/ui/button";
import { fetchReservation, formatDateFr } from "@/lib/artesia";

export const Route = createFileRoute("/_authenticated/reservation/$reservationId")({
  head: () => ({
    meta: [
      { title: "Réservation confirmée — Artesia" },
      { name: "description", content: "Le récapitulatif de votre réservation d'exposition." },
      { property: "og:title", content: "Réservation confirmée — Artesia" },
      { property: "og:description", content: "Votre billet d'exposition est enregistré." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ReservationPage,
});

function ReservationPage() {
  const { reservationId } = Route.useParams();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["reservation", reservationId],
    queryFn: () => fetchReservation(reservationId),
  });

  return (
    <AppShell>
      {isError ? (
        <ErrorState />
      ) : isLoading ? (
        <LoadingList count={1} />
      ) : !data ? (
        <EmptyState title="Réservation introuvable" />
      ) : (
        <div>
          <div className="mb-6 text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-petrol" />
            <h1 className="mt-3 text-3xl">Réservation confirmée</h1>
            <p className="mt-1 text-muted-foreground">
              Votre visite est enregistrée. Retrouvez ce billet dans « Mes tickets ».
            </p>
          </div>

          <div className="rounded-3xl bg-card p-5">
            <h2 className="text-xl">{data.exhibitions?.title}</h2>
            <p className="text-muted-foreground">{data.exhibitions?.museums?.name}</p>
            <dl className="mt-4 grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-muted-foreground">Date</dt>
                <dd>{formatDateFr(data.date)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Heure</dt>
                <dd>{data.time_slot}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Visiteurs</dt>
                <dd>{data.number_of_visitors}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Type de billet</dt>
                <dd className="capitalize">{data.ticket_type}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Prix total</dt>
                <dd>
                  {Number(data.total_price) === 0
                    ? "Gratuit"
                    : `${Number(data.total_price).toFixed(2).replace(".", ",")} €`}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Référence</dt>
                <dd className="font-mono text-xs">{data.booking_reference}</dd>
              </div>
            </dl>
          </div>

          <div className="mt-6 flex flex-col gap-2">
            <Button asChild size="lg">
              <Link to="/tickets">Voir mes tickets</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link to="/upcoming">Retour à À venir</Link>
            </Button>
          </div>
        </div>
      )}
    </AppShell>
  );
}
