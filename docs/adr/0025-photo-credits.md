# ADR 0025: Photo credits and the statement of changes

Date: 05-10-2026
Status: accepted. A human (the owner or a lawyer) should confirm the points listed under "To confirm". This ADR is a working reading of the licence texts, not legal advice.

## Context

The site serves 457 portraits. The files we store are scaled down: Commons thumbnails of about 320 px and Tweede Kamer photos resized with ImageMagick (`pipelines/portraits.mjs`). Small WebP copies, 160 px wide, are made from them for avatars and lists (`web/scripts/build-thumbs.mjs`). Tiles and the person page show a photo cut to a frame (`object-fit: cover`). So every served image is resized, and most are shown cropped. CC BY and CC BY-SA ask that changes are indicated. The credit lines in `data/media.json` named author, licence and source, but not the changes. The owner also asked whether `ATTRIBUTION.md` should credit every photo; it should not (see Decision 4).

## Licence families among the 457 portraits

CC0 1.0 (182), CC BY-SA 4.0 (106), CC BY 3.0 (69), CC BY 2.0 (35), CC BY-SA 3.0 (23), CC BY 4.0 (18), CC BY-SA 2.0 (10), public domain (6), "Attribution" (4, Commons label without a version), European Parliament (3), Commons "Copyrighted free use" (1).

## What each licence requires (read on 05-10-2026)

- CC BY 4.0, https://creativecommons.org/licenses/by/4.0/legalcode.en, section 3(a)(1): identify the creator, give a copyright notice, a notice that refers to the licence, a notice that refers to the disclaimer, and a URI or hyperlink to the material "to the extent reasonably practicable"; and "indicate if You modified the Licensed Material and retain an indication of any previous modifications". Section 3(a)(2): "You may satisfy the conditions in Section 3(a)(1) in any reasonable manner based on the medium, means, and context". Section 2(a)(6): no implied endorsement.
- CC BY-SA 4.0, https://creativecommons.org/licenses/by-sa/4.0/legalcode.en: the same attribution, plus section 3(b): the Adapter's License "must be a Creative Commons license with the same License Elements, this version or later, or a BY-SA Compatible License", its text or link must be included, and no further terms may restrict it.
- CC BY 3.0 and 2.0, https://creativecommons.org/licenses/by/3.0/legalcode and https://creativecommons.org/licenses/by/2.0/legalcode, section 4(b): keep copyright notices, give the author's name, the title if supplied, the URI where reasonably practicable, "reasonable to the medium or means You are utilizing", and for an adaptation "a credit identifying the use of the Work in the Adaptation" (3.0) or "Derivative Work" (2.0).
- CC BY-SA 3.0 and 2.0, https://creativecommons.org/licenses/by-sa/3.0/legalcode and https://creativecommons.org/licenses/by-sa/2.0/legalcode, section 4(a): an adaptation may be distributed "only under the terms of this License, a later version of this License with the same License Elements" (2.0 also: a Creative Commons iCommons licence with the same elements), with a copy of or the URI of that licence; section 4(c) (3.0) and 4(b) (2.0): the same credit as BY.
- CC0 1.0, https://creativecommons.org/publicdomain/zero/1.0/legalcode: the affirmer "waives, abandons, and surrenders all of Affirmer's Copyright and Related Rights". No attribution is required.
- European Parliament, https://www.europarl.europa.eu/legal-notice/en/: reuse "is authorised, for personal use or for further non-commercial or commercial dissemination, provided that the entire item is reproduced and the source is acknowledged", credited "© European Union, [year(s)] – Source: European Parliament". Partial reproduction must cite the URL of the complete item.
- "Attribution" (Commons label), public domain and "Copyrighted free use": no deed with a fixed text. The Commons file page is the reference and is linked as the source; ADR 0014 amendments 1 and 2 cover them.

## Decision

1. **The credit sits next to the photo, in the (i).** On a person page the (i) shows author (or "niet vermeld" and the publisher), licence linked to its deed (or the legal notice), the source page by site name with a link, the retrieval date and, new, a line "Verkleind en bijgesneden door Staatsgraaf" / "Resized and cropped by Staatsgraaf". This meets the attribution elements above in the form each licence allows ("any reasonable manner based on the medium"). In lists, the tooltip and the text for screen readers carry the same credit line. No separate list of photos is published.
2. **The credit line states the changes.** `mediaCreditLine` (`web/lib/entity.ts`) ends the line with ", verkleind en bijgesneden" (English: ", resized and cropped") for every licence except CC0 and public domain. `data/media.json` is not rewritten. The wording is true for every served image: the stored file is scaled down, the 160 px copy is scaled down again, and the frame crops it.
3. **CC BY-SA photos say they are shared under the same licence.** For CC BY-SA 2.0, 3.0 and 4.0 the (i) adds "Deze verkleinde en bijgesneden versie wordt gedeeld onder dezelfde licentie, CC BY-SA x.y." with a link to the deed. The licence row already links the same deed. The share-alike term stays with the file and does not touch the dataset licence (ADR 0014, amendment 3).
4. **`ATTRIBUTION.md` is general.** It states the dataset licence and what reuse requires, one row per source family with a link to its terms page, and one paragraph each for portraits, news and sources with no established licence. It lists no individual source or photo; those stay in `data/sources.json` and `data/media.json`.

## To confirm

- Whether a scaled-down copy shown in a frame counts as an adaptation under the 2.0 and 3.0 licences (they speak of a derivative or adaptation) or only as a copy. Treating it as one is the safe reading and is what the decision does.
- European Parliament: the notice asks for "the entire item". Frames crop the three photos. The (i) links the source page, which holds the complete item, but a lawyer should say whether that is enough or whether those three should be shown uncropped.
- Previous modifications: some Commons files are cropped versions made by others ("(cropped)" in the file name). The credit names the Commons file author and links the file page, which holds the history. Whether that suffices for "retain an indication of any previous modifications" is not verified.
- The deed text above was read through a summarising fetch tool on 05-10-2026. A person should read the cited sections once.
