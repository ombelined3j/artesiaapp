# Une image par musée

Aujourd'hui, toutes les images (fiches et page Explorer) pointent vers des adresses cassées : les cartes affichent un cadre vide. On règle ça avec une photo par musée, réutilisée partout où l'exposition n'a pas sa propre image.

## Ce qui change

- La photo du Jeu de Paume que vous venez d'envoyer est ajoutée à l'application.
- Chaque musée a une photo associée (Orsay, Pompidou, Louvre, Fondation Louis Vuitton, Picasso, Palais de Tokyo, Jeu de Paume, Petit Palais).
- Sur la page Explorer, chaque carte d'exposition affiche la photo de son musée.
- Sur la fiche d'exposition, la grande image en haut affiche la photo du musée.
- Si une exposition reçoit un jour sa propre affiche, celle-ci reste prioritaire ; la photo du musée sert de secours.
- Les adresses d'images cassées actuellement enregistrées ne sont plus utilisées.

## Images manquantes

Seule la photo du Jeu de Paume est disponible pour l'instant. Pour les 7 autres musées, deux options possibles :

1. Vous m'envoyez les photos (une par musée) et je les branche.
2. En attendant, ces musées affichent une vignette sobre aux couleurs de la charte, avec le nom du musée, au lieu d'un cadre vide.

Je partirai sur l'option 2 comme solution d'attente, remplaçable dès réception de vos photos.

## Détails techniques

- Photo envoyée via `lovable-assets` → pointeur `src/assets/museums/jeu-de-paume.jpg.asset.json`.
- Nouveau module `src/lib/museum-images.ts` : table de correspondance nom de musée (normalisé) → URL d'asset, plus une fonction `museumImage(museum)`.
- `ExhibitionCard.tsx` et `exhibition.$exhibitionId.tsx` : résolution de l'image = `exhibition.image_url` valide → image du musée → vignette de repli (dégradé encre/violet + nom).
- Recadrage géré en CSS (`object-cover`, ratio conservé) : aucun recadrage destructif du fichier.
- Aucune modification de schéma ni de données en base ; la logique reste côté affichage.
