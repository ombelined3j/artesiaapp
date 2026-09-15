import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";

import {
  AppShell,
  EmptyState,
  ErrorState,
  LoadingList,
  SectionTitle,
} from "@/components/artesia/AppShell";
import { Button } from "@/components/ui/button";
import { fetchReservations, formatDateFr, isoDate, type Reservation } from "@/lib/artesia";

export const Route = createFileRoute("/_authenticated/tickets")({
  head: () => ({
    meta: [
      { title: "Mes tickets — Artesia" },
      {
        name: "description",
        content: "Retrouvez vos réservations d'expositions à venir et passées sur Artesia.",
      },
      { property: "og:title", content: "Mes tickets — Artesia" },
      { property: "og:description", content: "Vos billets d'exposition, à venir et passés." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TicketsPage,
});

function TicketCard({ reservation }: { reservation: Reservation }) {
  return (
    <Link
      to="/reservation/$reservationId"
      params={{ reservationId: reservation.id }}
      className="block rounded-2xl bg-card p-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-base font-medium">
            {reservation.exhibitions?.title ?? "Exposition"}
          </h3>
          <p className="text-sm text-muted-foreground">
            {reservation.exhibitions?.museums?.name}
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-petrol px-2.5 py-1 text-xs font-medium text-petrol-foreground">
          {reservation.status === "confirmed" ? "Confirmé" : reservation.status}
        </span>
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
        <div>
          <dt className="text-muted-foreground">Date</dt>
          <dd>{formatDateFr(reservation.date)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Heure</dt>
          <dd>{reservation.time_slot}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Visiteurs</dt>
          <dd>{reservation.number_of_visitors}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Billet</dt>
          <dd className="capitalize">{reservation.ticket_type}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Prix</dt>
          <dd>{Number(reservation.total_price).toFixed(2).replace(".", ",")} €</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Référence</dt>
          <dd className="font-mono text-xs">{reservation.booking_reference}</dd>
        </div>
      </dl>
    </Link>
  );
}

function TicketsPage() {
  const today = isoDate(0);
  const { data, isLoading, isError } = useQuery({
    queryKey: ["reservations"],
    queryFn: fetchReservations,
  });

  const upcoming = (data ?? []).filter((r) => r.date >= today);
  const past = (data ?? []).filter((r) => r.date < today);

  return (
    <AppShell>
      <h1 className="mb-6 text-3xl">Mes tickets</h1>
      {isError ? (
        <ErrorState />
      ) : isLoading ? (
        <LoadingList count={2} />
      ) : (data ?? []).length === 0 ? (
        <EmptyState
          title="Aucune réservation pour le moment"
          description="Réservez une exposition depuis le fil À venir, votre billet apparaîtra ici."
        />
      ) : (
        <>
          <section className="mb-10">
            <SectionTitle>À venir</SectionTitle>
            {upcoming.length === 0 ? (
              <EmptyState title="Pas de visite prévue" />
            ) : (
              <div className="space-y-3">
                {upcoming.map((reservation) => (
                  <TicketCard key={reservation.id} reservation={reservation} />
                ))}
              </div>
            )}
          </section>
          {past.length > 0 ? (
            <section className="mb-10">
              <SectionTitle>Passés</SectionTitle>
              <div className="space-y-3 opacity-70">
                {past.map((reservation) => (
                  <TicketCard key={reservation.id} reservation={reservation} />
                ))}
              </div>
            </section>
          ) : null}
        </>
      )}
      <Button asChild variant="outline" className="w-full">
        <Link to="/upcoming">Découvrir d'autres expositions</Link>
      </Button>
    </AppShell>
  );
}
