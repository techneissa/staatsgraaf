# Workstream S: zaalindeling (zetelnummers plenaire zaal)

- Gegenereerd: 19-09-2026
- Vraag: het zetelnummer in de plenaire zaal van elk huidig lid van de Tweede Kamer en, als het gepubliceerd is, van de Eerste Kamer.
- Werkwijze: fetch, nooit uit het geheugen; geen nummer afgelezen uit een tekening. Alle 30 URL's zijn op 19-09-2026 opgehaald met curl; pdf's zijn met pdftotext op een tekstlaag gecontroleerd.
- Uitkomst in een zin: geen van beide Kamers publiceert een zetelnummer per lid. Er zijn 0 memberships bijgewerkt; beide Kamers staan als gap.

## Endpoints

| URL | Opgehaald | Status | Wat het bevatte |
| --- | --- | --- | --- |
| https://www.tweedekamer.nl/kamerleden_en_commissies/alle_kamerleden | 19-09-2026 | 200 | Ledenoverzicht. 0 treffers op 'zetel' en 'plattegrond' in de HTML, geen link naar een zaalindeling. |
| https://www.tweedekamer.nl/zoeken?qry=plattegrond+plenaire+zaal | 19-09-2026 | 200 | 8 resultaten: persinformatiepagina Opnamerichtlijnen voor journalisten, vier Kamerstukken (ventilatieonderzoek 2020, projectbeschrijving 2009, integriteitsrapport 2014, brief renovatie Binnenhof 2018), twee plenaire verslagen. Geen zetelnummers. |
| https://www.tweedekamer.nl/zoeken?qry=zetelindeling | 19-09-2026 | 200 | 0 resultaten. |
| https://www.tweedekamer.nl/zoeken?qry=zetelnummer | 19-09-2026 | 200 | 0 resultaten. |
| https://www.tweedekamer.nl/zoeken?qry=zaalindeling | 19-09-2026 | 200 | 6 resultaten, Kamerstukken en plenaire verslagen; geen zaalindeling van de plenaire zaal. |
| https://www.tweedekamer.nl/zoeken?qry=wie+zit+waar | 19-09-2026 | 200 | 15 resultaten, alleen Kamerstukken en plenaire verslagen. |
| https://www.tweedekamer.nl/zoeken?qry=zetelverdeling+plenaire+zaal | 19-09-2026 | 200 | 14 resultaten, waaronder de pagina Wie zit waar?. |
| https://www.tweedekamer.nl/zoeken?qry=zitplaats+kamerleden | 19-09-2026 | 200 | 15 resultaten over commissiezalen en Kamerstukken. |
| https://www.tweedekamer.nl/kamerleden-en-commissies/wie-zit-waar | 19-09-2026 | 200 | 'Welke fractie zit waar in de plenaire zaal van de Tweede Kamer?' met een link naar de pdf Zetelverdeling plenaire zaal. Geen zetelnummers per lid. |
| https://www.tweedekamer.nl/sites/default/files/2026-06/zetelverdeling%20Juni%202026%20NL.pdf | 19-09-2026 | 200 | 1 pagina, 'Zetelverdeling plenaire zaal, juni 2026' (pdf-metadata: aangemaakt 11-06-2026). Tekstlaag: per fractie een blok met zeteltal (D66 26, VVD 22, PRO 20, PVV 19, CDA 18, JA21 9, FVD 7, BBB 3, DENK 3, SGP 3, PvdD 3, ChristenUnie 3, SP 3, 50PLUS 2, Volt 1, Groep Markuszower 7, Lid Keijzer 1) en legenda 1 t/m 7 (Voorzitter, Griffier, Kabinet vak-K, Medewerkers Verslag en Redactie, Spreekgestoelte, Interruptiemicrofoons, Bodedienst). Geen ledennamen, geen zetelnummers per lid. |
| https://www.tweedekamer.nl/contact-en-bezoek/persinformatie/opnamerichtlijnen-voor-journalisten | 19-09-2026 | 200 | Links naar drie pdf's: opnamerichtlijnen november 2024, plattegrond plenaire zaal, plattegrond commissiezalen. |
| https://www.tweedekamer.nl/sites/default/files/2024-12/20241204-opnamerichtlijnen-plattegrond-plenaire-zaal.pdf | 19-09-2026 | 200 | 1 pagina zonder tekstlaag; plattegrond voor cameraposities. Geen zetelnummers in tekst. |
| https://www.tweedekamer.nl/sites/default/files/2024-12/20241127_Opnamerichtlijnen_voor_journalisten_november_2024.pdf | 19-09-2026 | 200 | Opnamerichtlijnen; 0 treffers op 'zetel', 'plattegrond', 'zitplaats'. |
| https://www.tweedekamer.nl/kamerleden_en_commissies/alle_kamerleden/abassi-i-el-denk | 19-09-2026 | 200 | Steekproef ledenprofiel; 0 treffers op 'zetel' of 'zitplaats'. |
| https://gegevensmagazijn.tweedekamer.nl/OData/v4/2.0/$metadata | 19-09-2026 | 200 | 38 entiteittypen. FractieZetel: Id, Gewicht, Fractie_Id. FractieZetelPersoon: Id, FractieZetel_Id, Persoon_Id, Functie, Van, TotEnMet. Persoon.Nummer is een persoonsnummer. Zaal: Id, Naam, SysCode, gekoppeld aan Reservering. Geen property met een zetelnummer of zaalpositie voor een lid. |
| https://gegevensmagazijn.tweedekamer.nl/OData/v4/2.0/FractieZetel?$top=5&$expand=Fractie($select=Afkorting)&$format=json | 19-09-2026 | 200 | Gewicht bevat waarden als 14, 17 en 10000: een sorteergewicht, geen zetelnummer. |
| https://gegevensmagazijn.tweedekamer.nl/OData/v4/2.0/Zaal?$top=20&$format=json | 19-09-2026 | 200 | Vergaderzalen met naam en SysCode, onder meer 'Plenaire zaal Tweede Kamer' (79). Geen zetels. |
| https://opendata.tweedekamer.nl/ | 19-09-2026 | 200 | Portaalpagina; 0 treffers op 'zetel', 'zaal', 'plattegrond'. |
| https://opendata.tweedekamer.nl/documentatie/informatiemodel | 19-09-2026 | 200 | 'zetel' alleen in CommissieZetel* en FractieZetel*; geen zaalpositie. |
| https://www.eerstekamer.nl/zoeken?q=zetelindeling | 19-09-2026 | 200 | 'Geen resultaten met zetelindeling'; het menu bevat Wie zit waar?. |
| https://www.eerstekamer.nl/plenaire_zaal | 19-09-2026 | 404 | Bestaat niet. |
| https://www.eerstekamer.nl/alle_leden | 19-09-2026 | 200 | Ledenoverzicht; 0 treffers op 'zetel', 'plattegrond', 'zaal'. |
| https://www.eerstekamer.nl/wie_zit_waar | 19-09-2026 | 200 | Interactieve plattegrond: 75 cellen met class 'lid', data-fractie en de naam van het lid. Linker bankjes 10 rijen (3, 3, 4, 4, 4, 4, 4, 4, 4, 5 cellen), rechter bankjes 10 rijen (3, 3, 4, 4, 4, 4, 4, 4, 3, 3 cellen), 1 cel in het middenblok. Attributen: alleen class, data-fractie, type. Geen zetelnummer in tekst of attribuut. De intro zegt 'Ieder Kamerlid heeft een vaste plek, ook wel zetel genoemd', zonder nummering. |
| https://www.eerstekamer.nl/wie_zit_waar?layout=print | 19-09-2026 | 200 | Printversie; 'zetel' 5 keer, alleen in de intro en de kop 'Fracties/zetels'. Geen nummers. |
| https://www.eerstekamer.nl/9370221/v/js/wiezitwaar.js | 19-09-2026 | 200 | Toggle- en popuplogica; geen zeteldata. |
| https://www.eerstekamer.nl/persoon/r_van_aelst_den_uijl_ma_sp | 19-09-2026 | 200 | Steekproef biografiepagina; 0 treffers op 'zetel', 'zitplaats', 'plattegrond'. |
| https://data.overheid.nl/zoeken?q=tweede+kamer+zetel | 19-09-2026 | 200 | Zoekpagina zonder bruikbare resultatenlijst in de HTML; herhaald via de CKAN-API. |
| https://data.overheid.nl/community/organization/tweede-kamer | 19-09-2026 | 404 | Bestaat niet. |
| https://data.overheid.nl/data/api/3/action/package_search?q=tweede+kamer&rows=50 | 19-09-2026 | 200 | 186 datasets: verkiezingsuitslagen (DONL, gemeenten), CBS 'Verkiezingsuitslag en zetelverdeling Tweede Kamer' per verkiezingsjaar, 'Open Data Portaal van de Tweede Kamer der Staten-Generaal'. Geen zaalindeling. |
| https://data.overheid.nl/data/api/3/action/package_search?q=zetel+plenaire+zaal&rows=20 | 19-09-2026 | 200 | 0 datasets. |

