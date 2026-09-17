# Brancher les vraies données parisiennes dans Artesia

Deux sources complémentaires :

- **Paris Musées (votre clé)** : les collections — œuvres, auteurs, images, styles et mouvements. Pas d'agenda, pas de tarifs.
- **« Que faire à Paris ? » (open data de la Ville, sans clé)** : l'agenda. J'ai vérifié : 354 expositions y sont référencées, avec titre, lieu, adresse et coordonnées, dates de début et de fin, gratuit ou payant, description tarifaire, image de couverture et **lien de billetterie** (par exemple Billetweb).

## Ce que vous obtiendrez

1. **Un agenda réel** : les expositions parisiennes remplacent les exemples saisis à la main, avec leurs vraies dates, leur lieu et leur image.
2. **Un bouton « Réserver » qui marche** : quand l'événement a un lien de billetterie, le bouton ouvre directement la page de réservation officielle. Sinon, la fiche indique simplement où et quand, sans promettre une réservation.
3. **Des tarifs justes** : la pastille « Gratuit » s'appuie sur l'information officielle, et le prix affiché reprend le détail tarifaire quand il existe.
4. **Des univers réels** : la liste du filtre « Univers » reprend les styles et mouvements artistiques réels de Paris Musées (impressionnisme, art moderne, contemporain…) au lieu d'une liste inventée, et chaque exposition est rattachée à l'un d'eux.
5. **De vraies œuvres en illustration** : quand une exposition n'a pas d'image, la fiche montre une œuvre de la collection du musée concerné, avec son titre et son auteur.
6. **Une mise à jour** : un bouton d'actualisation côté administration relance l'import quand vous le souhaitez.

Point d'honnêteté : les deux sources ne se recouvrent pas parfaitement. Le rattachement d'une exposition à un musée se fait par le nom du lieu, donc quelques événements resteront sans image d'œuvre ni univers. Ils s'afficheront correctement, simplement moins enrichis.

Votre clé est rangée dans le coffre sécurisé et n'est jamais visible dans le navigateur. Faites-la régénérer, puisqu'elle est passée en clair dans la conversation.

## Détails techniques

**Secret** : `PARIS_MUSEES_API_KEY` via l'outil de secrets (valeur fournie), lue uniquement dans un handler serveur.

**Base** : migration ajoutant à `exhibitions` `source` (`qfap` | `manual`), `source_id` unique, `price_detail`, `cover_url`, `last_synced_at` ; à `museums` `qfap_address_name` pour le rapprochement. Nouvelle table `artworks` (museum_id, title, author, date, image_url, style, source_id) + GRANT `SELECT` à `anon`/`authenticated`, RLS lecture publique, écriture réservée au service role. Nouvelle table `art_universes` alimentée par la taxonomie Paris Musées.

**Import** (`src/lib/sync.functions.ts`, admin uniquement, `supabaseAdmin` chargé dans le handler) :
- `GET https://opendata.paris.fr/api/explore/v2.1/catalog/datasets/que-faire-a-paris-/records` avec `where=qfap_tags LIKE "Expo" AND date_end > now()`, pagination par 100.
- Mapping : `title`, `lead_text`/`description` (HTML nettoyé) → description, `date_start`/`date_end` → dates, `price_type='gratuit'` → `is_free`, `price_detail` → `price_detail`, `access_link` → `booking_url` et `bookable=false` (réservation externe), `cover_url` → image, `address_name`/`address_street`/`lat_lon` → upsert `museums`.
- Upsert par `source_id` (`event_id`) pour rester idempotent ; les expositions `manual` ne sont pas touchées.

**Paris Musées** (`src/lib/parismusees.functions.ts`) : POST GraphQL sur `https://apicollections.parismusees.paris.fr/graphql`, en-tête `auth-token`. Deux usages : `taxonomyTermQuery` sur le vocabulaire style/mouvement pour `art_universes` ; `nodeQuery` type `oeuvre` filtré par `fieldMusee` pour peupler `artworks` (titre, `fieldOeuvreAuteurs`, `fieldDateProduction`, `fieldVisuels`, `fieldOeuvreStyleMouvement`). Le service renvoie parfois une page « Service indisponible » : gestion de l'erreur avec retour typé et import partiel accepté.

**Écrans** : `search.tsx`/`upcoming.tsx` — le filtre Univers lit `art_universes` ; `exhibition.$exhibitionId.tsx` — bouton « Réserver sur la billetterie » quand `booking_url`, prix depuis `price_detail`, œuvre de la collection en repli d'image ; `museum-images.ts` conserve les photos locales en dernier recours.
