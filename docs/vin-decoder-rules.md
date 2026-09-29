# Elroco VIN Decoding Code

Version 1.0 — 29 September 2026. Implemented in `app/lib/vin/` (engine, country table, model-year table, and one rule file per manufacturer under `app/lib/vin/makes/`). Tested by `scripts/vin/run-tests.ts` against the VINs in `scripts/vin/user-vins.txt` and `scripts/vin/fixtures.json`.

---

## Part 1 — Preliminary

**Rule 1. Purpose.** This Code sets out how Elroco decodes a 17-character Vehicle Identification Number (VIN) into the facts it encodes, position by position, for vehicles sold new in Australia. Vehicles built for other markets (grey and private imports) are decoded where the same rules apply, but they are not the aim of this Code.

**Rule 2. Definitions.**
- (a) *Position* means a character's place in the VIN, counted 1 to 17 from the left.
- (b) *WMI* (World Manufacturer Identifier) means positions 1–3.
- (c) *VDS* (Vehicle Descriptor Section) means positions 4–9.
- (d) *VIS* (Vehicle Identifier Section) means positions 10–17.
- (e) *Confirmed* means the meaning is supported by two independent sources, or by one documentary source and at least one real Australian VIN whose description matches.
- (f) *Single-sourced* means supported by one source only. Single-sourced meanings are decoded but carry a note saying so.
- (g) *Filler* means a character that carries no meaning on vehicles built for Australia.

**Rule 3. Order of decoding.** Every VIN is decoded in this order and the result is shown in this order:
- (a) position 1 — region of origin (Rule 6);
- (b) positions 1–2 — country of origin (Rule 7);
- (c) positions 1–3 — manufacturer (Rule 8);
- (d) positions 4–17 — each position in turn, by the manufacturer's rules in Part 3, and where Part 3 is silent, by the general rules in Part 2.

**Rule 4. No guessing.** A position whose meaning is not confirmed or single-sourced under Rule 2 is shown as *Not decoded*. A value is never inferred, estimated or copied from a similar vehicle. Where a manufacturer does not encode a fact (for example the model year on Toyotas), the decoder says so instead of leaving a blank.

---

## Part 2 — General rules (all VINs)

**Rule 5. Validation.**
- (a) A VIN has exactly 17 characters. A shorter number is a chassis number (Australian vehicles before 1989) and is rejected with that explanation.
- (b) The letters I, O and Q never appear in a VIN. A VIN containing them is rejected.

**Rule 6. Region of origin (position 1).** A–H Africa; J–R Asia; S–Z Europe; 1–5 North America; 6–7 Oceania; 8, 9, 0 South America.

**Rule 7. Country of origin (positions 1–2).** Decoded from the ISO 3779 allocation table in `regions.ts`. Allocations relevant to Australia include: 6A–6W Australia; 7A–7E New Zealand; JA–J0 Japan; KL–KR South Korea; L China; MA–ME India; MF–MK Indonesia; ML–MR Thailand; NL–NR Turkey; PL–PR Malaysia; SA–SM United Kingdom; TJ–TP Czech Republic; TR–TV Hungary; U5–U7 Slovakia; VF–VR France; VS–VW Spain; W Germany; YS–YW Sweden; ZA–ZR Italy; 1, 4, 5 United States; 2 Canada; 3A–3W Mexico; 8A–8E Argentina; 9A–9E and 93–99 Brazil.

**Rule 8. Manufacturer (positions 1–3).** Decoded from the WMI table in `app/lib/wmi.ts`. Where the WMI has no rule in Part 3, the make is taken from the WMI make list in `engine.ts` if listed.

**Rule 9. Check digit (position 9).**
- (a) The check digit is calculated by the ISO 3779 method (transliterate, weight 8-7-6-5-4-3-2-10-0-9-8-7-6-5-4-3-2, sum, remainder of division by 11; 10 is written X).
- (b) Where the manufacturer's rule says it does not use a check digit on Australian-delivered vehicles, position 9 is described as such and a mismatch is not an error.
- (c) Otherwise a mismatch is shown with the expected digit and a note that it may be a typing error.

**Rule 10. Model year (position 10).**
- (a) The ISO year code repeats every 30 years: A = 1980 or 2010 … Y = 2000 or 2030, 1–9 = 2001–2009 or 2031–2039. I, O, Q, U, Z and 0 are never year codes.
- (b) The 30-year ambiguity is resolved using the year window in the manufacturer's rule, or 1981 to next year if none.
- (c) Where the manufacturer's rule says position 10 is not a year on Australian-delivered vehicles, it is shown as *Filler* with that explanation.
- (d) A model year is not a build date. Cars built late in a calendar year often carry the next year's code.

