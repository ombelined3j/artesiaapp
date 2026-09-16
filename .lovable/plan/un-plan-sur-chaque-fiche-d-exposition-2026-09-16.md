# Un plan sur chaque fiche d'exposition

Supprimer la page « Carte des musées » et afficher à la place un vrai plan Google sur la fiche de chaque exposition, situé au niveau du musée.

## Ce qui change pour vous

- La page carte disparaît, ainsi que ses deux accès : l'icône carte en haut de la page Explorer et la ligne « Carte » dans le profil.
- Sur la fiche d'une exposition, sous le nom et l'adresse du musée, un plan Google apparaît avec le lieu centré, ainsi qu'un lien « Itinéraire » qui ouvre Google Maps.
- Si le lieu n'a pas de coordonnées connues, le plan est simplement masqué et l'adresse reste affichée.

## Étapes

1. Connecter Google Maps (une fenêtre de connexion s'affichera pour vous).
2. Supprimer la page carte et ses deux liens d'accès.
3. Ajouter un bloc plan réutilisable sur la fiche d'exposition, avec le musée centré et un lien vers l'itinéraire.
4. Vérifier sur mobile que le plan s'affiche bien sur une fiche d'exposition et qu'aucun lien cassé ne reste vers l'ancienne page.

## Détails techniques

- Supprimer `src/routes/_authenticated/map.tsx`; retirer le `Link to="/map"` dans `search.tsx` (ligne 113, ainsi que l'import `MapPinned`) et dans `profile.tsx` (ligne 53).
- Nouveau composant `src/components/artesia/MuseumMap.tsx` : iframe Maps Embed API en mode `view` (ou `place`), URL construite avec `import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY` et `museum.latitude/longitude`, `loading="lazy"`, ratio 16/9, coins arrondis cohérents avec les cartes existantes. Rendu uniquement si latitude et longitude sont présentes et si la clé existe.
- `fetchExhibition` doit renvoyer `museums.latitude` et `museums.longitude` : vérifier le `select` dans `src/lib/artesia.ts` et l'étendre si besoin (aucun changement de schéma).
- Insertion dans `src/routes/_authenticated/exhibition.$exhibitionId.tsx` après l'adresse du musée, avec un lien `https://www.google.com/maps/search/?api=1&query=lat,lng`.
- Aucun appel Places : uniquement Maps Embed avec la clé navigateur, donc pas de fonction serveur.
