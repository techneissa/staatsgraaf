# Workstream V: verbindingen van het Koninkrijk en de samenwerkingsverbanden

- Gegenereerd: 25-09-2026
- Aanleiding: de eigenaar meldde op 25-09-2026 dat onder meer de landen van het Koninkrijk op beide graafvormen (ringen en wiel) geen verbindingen met de rest van de staat toonden.
- Werkwijze: fetch, nooit uit het geheugen. Elke relatie verwijst naar een artikel of registerregel die op 25-09-2026 is opgehaald. Wat niet uit een officiële bron kwam, staat onder gaps.

## Wat ontbrak

Een telling op `data/relations.json` plus het `parent`-veld gaf 73 organisaties zonder enige relatie, en de organen van Aruba, Curaçao en Sint Maarten waren alleen binnen hun eigen land verbonden:

- de regering, de Staten en de ministeries van elk land, zonder lijn naar het Koninkrijk;
- de Algemene Rekenkamer, de Nationale ombudsman, de Dienst van het Koninklijk Huis, de Kanselarij der Nederlandse Orden, de Rijksvertegenwoordiger BES en het Kabinet (van ministers en staatssecretarissen);
- de koepels VNG, IPO en Unie van Waterschappen;
- alle 25 veiligheidsregio's, 15 GGD'en en 24 omgevingsdiensten.

## Endpoints

| Bron | URL | Opgehaald | Status |
| --- | --- | --- | --- |
| Statuut voor het Koninkrijk (geldend vanaf 01-01-2024) | https://wetten.overheid.nl/BWBR0002154/ | 25-09-2026 | 200 |
| Grondwet (geldend vanaf 22-02-2023) | https://wetten.overheid.nl/BWBR0001840/ | 25-09-2026 | 200 |
| Rijkswet financieel toezicht Curaçao en Sint Maarten | https://wetten.overheid.nl/BWBR0028132/ | 25-09-2026 | 200 |
| WolBES (geldend vanaf 15-09-2026) | https://wetten.overheid.nl/BWBR0028142/ | 25-09-2026 | 200 |
| Wet Nationale ombudsman | https://wetten.overheid.nl/BWBR0003372/ | 25-09-2026 | 200 |
| Comptabiliteitswet 2016 | https://wetten.overheid.nl/BWBR0039429/ | 25-09-2026 | 200 |
| Reglement van orde voor de ministerraad | https://wetten.overheid.nl/BWBR0006501/ | 25-09-2026 | 200 |
| Besluit bepalingen Kabinet van de Koning | https://wetten.overheid.nl/BWBR0016212/ | 25-09-2026 | 200 |
| Kamerstuk 33845 nr. 61 (IPKO juni 2026) | https://zoek.officielebekendmakingen.nl/kst-33845-61.html | 25-09-2026 | 200 |
| Rijksbegroting 2027 hoofdstuk I | https://www.rijksfinancien.nl/memorie-van-toelichting/2027/OWB/I | 25-09-2026 | 200 |
| Rijksbegroting 2027 hoofdstuk IIB | https://www.rijksfinancien.nl/memorie-van-toelichting/2027/OWB/IIB | 25-09-2026 | 200 |
| Rijksoverheid, bestuur van Bonaire, Sint Eustatius en Saba | https://www.rijksoverheid.nl/themas/overheid-en-democratie/caribische-deel-van-het-koninkrijk/bestuur-van-bonaire-sint-eustatius-en-saba | 25-09-2026 | 200 |
| Cft, organisatie | https://www.cft.cw/organisatie/ | 25-09-2026 | 200 |
| IPO, over het IPO | https://www.ipo.nl/over-het-ipo/ | 25-09-2026 | 200 |
| Register van Overheidsorganisaties, VNG | https://organisaties.overheid.nl/28110850/Vereniging_van_Nederlandse_Gemeenten | 25-09-2026 | 200 |
| Register van Overheidsorganisaties, 64 gemeenschappelijke regelingen | https://organisaties.overheid.nl/samenwerkingen/ (een pagina per regeling, zie `endpointsUsed`) | 25-09-2026 | 200 |

## Koninkrijk

Nieuwe organisaties:

- **Rijksministerraad** (`org:rijksministerraad`, koninkrijksorgaan). Statuut art. 7: de raad van ministers van het Koninkrijk bestaat uit de door de Koning benoemde ministers en de Gevolmachtigde Ministers van Aruba, Curaçao en Sint Maarten.
- **College financieel toezicht Curaçao en Sint Maarten** (`org:college-financieel-toezicht-curacao-en-sint-maarten`, toezichthouder). Rijkswet financieel toezicht art. 2 en 4.
- **Interparlementair Koninkrijksoverleg** (`org:interparlementair-koninkrijksoverleg`, koninkrijksorgaan). Kamerstuk 33845 nr. 61: vier delegaties.

Relaties:

| Van | Type | Naar | Grond |
| --- | --- | --- | --- |
| Rijksministerraad | consists_of | Ministerraad | Statuut art. 7 |
| Regering van elk land | part_of | Rijksministerraad | Statuut art. 7 en art. 8 lid 1, via de Gevolmachtigde Minister |
| Rijksministerraad | oversees | Regering van elk land | Statuut art. 43 lid 2 en art. 50 lid 1 (waarborgfunctie, schorsing en vernietiging) |
| Staten van elk land | advises | Tweede Kamer en Eerste Kamer | Statuut art. 15, 16, 17 lid 2 en 18 (verslag en bijzondere gedelegeerden bij ontwerpen van rijkswet) |
| Staten van elk land, Tweede Kamer, Eerste Kamer | joint_arrangement_member | IPKO | Kamerstuk 33845 nr. 61 |
| Rijksministerraad | appoints | Cft | Rijkswet financieel toezicht art. 2 lid 3, vanaf 10-10-2010 |
| Cft | oversees | Regering van Curaçao en van Sint Maarten | Rijkswet financieel toezicht art. 4 lid 1 onder a, vanaf 10-10-2010 |
| Regering | appoints | Rijksvertegenwoordiger BES | WolBES art. 188 lid 1 |
| Rijksvertegenwoordiger BES | oversees | Openbaar lichaam Bonaire, Saba, Sint Eustatius | WolBES art. 204 lid 1 en art. 222 lid 1 |
| Rijksvertegenwoordiger BES | accountable_to | Ministerie van BZK | WolBES art. 222 lid 1 en Rijksoverheid (confidence medium) |

