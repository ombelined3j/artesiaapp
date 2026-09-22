# Afficher le vrai prix au lieu de « Payant »

Aujourd'hui les expositions importées n'ont pas de montant chiffré : seul un texte de tarif existe (« De 9 à 21 euros. », « ▷ Tarif plein : 13 € … »). Comme le champ prix vaut 0, l'application affiche « Payant ».

## Ce qui va changer

- Les cartes (Explorer) et la fiche d'exposition affichent la fourchette réelle, par exemple **9–21 €**, ou un montant unique **13 €** quand le texte n'en donne qu'un.
- Quand le texte de tarif ne contient aucun montant (« Billets prochainement en vente »), on garde « Payant ».
- Le bouton de réservation sur la fiche affiche le même libellé.
- Le texte de tarif complet reste affiché sur la fiche, comme aujourd'hui.

Sur les 336 expositions importées : 196 gratuites, et la grande majorité des payantes disposent d'un texte de tarif exploitable.

## Détails techniques

Dans `src/lib/artesia.ts` :

- Ajouter `parsePriceRange(detail: string | null)` qui extrait les montants du texte de tarif : motifs « De X à Y euros/€ », « Tarif plein : X € », « X € », en tolérant les virgules décimales et les espaces insécables. Retourne `{ min, max }` à partir des montants strictement positifs trouvés (min/max), ou `null` si aucun.
- Étendre `priceLabel(exhibition)` : si `is_free` → « Gratuit » ; sinon si `price > 0` → montant actuel ; sinon si `parsePriceRange(price_detail)` donne `min !== max` → `9–21 €` (tiret demi-cadratin), sinon `13 €` ; sinon « Payant ».
- `priceLabel` prend désormais aussi `price_detail` dans son type de paramètre ; adapter les appels dans `ExhibitionCard.tsx` et `exhibition.$exhibitionId.tsx` (ils passent déjà l'objet exposition complet, aucun autre changement requis).

Aucune modification de base de données ni de l'import.
