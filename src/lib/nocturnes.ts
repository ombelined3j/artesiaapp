/** Nocturnes des musées parisiens (0 = dimanche … 6 = samedi). */
type Rule = {
  museum: string[]; // alias normalisés (contenus dans le nom du lieu)
  weekday: number;
  time: string;
  note?: string;
  nth?: number[]; // semaines du mois (1 = 1er …)
  excludeMonths?: number[]; // 1-12
  onlyMonths?: number[];
  from?: string;
  to?: string;
};

const DAYS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
const EXPO = "en période d'expositions";
const TOKYO = ["palais de tokyo"];

const RULES: Rule[] = [
  { museum: ["musee du luxembourg"], weekday: 1, time: "22h", note: EXPO },
  { museum: TOKYO, weekday: 1, time: "22h", note: EXPO },
  { museum: ["jeu de paume"], weekday: 2, time: "21h", note: EXPO },
  { museum: ["louvre"], weekday: 3, time: "21h" },
  { museum: ["judaisme", "mahj"], weekday: 3, time: "21h", from: "2026-10-15", to: "2027-03-14" },
  { museum: ["monnaie de paris"], weekday: 3, time: "21h" },
  { museum: ["pernod ricard"], weekday: 3, time: "21h" },
  { museum: ["le plateau"], weekday: 3, time: "21h", nth: [1], note: "1er mercredi du mois" },
  { museum: ["chasse et de la nature"], weekday: 3, time: "21h30", excludeMonths: [7, 8] },
  { museum: ["musee de montmartre"], weekday: 3, time: "22h", onlyMonths: [7, 8] },
  { museum: TOKYO, weekday: 3, time: "22h", note: EXPO },
  { museum: ["marmottan"], weekday: 4, time: "21h" },
  { museum: ["cite de l'architecture", "cite de l-architecture", "architecture et du patrimoine"], weekday: 4, time: "21h" },
  { museum: ["henner"], weekday: 4, time: "21h", nth: [2], excludeMonths: [7, 8], note: "2e jeudi du mois" },
  { museum: ["mad paris", "arts decoratifs"], weekday: 4, time: "21h", note: "collections permanentes non accessibles" },
  { museum: ["cluny", "moyen age"], weekday: 4, time: "21h", nth: [1, 3], note: "1er et 3e jeudis du mois" },
  { museum: ["cinematheque", "melies"], weekday: 4, time: "21h", nth: [2], note: "étudiants et moins de 26 ans" },
  { museum: ["art moderne de paris", "musee d'art moderne", "mam paris"], weekday: 4, time: "21h30", note: "expositions temporaires uniquement" },
  { museum: ["orsay"], weekday: 4, time: "21h45" },
  { museum: ["memorial de la shoah"], weekday: 4, time: "21h" },
  { museum: ["maillol"], weekday: 4, time: "22h" },
  { museum: ["citeco", "cite de l'economie"], weekday: 4, time: "22h", nth: [1], note: "1er jeudi du mois" },
  { museum: ["musee national de la marine", "musee de la marine"], weekday: 4, time: "22h", nth: [1], note: "1er jeudi du mois" },
  { museum: ["quai branly"], weekday: 4, time: "22h" },
  { museum: TOKYO, weekday: 4, time: "minuit", note: EXPO },
  { museum: ["bourse de commerce", "pinault"], weekday: 5, time: "21h", note: "selon les périodes" },
  { museum: ["galliera"], weekday: 5, time: "21h", note: EXPO },
  { museum: ["arts et metiers"], weekday: 5, time: "21h" },
  { museum: ["atelier des lumieres"], weekday: 5, time: "21h", note: "selon période" },
  { museum: ["louis vuitton"], weekday: 5, time: "23h", nth: [1], note: "1er vendredi du mois" },
  { museum: ["louis vuitton"], weekday: 5, time: "21h", nth: [2, 3, 4, 5], note: EXPO },
  { museum: ["hotel de la marine"], weekday: 5, time: "21h30" },
  { museum: ["louvre"], weekday: 5, time: "21h", note: "gratuit le 1er vendredi du mois sauf juillet-août" },
  { museum: ["jacquemart"], weekday: 5, time: "22h", note: EXPO },
  { museum: ["fondation cartier"], weekday: 5, time: "22h", note: EXPO },
  { museum: ["musee de l'armee", "invalides"], weekday: 5, time: "22h", nth: [1], note: "1er vendredi du mois" },
  { museum: TOKYO, weekday: 5, time: "22h", note: EXPO },
  { museum: ["atelier des lumieres"], weekday: 6, time: "21h", note: "selon période" },
  { museum: TOKYO, weekday: 6, time: "22h", note: EXPO },
  { museum: TOKYO, weekday: 0, time: "22h", note: EXPO },
];

function norm(v: string) {
  return v
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[’]/g, "'")
    .replace(/\s+/g, " ");
}

function rulesFor(name: string | null | undefined) {
  if (!name) return [];
  const n = norm(name);
  return RULES.filter((r) => r.museum.some((a) => n.includes(a)));
}

/** Nocturne du lieu à une date donnée (YYYY-MM-DD), sinon null. */
export function nocturneOn(name: string | null | undefined, day: string) {
  const d = new Date(`${day.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  const month = d.getMonth() + 1;
  const nth = Math.ceil(d.getDate() / 7);
  const iso = day.slice(0, 10);
  return (
    rulesFor(name).find(
      (r) =>
        r.weekday === d.getDay() &&
        (!r.nth || r.nth.includes(nth)) &&
        (!r.excludeMonths || !r.excludeMonths.includes(month)) &&
        (!r.onlyMonths || r.onlyMonths.includes(month)) &&
        (!r.from || iso >= r.from) &&
        (!r.to || iso <= r.to),
    ) ?? null
  );
}

/** Lignes lisibles décrivant toutes les nocturnes du lieu. */
export function nocturneLines(name: string | null | undefined) {
  return rulesFor(name).map((r) => {
    const extra = [
      r.onlyMonths ? "juillet-août uniquement" : null,
      r.excludeMonths ? "pas en juillet-août" : null,
      r.from && r.to ? "du 15 octobre 2026 au 14 mars 2027" : null,
      r.note ?? null,
    ].filter(Boolean);
    const day = DAYS[r.weekday];
    return `Le ${day} jusqu'à ${r.time}${extra.length ? ` (${extra.join(", ")})` : ""}`;
  });
}
