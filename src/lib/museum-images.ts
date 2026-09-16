import centrePompidou from "@/assets/museums/centre-pompidou.jpg.asset.json";
import fondationLouisVuitton from "@/assets/museums/fondation-louis-vuitton.jpg.asset.json";
import jeuDePaume from "@/assets/museums/jeu-de-paume.jpg.asset.json";
import museeDOrsay from "@/assets/museums/musee-d-orsay.jpg.asset.json";
import museeDuLouvre from "@/assets/museums/musee-du-louvre.jpg.asset.json";
import museePicasso from "@/assets/museums/musee-picasso.jpg.asset.json";
import palaisDeTokyo from "@/assets/museums/palais-de-tokyo.jpg.asset.json";
import petitPalais from "@/assets/museums/petit-palais.jpg.asset.json";

import type { Exhibition, Museum } from "@/lib/artesia";

/** Normalise un nom de musée : minuscules, sans accents ni ponctuation. */
function slug(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

const MUSEUM_IMAGES: Record<string, string> = {
  "centre-pompidou": centrePompidou.url,
  "fondation-louis-vuitton": fondationLouisVuitton.url,
  "jeu-de-paume": jeuDePaume.url,
  "musee-du-louvre": museeDuLouvre.url,
  "musee-picasso": museePicasso.url,
  "palais-de-tokyo": palaisDeTokyo.url,
  "petit-palais": petitPalais.url,
};

function isUsable(url: string | null | undefined): boolean {
  if (!url) return false;
  // Les anciennes URLs de démonstration ne renvoient plus d'image.
  return !url.includes("res.cloudinary.com/ncu7idmv");
}

/** Photo associée au musée, ou null si aucune photo n'est disponible. */
export function museumImage(museum: Pick<Museum, "name" | "image_url"> | null | undefined) {
  if (!museum) return null;
  const mapped = MUSEUM_IMAGES[slug(museum.name ?? "")];
  if (mapped) return mapped;
  return isUsable(museum.image_url) ? museum.image_url : null;
}

/** Image à afficher pour une exposition : son affiche, sinon la photo du musée. */
export function exhibitionImage(exhibition: Exhibition | null | undefined) {
  if (!exhibition) return null;
  if (isUsable(exhibition.image_url)) return exhibition.image_url;
  return museumImage(exhibition.museums);
}
