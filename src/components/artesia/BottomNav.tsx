import { Link } from "@tanstack/react-router";
import { CalendarDays, Sparkles, Ticket } from "lucide-react";

const items = [
  { to: "/upcoming", label: "À venir", icon: CalendarDays },
  { to: "/for-you", label: "Pour vous", icon: Sparkles },
  { to: "/tickets", label: "Tickets", icon: Ticket },
] as const;

export function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 backdrop-blur">
      <div className="mx-auto flex max-w-2xl items-stretch justify-between px-2 py-2">
        {items.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            activeProps={{ className: "text-primary" }}
            inactiveProps={{ className: "text-muted-foreground" }}
            className="flex flex-1 flex-col items-center gap-1 rounded-xl px-2 py-1.5 text-xs font-medium transition-colors"
          >
            <Icon className="h-5 w-5" />
            {label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