## Tellingen

- Tweede Kamer: 150 open memberships in `data/memberships.json`, 0 bijgewerkt. Zetelnummer per lid niet gepubliceerd.
- Eerste Kamer: 75 open memberships in `data/memberships.json`, 0 bijgewerkt. Plek per lid gepubliceerd als cel op een plattegrond, zetelnummer niet gepubliceerd.
- Endpoints: 30 opgehaald (26 keer 200, 3 keer 404, 1 keer 200 zonder bruikbare inhoud).
- Bronrecords: 6.
- Memberships in de envelope: 0.
- Gaps: 2.

## Toelichting

- Tweede Kamer. De enige officiële zaalindeling is de factsheet Zetelverdeling plenaire zaal (juni 2026), gelinkt vanaf de pagina Wie zit waar?. Die tekent blokken per fractie met het zeteltal en nummert alleen zaalfuncties (1 Voorzitter tot en met 7 Bodedienst). Namen van leden en zetelnummers per lid staan er niet in. De pdf Opnamerichtlijnen plattegrond plenaire zaal (04-12-2024) heeft geen tekstlaag en is bedoeld voor cameraposities. Het OData-gegevensmagazijn modelleert een 'FractieZetel' als een zetel van een fractie met een sorteergewicht (`Gewicht`), niet als een plek in de zaal; `Persoon.Nummer` is een persoonsnummer en `Zaal` is de vergaderzaal voor reserveringen. De sitezoekopdrachten 'zetelnummer' en 'zetelindeling' geven 0 resultaten en een ledenprofiel noemt geen zetel.
- Eerste Kamer. De pagina Wie zit waar publiceert per lid een vaste plek: 75 HTML-cellen met naam en fractie, verdeeld over linker en rechter bankjes van elk 10 rijen plus 1 middencel. Er staat geen nummer bij een cel, niet in de tekst, niet in een attribuut, niet in de printversie en niet in het script. Een rij- en kolomindex uit de opmaak afleiden zou een eigen nummering zijn en geen gepubliceerd feit; daarom is dat niet gedaan en blijft `seatNumber` null.
- data.overheid.nl. De 186 datasets voor 'tweede kamer' zijn verkiezingsuitslagen en CBS-zetelverdelingen (aantallen per partij), plus de registratie van het Open Data Portaal van de Tweede Kamer; 'zetel plenaire zaal' geeft 0 datasets.
- Namen matchen. Omdat geen enkele bron een zetelnummer per lid geeft, is er geen record om te matchen tegen `data/people.json`; de lijst niet-gematchte leden is daarom leeg.
- Vorm van de envelope. `shared/output-envelope.schema.json` beperkt `workstream` tot A tot en met P en kent in `gaps` geen `id`; op instructie van de orkestrator staat hier `"workstream": "S"` en dragen de gaps een `id`. Elke gap heeft ook het door het schema vereiste veld `resume`. De orkestrator besluit of het schema wordt verruimd.

