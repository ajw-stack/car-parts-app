#!/usr/bin/env node
// Patch chassis for models where body type is unambiguous — covering all makes.
// Only patches rows where chassis IS NULL. Never overwrites existing data.
// Usage: node scripts/patches/patch-all-makes-chassis-obvious.js [--dry-run]

const fs   = require('fs');
const path = require('path');

const DRY_RUN = process.argv.includes('--dry-run');

const envPath = path.join(__dirname, '..', '..', '.env.local');
const env = {};
for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
  const m = line.replace(/\r$/, '').match(/^([^=]+)=(.*)$/);
  if (m) env[m[1].trim()] = m[2].trim();
}
const BASE = env.NEXT_PUBLIC_SUPABASE_URL;
const KEY  = env.SUPABASE_SERVICE_ROLE_KEY;
const hdrs = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' };

async function api(urlPath, options = {}) {
  const res = await fetch(`${BASE}/rest/v1${urlPath}`, { headers: hdrs, ...options });
  const text = await res.text();
  if (!res.ok) throw new Error(`${res.status} ${urlPath}: ${text}`);
  return text ? JSON.parse(text) : null;
}

// Each entry: { make, model, chassis }
// Only models where every variant shares the same body type.
const ASSIGNMENTS = [

  // ── Acura ────────────────────────────────────────────────────────────────────
  { make: 'Acura', model: 'CL',   chassis: 'Coupe' },
  { make: 'Acura', model: 'CX',   chassis: 'SUV'   },
  { make: 'Acura', model: 'MDX',  chassis: 'SUV'   },
  { make: 'Acura', model: 'NSX',  chassis: 'Coupe' },
  { make: 'Acura', model: 'RL',   chassis: 'Sedan' },
  { make: 'Acura', model: 'RSX',  chassis: 'Coupe' },
  { make: 'Acura', model: 'TL',   chassis: 'Sedan' },
  { make: 'Acura', model: 'TSX',  chassis: 'Sedan' },

  // ── Alfa Romeo ───────────────────────────────────────────────────────────────
  { make: 'Alfa Romeo', model: '147',          chassis: 'Hatchback'  },
  { make: 'Alfa Romeo', model: '147 GTA',      chassis: 'Hatchback'  },
  { make: 'Alfa Romeo', model: '155',          chassis: 'Sedan'      },
  { make: 'Alfa Romeo', model: '156',          chassis: 'Sedan'      },
  { make: 'Alfa Romeo', model: '156 GTA',      chassis: 'Sedan'      },
  { make: 'Alfa Romeo', model: '159',          chassis: 'Sedan'      },
  { make: 'Alfa Romeo', model: '164',          chassis: 'Sedan'      },
  { make: 'Alfa Romeo', model: 'ALFA 147',     chassis: 'Hatchback'  },
  { make: 'Alfa Romeo', model: 'ALFA 147 GTA', chassis: 'Hatchback'  },
  { make: 'Alfa Romeo', model: 'ALFA 155',     chassis: 'Sedan'      },
  { make: 'Alfa Romeo', model: 'ALFA 156',     chassis: 'Sedan'      },
  { make: 'Alfa Romeo', model: 'ALFA 159',     chassis: 'Sedan'      },
  { make: 'Alfa Romeo', model: 'ALFA 164',     chassis: 'Sedan'      },
  { make: 'Alfa Romeo', model: 'Brera',        chassis: 'Coupe'      },
  { make: 'Alfa Romeo', model: 'Giulietta',    chassis: 'Hatchback'  },
  { make: 'Alfa Romeo', model: 'GIULIETTA 940',chassis: 'Hatchback'  },
  { make: 'Alfa Romeo', model: 'GT',           chassis: 'Coupe'      },
  { make: 'Alfa Romeo', model: 'Mito',         chassis: 'Hatchback'  },
  { make: 'Alfa Romeo', model: 'Montreal',     chassis: 'Coupe'      },
  { make: 'Alfa Romeo', model: 'Spider',       chassis: 'Convertible'},

  // ── Audi ─────────────────────────────────────────────────────────────────────
  { make: 'Audi', model: 'A1',    chassis: 'Hatchback' },
  { make: 'Audi', model: 'A2',    chassis: 'Hatchback' },
  { make: 'Audi', model: 'Q2',    chassis: 'SUV'       },
  { make: 'Audi', model: 'Q3',    chassis: 'SUV'       },
  { make: 'Audi', model: 'Q5',    chassis: 'SUV'       },
  { make: 'Audi', model: 'Q7',    chassis: 'SUV'       },
  { make: 'Audi', model: 'RS Q3', chassis: 'SUV'       },
  { make: 'Audi', model: 'S1',    chassis: 'Hatchback' },
  { make: 'Audi', model: 'SQ5',   chassis: 'SUV'       },
  { make: 'Audi', model: 'SQ7',   chassis: 'SUV'       },

  // ── Austin Healey ────────────────────────────────────────────────────────────
  { make: 'Austin Healey', model: '3000 MK II-III',   chassis: 'Convertible' },
  { make: 'Austin Healey', model: 'Sprite MK II-III', chassis: 'Convertible' },
  { make: 'Austin Healey', model: 'Sprite MK IV',     chassis: 'Convertible' },
  { make: 'Austin Healey', model: 'SPRITE MK IV 1275',chassis: 'Convertible' },

  // ── BMW ──────────────────────────────────────────────────────────────────────
  { make: 'BMW', model: 'M2', chassis: 'Coupe' },
  { make: 'BMW', model: 'M4', chassis: 'Coupe' },
  { make: 'BMW', model: 'X1', chassis: 'SUV'   },
  { make: 'BMW', model: 'X2', chassis: 'SUV'   },
  { make: 'BMW', model: 'X3', chassis: 'SUV'   },
  { make: 'BMW', model: 'X4', chassis: 'SUV'   },
  { make: 'BMW', model: 'X5', chassis: 'SUV'   },
  { make: 'BMW', model: 'X6', chassis: 'SUV'   },

  // ── Chrysler ─────────────────────────────────────────────────────────────────
  { make: 'Chrysler', model: 'GRAND VOYAGER', chassis: 'Van'       },
  { make: 'Chrysler', model: 'PT CRUISER',    chassis: 'Hatchback' },
  { make: 'Chrysler', model: 'VOYAGER',       chassis: 'Van'       },

  // ── Citroen ──────────────────────────────────────────────────────────────────
  { make: 'Citroen', model: 'BERLINGO',          chassis: 'Van'       },
  { make: 'Citroen', model: 'BERLINGO ENTERPRISE',chassis: 'Van'      },
  { make: 'Citroen', model: 'C4 AIRCROSS',       chassis: 'SUV'       },
  { make: 'Citroen', model: 'C4 HATCH',          chassis: 'Hatchback' },
  { make: 'Citroen', model: 'C4 HATCHBACK',      chassis: 'Hatchback' },
  { make: 'Citroen', model: 'C4 WAGON PICASSO',  chassis: 'Van'       },
  { make: 'Citroen', model: 'C5 BREAK',          chassis: 'Wagon'     },
  { make: 'Citroen', model: 'XSARA BREAK',       chassis: 'Wagon'     },
  { make: 'Citroen', model: 'XSARA COUPE',       chassis: 'Coupe'     },

  // ── Daewoo ───────────────────────────────────────────────────────────────────
  { make: 'Daewoo', model: 'LEGANZA', chassis: 'Sedan' },
  { make: 'Daewoo', model: 'Tacuma',  chassis: 'Van'   },

  // ── Daihatsu ─────────────────────────────────────────────────────────────────
  { make: 'Daihatsu', model: 'APPLAUSE',  chassis: 'Sedan'      },
  { make: 'Daihatsu', model: 'CHARADE',   chassis: 'Hatchback'  },
  { make: 'Daihatsu', model: 'Copen',     chassis: 'Convertible'},
  { make: 'Daihatsu', model: 'Feroza',    chassis: 'SUV'        },
  { make: 'Daihatsu', model: 'ROCKY 4WD', chassis: 'SUV'        },
  { make: 'Daihatsu', model: 'Terios',    chassis: 'SUV'        },

  // ── Fiat ─────────────────────────────────────────────────────────────────────
  { make: 'Fiat', model: '500',      chassis: 'Hatchback' },
  { make: 'Fiat', model: 'Ducato',   chassis: 'Van'       },
  { make: 'Fiat', model: 'FREEMONT', chassis: 'SUV'       },

  // ── Ford ─────────────────────────────────────────────────────────────────────
  { make: 'Ford', model: 'Bronco',                chassis: 'SUV'       },
  { make: 'Ford', model: 'CROWN VICTORIA',        chassis: 'Sedan'     },
  { make: 'Ford', model: 'Econovan',              chassis: 'Van'       },
  { make: 'Ford', model: 'ECONOVAN / SPECTRON',   chassis: 'Van'       },
  { make: 'Ford', model: 'Ecosport',              chassis: 'SUV'       },
  { make: 'Ford', model: 'Escape',                chassis: 'SUV'       },
  { make: 'Ford', model: 'Everest',               chassis: 'SUV'       },
  { make: 'Ford', model: 'Explorer',              chassis: 'SUV'       },
  { make: 'Ford', model: 'Festiva',               chassis: 'Hatchback' },
  { make: 'Ford', model: 'KA',                    chassis: 'Hatchback' },
  { make: 'Ford', model: 'Kuga',                  chassis: 'SUV'       },
  { make: 'Ford', model: 'Probe',                 chassis: 'Coupe'     },
  { make: 'Ford', model: 'Puma',                  chassis: 'Coupe'     },
  { make: 'Ford', model: 'Ranger',                chassis: 'Ute'       },
  { make: 'Ford', model: 'Taurus',                chassis: 'Sedan'     },
  { make: 'Ford', model: 'Territory',             chassis: 'SUV'       },
  { make: 'Ford', model: 'Transit',               chassis: 'Van'       },

  // ── Honda ────────────────────────────────────────────────────────────────────
  { make: 'Honda', model: 'CR-Z',    chassis: 'Coupe'      },
  { make: 'Honda', model: 'CRX',     chassis: 'Coupe'      },
  { make: 'Honda', model: 'HR-V',    chassis: 'SUV'        },
  { make: 'Honda', model: 'Insight', chassis: 'Hatchback'  },
  { make: 'Honda', model: 'Legend',  chassis: 'Sedan'      },
  { make: 'Honda', model: 'NSX',     chassis: 'Coupe'      },
  { make: 'Honda', model: 'Prelude', chassis: 'Coupe'      },
  { make: 'Honda', model: 'S 2000',  chassis: 'Convertible'},

  // ── Hyundai ──────────────────────────────────────────────────────────────────
  { make: 'Hyundai', model: 'Coupe',          chassis: 'Coupe'  },
  { make: 'Hyundai', model: 'GALLOPER 4WD',   chassis: 'SUV'    },
  { make: 'Hyundai', model: 'i30 CW',         chassis: 'Wagon'  },
  { make: 'Hyundai', model: 'ix35',           chassis: 'SUV'    },
  { make: 'Hyundai', model: 'Santa Fe',       chassis: 'SUV'    },
  { make: 'Hyundai', model: 'Sonata',         chassis: 'Sedan'  },
  { make: 'Hyundai', model: 'TERRACAN 4WD',   chassis: 'SUV'    },
  { make: 'Hyundai', model: 'Tiburon',        chassis: 'Coupe'  },
  { make: 'Hyundai', model: 'Tucson',         chassis: 'SUV'    },
  { make: 'Hyundai', model: 'Veloster',       chassis: 'Coupe'  },

  // ── Infiniti ─────────────────────────────────────────────────────────────────
  { make: 'Infiniti', model: 'FX30D', chassis: 'SUV'   },
  { make: 'Infiniti', model: 'FX37',  chassis: 'SUV'   },
  { make: 'Infiniti', model: 'FX50',  chassis: 'SUV'   },
  { make: 'Infiniti', model: 'M30D',  chassis: 'Sedan' },
  { make: 'Infiniti', model: 'M35H',  chassis: 'Sedan' },
  { make: 'Infiniti', model: 'M37',   chassis: 'Sedan' },
  { make: 'Infiniti', model: 'Q30',   chassis: 'Hatchback' },
  { make: 'Infiniti', model: 'Q50',   chassis: 'Sedan' },
  { make: 'Infiniti', model: 'Q60',   chassis: 'Coupe' },
  { make: 'Infiniti', model: 'Q70',   chassis: 'Sedan' },
  { make: 'Infiniti', model: 'QX70',  chassis: 'SUV'   },

  // ── Isuzu ────────────────────────────────────────────────────────────────────
  { make: 'Isuzu', model: 'D-MAX',              chassis: 'Ute' },
  { make: 'Isuzu', model: 'JACKAROO / TROOPER', chassis: 'SUV' },
  { make: 'Isuzu', model: 'MU-X',               chassis: 'SUV' },
  { make: 'Isuzu', model: 'Rodeo',              chassis: 'Ute' },

  // ── Jaguar ───────────────────────────────────────────────────────────────────
  { make: 'Jaguar', model: 'S-SERIES',  chassis: 'Sedan' },
  { make: 'Jaguar', model: 'XE',        chassis: 'Sedan' },
  { make: 'Jaguar', model: 'XF X250',   chassis: 'Sedan' },
  { make: 'Jaguar', model: 'XF X260',   chassis: 'Sedan' },
  { make: 'Jaguar', model: 'XJ SERIES', chassis: 'Sedan' },

  // ── Jeep ─────────────────────────────────────────────────────────────────────
  { make: 'Jeep', model: 'CHEROKEE',                           chassis: 'SUV' },
  { make: 'Jeep', model: 'CHEROKEE / WAGONEER / BRAIRWOOD – KJ', chassis: 'SUV' },
  { make: 'Jeep', model: 'CHEROKEE / WAGONEER / BRAIRWOOD – XJ', chassis: 'SUV' },
  { make: 'Jeep', model: 'COMANCHE',    chassis: 'Ute' },
  { make: 'Jeep', model: 'COMMANDER',   chassis: 'SUV' },
  { make: 'Jeep', model: 'COMPASS',     chassis: 'SUV' },
  { make: 'Jeep', model: 'GRAND CHEROKEE', chassis: 'SUV' },
  { make: 'Jeep', model: 'KL SERIES',   chassis: 'SUV' },
  { make: 'Jeep', model: 'LIBERTY',     chassis: 'SUV' },
  { make: 'Jeep', model: 'PATRIOT',     chassis: 'SUV' },
  { make: 'Jeep', model: 'RENEGADE',    chassis: 'SUV' },
  { make: 'Jeep', model: 'WRANGLER',    chassis: 'SUV' },

  // ── Kia ──────────────────────────────────────────────────────────────────────
  { make: 'Kia', model: 'CARNIVAL',       chassis: 'Van'       },
  { make: 'Kia', model: 'CARNIVAL GRAND', chassis: 'Van'       },
  { make: 'Kia', model: 'PICANTO',        chassis: 'Hatchback' },
  { make: 'Kia', model: 'Pregio',         chassis: 'Van'       },
  { make: 'Kia', model: 'Rondo',          chassis: 'Van'       },
  { make: 'Kia', model: 'SORENTO',        chassis: 'SUV'       },
  { make: 'Kia', model: 'SPORTAGE',       chassis: 'SUV'       },
  { make: 'Kia', model: 'STINGER',        chassis: 'Sedan'     },

  // ── Land Rover ───────────────────────────────────────────────────────────────
  { make: 'Land Rover', model: '110 & DEFENDER',          chassis: 'SUV' },
  { make: 'Land Rover', model: 'DISCOVERY I LJ',          chassis: 'SUV' },
  { make: 'Land Rover', model: 'DISCOVERY II LT',         chassis: 'SUV' },
  { make: 'Land Rover', model: 'DISCOVERY III LM',        chassis: 'SUV' },
  { make: 'Land Rover', model: 'DISCOVERY IV L319',       chassis: 'SUV' },
  { make: 'Land Rover', model: 'DISCOVERY SPORTS LC',     chassis: 'SUV' },
  { make: 'Land Rover', model: 'DISCOVERY V L462',        chassis: 'SUV' },
  { make: 'Land Rover', model: 'EVOQUE LV',               chassis: 'SUV' },
  { make: 'Land Rover', model: 'FREELANDER II FA',        chassis: 'SUV' },
  { make: 'Land Rover', model: 'RANGE ROVER CLASSIC',     chassis: 'SUV' },
  { make: 'Land Rover', model: 'RANGE ROVER II',          chassis: 'SUV' },
  { make: 'Land Rover', model: 'RANGE ROVER III L320 SPORT', chassis: 'SUV' },
  { make: 'Land Rover', model: 'RANGE ROVER III L322',    chassis: 'SUV' },
  { make: 'Land Rover', model: 'RANGE ROVER L405',        chassis: 'SUV' },
  { make: 'Land Rover', model: 'RANGE ROVER L494 SPORT',  chassis: 'SUV' },

  // ── Lexus ────────────────────────────────────────────────────────────────────
  { make: 'Lexus', model: 'CT 200H',    chassis: 'Hatchback' },
  { make: 'Lexus', model: 'ES 240',     chassis: 'Sedan'     },
  { make: 'Lexus', model: 'ES 300',     chassis: 'Sedan'     },
  { make: 'Lexus', model: 'ES 300H',    chassis: 'Sedan'     },
  { make: 'Lexus', model: 'ES 350',     chassis: 'Sedan'     },
  { make: 'Lexus', model: 'GS SERIES',  chassis: 'Sedan'     },
  { make: 'Lexus', model: 'GS-F SERIES',chassis: 'Sedan'     },
  { make: 'Lexus', model: 'GX SERIES',  chassis: 'SUV'       },
  { make: 'Lexus', model: 'HS 250H',    chassis: 'Sedan'     },
  { make: 'Lexus', model: 'IS 200',     chassis: 'Sedan'     },
  { make: 'Lexus', model: 'IS 200T',    chassis: 'Sedan'     },
  { make: 'Lexus', model: 'IS 220D',    chassis: 'Sedan'     },
  { make: 'Lexus', model: 'IS 300',     chassis: 'Sedan'     },
  { make: 'Lexus', model: 'IS 300H',    chassis: 'Sedan'     },
  { make: 'Lexus', model: 'IS 350',     chassis: 'Sedan'     },
  { make: 'Lexus', model: 'IS-F',       chassis: 'Sedan'     },
  { make: 'Lexus', model: 'LS 400',     chassis: 'Sedan'     },
  { make: 'Lexus', model: 'LS 460',     chassis: 'Sedan'     },
  { make: 'Lexus', model: 'LS 600H',    chassis: 'Sedan'     },
  { make: 'Lexus', model: 'LX 450D',    chassis: 'SUV'       },
  { make: 'Lexus', model: 'LX 470',     chassis: 'SUV'       },
  { make: 'Lexus', model: 'LX 570',     chassis: 'SUV'       },
  { make: 'Lexus', model: 'NX 200T',    chassis: 'SUV'       },
  { make: 'Lexus', model: 'NX 300H',    chassis: 'SUV'       },
  { make: 'Lexus', model: 'RC 200T',    chassis: 'Coupe'     },
  { make: 'Lexus', model: 'RC 350',     chassis: 'Coupe'     },
  { make: 'Lexus', model: 'RC-F',       chassis: 'Coupe'     },
  { make: 'Lexus', model: 'RX 200T',    chassis: 'SUV'       },
  { make: 'Lexus', model: 'RX 270',     chassis: 'SUV'       },
  { make: 'Lexus', model: 'RX 300',     chassis: 'SUV'       },
  { make: 'Lexus', model: 'RX 350',     chassis: 'SUV'       },
  { make: 'Lexus', model: 'RX 400H',    chassis: 'SUV'       },
  { make: 'Lexus', model: 'RX 450H',    chassis: 'SUV'       },
  { make: 'Lexus', model: 'Soarer',     chassis: 'Coupe'     },

  // ── Lotus ────────────────────────────────────────────────────────────────────
  { make: 'Lotus', model: 'ELISE S1', chassis: 'Convertible' },
  { make: 'Lotus', model: 'Evora',    chassis: 'Coupe'       },
  { make: 'Lotus', model: 'Exige',    chassis: 'Coupe'       },

  // ── Mazda ────────────────────────────────────────────────────────────────────
  { make: 'Mazda', model: 'BT-50',                  chassis: 'Ute'        },
  { make: 'Mazda', model: 'BT50',                   chassis: 'Ute'        },
  { make: 'Mazda', model: 'CX-3',                   chassis: 'SUV'        },
  { make: 'Mazda', model: 'CX-30',                  chassis: 'SUV'        },
  { make: 'Mazda', model: 'CX-30 Skyactiv-X M Hybrid', chassis: 'SUV'    },
  { make: 'Mazda', model: 'CX-5',                   chassis: 'SUV'        },
  { make: 'Mazda', model: 'CX-60',                  chassis: 'SUV'        },
  { make: 'Mazda', model: 'CX-60 e-Skyactiv Phev',  chassis: 'SUV'        },
  { make: 'Mazda', model: 'CX-7',                   chassis: 'SUV'        },
  { make: 'Mazda', model: 'CX-8',                   chassis: 'SUV'        },
  { make: 'Mazda', model: 'CX-9',                   chassis: 'SUV'        },
  { make: 'Mazda', model: 'CX-90',                  chassis: 'SUV'        },
  { make: 'Mazda', model: 'MPV',                    chassis: 'Van'        },
  { make: 'Mazda', model: 'MX-3',                   chassis: 'Coupe'      },
  { make: 'Mazda', model: 'MX 6',                   chassis: 'Coupe'      },
  { make: 'Mazda', model: 'MX-6',                   chassis: 'Coupe'      },
  { make: 'Mazda', model: 'MX-5',                   chassis: 'Convertible'},
  { make: 'Mazda', model: 'MX-5 – MIATA',           chassis: 'Convertible'},
  { make: 'Mazda', model: 'MX-5 RF',                chassis: 'Coupe'      },
  { make: 'Mazda', model: 'MX-30',                  chassis: 'SUV'        },
  { make: 'Mazda', model: 'MX-30 e-Skyactiv',       chassis: 'SUV'        },
  { make: 'Mazda', model: 'RX-7',                   chassis: 'Coupe'      },
  { make: 'Mazda', model: 'RX-8',                   chassis: 'Coupe'      },
  { make: 'Mazda', model: 'Tribute',                chassis: 'SUV'        },

  // ── Mercedes-Benz ────────────────────────────────────────────────────────────
  { make: 'Mercedes-Benz', model: 'A-CLASS', chassis: 'Hatchback' },
  { make: 'Mercedes-Benz', model: 'B-CLASS', chassis: 'Hatchback' },
  { make: 'Mercedes-Benz', model: 'G-CLASS', chassis: 'SUV'       },
  { make: 'Mercedes-Benz', model: 'M-CLASS', chassis: 'SUV'       },
  { make: 'Mercedes-Benz', model: 'SPRINTER',chassis: 'Van'       },
  { make: 'Mercedes-Benz', model: 'V-Class', chassis: 'Van'       },

  // ── MINI ─────────────────────────────────────────────────────────────────────
  { make: 'MINI', model: 'MINI COOPER – R52 CONVERTIBLE',   chassis: 'Convertible' },
  { make: 'MINI', model: 'MINI COOPER – R53 HATCHBACK',     chassis: 'Hatchback'   },
  { make: 'MINI', model: 'MINI COOPER – R56 HATCHBACK',     chassis: 'Hatchback'   },
  { make: 'MINI', model: 'MINI COOPER CLUBMAN',             chassis: 'Wagon'       },
  { make: 'MINI', model: 'MINI COOPER-R55 WAGON',           chassis: 'Wagon'       },
  { make: 'MINI', model: 'MINI COOPER-R57 CONVERTIBLE',     chassis: 'Convertible' },
  { make: 'MINI', model: 'MINI COOPER-R58 COUPE',           chassis: 'Coupe'       },
  { make: 'MINI', model: 'MINI COOPER-R59 ROADSTER',        chassis: 'Convertible' },
  { make: 'MINI', model: 'MINI COUNTRYMAN',                 chassis: 'SUV'         },
  { make: 'MINI', model: 'MINI COUNTRYMAN-R60 WAGON',       chassis: 'SUV'         },

  // ── Mitsubishi ───────────────────────────────────────────────────────────────
  { make: 'Mitsubishi', model: '3000 GT',                  chassis: 'Coupe'  },
  { make: 'Mitsubishi', model: '3000 GT, GT-SL, GT-VR4, USA', chassis: 'Coupe' },
  { make: 'Mitsubishi', model: 'ASX',                      chassis: 'SUV'    },
  { make: 'Mitsubishi', model: 'Challenger',               chassis: 'SUV'    },
  { make: 'Mitsubishi', model: 'Delica D5',                chassis: 'Van'    },
  { make: 'Mitsubishi', model: 'DELICA, SPACE GEAR 4WD',   chassis: 'Van'    },
  { make: 'Mitsubishi', model: 'Eclipse Cross',             chassis: 'SUV'    },
  { make: 'Mitsubishi', model: 'Eclipse Cross Plug-in Hybrid', chassis: 'SUV'},
  { make: 'Mitsubishi', model: 'EVOLUTION LANCER',         chassis: 'Sedan'  },
  { make: 'Mitsubishi', model: 'Express',                  chassis: 'Van'    },
  { make: 'Mitsubishi', model: 'Fto',                      chassis: 'Coupe'  },
  { make: 'Mitsubishi', model: 'Galant',                   chassis: 'Sedan'  },
  { make: 'Mitsubishi', model: 'Grandis',                  chassis: 'Van'    },
  { make: 'Mitsubishi', model: 'Gto',                      chassis: 'Coupe'  },
  { make: 'Mitsubishi', model: 'L200 Express',             chassis: 'Van'    },
  { make: 'Mitsubishi', model: 'L300',                     chassis: 'Van'    },
  { make: 'Mitsubishi', model: 'Lancer CE',                chassis: 'Sedan'  },
  { make: 'Mitsubishi', model: 'Lancer Evo I',             chassis: 'Sedan'  },
  { make: 'Mitsubishi', model: 'Lancer Evo Iii',           chassis: 'Sedan'  },
  { make: 'Mitsubishi', model: 'Lancer Evo IV',            chassis: 'Sedan'  },
  { make: 'Mitsubishi', model: 'Lancer Evo IX',            chassis: 'Sedan'  },
  { make: 'Mitsubishi', model: 'Lancer Evo V',             chassis: 'Sedan'  },
  { make: 'Mitsubishi', model: 'Lancer Evo Vii',           chassis: 'Sedan'  },
  { make: 'Mitsubishi', model: 'Lancer Evo Viii',          chassis: 'Sedan'  },
  { make: 'Mitsubishi', model: 'Lancer Evo X',             chassis: 'Sedan'  },
  { make: 'Mitsubishi', model: 'Nimbus',                   chassis: 'Van'    },
  { make: 'Mitsubishi', model: 'NIMBUS, SPACEWAGON, CHARIOT', chassis: 'Van' },
  { make: 'Mitsubishi', model: 'Outlander',                chassis: 'SUV'    },
  { make: 'Mitsubishi', model: 'OUTLANDER, AIRTREK',       chassis: 'SUV'    },
  { make: 'Mitsubishi', model: 'Pajero IO',                chassis: 'SUV'    },
  { make: 'Mitsubishi', model: 'ROSA BUS',                 chassis: 'Van'    },
  { make: 'Mitsubishi', model: 'Sigma',                    chassis: 'Sedan'  },
  { make: 'Mitsubishi', model: 'Sigma Scorpion',           chassis: 'Sedan'  },
  { make: 'Mitsubishi', model: 'Starion',                  chassis: 'Coupe'  },
  { make: 'Mitsubishi', model: 'Starwagon',                chassis: 'Van'    },
  { make: 'Mitsubishi', model: 'Starwagon / Delica / Space Gear', chassis: 'Van' },
  { make: 'Mitsubishi', model: 'STARWAGON, DELICA, SPACE GEAR', chassis: 'Van' },
  { make: 'Mitsubishi', model: 'Triton',                   chassis: 'Ute'    },
  { make: 'Mitsubishi', model: 'Verada',                   chassis: 'Sedan'  },
  { make: 'Mitsubishi', model: 'VERADA / DIAMANTE',        chassis: 'Sedan'  },

  // ── Nissan ───────────────────────────────────────────────────────────────────
  { make: 'Nissan', model: '180SX',                  chassis: 'Coupe'   },
  { make: 'Nissan', model: '200SX',                  chassis: 'Coupe'   },
  { make: 'Nissan', model: '350Z',                   chassis: 'Coupe'   },
  { make: 'Nissan', model: '370Z',                   chassis: 'Coupe'   },
  { make: 'Nissan', model: 'Cube',                   chassis: 'Hatchback'},
  { make: 'Nissan', model: 'Dualis',                 chassis: 'SUV'     },
  { make: 'Nissan', model: 'Elgrand',                chassis: 'Van'     },
  { make: 'Nissan', model: 'GT-R R35',               chassis: 'Coupe'   },
  { make: 'Nissan', model: 'Juke',                   chassis: 'SUV'     },
  { make: 'Nissan', model: 'MICRA, MARCH K11',       chassis: 'Hatchback'},
  { make: 'Nissan', model: 'Murano',                 chassis: 'SUV'     },
  { make: 'Nissan', model: 'NAVARA D21 & D22 4X2',   chassis: 'Ute'     },
  { make: 'Nissan', model: 'NAVARA D21 & D22 4X4',   chassis: 'Ute'     },
  { make: 'Nissan', model: 'NAVARA D40 4X2, 4X4',    chassis: 'Ute'     },
  { make: 'Nissan', model: 'Navara NP300',            chassis: 'Ute'     },
  { make: 'Nissan', model: 'NX COUPE',               chassis: 'Coupe'   },
  { make: 'Nissan', model: 'PATHFINDER / TERRANO',   chassis: 'SUV'     },
  { make: 'Nissan', model: 'PATROL / SAFARI Y62',    chassis: 'SUV'     },
  { make: 'Nissan', model: 'Qashqai',                chassis: 'SUV'     },
  { make: 'Nissan', model: 'Silvia',                 chassis: 'Coupe'   },
  { make: 'Nissan', model: 'Stagea',                 chassis: 'Wagon'   },
  { make: 'Nissan', model: 'Stanza',                 chassis: 'Sedan'   },
  { make: 'Nissan', model: 'Terrano',                chassis: 'SUV'     },
  { make: 'Nissan', model: 'Urvan',                  chassis: 'Van'     },
  { make: 'Nissan', model: 'VANETTE',                chassis: 'Van'     },
  { make: 'Nissan', model: 'X-Trail',                chassis: 'SUV'     },
  { make: 'Nissan', model: 'Xterra',                 chassis: 'SUV'     },

  // ── Opel ─────────────────────────────────────────────────────────────────────
  { make: 'Opel', model: 'Corsa',  chassis: 'Hatchback' },
  { make: 'Opel', model: 'Zafira', chassis: 'Van'       },

  // ── Peugeot ──────────────────────────────────────────────────────────────────
  { make: 'Peugeot', model: '2008',                           chassis: 'SUV'        },
  { make: 'Peugeot', model: '3008',                           chassis: 'SUV'        },
  { make: 'Peugeot', model: '4007',                           chassis: 'SUV'        },
  { make: 'Peugeot', model: '4008',                           chassis: 'SUV'        },
  { make: 'Peugeot', model: '307 CONVERTIBLE',                chassis: 'Convertible'},
  { make: 'Peugeot', model: '307 HATCHBACK',                  chassis: 'Hatchback'  },
  { make: 'Peugeot', model: '307 WAGON',                      chassis: 'Wagon'      },
  { make: 'Peugeot', model: 'EXPERT',                         chassis: 'Van'        },
  { make: 'Peugeot', model: 'PARTNER / RANCH / LIGHT COMMERCIAL', chassis: 'Van'   },
  { make: 'Peugeot', model: 'RCZ',                            chassis: 'Coupe'      },

  // ── Pontiac ──────────────────────────────────────────────────────────────────
  { make: 'Pontiac', model: 'G8',   chassis: 'Sedan'     },
  { make: 'Pontiac', model: 'GTO',  chassis: 'Coupe'     },
  { make: 'Pontiac', model: 'Vibe', chassis: 'Hatchback' },

  // ── Porsche ──────────────────────────────────────────────────────────────────
  { make: 'Porsche', model: 'BOXSTER',    chassis: 'Convertible' },
  { make: 'Porsche', model: 'Cayman',     chassis: 'Coupe'       },
  { make: 'Porsche', model: 'CAYENNE SUV',chassis: 'SUV'         },

  // ── Proton ───────────────────────────────────────────────────────────────────
  { make: 'Proton', model: 'PERSONA',           chassis: 'Sedan'     },
  { make: 'Proton', model: 'SATRIA GLI',        chassis: 'Hatchback' },
  { make: 'Proton', model: 'SATRIA XLI, GTI 1.8L', chassis: 'Hatchback' },

  // ── Renault ──────────────────────────────────────────────────────────────────
  { make: 'Renault', model: 'Captur',  chassis: 'SUV'       },
  { make: 'Renault', model: 'Clio',    chassis: 'Hatchback' },
  { make: 'Renault', model: 'FLUENCE', chassis: 'Sedan'     },
  { make: 'Renault', model: 'Kangoo',  chassis: 'Van'       },
  { make: 'Renault', model: 'Koleos',  chassis: 'SUV'       },
  { make: 'Renault', model: 'LATITUDE',chassis: 'Sedan'     },
  { make: 'Renault', model: 'Master',  chassis: 'Van'       },
  { make: 'Renault', model: 'Trafic',  chassis: 'Van'       },

  // ── Scion ────────────────────────────────────────────────────────────────────
  { make: 'Scion', model: 'FR-S', chassis: 'Coupe' },

  // ── Skoda ────────────────────────────────────────────────────────────────────
  { make: 'Skoda', model: 'Ateca',   chassis: 'SUV'       },
  { make: 'Skoda', model: 'Fabia',   chassis: 'Hatchback' },
  { make: 'Skoda', model: 'Kodiaq',  chassis: 'SUV'       },
  { make: 'Skoda', model: 'Rapid',   chassis: 'Sedan'     },
  { make: 'Skoda', model: 'Superb',  chassis: 'Sedan'     },
  { make: 'Skoda', model: 'YETI 5L', chassis: 'SUV'       },

  // ── Smart ────────────────────────────────────────────────────────────────────
  { make: 'Smart', model: 'CITY COUP', chassis: 'Coupe'     },
  { make: 'Smart', model: 'FORFOUR',   chassis: 'Hatchback' },
  { make: 'Smart', model: 'fortwo',    chassis: 'Coupe'     },

  // ── SsangYong ────────────────────────────────────────────────────────────────
  { make: 'SsangYong', model: 'Actyon',  chassis: 'SUV' },
  { make: 'SsangYong', model: 'KORANDO', chassis: 'SUV' },
  { make: 'SsangYong', model: 'Kyron',   chassis: 'SUV' },
  { make: 'SsangYong', model: 'Musso',   chassis: 'SUV' },
  { make: 'SsangYong', model: 'Rexton',  chassis: 'SUV' },

  // ── Subaru ───────────────────────────────────────────────────────────────────
  { make: 'Subaru', model: 'BRZ',     chassis: 'Coupe'  },
  { make: 'Subaru', model: 'BRUMBY',  chassis: 'Ute'    },
  { make: 'Subaru', model: 'Forester',chassis: 'SUV'    },
  { make: 'Subaru', model: 'Levorg',  chassis: 'Wagon'  },
  { make: 'Subaru', model: 'Outback', chassis: 'Wagon'  },
  { make: 'Subaru', model: 'Tribeca', chassis: 'SUV'    },
  { make: 'Subaru', model: 'XV',      chassis: 'SUV'    },

  // ── Suzuki ───────────────────────────────────────────────────────────────────
  { make: 'Suzuki', model: 'Alto',          chassis: 'Hatchback' },
  { make: 'Suzuki', model: 'APV',           chassis: 'Van'       },
  { make: 'Suzuki', model: 'GRAND VITARA',  chassis: 'SUV'       },
  { make: 'Suzuki', model: 'KIZASHI',       chassis: 'Sedan'     },
  { make: 'Suzuki', model: 'S-CROSS',       chassis: 'SUV'       },
  { make: 'Suzuki', model: 'SAMURAI',       chassis: 'SUV'       },
  { make: 'Suzuki', model: 'SIERRA / JIMNY',chassis: 'SUV'       },
  { make: 'Suzuki', model: 'Swift',         chassis: 'Hatchback' },
  { make: 'Suzuki', model: 'SX4',           chassis: 'Hatchback' },

  // ── Toyota ───────────────────────────────────────────────────────────────────
  { make: 'Toyota', model: '86',                  chassis: 'Coupe'     },
  { make: 'Toyota', model: 'Alphard',             chassis: 'Van'       },
  { make: 'Toyota', model: 'Alphard / Vellfire',  chassis: 'Van'       },
  { make: 'Toyota', model: 'C-HR',                chassis: 'SUV'       },
  { make: 'Toyota', model: 'C-HR Hybrid [X2, H2]',chassis: 'SUV'      },
  { make: 'Toyota', model: 'Corolla Cross',        chassis: 'SUV'       },
  { make: 'Toyota', model: 'Estima',               chassis: 'Van'       },
  { make: 'Toyota', model: 'Estima Emina / Lucida',chassis: 'Van'       },
  { make: 'Toyota', model: 'FJ Cruiser',           chassis: 'SUV'       },
  { make: 'Toyota', model: 'GR 86',                chassis: 'Coupe'     },
  { make: 'Toyota', model: 'Granvia',              chassis: 'Van'       },
  { make: 'Toyota', model: 'Granvia / Grand Hiace',chassis: 'Van'       },
  { make: 'Toyota', model: 'HI-ACE',              chassis: 'Van'       },
  { make: 'Toyota', model: 'Hiace',               chassis: 'Van'       },
  { make: 'Toyota', model: 'Hiace / Commuter',    chassis: 'Van'       },
  { make: 'Toyota', model: 'Hiace Sbv',           chassis: 'Van'       },
  { make: 'Toyota', model: 'Hilux',               chassis: 'Ute'       },
  { make: 'Toyota', model: 'HI-LUX 4WD, REVO',   chassis: 'Ute'       },
  { make: 'Toyota', model: 'Kluger',              chassis: 'SUV'       },
  { make: 'Toyota', model: 'KLUGER, HIGHLANDER',  chassis: 'SUV'       },
  { make: 'Toyota', model: 'Land Cruiser Prado',  chassis: 'SUV'       },
  { make: 'Toyota', model: 'LITE-ACE',            chassis: 'Van'       },
  { make: 'Toyota', model: 'Liteace',             chassis: 'Van'       },
  { make: 'Toyota', model: 'Prius',               chassis: 'Hatchback' },
  { make: 'Toyota', model: 'Prius C',             chassis: 'Hatchback' },
  { make: 'Toyota', model: 'Prius V',             chassis: 'Wagon'     },
  { make: 'Toyota', model: 'Rav 4',               chassis: 'SUV'       },
  { make: 'Toyota', model: 'Supra',               chassis: 'Coupe'     },
  { make: 'Toyota', model: 'Tarago',              chassis: 'Van'       },

  // ── Volkswagen ───────────────────────────────────────────────────────────────
  { make: 'Volkswagen', model: 'Amarok',     chassis: 'Ute'        },
  { make: 'Volkswagen', model: 'Arteon',     chassis: 'Sedan'      },
  { make: 'Volkswagen', model: 'BEETLE NEW', chassis: 'Coupe'      },
  { make: 'Volkswagen', model: 'Bora',       chassis: 'Sedan'      },
  { make: 'Volkswagen', model: 'CADDY VAN',  chassis: 'Van'        },
  { make: 'Volkswagen', model: 'CRAFTER',    chassis: 'Van'        },
  { make: 'Volkswagen', model: 'Eos',        chassis: 'Convertible'},
  { make: 'Volkswagen', model: 'Kombi',      chassis: 'Van'        },
  { make: 'Volkswagen', model: 'SCIROCCO',   chassis: 'Coupe'      },
  { make: 'Volkswagen', model: 'Tiguan',     chassis: 'SUV'        },
  { make: 'Volkswagen', model: 'TOUAREG',    chassis: 'SUV'        },

  // ── Volvo ────────────────────────────────────────────────────────────────────
  { make: 'Volvo', model: 'C30',             chassis: 'Hatchback' },
  { make: 'Volvo', model: 'S40',             chassis: 'Sedan'     },
  { make: 'Volvo', model: 'S40 II',          chassis: 'Sedan'     },
  { make: 'Volvo', model: 'S60',             chassis: 'Sedan'     },
  { make: 'Volvo', model: 'S70',             chassis: 'Sedan'     },
  { make: 'Volvo', model: 'S80',             chassis: 'Sedan'     },
  { make: 'Volvo', model: 'S90',             chassis: 'Sedan'     },
  { make: 'Volvo', model: 'V50',             chassis: 'Wagon'     },
  { make: 'Volvo', model: 'V60',             chassis: 'Wagon'     },
  { make: 'Volvo', model: 'V70',             chassis: 'Wagon'     },
  { make: 'Volvo', model: 'V70 II',          chassis: 'Wagon'     },
  { make: 'Volvo', model: 'V90',             chassis: 'Wagon'     },
  { make: 'Volvo', model: 'XC60',            chassis: 'SUV'       },
  { make: 'Volvo', model: 'XC70',            chassis: 'Wagon'     },
  { make: 'Volvo', model: 'XC70 CROSS COUNTRY', chassis: 'Wagon'  },
  { make: 'Volvo', model: 'XC90',            chassis: 'SUV'       },
];

