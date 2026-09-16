import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarDays, Heart, Sparkles, Ticket } from "lucide-react";

import heroAsset from "@/assets/hero-artesia.webp.asset.json";
import { Logo } from "@/components/artesia/Logo";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Artesia — Les expositions de Paris, aujourd'hui et demain" },
      {
        name: "description",
        content:
          "Découvrez en un coup d'œil les expositions parisiennes du jour et du lendemain, recevez des recommandations et réservez votre visite.",
      },
      { property: "og:title", content: "Artesia — Les expositions de Paris" },
      {
        property: "og:description",
        content:
          "Un fil chronologique des expositions parisiennes : aujourd'hui, demain, et la réservation en quelques taps.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const heroImage = heroAsset.url;

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-5 py-5">
        <Logo />
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost">
            <Link to="/login">Se connecter</Link>
          </Button>
          <Button asChild>
            <Link to="/signup">Créer un compte</Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5">
        <section className="grid items-center gap-10 py-10 md:grid-cols-2 md:py-16">
          <div>
            <h1 className="mt-4 text-4xl leading-tight md:text-5xl">
              Trouver et réserver les meilleures expositions.
            </h1>
            <p className="mt-5 text-lg text-muted-foreground">
              Expos, vernissages, galeries... découvrez les meilleurs arts
              visuels et réservez vos visites à l'avance en un clic.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link to="/signup">Créer un compte</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/login">Se connecter</Link>
              </Button>
            </div>
          </div>
          <div className="overflow-hidden rounded-3xl bg-muted">
            <img
              src={heroImage}
              alt="Sculpture florale rose monumentale sous la coupole d'un musée parisien"
              className="h-[380px] w-full object-cover object-center md:h-[460px]"
            />
          </div>
        </section>

        <section className="grid gap-4 pb-16 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              icon: CalendarDays,
              title: "Aujourd'hui / Demain",
              text: "Un fil chronologique, avec les horaires, les prix et les derniers jours.",
            },
            {
              icon: Sparkles,
              title: "Pour vous",
              text: "Une sélection des meilleures expositions pour vous. Réservation en un clic.",
            },
            {
              icon: Heart,
              title: "Favoris en un tap",
              text: "Gardez une exposition de côté depuis n'importe quelle carte.",
            },
            {
              icon: Ticket,
              title: "Réservation directe",
              text: "Date, créneau, visiteurs : votre billet en quelques secondes.",
            },
          ].map(({ icon: Icon, title, text }) => (
            <div key={title} className="rounded-2xl bg-card p-5">
              <Icon className="h-5 w-5 text-primary" />
              <h3 className="mt-3 text-lg">{title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{text}</p>
            </div>
          ))}
        </section>
      </main>

      <footer className="border-t px-5 py-6 text-center text-sm text-muted-foreground">
        Artesia · Les expositions de Paris
      </footer>
    </div>
  );
}
