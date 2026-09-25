import { formatDateFr, type Exhibition, type Museum } from "@/lib/artesia";

/**
 * Gratuités des musées parisiens, d'après parisjetaime.com/article/les-musees-et-monuments-gratuits-a-paris-a961.
 * Seuls les lieux parisiens présents dans notre base sont repris ici — les sites hors Paris
 * (Meudon, Sceaux, Issy-les-Moulineaux, Vitry-sur-Seine, Saint-Germain-en-Laye, Écouen, Sèvres,
 * Boulogne-Billancourt, Le Bourget, Drancy…) sont volontairement exclus.
 */
type Category =
  | "always"
  | "first-sunday-year"
  | "first-saturday-collections"
  | "nocturne-louvre"
  | "nocturne-bourse";

type Rule = {
  museum: string[];
  exclude?: string[];
  category: Category;
};

const RULES: Rule[] = [
  // Gratuit tous les jours, toute l'année (collections permanentes)
  { museum: ["art moderne de paris", "mam paris"], category: "always" },
  { museum: ["balzac"], category: "always" },
  { museum: ["bourdelle"], category: "always" },
  { museum: ["carnavalet"], category: "always" },
  { museum: ["cognacq"], category: "always" },
  { museum: ["liberation de paris", "general leclerc", "jean moulin"], category: "always" },
  { museum: ["petit palais"], category: "always" },
  { museum: ["vie romantique"], category: "always" },
  { museum: ["victor hugo"], category: "always" },
  { museum: ["zadkine"], category: "always" },
  { museum: ["archives nationales"], category: "always" },
  { museum: ["memorial de la shoah"], exclude: ["drancy"], category: "always" },

  // Gratuit le 1er dimanche de chaque mois, toute l'année
  { museum: ["arts et metiers"], category: "first-sunday-year" },
  { museum: ["chasse et de la nature"], category: "first-sunday-year" },
  { museum: ["delacroix"], category: "first-sunday-year" },
  { museum: ["henner"], category: "first-sunday-year" },
  { museum: ["cluny"], category: "first-sunday-year" },
  { museum: ["orangerie"], category: "first-sunday-year" },
  { museum: ["orsay"], category: "first-sunday-year" },
  { museum: ["picasso"], category: "first-sunday-year" },
  {
    museum: ["cite de l'architecture", "cite de l-architecture", "architecture et du patrimoine"],
    category: "first-sunday-year",
  },
  { museum: ["histoire de l'immigration", "porte doree"], category: "first-sunday-year" },
  { museum: ["quai branly"], category: "first-sunday-year" },
  { museum: ["guimet"], category: "first-sunday-year" },
  { museum: ["cinematheque"], category: "first-sunday-year" },
  // Centre Pompidou fermé pour travaux jusqu'en 2030 : volontairement absent de cette liste.

  // Collections gratuites le 1er samedi du mois, du 1er octobre au 30 juin
  { museum: ["judaisme", "mahj"], category: "first-saturday-collections" },

  // Nocturne gratuite mensuelle
  { museum: ["louvre"], category: "nocturne-louvre" },
  { museum: ["bourse de commerce", "pinault"], category: "nocturne-bourse" },
];

function norm(v: string) {
  return v
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[’]/g, "'")
    .replace(/\s+/g, " ");
}

function ruleFor(name: string | null | undefined) {
  if (!name) return null;
  const n = norm(name);
  return (
    RULES.find(
      (r) => r.museum.some((a) => n.includes(a)) && !(r.exclude ?? []).some((a) => n.includes(a)),
    ) ?? null
  );
}

function isoDateOnly(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** N-ième occurrence d'un jour de semaine dans le mois (weekday: 0 = dimanche … 6 = samedi). */
function nthWeekdayOfMonth(year: number, monthIndex: number, weekday: number, nth = 1) {
  const first = new Date(year, monthIndex, 1);
  const offset = (weekday - first.getDay() + 7) % 7;
  return new Date(year, monthIndex, 1 + offset + (nth - 1) * 7);
}

export type FreeAdmissionInfo = {
  reason: string;
  /** Date ISO précise de la gratuité, ou "" quand elle s'applique tous les jours. */
  date: string;
};

function reasonForCategory(
  category: Category,
  year: number,
  monthIndex: number,
): FreeAdmissionInfo | null {
  const month = monthIndex + 1;
  switch (category) {
    case "always":
      return { reason: "Gratuit tous les jours (collections permanentes)", date: "" };
    case "first-sunday-year": {
      const d = isoDateOnly(nthWeekdayOfMonth(year, monthIndex, 0));
      return { reason: `Gratuit le ${formatDateFr(d)} (1er dimanche du mois)`, date: d };
    }
    case "first-saturday-collections": {
      if (![10, 11, 12, 1, 2, 3, 4, 5, 6].includes(month)) return null;
      const d = isoDateOnly(nthWeekdayOfMonth(year, monthIndex, 6));
      return {
        reason: `Collections gratuites le ${formatDateFr(d)} (1er samedi du mois, d'octobre à juin)`,
        date: d,
      };
    }
    case "nocturne-louvre": {
      if ([7, 8].includes(month)) return null;
      const d = isoDateOnly(nthWeekdayOfMonth(year, monthIndex, 5));
      return {
        reason: `Gratuit le ${formatDateFr(d)} après 18h (nocturne du 1er vendredi, sauf juillet-août)`,
        date: d,
      };
    }
    case "nocturne-bourse": {
      const d = isoDateOnly(nthWeekdayOfMonth(year, monthIndex, 6));
      return {
        reason: `Accès gratuit le ${formatDateFr(d)} dès 17h (1er samedi du mois, sur réservation)`,
        date: d,
      };
    }
  }
}

/** 1er jour du mois suivant la date donnée. */
export function nextMonthReference(now = new Date()) {
  return new Date(now.getFullYear(), now.getMonth() + 1, 1);
}

function monthBounds(referenceDate: Date) {
  const start = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1);
  const end = new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1, 0);
  return { start: isoDateOnly(start), end: isoDateOnly(end) };
}

/**
 * Raison de gratuité du musée pour le mois de `referenceDate`, si son musée
 * en bénéficie ce mois-ci (d'après les règles ci-dessus).
 */
export function isExhibitionFreeThisMonth(
  exhibition: Pick<Exhibition, "start_date" | "end_date"> & {
    museums: Pick<Museum, "name"> | null;
  },
  referenceDate: Date,
): FreeAdmissionInfo | null {
  const rule = ruleFor(exhibition.museums?.name);
  if (!rule) return null;
  const info = reasonForCategory(
    rule.category,
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
  );
  if (!info) return null;

  if (info.date) {
    return exhibition.start_date <= info.date && exhibition.end_date >= info.date ? info : null;
  }
  const { start, end } = monthBounds(referenceDate);
  return exhibition.start_date <= end && exhibition.end_date >= start ? info : null;
}
