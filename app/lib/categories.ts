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
  { name: "Brake Pads", slug: "brake-pads", group: "Brakes", dbNames: ["Brake Pads", "Brake Pad Set"] },
  { name: "Brake Shoe Sets", slug: "brake-shoe-sets", group: "Brakes", dbNames: ["Brake Shoe Sets", "Brake Shoe Set"] },
  { name: "Brake Rotors", slug: "brake-rotors", group: "Brakes", dbNames: ["Brake Rotors", "Brake Rotor"] },
  { name: "Brake Drums", slug: "brake-drums", group: "Brakes", dbNames: ["Brake Drums", "Brake Drum"] },
  { name: "Brake Calipers", slug: "brake-calipers", group: "Brakes" },
  { name: "Brake Lines & Hoses", slug: "brake-lines-hoses", group: "Brakes" },
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
  // Engine
  { name: "Gaskets & Seals", slug: "gaskets-seals", group: "Engine" },
  { name: "Timing Belts & Chains", slug: "timing-belts-chains", group: "Engine" },
  { name: "Drive Belts", slug: "drive-belts", group: "Engine" },
  { name: "Engine Bearings", slug: "engine-bearings", group: "Engine" },
  // Cooling System
  { name: "Radiators", slug: "radiators", group: "Cooling System" },
  { name: "Water Pumps", slug: "water-pumps", group: "Cooling System" },
  { name: "Thermostats", slug: "thermostats", group: "Cooling System" },
  { name: "Coolant Hoses", slug: "coolant-hoses", group: "Cooling System" },
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
