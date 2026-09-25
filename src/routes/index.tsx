import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarDays, MapPin, Sparkles, Ticket } from "lucide-react";

import heroImage from "@/assets/hero-artesia.webp";
import { Logo } from "@/components/artesia/Logo";
import { Button } from "@/components/ui/button";
import { dateRangeLabel, fetchExhibitionsForDay, isoDate, priceLabel } from "@/lib/artesia";
import { exhibitionImage } from "@/lib/museum-images";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Artesy — Les expositions de Paris, aujourd'hui et demain" },
      {
        name: "description",
        content:
          "Découvrez en un coup d'œil les expositions parisiennes du jour et du lendemain, recevez des recommandations et réservez votre visite.",
      },
      { property: "og:title", content: "Artesy — Les expositions de Paris" },
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

function Landing() {
  const today = isoDate(0);
  const { data: openExhibitions } = useQuery({
    queryKey: ["exhibitions", "landing-popular"],
    queryFn: () => fetchExhibitionsForDay(today),
  });
  const popular = (openExhibitions ?? []).slice(0, 3);

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
              Découvrez et réservez les meilleurs expos.&nbsp;
            </h1>
            <p className="mt-5 text-lg text-muted-foreground">
              Téléchargez Artesy et trouvez les meilleurs expos, vernissages et galeries autour de
              vous.&nbsp;
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

        <section className="grid gap-4 pb-16 sm:grid-cols-2">
          {[
            {
              icon: CalendarDays,
              title: "Les évènements artistiques du moment à ne pas rater",
              text: "Découvrez les meilleurs expos des musées et galeries autour de vous.",
            },
            {
              icon: Ticket,
              title: "Réservation simplfiée",
              text: "Réservez votre billet en quelques secondes et planifiez vos sorties sans faire la queue. ",
            },
          ].map(({ icon: Icon, title, text }) => (
            <div key={title} className="rounded-2xl bg-card p-5">
              <Icon className="h-5 w-5 text-primary" />
              <h3 className="mt-3 text-lg">{title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{text}</p>
            </div>
          ))}
        </section>

        {popular.length > 0 ? (
          <section className="pb-16">
            <h2 className="mb-5 text-2xl leading-tight md:text-3xl">
              Les expositions populaires du moment à Paris
            </h2>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {popular.map((exhibition) => {
                const image = exhibitionImage(exhibition);
                const isFree = Boolean(exhibition.is_free);
                return (
                  <Link
                    key={exhibition.id}
                    to="/exhibition/$exhibitionId"
                    params={{ exhibitionId: exhibition.id }}
                    className="group overflow-hidden rounded-2xl bg-card transition-shadow hover:shadow-[0_8px_24px_-16px_var(--ink)]"
                  >
                    <div className="aspect-[4/3] w-full overflow-hidden bg-muted">
                      {image ? (
                        <img
                          src={image}
                          alt={exhibition.title}
                          loading="lazy"
                          className="h-full w-full object-cover transition-transform group-hover:scale-[1.03]"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-secondary to-muted px-4 text-center text-sm font-medium text-muted-foreground">
                          {exhibition.museums?.name ?? exhibition.title}
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="line-clamp-2 font-semibold">{exhibition.title}</h3>
                      {exhibition.museums?.name ? (
                        <p className="mt-1 flex items-center gap-1 truncate text-sm text-muted-foreground">
                          <MapPin className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{exhibition.museums.name}</span>
                        </p>
                      ) : null}
                      <p className="mt-2 truncate text-sm">
                        <span className="font-medium text-primary">
                          {dateRangeLabel(exhibition, today)}
                        </span>
                        {isFree ? null : (
                          <span className="text-muted-foreground"> · {priceLabel(exhibition)}</span>
                        )}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {isFree ? (
                          <span className="inline-flex h-6 items-center justify-center rounded-full bg-badge-free px-3 text-center text-xs font-semibold leading-none text-badge-foreground">
                            Gratuit
                          </span>
                        ) : null}
                        {exhibition.exhibition_type ? (
                          <span className="rounded-full border px-3 py-1 text-xs text-muted-foreground">
                            {exhibition.exhibition_type}
                          </span>
                        ) : null}
                        {exhibition.mood ? (
                          <span className="rounded-full border px-3 py-1 text-xs text-muted-foreground">
                            {exhibition.mood}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        ) : null}

        <section className="pb-16">
          <div className="mx-auto max-w-xl rounded-2xl bg-card p-6 text-center">
            <Sparkles className="mx-auto h-5 w-5 text-primary" />
            <h3 className="mt-3 text-lg">
              Vous êtes artiste ? Trouvez votre public et vos clients.
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Développez votre communauté et trouvez vos prochains clients.
            </p>
            <Button asChild size="lg" className="mt-5">
              <a href="/publier-evenement">Publier mon évènement</a>
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t px-5 py-6 text-center text-sm text-muted-foreground">
        Artesy · Les meilleurs rendez-vous artistiques
      </footer>
    </div>
  );
}