async function main() {
  console.log(DRY_RUN ? '=== DRY RUN ===' : '=== PATCH ALL-MAKES CHASSIS (OBVIOUS) ===');
  console.log(`Assignments: ${ASSIGNMENTS.length}\n`);

  let totalRows = 0;
  let ok = 0;

  for (const { make, model, chassis } of ASSIGNMENTS) {
    const enc = encodeURIComponent;
    const filter = `/vehicles?make=eq.${enc(make)}&model=eq.${enc(model)}&chassis=is.null`;

    if (DRY_RUN) {
      const rows = await api(`${filter}&select=id`);
      if (rows.length > 0) {
        console.log(`  ${rows.length.toString().padStart(4)} rows: ${make} / ${model} → "${chassis}"`);
        totalRows += rows.length;
      }
    } else {
      await api(filter, {
        method:  'PATCH',
        headers: { ...hdrs, Prefer: 'return=minimal' },
        body:    JSON.stringify({ chassis }),
      });
      // Count what was just patched
      const patched = await api(`${filter}&select=id`); // should now be 0
      // We can't easily count after the fact; just log the assignment
      console.log(`  ✓ ${make} / ${model} → "${chassis}"`);
      ok++;
    }
  }

  if (DRY_RUN) {
    console.log(`\nDry-run complete. Would patch ~${totalRows} rows across ${ASSIGNMENTS.length} make/model groups.`);
  } else {
    console.log(`\nDone. Processed ${ok} assignments.`);
  }
}

main().catch(err => { console.error(err); process.exit(1); });
