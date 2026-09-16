# Page Explorer : filtres façon Shotgun

## Ce qui change à l'écran

1. **Barre de recherche supprimée** — la page commence directement par la rangée de filtres.
2. **Filtre « Agenda »** (icône calendrier) : ouvre un panneau qui monte du bas avec
   « Aller à : Cette semaine / Semaine prochaine », puis un vrai calendrier mensuel
   (flèches mois précédent/suivant, jours passés grisés). La date choisie filtre les
   expositions ouvertes ce jour-là et s'affiche sur la pastille (ex. « 18 sept »).
3. **Filtre « Univers »** (remplace « Type ») : panneau du bas avec les univers en
   pastilles multi-sélection (Peinture, Art moderne, Art contemporain, Photographie,
   Sculpture, Dessin, Installation, Vidéo, Patrimoine…), un lien « Effacer » et un
   bouton « Voir N expositions ». Les univers proviennent des expositions existantes.
4. **Filtre « Prix »** (remplace « Trier ») : panneau du bas avec « Gratuit »,
   « Max 15 € » et « Personnalisé » qui affiche un curseur de prix (0 → prix max).
5. **Lieu visible** (pas de filtre) : le nom du lieu (Louvre, Musée d'Orsay, Centre
   Pompidou…) sur sa propre ligne de chaque affiche, toujours lisible en mobile.
   Le filtre existant reste « Paris » / quartier.
6. **Dates au lieu des horaires** sur les affiches : afficher la période de
   l'exposition (ex. « 15 – 30 sept ») ou « Aujourd'hui » / « Dernier jour », plus
   le prix, à la place des heures d'ouverture.

Le tri par popularité reste appliqué par défaut (en silence), les pastilles actives
gardent le style violet existant.

## Détails techniques

- `src/routes/_authenticated/search.tsx` : retirer l'`Input`, remplacer les `Select`
  par des pastilles ouvrant des `Drawer` (`@/components/ui/drawer`, déjà présent).
  Nouveaux états : `date: string | null`, `universes: string[]`, `priceMode:
  "all" | "free" | "max15" | "custom"`, `maxPrice: number`, `museumId: string | null`.
  Le filtrage reste dans le `useMemo` existant ; `fetchAllExhibitions` inchangé.
- Calendrier : `@/components/ui/calendar` (react-day-picker, locale fr) + helpers
  `isoDate`/`formatDateFr` de `src/lib/artesia.ts` ; « cette semaine » / « semaine
  prochaine » calculés côté client (lundi → dimanche).
- Curseur : `@/components/ui/slider`.
- `src/components/artesia/ExhibitionCard.tsx` : dans la variante « poster », remplacer
  `formatTime(opening_time/closing_time)` par une plage de dates (nouveau helper de
  formatage court dans `src/lib/artesia.ts`), et mettre le nom du lieu sur sa propre
  ligne avec `truncate` + `min-w-0` pour rester lisible en mobile.
- Aucun changement de base de données : `exhibition_type` sert d'univers,
  `museums.name` de lieu.
- Vérification : `tsgo` puis contrôle dans le navigateur en 393 px (ouverture des trois
  panneaux, filtres combinés).
