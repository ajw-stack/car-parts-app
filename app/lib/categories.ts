export type Category = {
  name: string;
  slug: string;
  group: string;
  dbNames?: string[];
};

export const CATEGORIES: Category[] = [
  // Filters
  { name: "Oil Filters", slug: "oil-filters", group: "Filters", dbNames: ["Oil Filters", "Oil Filter"] },
  { name: "Air Filters", slug: "air-filters", group: "Filters" },
  { name: "Fuel Filters", slug: "fuel-filters", group: "Filters" },
  { name: "Cabin Air Filters", slug: "cabin-air-filters", group: "Filters", dbNames: ["Cabin Air Filters", "Cabin Filters"] },
  { name: "Transmission Filters", slug: "transmission-filters", group: "Filters" },
  // Ignition
  { name: "Spark Plugs", slug: "spark-plugs", group: "Ignition" },
  { name: "Glow Plugs", slug: "glow-plugs", group: "Ignition" },
  { name: "Ignition Leads", slug: "ignition-leads", group: "Ignition" },
  { name: "Coil Packs", slug: "coil-packs", group: "Ignition" },
  // Brakes
  { name: "Brake Pads", slug: "brake-pads", group: "Brakes", dbNames: ["Brake Pads", "Brake Pad Set", "Brake pads", "Brake pad accessories"] },
  { name: "Brake Shoes", slug: "brake-shoes", group: "Brakes", dbNames: ["Brake Shoe Sets", "Brake Shoe Set", "Shoes", "Park Brake Shoe Set"] },
  { name: "Brake Rotors", slug: "brake-rotors", group: "Brakes", dbNames: ["Brake Rotors", "Brake Rotor", "Brake discs"] },
  { name: "Brake Drums", slug: "brake-drums", group: "Brakes", dbNames: ["Brake Drums", "Brake Drum", "Drums"] },
  { name: "Brake Calipers", slug: "brake-calipers", group: "Brakes", dbNames: ["Brake Calipers", "Caliper", "LCV calipers", "LCV caliper bracket"] },
  { name: "Brake Hoses", slug: "brake-hoses", group: "Brakes", dbNames: ["Brake Hoses", "Brake Hose Set", "Brake Lines & Hoses", "Brake Hose"] },
  { name: "Brake Upgrade Kits", slug: "brake-upgrade-kits", group: "Brakes", dbNames: ["Brake Upgrade Kits", "High Performance Brake Kit", "UPGRADE GT kit", "Disc and Pad Kit"] },
  { name: "Master Cylinders", slug: "master-cylinders", group: "Brakes", dbNames: ["Master Cylinders", "Master Cylinder"] },
  // Suspension & Steering
  { name: "Shock Absorbers", slug: "shock-absorbers", group: "Suspension & Steering" },
  { name: "Coil Springs", slug: "coil-springs", group: "Suspension & Steering" },
  { name: "Ball Joints", slug: "ball-joints", group: "Suspension & Steering" },
  { name: "Tie Rod Ends", slug: "tie-rod-ends", group: "Suspension & Steering" },
  { name: "Control Arms", slug: "control-arms", group: "Suspension & Steering" },
  { name: "Sway Bar Links", slug: "sway-bar-links", group: "Suspension & Steering" },
  { name: "Bushes & Mounts", slug: "bushes-mounts", group: "Suspension & Steering" },
  { name: "Power Steering Pumps", slug: "power-steering-pumps", group: "Suspension & Steering" },
  { name: "Steering Racks", slug: "steering-racks", group: "Suspension & Steering" },
  // Engine Parts
  { name: "Gaskets & Seals", slug: "gaskets-seals", group: "Engine Parts" },
  { name: "Engine Bearings", slug: "engine-bearings", group: "Engine Parts" },
  // Belts & Timing Parts
  { name: "Timing Belt Kits", slug: "timing-belt-kits", group: "Belts & Timing Parts", dbNames: ["Timing Belt Kit", "Timing Belt Kits", "Timing Belt"] },
  { name: "Drive Belts", slug: "drive-belts", group: "Belts & Timing Parts", dbNames: ["Drive Belts", "V-Belt", "V-ribbed Belt"] },
  // Cooling System
  { name: "Radiators", slug: "radiators", group: "Cooling System" },
  { name: "Water Pumps", slug: "water-pumps", group: "Cooling System", dbNames: ["Water Pumps", "Water Pump"] },
  { name: "Thermostats", slug: "thermostats", group: "Cooling System", dbNames: ["Thermostats", "Thermostat"] },
  { name: "Coolant Hoses", slug: "coolant-hoses", group: "Cooling System", dbNames: ["Coolant Hoses", "Radiator Hoses", "Heater Hose", "Radiator Hose", "Coolant Pipe"] },
  { name: "Heater Control Valves", slug: "heater-control-valves", group: "Cooling System", dbNames: ["Heater Control Valve", "Coolant Control Valve"] },
  // Oil & Fluids
  { name: "Engine Oil", slug: "engine-oil", group: "Oil & Fluids", dbNames: ["Engine Oil"] },
  { name: "Differential Oil", slug: "differential-oil", group: "Oil & Fluids", dbNames: ["Differential Oil"] },
  { name: "Automatic Trans Fluid", slug: "automatic-trans-fluid", group: "Oil & Fluids", dbNames: ["Automatic Trans Fluid", "Automatic Transmission Fluid"] },
  { name: "Manual Transmission Oil", slug: "manual-transmission-oil", group: "Oil & Fluids", dbNames: ["Manual Transmission Oil", "Manual Trans Oil"] },
  { name: "Power Steering Fluid", slug: "power-steering-fluid", group: "Oil & Fluids", dbNames: ["Power Steering Fluid"] },
  { name: "Brake Fluid", slug: "brake-fluid", group: "Oil & Fluids", dbNames: ["Brake Fluid"] },
  { name: "Coolant", slug: "coolant", group: "Oil & Fluids", dbNames: ["Engine Coolant/Antifreeze Fluid", "Engine Coolant", "Coolant"] },
  { name: "Intake System Cleaner", slug: "intake-system-cleaner", group: "Oil & Fluids", dbNames: ["Intake System Cleaner"] },
  // Drivetrain
  { name: "CV Joints & Boots", slug: "cv-joints-boots", group: "Drivetrain" },
  { name: "Universal Joints", slug: "universal-joints", group: "Drivetrain" },
  // Clutch
  { name: "Clutch Kits", slug: "clutch-kits", group: "Clutch" },
  { name: "Flywheels", slug: "flywheels", group: "Clutch" },
  // Exhaust
  { name: "Mufflers", slug: "mufflers", group: "Exhaust" },
  { name: "Catalytic Converters", slug: "catalytic-converters", group: "Exhaust" },
  // Service Kits
  { name: "Filter Service Kits", slug: "filter-service-kits", group: "Service Kits" },
  // Lighting
  { name: "Headlights", slug: "headlights", group: "Lighting" },
  { name: "Tail Lights", slug: "tail-lights", group: "Lighting" },
  { name: "Globes & Bulbs", slug: "globes-bulbs", group: "Lighting" },
  // Batteries & Charging
  { name: "Batteries", slug: "batteries", group: "Batteries & Charging" },
  { name: "Alternators", slug: "alternators", group: "Batteries & Charging" },
  { name: "Starter Motors", slug: "starter-motors", group: "Batteries & Charging" },
];

export function getCategoryBySlug(slug: string): Category | undefined {
  return CATEGORIES.find((c) => c.slug === slug);
}

export function getDbNames(category: Category): string[] {
  return category.dbNames ?? [category.name];
}

export function groupCategories(): Record<string, Category[]> {
  const groups: Record<string, Category[]> = {};
  for (const cat of CATEGORIES) {
    if (!groups[cat.group]) groups[cat.group] = [];
    groups[cat.group].push(cat);
  }
  return groups;
}
