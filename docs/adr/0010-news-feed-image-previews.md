# ADR 0010: news feed image previews

- Date: 18-09-2026
- Status: accepted. The owner asked on 18-09-2026 for news cards to show a preview of the article's own image instead of the outlet monogram.
- Supersedes: the images clause of ADR 0007 decision 7 ("No images from all rights reserved outlets").

## Context

News cards showed a preview tile in this order: a licensed stored image, the portrait of a linked person, then a publisher monogram. Every feed in `pipelines/feeds.json` has `imageLicense: null`, so the first branch never fired and nearly every card showed a monogram. The owner asked for the article's own image as the preview.

The earlier rule had two reasons: showing an image the site does not hold rights to republishes it, and loading it from the outlet's server sends the reader's request to a third party. Both still hold. The owner's instruction changes the trade-off on the reader's side: the monogram tiles made the news list look identical to itself, and the feed image is the honest preview of the article.

## Decision

1. **The pipeline stores the feed-supplied image URL.** `pipelines/news.mjs` writes `imageUrl` on every item that carries an enclosure or `media:content` image, normalized to https. It is exactly what the outlet published in its feed: no resizing, no proxy, no copy.
2. **No license is claimed.** `imageUrl` is a preview reference, not a licensed asset. A licensed local copy stays the upgrade path: when a feed sets `imageLicense`, the pipeline downloads the image into `web/public/media/`, registers it in `data/media.json`, and the item's `image` media reference takes precedence over `imageUrl` in the interface.
3. **The browser loads the image from the outlet.** The preview tile renders the outlet's URL directly, with `referrerPolicy="no-referrer"` so the request carries no Staatsgraaf page as referrer. `docs/12` privacy: no reader data goes to the outlet beyond the image request the reader's own browser makes.
4. **Credit stays visible.** The card's credit line reads "Beeld: {publisher}" (English: "Image: {publisher}") using the existing `imageCreditLabel` plus the publisher name. Licensed images keep their full credit and license line as before.
5. **Rights gate for downloads stays closed.** Without `imageLicense` the pipeline still does not download, store, or redistribute the image bytes; `imagesSkippedForRights` still counts those. Nothing is invented: the outlet publishes the image, the reader fetches it from the outlet, the site credits the outlet and claims nothing.
6. **Schema.** `schema/v1/news-item.schema.json` gains optional nullable `imageUrl` (https or http string). Existing items without the field stay valid.

## Consequences

- Cards with a feed image show the article image; items without one fall back to a linked person's portrait, then the monogram, unchanged.
- Images may fail to load (hotlink protection, expiry). The tile keeps its frame; an unreadable image degrades to an empty tile, not an error.
- The site now makes third-party image requests from the reader's browser. This is disclosed here and in the preview code; no image is cached, resized, or archived by Staatsgraaf.
- `data/news.json` grows by one nullable string per item. `web/lib/news-view.test.mjs` pins the precedence: licensed image, then feed image (remote), then portrait, then monogram.

## Verification

`pipelines/news.test.mjs` still asserts the rights gate (no download without `imageLicense`) and now asserts `imageUrl` is stored; `web/lib/news-view.test.mjs` pins the preview precedence and the remote flag.
