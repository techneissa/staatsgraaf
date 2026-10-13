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
3. Weak files go to the owner for a decision and do not ship meanwhile: uploader "own work" redraws of a modern logo, `{{PD-textlogo}}` or `{{Trademark}}` on a modern logo, and arms drawings whose page names no source beyond "own work".
4. Storage: a public-domain emblem is served as a WebP of 240 px high, rendered from the verified SVG (`web/public/media/wapens/`); no statement of changes is owed. An emblem under any other licence is served as the unchanged original. The source record keeps the Commons file page, the upload date and the SHA-1 of the original. Media records use `type: "logo"`, ids `media:wapen-<org-slug>` and sources `src:commons-wapen-<org-slug>`; the organisation's `images` lists the media id.
5. Display: the organisation page shows the emblem next to the name with the Dutch alt text "Wapen van {naam}", and the credit with the licence visible under the name, with the (i) for author, licence and source page (`web/components/entity/org-emblem.tsx`). Nothing on the page suggests the body endorses Staatsgraaf.

## What shipped

266 emblems, all checked again by the orchestrator on 13-10-2026 (licence template in the licence section, SHA-1 of the downloaded file, file title against the body name):

- 12 provincies: all `{{PD-NL-gemeentewapen}}` (Limburg `{{PD-self}}` only), source Hoge Raad van Adel, Hubert-Herald (Utrecht) or gelderland.nl (Gelderland).
- 239 gemeenten and 12 waterschappen: `{{PD-NL-gemeentewapen}}` or `{{PD-self}}`, with a named source.
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

- 101 gemeenten: about 70 arms drawings whose page names no source beyond "own work" or a news site (among them Amsterdam, Arnhem and Enschede), 26 with several current-looking variants on Commons, and a few with only an old scan or a recent redesign. Ship or not.
- Tweede Kamer and Eerste Kamer: arms files from 2012 tagged `{{PD-old}}` with an unknown author and the chamber sites as source; CC BY 3.0 redraws by Commons users.
- Hoge Raad (CC0 own work), Nationale ombudsman, Onderwijsraad, Raad voor het Openbaar Bestuur, PBL and SCP (`{{PD-textlogo}}`, some with `{{Trademark}}`), Gezondheidsraad and Adviesraad Migratie (own-work redraws), SER (CC BY-SA claim), Nationaal Archief, Politie and Nederlandse Arbeidsinspectie.
- Aruba, Curaçao and Sint Maarten: free files, but the sources are a Defensie image bank, heraldry sites and an encyclopedia.
- Five waterschappen (Aa en Maas, De Dommel, Rivierenland, Schieland en Krimpenerwaard, Vechtstromen): the source traces to ngw.nl or Dutch Wikipedia, or is missing.

## Consequences

- A later round can add the review rows one by one once the owner decides, with the same records and the same component.
- A redesigned arms (Urk, Sittard-Geleen) can supersede a shipped file. The pipeline does not watch Commons; a new file is a new check under this ADR.