**Rule 11. Production sequence (positions 12–17).** The serial number, unless the manufacturer's rule uses some of these positions for other data (Ford Australia, Rule 17).

**Rule 12. Online supplement.** After the local rules run, the US NHTSA vPIC service is asked to fill empty fields when the VIN has the North-American layout (first character 1–5, or 7F–70) or when no local rule named the model. Local rules always take priority over vPIC.

---

## Part 3 — Manufacturer rules

Each Division lists the WMIs it covers, then what each position means. Positions not listed follow Part 2. Sources are given at the head of each rule file.

### Division 1 — Holden (`makes/holden.ts`, `makes/others.ts`)

**Rule 13. Holden, WMI 6H8 (Elizabeth, 1988 – November 2002).**
- (a) Positions 4–5, model series: VN, VP, VR, VS, VT, VX Commodore; VG, VU Utility; VQ, WH Statesman/Caprice; V2 Monaro. VT is split by serial: 464495 and above is VT Series II (Holden Service Techline, 31/05/1999).
- (b) Position 6, luxury level: K Executive/S/SS (shared); L Berlina; X Calais; S SS; Y Statesman; Z Caprice. On the V2 Monaro, K = CV6 and X = CV8.
- (c) Positions 7–8, body: 19 or 69 Sedan; 35 Wagon; 80 Utility; 37 Coupe.
- (d) Position 9, engine (no check digit on 6H8): H 3.8 V6; A 3.8 Ecotec (L36); S and R 3.8 supercharged (L67); U and M 5.0 V8; F 5.7 Gen III (LS1).
- (e) Position 10, model year: J 1988 … Y 2000, 1 2001, 2 2002.
- (f) Position 11, plant: L Elizabeth, South Australia.

**Rule 14. Holden, WMI 6G1 (November 2002 – 2017).**
- (a) Position 4, model: Y VY; Z VZ; E VE; F VF Commodore; K WK, L WL, M WM Statesman/Caprice; N WN Caprice; P Cruze (JG/JH).
- (b) Position 5, luxury level (Commodore): K Executive/Omega/SV6/SV8/SS (shared); L Berlina; X Calais; Z Caprice; Y Statesman; P SS V; C SS; B SV6; J Calais V; E SS V Redline; A International. Cruze: D Equipe/CD; E CDX/SRi/SRi-V/Z-Series (shared).
- (c) Position 6, body (Commodore): 0 cab chassis; 1 coupe; 3 Crewman; 4 utility; 5 sedan; 8 wagon. Cruze: 5 sedan; 6 hatch.
- (d) Position 7, restraint: 1 active belts; 2 driver and passenger airbags; 3 driver airbag; 4 driver, passenger and side airbags; E load-limiting belts, driver, passenger and side airbags.
- (e) Position 8, engine (Commodore): A 3.8 Ecotec; R 3.8 supercharged (L67); 7 3.6 Alloytec 190 (LY7); 5 3.0 SIDI (LF1); 3 3.6 SIDI (LLT); V 3.6 SIDI (LFX); F 5.7 Gen III (LS1); U 6.0 (LS2); H 6.0 (L98); Y 6.0 (L77); W 6.2 (LS3). Cruze engine letters are not yet confirmed.
- (f) Position 9 is a check digit. Position 10 is the model year (2002–2017). Position 11: L Elizabeth.

**Rule 15. Holden ZB Commodore, WMI W0V with position 4 = Z (Rüsselsheim, 2018–2020).** Position 5 trim: M LT; S RS/RS-V; X VXR; T Calais/Calais-V. Position 6 body: 6 liftback; 8 Sportwagon. Position 8 engine: C 2.0 turbo (FWD); D 3.6 V6 (AWD). Position 10 model year.

**Rule 16. Holden, WMI KL3 (GM Korea).** Position 4 model: J Cruze (J300); D Captiva; M Barina Spark (M300, single-sourced); T Barina TM (T300, single-sourced). Positions 5–8 not decoded (not published). Position 9 is not a North-American check digit. Position 10 model year. Position 11 plant: B Bupyeong; K Gunsan; C Changwon.

### Division 2 — Ford, Jeep, Chrysler (`makes/ford-fca.ts`)

