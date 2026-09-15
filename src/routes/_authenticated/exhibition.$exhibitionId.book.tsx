import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useMemo, useState } from "react";

import { AppShell, EmptyState, ErrorState, LoadingList } from "@/components/artesia/AppShell";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createReservation, fetchExhibition, formatDateFr, isoDate } from "@/lib/artesia";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/exhibition/$exhibitionId/book")({
  head: () => ({
    meta: [
      { title: "Réserver — Artesia" },
      {
        name: "description",
        content: "Choisissez votre date, votre créneau et votre billet pour visiter l'exposition.",
      },
      { property: "og:title", content: "Réserver — Artesia" },
      { property: "og:description", content: "Réservez votre visite en quelques taps." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: BookPage,
});

const TICKET_TYPES = [
  { value: "plein", label: "Plein tarif", factor: 1 },
  { value: "reduit", label: "Tarif réduit", factor: 0.6 },
  { value: "gratuit", label: "Gratuit (-18 ans)", factor: 0 },
];

const SLOTS = ["10:00", "11:30", "14:00", "15:30", "17:00"];

function BookPage() {
  const { exhibitionId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["exhibition", exhibitionId],
    queryFn: () => fetchExhibition(exhibitionId),
  });

  const [date, setDate] = useState<string | null>(null);
  const [slot, setSlot] = useState<string | null>(null);
  const [visitors, setVisitors] = useState(1);
  const [ticketType, setTicketType] = useState("plein");

  const availableDates = useMemo(() => {
    if (!data) return [];
    return Array.from({ length: 14 }, (_, index) => isoDate(index)).filter(
      (day) => day >= data.start_date && day <= data.end_date,
    );
  }, [data]);

  const factor = TICKET_TYPES.find((t) => t.value === ticketType)?.factor ?? 1;
  const unitPrice = data?.is_free ? 0 : Number(data?.price ?? 0) * factor;
  const total = unitPrice * visitors;

  const mutation = useMutation({
    mutationFn: async () => {
      if (!date || !slot) throw new Error("Choisissez une date et un créneau.");
      return createReservation({
        exhibition_id: exhibitionId,
        date,
        time_slot: slot,
        number_of_visitors: visitors,
        ticket_type: ticketType,
        total_price: Number(total.toFixed(2)),
      });
    },
    onSuccess: (reservationId) => {
      queryClient.invalidateQueries({ queryKey: ["reservations"] });
      navigate({ to: "/reservation/$reservationId", params: { reservationId } });
    },
  });

  return (
    <AppShell>
      <Button asChild variant="ghost" size="sm" className="mb-3 -ml-2">
        <Link to="/exhibition/$exhibitionId" params={{ exhibitionId }}>
          <ArrowLeft className="mr-1 h-4 w-4" /> Retour
        </Link>
      </Button>

      {isError ? (
        <ErrorState />
      ) : isLoading ? (
        <LoadingList count={1} />
      ) : !data ? (
        <EmptyState title="Exposition introuvable" />
      ) : !data.bookable ? (
        <EmptyState
          title="Réservation indisponible ici"
          description="Cette exposition se réserve sur la plateforme officielle du musée."
        />
      ) : (
        <div className="space-y-6">
          <header>
            <h1 className="text-2xl">Réserver</h1>
            <p className="text-muted-foreground">
              {data.title} · {data.museums?.name}
            </p>
          </header>

          <section>
            <h2 className="mb-2 text-sm font-semibold tracking-[0.14em] text-muted-foreground uppercase">
              Date
            </h2>
            {availableDates.length === 0 ? (
              <EmptyState
                title="Aucune date disponible"
                description="Les prochaines dates ne sont pas encore ouvertes à la réservation."
              />
            ) : (
              <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
                {availableDates.map((day) => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => setDate(day)}
                    className={cn(
                      "shrink-0 rounded-2xl border px-4 py-3 text-sm whitespace-nowrap",
                      date === day
                        ? "border-primary bg-primary text-primary-foreground"
                        : "bg-card",
                    )}
                  >
                    {formatDateFr(day)}
                  </button>
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="mb-2 text-sm font-semibold tracking-[0.14em] text-muted-foreground uppercase">
              Créneau
            </h2>
            <div className="flex flex-wrap gap-2">
              {SLOTS.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setSlot(value)}
                  className={cn(
                    "rounded-full border px-4 py-2 text-sm",
                    slot === value ? "border-primary bg-primary text-primary-foreground" : "bg-card",
                  )}
                >
                  {value}
                </button>
              ))}
            </div>
          </section>

          <section className="grid grid-cols-2 gap-3">
            <div>
              <h2 className="mb-2 text-sm font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                Visiteurs
              </h2>
              <Select value={String(visitors)} onValueChange={(v) => setVisitors(Number(v))}>
                <SelectTrigger aria-label="Nombre de visiteurs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 8 }, (_, index) => index + 1).map((count) => (
                    <SelectItem key={count} value={String(count)}>
                      {count}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <h2 className="mb-2 text-sm font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                Billet
              </h2>
              <Select value={ticketType} onValueChange={setTicketType}>
                <SelectTrigger aria-label="Type de billet">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TICKET_TYPES.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </section>

          <section className="rounded-2xl bg-card p-4">
            <h2 className="mb-3 text-lg">Récapitulatif</h2>
            <dl className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Date</dt>
                <dd>{date ? formatDateFr(date) : "—"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Créneau</dt>
                <dd>{slot ?? "—"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Visiteurs</dt>
                <dd>{visitors}</dd>
              </div>
              <div className="flex justify-between border-t pt-2 text-base font-medium">
                <dt>Total</dt>
                <dd>
                  {total === 0 ? "Gratuit" : `${total.toFixed(2).replace(".", ",")} €`}
                </dd>
              </div>
            </dl>
          </section>

          {mutation.isError ? (
            <p className="text-sm text-destructive">
              {(mutation.error as Error).message ||
                "La réservation n'a pas pu être enregistrée. Réessayez."}
            </p>
          ) : null}

          <Button
            size="lg"
            className="w-full"
            disabled={!date || !slot || mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? "Enregistrement…" : "Confirmer la réservation"}
          </Button>
        </div>
      )}
    </AppShell>
  );
}
