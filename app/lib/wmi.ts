// World Manufacturer Identifier lookup
// Source: https://en.wikibooks.org/wiki/Vehicle_Identification_Numbers_(VIN_codes)/World_Manufacturer_Identifier_(WMI)

const WMI_MAP: Record<string, string> = {
  // Africa
  AAV: "Volkswagen South Africa", AC5: "Hyundai South Africa",
  ADD: "Hyundai South Africa", AFA: "Ford South Africa", AHT: "Toyota South Africa",
  // Japan
  JA3: "Mitsubishi", JA4: "Mitsubishi", JA: "Isuzu", JD: "Daihatsu",
  JF: "Subaru", JH: "Honda", JK: "Kawasaki", JL5: "Mitsubishi Fuso",
  JMB: "Mitsubishi Motors", JMY: "Mitsubishi Motors", JMZ: "Mazda",
  JN: "Nissan", JS: "Suzuki", JT: "Toyota", JY: "Yamaha",
  // Korea
  KL: "Daewoo / GM Korea", KM: "Hyundai", KMY: "Daelim", KM1: "Hyosung",
  KN: "Kia", KNM: "Renault Samsung", KPA: "SsangYong", KPT: "SsangYong",
  // China
  LAN: "Changzhou Yamasaki", LBB: "Keeway / Generic", LBE: "Beijing Hyundai",
  LBM: "Zongshen Piaggio", LBP: "Chongqing Jianshe Yamaha", LB2: "Geely",
  LDC: "Dong Feng Peugeot Citroën", LFP: "FAW", LFV: "FAW-Volkswagen",
  LGB: "Dongfeng", LGH: "Qoros", LGX: "BYD Auto",
  LHB: "Beijing Automotive", LJC: "JAC", LJ1: "JAC", LKL: "Suzhou King Long",
  LSG: "Shanghai General Motors", LSJ: "MG Motor / SAIC", LSV: "Shanghai Volkswagen",
  LSY: "Brilliance Zhonghua", LTV: "Toyota Tianjin", LUC: "Guangqi Honda",
  LVV: "Chery", LVZ: "Dongfeng Sokon", LZY: "Yutong", LZZ: "Howo",
  // India
  MAB: "Mahindra & Mahindra", MAC: "Mahindra & Mahindra", MAJ: "Ford India",
  MAK: "Honda India", MAL: "Hyundai India", MAT: "Tata Motors",
  MA1: "Mahindra & Mahindra", MA3: "Suzuki India (Maruti)", MA6: "GM India",
  MA7: "Mitsubishi India", MBH: "Suzuki India (Maruti)", MBJ: "Toyota India",
  MBR: "Mercedes-Benz India", MB1: "Ashok Leyland", MCA: "Fiat India",
  MC2: "Volvo Eicher", MDH: "Nissan India", MD2: "Bajaj Auto",
  MEE: "Renault India", MEX: "Volkswagen India",
  // Indonesia / Thailand
  MHF: "Toyota Indonesia", MHR: "Honda Indonesia", MLC: "Suzuki Thailand",
  MLH: "Honda Thailand", MMB: "Mitsubishi Thailand", MMC: "Mitsubishi Thailand",
  MMT: "Mitsubishi Thailand", MM8: "Mazda Thailand", MNB: "Ford Thailand",
  MNT: "Nissan Thailand", MPA: "Isuzu Thailand", MRH: "Honda Thailand",
  MR0: "Toyota Thailand",
  // Turkey
  NLA: "Honda Turkey", NLE: "Mercedes-Benz Türk", NLH: "Hyundai Assan",
  NM0: "Ford Turkey", NM4: "Tofaş", NMT: "Toyota Turkey",
  // Malaysia / Philippines / Taiwan
  PL1: "Proton Malaysia", PNA: "NAZA Malaysia", PE1: "Ford Philippines",
  PE3: "Mazda Philippines", RFB: "Kymco Taiwan", RFG: "Sanyang SYM Taiwan",
  RF3: "Aeon Motor Taiwan",
  // UK
  SAL: "Land Rover", SAJ: "Jaguar", SAR: "Rover", SB1: "Toyota UK",
  SBM: "McLaren", SCA: "Rolls-Royce", SCB: "Bentley", SCC: "Lotus",
  SCF: "Aston Martin", SDB: "Peugeot UK", SFA: "Ford UK", SFD: "Alexander Dennis",
  SHH: "Honda UK", SHS: "Honda UK", SJN: "Nissan UK", SKF: "Vauxhall",
  SMT: "Triumph Motorcycles",
  // Poland
  SUF: "Fiat Poland", SUL: "FSC Poland", SUP: "FSO-Daewoo Poland",
  // Czech Republic / Hungary / Switzerland
  TCC: "smart (1998–1999)", TMA: "Hyundai Czech", TMB: "Škoda",
  TMK: "Karosa", TMP: "Škoda Trolleybus", TMT: "Tatra",
  TRA: "Ikarus Bus", TRU: "Audi Hungary", TSM: "Suzuki Hungary",
  // Portugal
  TW1: "Toyota Caetano Portugal",
  // Romania
  UU1: "Renault Dacia", UU3: "ARO", UU6: "Daewoo Romania",
  U5Y: "Kia Slovakia", U6Y: "Kia Slovakia",
  // Austria
  VAG: "Magna Steyr", VAN: "MAN Austria", VBK: "KTM",
  // France
  VF1: "Renault", VF2: "Renault", VF3: "Peugeot", VF7: "Citroën",
  VF6: "Renault Trucks", VG5: "MBK", VNK: "Toyota France",
  VNV: "Renault-Nissan",
  // Spain
  VSA: "Mercedes-Benz Spain", VSE: "Suzuki Spain", VSK: "Nissan Spain",
  VSS: "SEAT", VSX: "Opel Spain", VS6: "Ford Spain", VS7: "Citroën Spain",
  VTH: "Derbi", VWV: "Volkswagen Spain",
  // Belgium / Netherlands
  XLB: "Volvo NedCar", XLE: "Scania Netherlands", XLR: "DAF",
  YBW: "Volkswagen Belgium", YCM: "Mazda Belgium",
  // Germany
  WAG: "Neoplan", WAU: "Audi", WA1: "Audi SUV",
  WBA: "BMW", WBS: "BMW M",
  WDA: "Daimler", WDB: "Mercedes-Benz", WDC: "DaimlerChrysler",
  WDD: "Mercedes-Benz", WDF: "Mercedes-Benz Commercial",
  WEB: "Evobus (Mercedes-Bus)", WF0: "Ford Germany",
  WJM: "Iveco Magirus", WMA: "MAN Germany",
  WME: "smart", WMW: "MINI", WMX: "Mercedes-AMG",
  WP0: "Porsche", WP1: "Porsche SUV",
  W0L: "Opel", WUA: "quattro GmbH",
  WVG: "Volkswagen MPV / SUV", WVW: "Volkswagen",
  WV1: "Volkswagen Commercial", WV2: "Volkswagen Bus / Van",
  WV3: "Volkswagen Trucks",
  // Russia
  XTA: "Lada / AvtoVAZ", XTT: "UAZ / Sollers",
  XUF: "GM Russia", XUU: "AvtoTor", XW8: "Volkswagen Russia",
  X4X: "AvtoTor (BMW)", X7L: "Renault Russia", X7M: "Hyundai TagAZ",
  // Sweden / Finland
  YK1: "Saab-Valmet Finland", YS2: "Scania AB", YS3: "Saab", YS4: "Scania Bus",
  YTN: "Saab NEVS", YV1: "Volvo Cars", YV4: "Volvo Cars",
  YV2: "Volvo Trucks", YV3: "Volvo Buses",
  // Italy
  ZAA: "Autobianchi", ZAM: "Maserati", ZAP: "Piaggio / Vespa",
  ZAR: "Alfa Romeo", ZBN: "Benelli", ZCF: "Iveco",
  ZCG: "MV Agusta", ZDM: "Ducati", ZFF: "Ferrari",
  ZDF: "Ferrari Dino", ZD0: "Yamaha Italy", ZD4: "Aprilia",
  ZFA: "Fiat", ZFC: "Fiat VI", ZGU: "Moto Guzzi",
  ZHW: "Lamborghini", ZJN: "Innocenti", ZKH: "Husqvarna Italy",
  ZLA: "Lancia",
  // USA
  "1B3": "Dodge", "1C3": "Chrysler", "1C6": "Chrysler",
  "1D3": "Dodge", "1FA": "Ford", "1FB": "Ford",
  "1FC": "Ford", "1FD": "Ford", "1FM": "Ford", "1FT": "Ford",
  "1FU": "Freightliner", "1FV": "Freightliner",
  "1GC": "Chevrolet Truck", "1GT": "GMC Truck",
  "1G1": "Chevrolet", "1G2": "Pontiac", "1G3": "Oldsmobile",
  "1G4": "Buick", "1G6": "Cadillac", "1G8": "Saturn",
  "1GM": "Pontiac", "1GY": "Cadillac",
  "1HD": "Harley-Davidson", "1J4": "Jeep",
  "1ME": "Mercury", "1N": "Nissan USA", "1NX": "NUMMI",
  "1P3": "Plymouth", "1VW": "Volkswagen USA",
  "1YV": "Mazda USA", "1ZV": "Ford AutoAlliance",
  "4F": "Mazda USA", "4JG": "Mercedes-Benz USA",
  "4T": "Toyota USA", "4US": "BMW USA",
  "5F": "Honda USA", "5L": "Lincoln",
  "5N1": "Nissan USA", "5NP": "Hyundai USA",
  "5T": "Toyota USA (Trucks)", "5YJ": "Tesla",
  // Canada
  "2A4": "Chrysler Canada", "2B3": "Dodge Canada",
  "2C3": "Chrysler Canada", "2CN": "CAMI",
  "2FA": "Ford Canada", "2FB": "Ford Canada",
  "2FM": "Ford Canada", "2FT": "Ford Canada",
  "2G1": "Chevrolet Canada", "2G2": "Pontiac Canada",
  "2G4": "Buick Canada", "2HG": "Honda Canada",
  "2HK": "Honda Canada", "2HM": "Hyundai Canada",
  "2T": "Toyota Canada",
  // Mexico
  "3C4": "Chrysler Mexico", "3D3": "Dodge Mexico",
  "3FA": "Ford Mexico", "3G": "GM Mexico",
  "3H": "Honda Mexico", "3MZ": "Mazda Mexico",
  "3N": "Nissan Mexico", "3VW": "Volkswagen Mexico",
  // Australia
  "6AB": "MAN Australia", "6F4": "Nissan Australia",
  "6F5": "Kenworth Australia", "6FP": "Ford Australia",
  "6G1": "Holden (post 2002)", "6G2": "Pontiac Australia",
  "6H8": "Holden (pre 2002)", "6MM": "Mitsubishi Australia",
  "6T1": "Toyota Australia", "6U9": "Private Import (Australia)",
  // South America
  "8AF": "Ford Argentina", "8AG": "Chevrolet Argentina",
  "8AJ": "Toyota Argentina", "8AW": "Volkswagen Argentina",
  "8A1": "Renault Argentina", "8GG": "Chevrolet Chile",
  "93H": "Honda Brazil", "93R": "Toyota Brazil",
  "93U": "Audi Brazil", "9BD": "Fiat Brazil",
  "9BF": "Ford Brazil", "9BG": "Chevrolet Brazil",
  "9BM": "Mercedes-Benz Brazil", "9BR": "Toyota Brazil",
  "9BW": "Volkswagen Brazil",
};