**Rule 17. Ford Australia, WMI 6FP (Broadmeadows / Geelong, 17-digit VINs 1989–2016).**
- (a) Positions 4–6: AAA filler.
- (b) Position 7: J, product source Ford Australia.
- (c) Position 8: G, plant Broadmeadows.
- (d) Positions 9–10, body: SW sedan (short wheelbase, Falcon); WA wagon; CM utility or cab chassis; LW long-wheelbase sedan (Fairlane/LTD). There is no check digit on these VINs.
- (e) Position 11, build year (ISO year letters, resolved within 1989–2016). This is a build year, not a model year.
- (f) Position 12, build month: C Jan, K Feb, D Mar, E Apr, L May, Y Jun, M Jul, P Aug, B Sep, R Oct, A Nov, G Dec; also S Jul, T Aug, J Sep, U Oct. Confirmed on 1998–2002 and FG-era VINs; Ford rotated letter sets between years.
- (g) Positions 13–17: serial.

**Rule 18. Ford Thailand, WMIs MNA, MNB, MPB.** Positions 4–8: Ranger or Everest; detail not decoded. Position 10: model year.

**Rule 19. North-American FCA layout, WMIs 1C4, 1J4, 1J8, 2C3, 1C3, 1C6, 3C4.** Positions 5–6 vehicle line: JW Jeep Wrangler Unlimited (JK); JF Jeep Grand Cherokee (WK2); CA Chrysler 300 (LX). Position 9 check digit. Position 10 model year. Position 11 plant: L Toledo; C Jefferson North, Detroit; H Brampton. Remaining fields come from vPIC (Rule 12).

### Division 3 — Toyota, Lexus, Isuzu, private imports (`makes/toyota.ts`)

**Rule 20. Toyota and Lexus (JTE, JTD, JTM, JTN, JTK, JTF, JT1–JT3, JT7, MR0–MR2, MHF, 6T1, 5TD, 4T1; Lexus JTH, JTJ, JT6, 2T2).**
- (a) Positions 4–8 are Toyota's model code. Confirmed codes: BH3FJ LandCruiser Prado 150; BR3FJ LandCruiser 70; LV71J LandCruiser 79 single cab; AAABJ LandCruiser 300; BU11F FJ Cruiser; BY29J Kluger XU20; BZ3FH Kluger GSU55 (US-built); BFREV RAV4 ASA44; B23HK Camry AXVH71; BD3FK Camry AVV50 (Altona); KU52E Corolla ZRE152; JW133 Yaris NCP12; KW3D3 Yaris NCP131; FZ22G and FZ… (MR0) HiLux N70. Lexus: BE262 IS350 GSE21.
- (b) Position 8 alone names the car line where the full code is not listed: E Corolla; K Camry; J LandCruiser/Prado; V RAV4; G HiLux.
- (c) Position 9 is a real check digit.
- (d) Position 10 is 0 on every Australian-delivered Toyota and Lexus — no model year is encoded.
- (e) Position 11: on 6T1 VINs the plant is Altona, Victoria.

**Rule 21. Isuzu, WMIs MPA, MP1, JAA, JAL.** Positions 4–6 chassis code: TFR D-MAX 4x2; TFS D-MAX 4x4; UCR MU-X 4x2; UCS MU-X 4x4. Positions 7–8: 85 = RG series. Position 9 body (not a check digit): J utility/cab chassis; G wagon. Position 10 model year.

**Rule 22. Australian-issued VINs for privately imported vehicles, WMI 6U9.** Positions 4–5 are 00 padding. Positions 6–17 are the vehicle's original Japanese frame number (chassis code then serial), e.g. 6U900ACR307016500 = frame ACR30-7016500 = Toyota Estima/Tarago. Known chassis codes: ACR30 Estima/Tarago; AHR20 Estima Hybrid.

### Division 4 — Mazda, Mitsubishi, Nissan, Suzuki, Hyundai, Kia (`makes/asia.ts`)

**Rule 23. Mazda, WMIs JM0, JMZ, JM1, MM0, MM6, MM7, MM8.** Positions 4–5 model code: KE, KF CX-5; DE, DJ Mazda2; DK CX-3; BK, BL, BM, BN, BP Mazda3; GG, GH, GJ, GL Mazda6; TB, TC CX-9; CU Tribute; NA–ND MX-5; UR, UN BT-50. Positions 6–8 not decoded. Position 9 is not a check digit. Position 10 is not a model year (usually 0).

**Rule 24. Mitsubishi, WMIs JMF, JMY, JMB, JA4, MMA, MMB, MMC, MMT, 6MM.** Positions 4–7 model code, longest match: XTGA ASX XC; XTGF Outlander ZL; XT ASX/Outlander family; LYV Pajero NM–NS; L Pajero family (5-door); SRCK Lancer CE; SNCY Lancer CJ; ENKA Triton ML; JNKB Triton MN; YLKK Triton MR; GUKS Pajero Sport QE; TH Magna TH; DB 380 DB. Position 9 is not a check digit. Position 10 IS the model year. 6MM plant: Tonsley Park, South Australia.