## Gaps

| id | Wat | Waarom | Endpoint |
| --- | --- | --- | --- |
| gap:s-tk-zetelnummers | `seatNumber` voor alle 150 huidige leden van de Tweede Kamer (150 membership-records) | Niet gepubliceerd. Alleen een plattegrond per fractie met zeteltallen en een legenda voor zaalfuncties; geen ledennamen, geen nummers per lid. OData kent geen zetelproperty. Zoekopdrachten 'zetelnummer' en 'zetelindeling' geven 0 resultaten. | https://www.tweedekamer.nl/kamerleden-en-commissies/wie-zit-waar |
| gap:s-ek-zetelnummers | `seatNumber` voor alle 75 huidige leden van de Eerste Kamer (75 membership-records) | Plek per lid is gepubliceerd als cel op een interactieve plattegrond, maar zonder zetelnummer in HTML, printversie, script of biografiepagina. Een nummer uit de rij- en kolompositie afleiden zou een eigen nummering zijn. | https://www.eerstekamer.nl/wie_zit_waar |

Hervatten: controleer bij een volgende run of tweedekamer.nl een zaalindeling per lid publiceert of het gegevensmagazijn een zetelproperty toevoegt (vergelijk `$metadata` met de versie van 19-09-2026), en of eerstekamer.nl een nummering aan de cellen van Wie zit waar toevoegt. Als het project zelf rij- en kolomposities wil opnemen, vraagt dat een eigen veld naast `seatNumber` en een ADR.

