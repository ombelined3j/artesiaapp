import { ExternalLink } from "lucide-react";

import type { Museum } from "@/lib/artesia";

type Props = { museum: Museum };

export function MuseumMap({ museum }: Props) {
  const key = import.meta.env['VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY'] as
    | string
    | undefined;
  const { latitude, longitude } = museum;

  if (!key || latitude == null || longitude == null) return null;

  const center = `${latitude},${longitude}`;
  const embedUrl = `https://www.google.com/maps/embed/v1/view?key=${key}&center=${center}&zoom=15`;
  const directionsUrl = `https://www.google.com/maps/search/?api=1&query=${center}`;

  return (
    <div>
      <div className="overflow-hidden rounded-2xl bg-muted">
        <iframe
          src={embedUrl}
          title={`Plan — ${museum.name}`}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          allowFullScreen
          className="aspect-[16/10] w-full border-0"
        />
      </div>
      <a
        href={directionsUrl}
        target="_blank"
        rel="noreferrer"
        className="mt-2 inline-flex items-center gap-1.5 text-sm text-primary underline"
      >
        Itinéraire
        <ExternalLink className="h-3.5 w-3.5" />
      </a>
    </div>
  );
}
