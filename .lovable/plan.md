# Une seule page de découverte

Fusion des pages « À venir » (Aujourd'hui / Demain) et « Explorer » (recherche filtrée) en une seule page.

## Ce que verra l'utilisateur

- Une seule page de découverte, accessible depuis la barre du bas (l'entrée « Explorer » disparaît, l'onglet devient « Explorer »).
- En haut : le titre « Explorer » et l'accès au profil, sans logo.
- Juste en dessous, la rangée de filtres qui défile horizontalement, reprise de la page Explorer : **Agenda · Univers · Prix · Paris** (aucune pastille Aujourd'hui/Demain).
  - « Agenda » ouvre le calendrier français avec « Cette semaine » / « Semaine prochaine » / « Effacer ».
  - « Univers », « Prix » (Gratuit, Max 15 €, Personnalisé avec curseur) et le sélecteur de quartier restent identiques.
- En dessous, les sections **Aujourd'hui** puis **Demain** listent les expos de ces deux jours, avec le bouton « Voir X de plus » comme aujourd'hui.
- Puis une section **Tout à venir** avec le reste des expos filtrées, triées par popularité et son compteur « X expositions ».
- Les filtres du haut s'appliquent à toutes les sections. Si une date précise est choisie dans l'Agenda, on affiche une seule liste pour ce jour à la place des sections Aujourd'hui / Demain.
- Fiches au format affiche (photo, dates, lieu, pastilles Gratuit / Nouveau / Dernier jour) partout.
- L'ancienne adresse de la page de recherche renvoie automatiquement vers la page de découverte, donc aucun lien existant ne casse.

## Détails techniques

- `src/routes/_authenticated/upcoming.tsx` devient la page unique : on y déplace la logique de `search.tsx` (requête `fetchAllExhibitions`, filtres date / univers / prix / quartier, tri popularité, fiches `variant="poster"`).
- Ajout de deux pastilles de date en tête de la rangée de filtres : `Aujourd'hui` → `isoDate(0)`, `Demain` → `isoDate(1)`, mutuellement exclusives avec la sélection du calendrier (même état `date`).
- `src/routes/_authenticated/search.tsx` est remplacé par une simple redirection `beforeLoad` vers `/upcoming` (garde les liens existants valides).
- `src/routes/_authenticated/profile.tsx` : le lien « Explorer » pointe vers `/upcoming`.
- `src/components/artesia/BottomNav.tsx` : libellé de l'onglet `/upcoming` passé à « Explorer ».
- En-tête : suppression du logo et du bouton loupe vers `/search`, on garde le titre « Explorer » et l'icône profil. Suppression du composant `FilterBar` s'il n'est plus utilisé ailleurs.
- Métadonnées `head()` de `/upcoming` mises à jour (titre/description de page de découverte).
- Vérification : typecheck puis contrôle visuel mobile de la page et des trois tiroirs de filtres.