// Country of origin from VIN first character
const COUNTRY_MAP: Record<string, string> = {
  A: "South Africa", B: "Angola / Kenya / Tanzania",
  C: "Benin / Madagascar", D: "Egypt / Morocco",
  E: "Ethiopia / Mozambique", F: "Ghana / Nigeria",
  G: "Ivory Coast / Senegal", H: "Kenya / Nigeria",
  J: "Japan", K: "South Korea",
  L: "China", M: "India / Indonesia / Thailand",
  N: "Turkey / South East Asia", P: "Philippines / Malaysia",
  R: "Taiwan", S: "United Kingdom / Poland",
  T: "Czech Republic / Hungary / Switzerland",
  U: "Romania / Slovakia / Uzbekistan",
  V: "France / Spain / Belgium / Netherlands / Austria",
  W: "Germany", X: "Russia",
  Y: "Sweden / Finland / Norway / Belgium",
  Z: "Italy",
  "1": "United States", "2": "Canada", "3": "Mexico",
  "4": "United States", "5": "United States",
  "6": "Australia / New Zealand", "7": "Australia / New Zealand",
  "8": "Argentina / Chile",
  "9": "Brazil / Colombia",
};

/** Look up a manufacturer by WMI (3-char or 2-char prefix). */
export function lookupWMI(vin: string): string | null {
  if (!vin || vin.length < 3) return null;
  const w3 = vin.substring(0, 3).toUpperCase();
  const w2 = vin.substring(0, 2).toUpperCase();
  return WMI_MAP[w3] ?? WMI_MAP[w2] ?? null;
}

/** Return country of manufacture from first VIN character. */
export function vinCountry(vin: string): string | null {
  return COUNTRY_MAP[vin[0]?.toUpperCase()] ?? null;
}
