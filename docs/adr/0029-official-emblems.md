# ADR 0029: Official logos and coats of arms only under a verified free licence

Date: 13-10-2026
Status: accepted. The owner asked on 13-10-2026 for official logos and coats of arms on the organisation pages where a free licence exists. The rows marked review in `research/qa/logos-13-10-2026.md` wait for an owner decision. This ADR is a working reading of the licence texts, not legal advice.
Leaves unchanged: `docs/adr/0011-party-identity-registry.md` (party logos).

## Context

An organisation page showed only the name. Most Dutch provincies, gemeenten and waterschappen have a coat of arms granted by Royal Decree, and Wikimedia Commons holds drawings of most of them. Commons tags these `{{PD-NL-gemeentewapen}}`. The template text (https://commons.wikimedia.org/wiki/Template:PD-NL-gemeentewapen, retrieved 13-10-2026) cites a ministerial notice of 03-09-1979: anyone may depict the arms, as long as no impression of involvement of the body is created, and each drawing carries the copyright of its artist. The template marks the file with the Public Domain Mark.

Modern organisation logos are a different case. The official sites restrict them, and a free tag on Commons is often an uploader's claim that the source does not back:

- rijksoverheid.nl/service/copyright, kiesraad.nl/service/copyright and om.nl/service/copyright: "Beeldmateriaal (zoals foto's en video's) mag u bijna nooit gebruiken."
- rekenkamer.nl/service/copyright: the CC0 statement does not cover images ("Op foto's, video's, infographics en alle andere vormen van beeld is de CC0-verklaring niet van toepassing").
- english.defensie.nl/copyright (now www.ministryofdefence.nl/service/copyright): "You cannot, for example, simply reproduce organisation names, logos and slogans."
- Staatscourant 2024, 5153 (https://zoek.officielebekendmakingen.nl/stcrt-2024-5153.html): the Raad voor de rechtspraak reserves copyright on its logo and house style under article 15b Auteurswet, including the sublogo of every court and national service.

All pages were retrieved 13-10-2026. Their text is kept in `research/raw/logos/licences/`.

## Decision

1. An emblem ships only when its Commons file page carries a public domain template, CC0, CC BY or CC BY-SA, the Source or Author field names where it comes from (the Hoge Raad van Adel, a decree, or the body itself), and it is the current emblem of that exact body. The licence is read from the template on the file page, not only from the metadata.
2. No emblem ships when the body's own site restricts its images, even if Commons tags the file as free. This covers the Rijksoverheid ministries and every logo with the rijkslogo, the Kiesraad, the Algemene Rekenkamer, Defensie, the Openbaar Ministerie and all Rechtspraak courts.
3. Weak files go to the owner for a decision and do not ship meanwhile: uploader "own work" redraws of a modern logo, `{{PD-textlogo}}` or `{{Trademark}}` on a modern logo, arms whose page names only a newspaper or another site as source, and arms with several current-looking variants.
4. Arms drawings made by the uploader ("own work", or own work based on a published image of the arms) under `{{PD-NL-gemeentewapen}}` or `{{PD-self}}` ship. The owner decided this on 13-10-2026: the arms are free to depict and the uploader released the drawing; the credit names the uploader as author.
5. Storage: a public-domain emblem is served as a WebP of 240 px high, rendered from the verified SVG (`web/public/media/wapens/`); no statement of changes is owed. An emblem under any other licence is served as the unchanged original. The source record keeps the Commons file page, the upload date and the SHA-1 of the original. Media records use `type: "logo"`, ids `media:wapen-<org-slug>` and sources `src:commons-wapen-<org-slug>`; the organisation's `images` lists the media id.
6. Display: the organisation page shows the emblem next to the name with the Dutch alt text "Wapen van {naam}", and the credit with the licence visible under the name, with the (i) for author, licence and source page (`web/components/entity/org-emblem.tsx`). Nothing on the page suggests the body endorses Staatsgraaf.

## What shipped

320 emblems, all checked again by the orchestrator on 13-10-2026 (licence template in the licence section, SHA-1 of the downloaded file, file title against the body name):

- 12 provincies: all `{{PD-NL-gemeentewapen}}` (Limburg `{{PD-self}}` only), source Hoge Raad van Adel, Hubert-Herald (Utrecht) or gelderland.nl (Gelderland).
- 293 gemeenten and 12 waterschappen: `{{PD-NL-gemeentewapen}}` or `{{PD-self}}`. 239 gemeenten and the waterschappen name a source (mostly the Hoge Raad van Adel); 54 gemeenten are the uploader's own drawing (decision 4).
- Saba and Sint Eustatius: `{{PD-NL-gemeentewapen}}`, source Hoge Raad van Adel.
- Openbaar lichaam Bonaire: `File:Wapen van Bonaire.png`, CC BY-SA 4.0, uploaded as own work by the account "Communicatie OLB". Served unchanged, attribution in the credit.

The full list per body, with every review row and gap and its reason, is in `research/qa/logos-13-10-2026.md`.

## Named gaps

- Rijksoverheid ministries, agencies and inspecties with the rijkslogo, including the NVWA (its Commons file is filed under "Images from Rijksoverheid.nl"): rijksoverheid.nl restricts images.
- Kiesraad: a CC0 file uploaded from kiesraad.nl exists, but kiesraad.nl restricts images.
- Algemene Rekenkamer, Defensie, Openbaar Ministerie: their own copyright pages restrict images (see Context).
- All rechtbanken, gerechtshoven, the Centrale Raad van Beroep, the College van Beroep voor het bedrijfsleven and the Raad voor de rechtspraak: copyright reserved (Staatscourant 2024, 5153).
- Raad van State, the WRR and several adviesraden: no file on Commons.
- Eerste Kamer: the file named in earlier research (`File:Eerste_Kamer_der_Staten-Generaal_2023.svg`) is a seat diagram, not a logo.
- IJsselstein and Montfoort: the arms file carries the flag template `{{PD-NL-gemeentevlag}}`, so the tag does not match the image.
- The Staten of Aruba, Curaçao and Sint Maarten, the eilandsraden, the ministries of the Caribbean countries, the Rijksministerraad and the College financieel toezicht: no emblem file found.
- Not checked: zbo's, rwt's, veiligheidsregio's, samenwerkingsverbanden and koepels.

## For the owner to decide

- 47 gemeenten: 26 with several current-looking variants on Commons (which one is current), about 15 whose source names only a newspaper or another site, and a few with only an old scan, a recent redesign (Urk) or no licence template in the licence section (Wijchen).
- Tweede Kamer and Eerste Kamer: arms files from 2012 tagged `{{PD-old}}` with an unknown author and the chamber sites as source; CC BY 3.0 redraws by Commons users.
- Hoge Raad (CC0 own work), Nationale ombudsman, Onderwijsraad, Raad voor het Openbaar Bestuur, PBL and SCP (`{{PD-textlogo}}`, some with `{{Trademark}}`), Gezondheidsraad and Adviesraad Migratie (own-work redraws), SER (CC BY-SA claim), Nationaal Archief, Politie and Nederlandse Arbeidsinspectie.
- Aruba, Curaçao and Sint Maarten: free files, but the sources are a Defensie image bank, heraldry sites and an encyclopedia.
- Five waterschappen (Aa en Maas, De Dommel, Rivierenland, Schieland en Krimpenerwaard, Vechtstromen): the source traces to ngw.nl or Dutch Wikipedia, or is missing.

## Consequences

- A later round can add the review rows one by one once the owner decides, with the same records and the same component.
- A redesigned arms (Urk, Sittard-Geleen) can supersede a shipped file. The pipeline does not watch Commons; a new file is a new check under this ADR.

## Amendment 1 (13-10-2026): official logos loaded from the body's own site

The owner asked on 13-10-2026 to show the logos that have no free licence by embedding them, with the source linked in the (i).

1. A body without a licensed emblem may get `logoEmbed` on its organisation record (`docs/04-data-model.md` section 3): the URL of its logo as published on its own site, the page it appears on and the date it was read. The reader's browser loads the image from that site, without a referrer, the same way news previews work (`docs/adr/0010-news-feed-image-previews.md`). Staatsgraaf stores no copy and claims no licence. The (i) says so ("Geen licentie: geladen van de website van de organisatie, niet door Staatsgraaf opgeslagen") and links the page. When the image fails to load, the page leaves it out.
2. The Rechtspraak courts and the Raad voor de rechtspraak reserved copyright on their logos (Staatscourant 2024, 5153), so they get `linkOnly: true`: no image, only the credit line and the (i) with the link to their page on rechtspraak.nl.
3. An embed ships only when the image is the body's own: it answers 200 with an image type, also with a `staatsgraaf.pages.dev` referrer, it loads in Chrome from another page, and it is not byte-identical to the image of another body. Most rijksoverheid sites serve the same rijkslogo file without the body's name; those bodies stay without a logo.
4. Every embed host is in the `img-src` of `web/public/_headers`; `web/lib/csp.test.mjs` fails when one is missing or when a header line passes the Cloudflare Pages limit of 2,000 characters (https://developers.cloudflare.com/pages/configuration/headers/, read 13-10-2026).
5. Result on 13-10-2026: 28 embedded logos (among them the Tweede Kamer, the Algemene Rekenkamer, the Kiesraad, the Openbaar Ministerie, the Belastingdienst, the Nationale ombudsman, the SER and the Staten of Aruba, Curaçao and Sint Maarten) and 18 courts with a link only. The Eerste Kamer (the image does not load from another site) and the Hoge Raad (403 on recheck) are not embedded. The full list with every rejection and gap is in `research/qa/logos-13-10-2026.md`.

Risk, stated plainly: an embed still shows the logo on our page. Several bodies say on their own site that their images may almost never be reused (see Context). The owner chose to embed them with the source linked; the courts stay link-only because their reservation is formal.
