# Party colours research, 18-09-2026

Method: colours were fetched, not recalled. For each party I first tried the party's own website and read the hex values in its HTML and CSS. Where the site is JavaScript-rendered or unreachable, I used the official party logo file on Wikimedia Commons (an SVG, so exact hex fills can be read) or the colour field ("Kleuren") in the Dutch Wikipedia party infobox, cross-checked against the sRGB colour property (P465) in Wikidata. A colour is "high" confidence when the party's own site or official logo shows it, "medium" when it rests on secondary sources or when sources conflict slightly, and gaps are named rather than filled. Two of the domains in the task list do not belong to the parties they were listed for: nsc.nl is a construction company, and "Partij voor de Regio" does not exist; PRO in this dataset is Progressief Nederland (see notes). Dates are dd-MM-YYYY.

## Table

| Party (abbrev) | Full name (nl) | Full name (en) | Colour hex | Source URL | Retrieved | Confidence |
| --- | --- | --- | --- | --- | --- | --- |
| VVD | Volkspartij voor Vrijheid en Democratie | People's Party for Freedom and Democracy | #FF6400 | https://www.vvd.nl | 18-09-2026 | high |
| D66 | Democraten 66 | Democrats 66 | #00AE41 | https://d66.nl | 18-09-2026 | high |
| CDA | Christen-Democratisch Appèl | Christian Democratic Appeal | #2CC84D | https://cda.nl | 18-09-2026 | medium |
| PvdA | Partij van de Arbeid (Nederland) | Labour Party (Netherlands) | #E00913 | https://nl.wikipedia.org/wiki/Partij_van_de_Arbeid_(Nederland) | 18-09-2026 | medium |
| PVV | Partij voor de Vrijheid | Party for Freedom | #012758 | https://nl.wikipedia.org/wiki/Partij_voor_de_Vrijheid | 18-09-2026 | medium |
| SGP | Staatkundig Gereformeerde Partij | Reformed Political Party | #EA5D06 | https://nl.wikipedia.org/wiki/Staatkundig_Gereformeerde_Partij | 18-09-2026 | medium |
| CU | ChristenUnie | Christian Union | #00A7EB | https://nl.wikipedia.org/wiki/ChristenUnie | 18-09-2026 | medium |
| SP | Socialistische Partij | Socialist Party | #E9161D | https://www.sp.nl | 18-09-2026 | high |
| PvdD | Partij voor de Dieren | Party for the Animals | #00743C | https://commons.wikimedia.org/wiki/File:Partij_voor_de_Dieren_icon.svg | 18-09-2026 | high |
| GL | GroenLinks | GreenLeft | #39A935 | https://nl.wikipedia.org/wiki/GroenLinks | 18-09-2026 | medium |
| FVD | Forum voor Democratie | Forum for Democracy | #A71C20 | https://nl.wikipedia.org/wiki/Forum_voor_Democratie | 18-09-2026 | medium |
| JA21 | JA21 | JA21 | #1F2756 | https://nl.wikipedia.org/wiki/JA21 | 18-09-2026 | medium |
| BBB | BoerBurgerBeweging | Farmer-Citizen Movement | #93C01F | https://commons.wikimedia.org/wiki/File:BoerBurgerBeweging_logo.svg | 18-09-2026 | high |
| DENK | DENK | DENK | #00B7B2 | https://denk.nl | 18-09-2026 | high |
| Volt | Volt Nederland | Volt Netherlands | #502379 | https://voltnederland.org | 18-09-2026 | high |
| 50PLUS | 50PLUS | 50PLUS | #84236D | https://www.50pluspartij.nl | 18-09-2026 | high |
| NSC | Nieuw Sociaal Contract | New Social Contract | #13123B | https://nl.wikipedia.org/wiki/Nieuw_Sociaal_Contract | 18-09-2026 | medium |
| PRO | Progressief Nederland | Progressive Netherlands | #00AA00 | https://commons.wikimedia.org/wiki/File:Progressief_Nederland_logo_liggend.svg | 18-09-2026 | medium |
| (partijloos) | Partijloos / onafhankelijk | Independent (no party) | GAP | none found | 18-09-2026 | low |
| (Groep Markuszower) | Groep Markuszower | Markuszower Group (parliamentary group) | #2F3C73 | https://nl.wikipedia.org/wiki/Groep_Markuszower | 18-09-2026 | medium |
| OPNL | Onafhankelijke Politiek Nederland | Independent Politics Netherlands | #0D2958 | https://www.opnl.nl | 18-09-2026 | medium |
| FNP | Fryske Nasjonale Partij | Frisian National Party | #21366B | https://commons.wikimedia.org/wiki/File:Frisian_National_Party_logo_(2019%E2%80%93present).svg | 18-09-2026 | high |
| Water Natuurlijk | Water Natuurlijk | Water Naturally (water board party) | #0083F1 | https://commons.wikimedia.org/wiki/File:Water_Natuurlijk_logo.svg | 18-09-2026 | high |

