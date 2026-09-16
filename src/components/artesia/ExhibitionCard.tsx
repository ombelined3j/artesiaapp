import { Link } from "@tanstack/react-router";
import { Heart, MapPin } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  dateRangeLabel,
  formatTime,
  priceLabel,
  statusLabel,
  type Exhibition,
} from "@/lib/artesia";

type Props = {
  exhibition: Exhibition;
  day?: string;
  isFavorite: boolean;
  onToggleFavorite: (id: string) => void;
  /** "poster" affiche une grande affiche verticale, sans fond de carte. */
  variant?: "default" | "poster";
};

export function ExhibitionCard({
  exhibition,
  day,
  isFavorite,
  onToggleFavorite,
  variant = "default",
}: Props) {
  const status = day ? statusLabel(exhibition, day) : null;
  const hours = formatTime(exhibition.opening_time);
  const closing = formatTime(exhibition.closing_time);
  const dates = day ? dateRangeLabel(exhibition, day) : null;
  const poster = variant === "poster";
  const isFree = Boolean(exhibition.is_free);

  return (
    <div
      className={cn(
        "group relative flex gap-4",
        poster
          ? "items-start py-1"
          : "rounded-2xl bg-card p-3 transition-shadow hover:shadow-[0_8px_24px_-16px_var(--ink)]",
      )}
    >
      <Link
        to="/exhibition/$exhibitionId"
        params={{ exhibitionId: exhibition.id }}
        className="flex min-w-0 flex-1 gap-4"
      >
        <div
          className={cn(
            "shrink-0 overflow-hidden rounded-xl bg-muted",
            poster ? "aspect-[3/4] w-28" : "h-24 w-24 sm:h-28 sm:w-28",
          )}
        >
          {exhibition.image_url ? (
            <img
              src={exhibition.image_url}
              alt={exhibition.title}
              loading="lazy"
              className="h-full w-full object-cover"
            />
          ) : null}
        </div>
        <div className={cn("min-w-0 flex-1", poster && "pt-1")}>
          <h3
            className={cn(
              "truncate",
              poster ? "text-lg font-semibold" : "text-base font-medium",
            )}
          >
            {exhibition.title}
          </h3>
          {poster ? (
            <>
              <p className="mt-1.5 truncate text-sm text-muted-foreground">
                {dates ? <span className="font-medium text-primary">{dates}</span> : null}
                {dates && !isFree ? " · " : ""}
                {isFree ? null : priceLabel(exhibition)}
              </p>
              {exhibition.museums?.name ? (
                <p className="mt-1 flex min-w-0 items-center gap-1 text-sm text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{exhibition.museums.name}</span>
                </p>
              ) : null}
            </>
          ) : (
            <>
              <p className="mt-1 flex items-center gap-1 truncate text-sm text-muted-foreground">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                {exhibition.museums?.name}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {hours ? (
                  <span className="text-foreground">
                    {hours}
                    {closing ? ` – ${closing}` : ""}
                  </span>
                ) : null}
                {hours && !isFree ? " · " : ""}
                {isFree ? null : priceLabel(exhibition)}
              </p>
            </>
          )}
          <div className={cn("flex flex-wrap gap-1.5", poster ? "mt-2.5" : "mt-2")}>
            {isFree ? (
              <span className="inline-flex h-6 items-center justify-center rounded-full bg-badge-free px-3 text-center text-xs font-semibold leading-none text-badge-foreground">
                Gratuit
              </span>
            ) : null}
            {status ? (
              <span
                className={cn(
                  "inline-flex h-6 items-center justify-center rounded-full px-3 text-center text-xs font-semibold leading-none text-badge-foreground",
                  status === "Dernier jour" ? "bg-badge-last" : "bg-badge-new",
                )}
              >
                {status}
              </span>
            ) : null}
            {exhibition.exhibition_type ? (
              <span
                className={cn(
                  "rounded-full border text-xs text-muted-foreground",
                  poster ? "px-3 py-1" : "px-2 py-0.5",
                )}
              >
                {exhibition.exhibition_type}
              </span>
            ) : null}
            {exhibition.mood ? (
              <span
                className={cn(
                  "rounded-full border text-xs text-muted-foreground",
                  poster ? "px-3 py-1" : "px-2 py-0.5",
                )}
              >
                {exhibition.mood}
              </span>
            ) : null}
          </div>
        </div>
      </Link>
      <button
        type="button"
        aria-label={isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
        onClick={() => onToggleFavorite(exhibition.id)}
        className="self-start rounded-full p-2 text-muted-foreground transition-colors hover:text-primary"
      >
        <Heart className={cn("h-5 w-5", isFavorite && "fill-primary text-primary")} />
      </button>
    </div>
  );
}
