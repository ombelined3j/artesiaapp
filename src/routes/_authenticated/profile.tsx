import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Clock, Loader2, Palette, RefreshCw, Search } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/artesia/AppShell";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { syncMuseumOpeningHours } from "@/lib/google-places.functions";
import { syncParisExhibitions } from "@/lib/paris-sync.functions";
import { syncParisMuseesArtworks } from "@/lib/parismusees.functions";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Mon profil — Artesy" },
      { name: "description", content: "Votre compte Artesy et vos préférences." },
      { property: "og:title", content: "Mon profil — Artesy" },
      { property: "og:description", content: "Gérez votre compte Artesy." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: user } = useQuery({
    queryKey: ["auth", "user"],
    queryFn: async () => (await supabase.auth.getUser()).data.user,
  });

  const runSync = useServerFn(syncParisExhibitions);
  const sync = useMutation({
    mutationFn: () => runSync(),
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: ["exhibitions"] });
      toast.success(`${result.imported} expositions à jour dans ${result.venues} lieux.`);
    },
    onError: () => toast.error("L'agenda de Paris n'a pas répondu. Réessayez plus tard."),
  });

  const runArtworksSync = useServerFn(syncParisMuseesArtworks);
  const artworksSync = useMutation({
    mutationFn: () => runArtworksSync(),
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: ["artworks"] });
      const detail =
        result.failures.length > 0
          ? ` (${result.failures.length} musée${result.failures.length > 1 ? "s" : ""} indisponible${result.failures.length > 1 ? "s" : ""})`
          : "";
      toast.success(
        `${result.imported} œuvres à jour pour ${result.matchedMuseums} musées, ${result.universes} univers.${detail}`,
      );
    },
    onError: (error) =>
      toast.error(
        error instanceof Error ? error.message : "La synchronisation Paris Musées a échoué.",
      ),
  });

  const runHoursSync = useServerFn(syncMuseumOpeningHours);
  const hoursSync = useMutation({
    mutationFn: () => runHoursSync(),
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: ["exhibitions"] });
      void queryClient.invalidateQueries({ queryKey: ["museums"] });
      const detail = result.failures.length > 0 ? ` (${result.failures.length} en échec)` : "";
      toast.success(
        `${result.updated}/${result.total} lieux à jour${detail}, ${result.notFound} introuvables.`,
      );
    },
    onError: (error) =>
      toast.error(
        error instanceof Error ? error.message : "La synchronisation Google Places a échoué.",
      ),
  });

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/login", replace: true });
  }

  return (
    <AppShell>
      <h1 className="mb-2 text-3xl">Mon profil</h1>
      <p className="mb-6 text-muted-foreground">{user?.email}</p>

      <div className="space-y-2">
        <Link
          to="/upcoming"
          className="flex items-center gap-3 rounded-2xl bg-card p-4 font-medium"
        >
          <Search className="h-5 w-5 text-primary" /> Explorer les expositions
        </Link>
        <button
          type="button"
          onClick={() => sync.mutate()}
          disabled={sync.isPending}
          className="flex w-full items-center gap-3 rounded-2xl bg-card p-4 text-left font-medium disabled:opacity-70"
        >
          {sync.isPending ? (
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          ) : (
            <RefreshCw className="h-5 w-5 text-primary" />
          )}
          {sync.isPending ? "Mise à jour en cours…" : "Actualiser les expositions de Paris"}
        </button>
        <button
          type="button"
          onClick={() => artworksSync.mutate()}
          disabled={artworksSync.isPending}
          className="flex w-full items-center gap-3 rounded-2xl bg-card p-4 text-left font-medium disabled:opacity-70"
        >
          {artworksSync.isPending ? (
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          ) : (
            <Palette className="h-5 w-5 text-primary" />
          )}
          {artworksSync.isPending ? "Mise à jour en cours…" : "Actualiser les œuvres Paris Musées"}
        </button>
        <button
          type="button"
          onClick={() => hoursSync.mutate()}
          disabled={hoursSync.isPending}
          className="flex w-full items-center gap-3 rounded-2xl bg-card p-4 text-left font-medium disabled:opacity-70"
        >
          {hoursSync.isPending ? (
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          ) : (
            <Clock className="h-5 w-5 text-primary" />
          )}
          {hoursSync.isPending
            ? "Mise à jour en cours…"
            : "Actualiser les horaires (Google Places)"}
        </button>
      </div>

      <Button variant="outline" className="mt-8 w-full" onClick={handleSignOut}>
        Se déconnecter
      </Button>
    </AppShell>
  );
}