## Gaps

- partijloos. No brand colour exists and no source states one. It is conventionally rendered grey in visualisations, but I found no citable source for a specific grey hex. Per the project rule, ship it as a named gap with a UI convention note, not as a sourced colour.
- NSC. The party's own site (nieuwsociaalcontract.nl, the true official domain) is JavaScript-rendered and exposes no hex values. The colour rests on the Dutch Wikipedia infobox (#13123B "Donkerblauw", with #F0C400 "Geel" as the second colour). Wikidata's P465 for NSC is #F0C400 only. Confidence medium. Note that nsc.nl is a completely different company ("Merkenbouwers & Full-Service Sectorspecialist") and must not be used as the party source.
- PVV. pvv.nl exposes no brand hex values. The value rests on the Dutch Wikipedia infobox (#012758 "Marineblauw"); Wikidata carries #234672. Both are dark navy. Confidence medium.
- CDA. cda.nl contains green #2CC84D, but the site does not clearly designate it as the primary brand colour and the green is used sparingly. Wikipedia infobox says #28C94C, Wikidata says #1F9359. All three are the same family of CDA green. Confidence medium.
- Groep Markuszower. The group's related party website denederlandsealliantie.nl serves no brand colours at all. The value rests on the Dutch Wikipedia infobox (#2F3C73 "Blauw"). Confidence medium.
- PRO. progressiefnederland.nl is JavaScript-rendered with no hex values. The value rests on the official logo SVG (#00AA00) plus the Wikipedia infobox ("Groen, Rood") and Wikidata P465 (#00AD00). The primary colour is not yet firmly established weeks after the fusion. Confidence medium.

## Notes

- PRO is not "Partij voor de Regio". The partijvoorderegio.nl domain in the task list does not correspond to the dataset entity. PRO is Progressief Nederland, the fusion party of GroenLinks and the PvdA, founded 1 July 2026 after the members voted for fusion in June 2025 and the name was announced 26 March 2026 (NOS, 26-03-2026). It is the largest party in the Tweede Kamer bloc picture with 20 seats (2025 election, as GroenLinks-PvdA) and leads in the Eerste Kamer (14) and Europees Parlement (8). In provincial contexts the GroenLinks and PvdA fractions largely continue as separate fractions until the elections, which likely explains the 34 members appearing under the separate labels.
- GroenLinks and PvdA still exist as organisations for provincial and water board work, so both keep their own colour records in the dataset. GroenLinks uses green #39A935 with red #DD2132 as second colour; PvdA red #E00913.
- Water Natuurlijk is endorsed by D66, GroenLinks (now PRO) and Volt, who stay out of water board elections. The English Wikipedia infobox lists its colours as "blue and green"; the official logo is blue #0083F1, so blue is the primary.
- Groep Markuszower is a Tweede Kamer group of 7 seats formed on 20 January 2026 by members who left the PVV (largest split in Kamer history, per NOS 20-01-2026). A related party, De Nederlandse Alliantie (DNA), was registered on 17 April 2026; Wikidata gives it #374051, but its site exposes no colour. Because the dataset entity is the group, I sourced the group colour.
- OPNL. The official domain is opnl.nl (opnl.org from the task list does not respond). The current site identity is dark navy #0D2958 with red #D32E0E and yellow #FFD500 accents. The legacy Wikidata and Wikipedia value is #CBBB9F (beige, from the Onafhankelijke Senaatsfractie era). I report the current site navy as primary and flag the legacy value.
- 50PLUS. The official site is 50pluspartij.nl; 50plus.nl did not respond. The site tagline is "Paars is de kleur van de nieuwe politiek" (purple). The site CSS uses #84236D; Wikipedia says #800080 and Wikidata #92107D. All are purple; the official-site value is used.
- VVD. The official site's logo SVG carries a default fill of #FF6400 (orange), so orange is used as the primary. The site also uses ultramarine #0328CB heavily, and the Wikipedia infobox lists "Ultramarijn" first, then "Oranje". If the app wants ultramarine instead, #0328CB is the sourced alternative.
- Several parties' official sites are JavaScript-rendered (pvda.nl, groenlinks.nl, groenlinkspvda.nl, progressiefnederland.nl, boerburgerbeweging.nl, partijvoordedieren.nl home page), so for those the logo SVG on Commons or the Wikipedia colour field is the working source. A future pass could render those pages headlessly and read the CSS custom properties directly, which would upgrade several medium entries to high.
- Volt's Wikidata value (#582C83) differs slightly from the party site value (#502379); both are Volt purple. CU's site accent (#00C1ED) differs slightly from the Wikipedia and Wikidata value (#00A7EB); both are CU light blue.
