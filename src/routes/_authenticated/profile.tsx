import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Search } from "lucide-react";

import { AppShell } from "@/components/artesia/AppShell";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Mon profil — Artesia" },
      { name: "description", content: "Votre compte Artesia et vos préférences." },
      { property: "og:title", content: "Mon profil — Artesia" },
      { property: "og:description", content: "Gérez votre compte Artesia." },
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
        <Link to="/upcoming" className="flex items-center gap-3 rounded-2xl bg-card p-4 font-medium">
          <Search className="h-5 w-5 text-primary" /> Explorer les expositions
        </Link>
      </div>

      <Button variant="outline" className="mt-8 w-full" onClick={handleSignOut}>
        Se déconnecter
      </Button>
    </AppShell>
  );
}