**Rule 25. Nissan, WMIs JN1, JN6, JN8, MNT, VSK, SJN, MDH, MHB.** Positions 7–9 chassis code: T30–T33 X-Trail; D22, D40, D23 Navara; Y60, Y61, Y62 Patrol; R50, R51 Pathfinder; J10 Dualis/Qashqai; J11 Qashqai; N16, C12, B17 Pulsar; K12, K13 Micra; L33 Altima; Z33 350Z; Z34 370Z; Z50, Z51 Murano; F15 Juke. There is no check digit. Position 10 is a fixed A, not a year. US-built WMIs 5N1, 1N4, 1N6 use the North-American layout (5N1AR2… = Pathfinder R52).

**Rule 26. Suzuki, WMIs JSA, JS2, JS3, TSM, MA3, MBH.** Positions 4–8 model code, longest match: AZC Swift AZ; FZC Swift FZ; EZC Swift EZ; FJB Jimny JB43; JJC74 Jimny XL JC74; JTA, JTD Grand Vitara JT; ETD Vitara ET; LYD Vitara LY; JYA, JYB S-Cross JY; EGC Baleno EG; EWB Baleno EW. Position 9 is not a check digit. Position 10 is a fixed 0.

**Rule 27. Hyundai (KMH, KMF, KMJ, KM8, TMA, MAL, NLH, 5NP) and Kia (KNA, KNC, KND, KNE, U5Y, U6Y, MS0).**
- (a) Position 4, model line. Hyundai: D Elantra when position 6 is 4 (sedan), otherwise i30 FD/GD; H i30 PD; J Tucson/ix35; K Kona; C Accent; S Santa Fe. Kia: F Cerato; D Rio; P Sportage (Korean-built); M Carnival.
- (b) Position 5: trim, not decoded.
- (c) Position 6, body: 3 three-door hatch; 4 sedan; 5 five-door hatch; 6 coupe; 8 wagon/SUV/people mover.
- (d) Position 7, restraint: 1 active 3-point belts; 2 passive; 3 driver airbag; 4 dual airbags; 5 depowered airbags.
- (e) Position 8: engine, not decoded (letters change meaning between generations).
- (f) Position 9 is not an ISO check digit (often a letter).
- (g) Position 10 model year.
- (h) Position 11 plant. Hyundai: A Asan; C Jeonju; U Ulsan; W Gwangju; J Nošovice; M Chennai; Z İzmit. Kia: 5 Hwaseong; 6, 7 Korea; L Žilina.

### Division 5 — Subaru, Honda, Land Rover (`makes/japan-uk.ts`)

**Rule 28. Subaru, WMIs JF1, JF2.** Positions 4–5 chassis code (e.g. GC, GD, GE, GH, GJ, GP, GK, GT Impreza/XV; VA, VB WRX; SF–SK Forester; BD–BT Liberty/Outback; ZC, ZD BRZ). Positions 6–8 not decoded. Position 9 real check digit. Position 10 model year. Position 11: G Gunma, Japan.

**Rule 29. Honda, WMIs JHM, JHL, MRH.** Positions 4–5 chassis code (RD, RE, RM, RW CR-V; EU, ES, FD, FB, FC, FK, FL Civic; GD, GE, GK Jazz; GM City; CL, CU Accord Euro; RA, RB, RC Odyssey; GH, RU HR-V). Positions 6–8 not decoded. Position 9 is a fixed 0, not a check digit. Position 10 model year. Position 11: P or T Thailand (MRH); C or S Japan (JH-).

**Rule 30. Land Rover, WMI SAL.** Positions 4–5 chassis code: CA Discovery Sport L550; RA Discovery L462; LA Discovery 3/4 L319; WA Range Rover Sport L494; LS Range Rover Sport L320; VA Evoque L538; GA Range Rover L405; ZA Velar L560; FA Freelander 2 L359; LD Defender classic. Position 9 check digit. Position 10 model year. Position 11: A Solihull; H Halewood.

### Division 6 — European makes (`makes/volkswagen.ts`, `makes/mercedes.ts`, `makes/others.ts`)