Correcties op de uitgangsvraag, uit de brontekst: de vernietiging van landsmaatregelen gaat bij gemotiveerd besluit van de Koning op voordracht van de raad van ministers, niet bij algemene maatregel van rijksbestuur; toezending van ontwerp-rijkswetten staat in art. 15, niet in art. 16.

## Rijk

| Van | Type | Naar | Grond |
| --- | --- | --- | --- |
| Algemene Rekenkamer | oversees | Regering | Grondwet art. 76; Comptabiliteitswet 2016 art. 7.12 en 7.15 |
| Tweede Kamer | confirms | Algemene Rekenkamer | Grondwet art. 77 lid 1 (voordracht van drie) |
| Tweede Kamer | appoints | Nationale ombudsman | Grondwet art. 78a lid 2; Wet Nationale ombudsman art. 2 |
| Nationale ombudsman | oversees | Regering | Grondwet art. 78a lid 1 |
| Kabinet van de Koning | part_of | Ministerie van Algemene Zaken | Rijksbegroting 2027 hoofdstuk I; Besluit bepalingen Kabinet van de Koning art. 2 lid 2 |
| Ministerie van Algemene Zaken | oversees | Dienst van het Koninklijk Huis | Rijksbegroting 2027 hoofdstuk I (confidence medium: begrotingsbeheer, geen instellingsbesluit gevonden) |
| Ministerie van BZK | oversees | Kanselarij der Nederlandse Orden | Rijksbegroting 2027 hoofdstuk IIB art. 4 (confidence medium) |
| Kabinet | consists_of | Ministerraad | Grondwet art. 45 en 46; Reglement van orde voor de ministerraad art. 2 en 3 (confidence medium) |

## Koepels

- **IPO**: de twaalf provincies, elk `part_of` met `metadata.rol: lid`. Bron: ipo.nl, "een privaatrechtelijke samenwerkingsvorm van de twaalf provincies".
- **VNG**: alle 342 gemeenten, elk `part_of` met `metadata.rol: lid`. Bron: registertekst van de VNG, "de organisatie die alle gemeenten in Nederland en de overzeese gebieden verbindt". De openbare lichamen van Caribisch Nederland zijn niet als lid opgenomen, omdat de tekst dat niet uitdrukkelijk zegt.
- **Unie van Waterschappen**: niet gekoppeld, zie gaps.

## Samenwerkingsverbanden

Elk van de 64 organen verwijst in het Register van Overheidsorganisaties naar zijn gemeenschappelijke regeling. Die pagina heeft een tabel "Deelnemende organisaties" met de datum van toetreding. Per deelnemer is een relatie `joint_arrangement_member` van gemeente of provincie naar het orgaan opgenomen, met die datum als `validFrom`.

| Soort | Organen | Relaties |
| --- | --- | --- |
| Veiligheidsregio | 25 | 342 |
| GGD | 15 | 219 |
| Omgevingsdienst | 24 | 337, waarvan 24 van een provincie |
| Totaal | 64 | 898 |

Beslissingen:

- Bij Veiligheidsregio Amsterdam-Amstelland en Zuid-Limburg noemt het register een tweede regeling (Ombudsman metropool Amsterdam, Solido). Die zijn niet gebruikt; alleen de regeling van de veiligheidsregio zelf telt.
- Negen registernamen wijken af van de namen in de dataset en zijn met de hand gekoppeld: Beek, Bergen (L), Bergen (NH), Den Haag, Hengelo, Laren, Middelburg, Rijswijk en Stein.
- Het aantal gelezen deelnemers is voor elke regeling gelijk aan het aantal dat het register in de kop noemt.

## Tellingen

- Relaties: 1286 (903 joint_arrangement_member, 358 part_of, 12 oversees, 6 advises, 3 appoints, 2 consists_of, 1 accountable_to, 1 confirms). Confidence: 1282 high, 4 medium.
- Organisaties: 3 nieuw. Bronnen: 73 nieuw. Gaps: 5.

## Gaps

1. Unie van Waterschappen: de ledenlijst was niet op te halen (403 en Cloudflare-uitdaging).
2. Gemeenschappelijk Hof van Justitie: het Hof bestaat (BWBR0028070 art. 15) en de Hoge Raad is cassatierechter (BWBR0002356 art. 1), maar het model heeft geen relatietype voor rechtsgang tussen gerechten. Het Hof is daarom nog niet opgenomen.
3. College Aruba financieel toezicht: alleen de Cft-site noemt de grondslag; de landsverordening zelf is niet opgehaald.
4. Kiezers van de landen: alleen de Staatsregeling van Aruba is als tekst bevestigd; die van Curaçao is een scan zonder tekstlaag en die van Sint Maarten laadt via script.
5. Raad van State van het Koninkrijk: Statuut art. 13 lid 2 benoemt een lid voor een land alleen op verzoek; welke landen dat nu doen is niet opgehaald.
