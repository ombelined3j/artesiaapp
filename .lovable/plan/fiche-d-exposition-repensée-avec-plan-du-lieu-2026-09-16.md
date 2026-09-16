# Fiche d'exposition repensée, avec plan du lieu

Refonte de la fiche d'exposition dans l'esprit des captures fournies, et suppression de la page carte au profit d'un plan Google directement sur la fiche.

## Ce qui change pour vous

Sur la fiche d'une exposition, de haut en bas :

- Boutons ronds « retour » et « partager » posés en haut de l'image.
- Grande image de l'exposition, puis le titre en gros, et le musée en dessous.
- Un bouton « Favori » avec l'icône cœur, à côté du nombre de personnes intéressées.
- Un bloc d'informations avec une ligne par élément et un séparateur fin : dates, horaires, lieu, adresse.
- La description sous un intertitre « Description ».
- Les étiquettes Type et Ambiance sous un intertitre « Ambiance ».
- Un intertitre « Lieu » suivi d'un vrai plan Google centré sur le musée, cliquable pour ouvrir l'itinéraire.
- Le bouton de réservation reste toujours visible en bas de l'écran, avec le prix affiché dessus.

La page « Carte des musées » disparaît, ainsi que ses deux accès (icône en haut de la page Explorer, ligne dans le profil).

Note : les captures montrent un thème sombre. Je garde la charte Artesia (ivoire, encre, violet) et je reprends uniquement la structure, la hiérarchie et le bouton fixe en bas.

## Détails techniques

- Supprimer `src/routes/_authenticated/map.tsx`; retirer le `Link to="/map"` de `search.tsx` (+ import `MapPinned`) et de `profile.tsx`.
- Nouveau `src/components/artesia/MuseumMap.tsx` : iframe Maps Embed API (`/maps/embed/v1/place` ou `view`) avec `VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY`, coordonnées du musée, `loading="lazy"`, ratio ~16/10, coins arrondis. Rendu seulement si clé + coordonnées disponibles ; lien `https://www.google.com/maps/search/?api=1&query=lat,lng`. Connexion du connecteur Google Maps requise (carte de connexion à approuver).
- Réécriture de la mise en page de `src/routes/_authenticated/exhibition.$exhibitionId.tsx` : image plein cadre avec boutons flottants (retour, partage via `navigator.share` avec repli copie du lien), titre Fraunces, lignes d'info avec `border-b`, sections intitulées, et barre d'action fixe en bas (`sticky`/`fixed` avec padding de sécurité au-dessus de la navigation).
- `fetchExhibition` renvoie déjà `museums(*)`, donc latitude/longitude sont disponibles ; aucun changement de base de données.
- Pas d'appel Places : uniquement Maps Embed côté navigateur, donc aucune fonction serveur.
