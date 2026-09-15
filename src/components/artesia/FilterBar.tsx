import { Calendar, MapPin } from "lucide-react";

import { cn } from "@/lib/utils";

export type Filters = {
  type: string | null;
  mood: string | null;
  freeOnly: boolean;
};

type Props = {
  types: string[];
  moods: string[];
  filters: Filters;
  onChange: (filters: Filters) => void;
};

function Chip({
  active,
  children,
  onClick,
}: {
  active?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex shrink-0 items-center gap-1.5 rounded-full border px-4 py-2 text-sm whitespace-nowrap transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "bg-card text-foreground hover:border-primary/50",
      )}
    >
      {children}
    </button>
  );
}

export function FilterBar({ types, moods, filters, onChange }: Props) {
  return (
    <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
      <Chip>
        <MapPin className="h-4 w-4" /> Paris
      </Chip>
      <Chip>
        <Calendar className="h-4 w-4" /> Aujourd'hui / Demain
      </Chip>
      <Chip
        active={filters.freeOnly}
        onClick={() => onChange({ ...filters, freeOnly: !filters.freeOnly })}
      >
        Gratuit
      </Chip>
      {types.map((type) => (
        <Chip
          key={type}
          active={filters.type === type}
          onClick={() => onChange({ ...filters, type: filters.type === type ? null : type })}
        >
          {type}
        </Chip>
      ))}
      {moods.map((mood) => (
        <Chip
          key={mood}
          active={filters.mood === mood}
          onClick={() => onChange({ ...filters, mood: filters.mood === mood ? null : mood })}
        >
          {mood}
        </Chip>
      ))}
    </div>
  );
}