## Aanvulling 25-09-2026: de plattegronden als data

Op verzoek van de eigenaar (ADR 0018, amendement 3) zijn de plattegronden van beide Kamers opgenomen als eigen record, naast `seatNumber` zoals hierboven bij Hervatten voorgesteld. `seatNumber` blijft null: een rij en kolom zijn de plek in de tekening of opmaak van de bron, geen zetelnummer.

| URL | Opgehaald | Status | Wat het bevatte |
| --- | --- | --- | --- |
| https://www.tweedekamer.nl/kamerleden-en-commissies/wie-zit-waar | 25-09-2026 | 200 | Link naar de pdf Zetelverdeling plenaire zaal van juni 2026 (ongewijzigd sinds 19-09-2026). |
| https://www.tweedekamer.nl/sites/default/files/2026-06/zetelverdeling%20Juni%202026%20NL.pdf | 25-09-2026 | 200 | Vectortekening van 150 zetels in vijf vakken, elke zetel in de kleur van een fractie uit de legenda; legenda 1 t/m 7 voor zaalfuncties. |
| https://www.eerstekamer.nl/wie_zit_waar | 25-09-2026 | 200 | 75 ledencellen met naam en fractie: linker bankjes 10 rijen (3, 3, dan acht keer 4 cellen, samen 38), rechter bankjes 10 rijen (3, 3, 4, 4, 4, 4, 4, 4, 3, 3, samen 36), 1 cel in het middenblok (de voorzitter). De regeringstafel ('regering chevron') staat midden boven, tegenover de voorzitter. |

- Werkwijze: `research/S-zaalindeling-plans.py` leest de pdf en de pagina zoals gedownload. De pdf wordt op 400 dpi gerasterd en langs de witte lijnen in zetels gesplitst; elke zetel krijgt de fractie waarvan de legendakleur het dichtst bij zijn pixels ligt, en een zetel in twee kleuren (groen en rood) is PRO. Het script stopt als het aantal per fractie afwijkt van de legenda. Uitkomst: 150 zetels, per fractie gelijk aan de legenda en aan de open memberships in `data/memberships.json`.
- Eerste Kamer: alle 75 namen matchen een open membership (negen na het weglaten van de komma voor een achtervoegsel als 'MA' of 'MSc'); de voorzitter in de middencel is dr. M.L. Vos, gelijk aan de open tenure als voorzitter.
- Correctie op de telling van 19-09-2026 hierboven: de linker bankjes tellen 3, 3 en daarna acht keer 4 cellen (38), niet 3, 3, zeven keer 4 en 5; met 36 rechts en 1 in het midden is dat 75.
- Tweede Kamer, zetel per lid: blijft een gap (gap:s-tk-zetelnummers). De factsheet toont per zetel een fractie, geen lid.
