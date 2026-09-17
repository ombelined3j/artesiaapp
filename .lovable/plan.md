# Une seule page de découverte

Fusion des pages « À venir » (Aujourd'hui / Demain) et « Explorer » (recherche filtrée) en une seule page.

## Ce que verra l'utilisateur

- Une seule page de découverte, accessible depuis la barre du bas (l'entrée « Explorer » disparaît, l'onglet devient « Explorer »).
- En haut : le titre « Explorer » et l'accès au profil, sans logo.
- Juste en dessous, une rangée de filtres qui défile horizontalement, reprise de la page Explorer :
  **Aujourd'hui · Demain · Agenda · Univers · Prix · Paris**
  - « Aujourd'hui » et « Demain » sont deux raccourcis de date : un tap affiche les expos du jour choisi.
  - « Agenda » ouvre le calendrier français avec « Cette semaine » / « Semaine prochaine » / « Effacer ».
  - « Univers », « Prix » (Gratuit, Max 15 €, Personnalisé avec curseur) et le sélecteur de quartier restent identiques.
- Résultats : les fiches format affiche (photo, dates, lieu, pastilles Gratuit / Nouveau / Dernier jour), triées par popularité, avec le compteur « X expositions ».
- Quand ni date ni raccourci n'est actif, la page montre toutes les expos en cours et à venir.
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