**Rule 31. Volkswagen (WVW, WVG, WV1, WV2, WV3, WV4, AAV, 8AW, VWV, 3VW, 9BW) and Audi (WAU, WA1, WUA, TRU).**
- (a) Positions 4–6: ZZZ filler (rest-of-world layout). Any other content is the US layout and is not decoded.
- (b) Positions 7–8, platform: the VW table in `volkswagen.ts` (e.g. 1K Golf 5/6, 5K Golf 6, AU Golf 7, CD Golf 8, 6R Polo 5, AW Polo 6, 5N Tiguan, 7H Transporter T5/T6.1, 7P Touareg 2, 2H Amarok, 3C Passat 6–8/CC) and the Audi table (e.g. 8P, 8V, 8Y A3; 8X, GB A1; 8K, 8W A4; 8R, FY Q5; 8U, F3 Q3; 4M Q7/Q8).
- (c) Position 9: Z filler — no check digit.
- (d) Position 10: model year (VW model year runs 1 August to 31 July).
- (e) Position 11: plant per the table in `volkswagen.ts` (8 = General Pacheco on 8A- VINs, otherwise Dresden).
- (f) WMI WV4 (second-generation Amarok, 2022 on, Ford-built at Silverton) does not follow (b)–(c); positions 7–9 are not decoded and its plant letter is not confirmed.

**Rule 32. Mercedes-Benz, WMIs WDB, WDD, WDC, WDF, W1K, W1N, W1V, W1W, WMX, VSA.**
- (a) Positions 4–9 are the factory type designation NNN.NNN (e.g. 205.042). Positions 4–6 name the chassis series per the table in `mercedes.ts` (e.g. 205 C-Class W205; 211 E-Class W211; 253 GLC X253; 167 GLE V167; 906, 907, 910 Sprinter; 447 Vito/V-Class).
- (b) Position 10 is not a model year; every Australian sample carries 2 (right-hand drive).
- (c) Position 11 plant letters are not yet confirmed for Australian-delivered cars.

**Rule 33. BMW, WMIs WBA, WBS, WBX, WBY.**
- (a) Positions 4–7 are a type code. BMW publishes no table; only codes seen on real Australian listings are named: FE42 X5 E70; VC36 3 Series E90 320d; VA76, 3D36, PN36 3 Series; JU42 X5 (generation unconfirmed). Other codes are shown raw for lookup in the BMW parts catalogue.
- (b) Position 10 is 0 on Australian and European BMWs — not a year.
- (c) Position 11 plant: A, F, G, K Munich; B, C, D Dingolfing; E, J, P Regensburg; L Spartanburg; N Rosslyn.

**Rule 34. Renault, WMIs VF1, VF2.** Positions 4–6 model code: RFB Megane IV (single-sourced).

---

## Part 4 — Testing

**Rule 35. Test set.** The decoder is tested against:
- (a) every VIN in `scripts/vin/user-vins.txt` — real VINs from Australian roads supplied by Elroco (98); and
- (b) every VIN in `scripts/vin/fixtures.json` — real Australian VINs from auction and parts listings, each with the listing's description of the vehicle (138 further VINs), covering all top-20 makes on Australian roads (by the 2025 motor vehicle census: Toyota, Mazda, Ford, Holden, Hyundai, Mitsubishi, Nissan, Subaru, Kia, Volkswagen, Honda, Mercedes-Benz, BMW, Suzuki, Isuzu, Audi, MG, Jeep, Lexus, Land Rover).

**Rule 36. Pass test.** A VIN passes when the decoder gives its country, make and model or series, and — where a listing describes the car — the make and model name agree and the model year is within one year of the listing's year.

**Rule 37. Running the tests.** `node --import ./scripts/vin/register.mjs scripts/vin/run-tests.ts` (add `--verbose` for every breakdown). The spreadsheet is rebuilt with `scripts/vin/export-breakdowns.ts` then `scripts/vin/build-spreadsheet.py`.

---

## Schedule 1 — Known gaps (not decoded, no source found)

1. Toyota: older Altona-format VINs (6T153…, 6T164…), Thai MR053… and pre-2000 JT7 LandCruiser VDS codes.
2. Ford Australia: body code AT (believed to be Territory, unconfirmed); pre-1998 layout with position 8 = L (e.g. 1995 ED ute).
3. Ford Brazil (9BF), GWM (LGW), Mahindra (MA1), SsangYong (KPT), Volvo China (LYV): model not decoded locally.
4. Hyundai position-4 letters R and Y, KMF commercial models; Kia position-4 R (one source says Sorento) and KNC (possibly Tasman).
5. MG (LSJ): no Australian VIN with a known description could be obtained; make only.
6. BMW type codes beyond Rule 33(a); Mercedes-Benz plant letters.
7. Engine and grade blocks for Mazda, Subaru, Honda, Land Rover, Nissan, Suzuki, Hyundai, Kia, GM Korea and Cruze — no published tables.
