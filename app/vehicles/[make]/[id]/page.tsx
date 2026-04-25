import { supabaseServer } from "../../../lib/supabaseServer";
import Header from "../../../components/Header";
import Footer from "../../../components/Footer";
import VehicleDetailClient from "./VehicleDetailClient";

function Row({ label, value }: { label: string; value?: string | number | null }) {
  if (!value && value !== 0) return null;
  return (
    <div className="flex py-2.5 border-b border-gray-100 last:border-0">
      <span className="w-56 shrink-0 text-sm text-gray-500">{label}</span>
      <span className="text-sm font-medium text-[#111827]">{value}</span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-6 rounded-xl border border-gray-200 overflow-hidden">
      <div className="bg-[#141414] px-5 py-3">
        <h2 className="text-sm font-semibold text-white uppercase tracking-wide">{title}</h2>
      </div>
      <div className="px-5 py-1">{children}</div>
    </div>
  );
}

function TagRow({ label, tags }: { label: string; tags: string[] }) {
  if (!tags || tags.length === 0) return null;
  return (
    <div className="flex py-2.5 border-b border-gray-100 last:border-0 items-start">
      <span className="w-56 shrink-0 text-sm text-gray-500">{label}</span>
      <div className="flex flex-wrap gap-1.5">
        {tags.map(tag => (
          <span key={tag} className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}

export const revalidate = 60;

export default async function VehicleDetailPage({ params }: { params: Promise<{ make: string; id: string }> }) {
  const { make: makeSlug, id } = await params;

  const { data: v, error } = await supabaseServer
    .from("vehicles")
    .select("*, image_urls")
    .eq("id", id)
    .single();

  if (error || !v) {
    return (
      <div className="min-h-screen flex flex-col bg-[#F3F4F6]">
        <Header />
        <main className="flex-1 bg-white flex items-center justify-center">
          <p className="text-gray-400">Vehicle not found.</p>
        </main>
      </div>
    );
  }

  const specs = (v.specs as Record<string, any>) ?? {};

  return (
    <div className="min-h-screen flex flex-col bg-[#F3F4F6]">
      <Header />

      <main className="flex-1 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-8">
          {/* Back link */}
          <a href={`/vehicles/${makeSlug}`} className="text-sm text-gray-400 hover:text-gray-600">
            ← Back to {v.make}
          </a>

          {/* Title + View Parts button */}
          <div className="mt-3 flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-[#111827]">
                {v.make} {v.series} {v.model}
              </h1>
              {(v.trim_code ?? v.grade) && <p className="mt-0.5 text-gray-500">{v.trim_code ?? v.grade}</p>}
            </div>
            <a
              href={`/vehicles/${makeSlug}/${id}/parts`}
              className="shrink-0 rounded-xl bg-[#E8000D] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#9a0101] transition-colors"
            >
              View Parts
            </a>
          </div>

          {/* Images + edit button */}
          <VehicleDetailClient
            vehicleId={id}
            makeSlug={makeSlug}
            imageUrls={(v.image_urls as string[] | null) ?? []}
          />

          {/* Core specs */}
          <Section title="General">
            <Row label="Make" value={v.make} />
            <Row label="Model" value={v.model} />
            <Row label="Series" value={v.series} />
            <Row label="Trim" value={v.trim_code ?? v.grade} />
            <TagRow label="Trims" tags={Array.isArray(specs.grades) ? specs.grades : []} />
            <Row label="Year From" value={v.year_from} />
            <Row label="Year To" value={v.year_to} />
            <Row label="Notes" value={v.notes} />
            <Row label="Country of Origin" value={specs.country_of_origin} />
            <Row label="VIN Sample" value={specs.vin_sample} />
            <Row label="Warranty" value={specs.warranty} />
            <Row label="Seats" value={specs.seats} />
            <Row label="RON Rating" value={specs.ron_rating} />
          </Section>

          <Section title="Body">
            <Row label="Body Type" value={specs.body} />
            <Row label="Market Body" value={specs.market_body} />
            <Row label="Market Segment" value={specs.market_segment} />
            <Row label="Doors" value={specs.doors} />
            <Row label="Length (mm)" value={specs.length_mm} />
            <Row label="Length with Spare (mm)" value={specs.length_with_spare_mm} />
            <Row label="Width (mm)" value={specs.width_mm} />
            <Row label="Height (mm)" value={specs.height_mm} />
            <Row label="Wheelbase (mm)" value={specs.wheelbase_mm} />
            <Row label="Ground Clearance (mm)" value={specs.ground_clearance_mm} />
            <Row label="Kerb Mass (kg)" value={specs.kerb_mass_kg} />
            <Row label="Curb Mass MT (kg)" value={specs.curb_mass_min_kg ? `${specs.curb_mass_min_kg}–${specs.curb_mass_max_kg}` : null} />
            <Row label="Curb Mass AT (kg)" value={specs.curb_mass_at_min_kg ? `${specs.curb_mass_at_min_kg}–${specs.curb_mass_at_max_kg}` : null} />
            <Row label="GVM (kg)" value={specs.gvm_kg} />
            <Row label="Max Axle Load Front (kg)" value={specs.max_axle_front_kg} />
            <Row label="Max Axle Load Rear (kg)" value={specs.max_axle_rear_kg} />
            <Row label="Boot Space (L)" value={specs.boot_space_litres} />
            <Row label="Airbags" value={specs.airbags} />
            <Row label="Spare Tyre" value={specs.spare_tyre} />
          </Section>

          <Section title="Engine">
            <Row label="Engine Code" value={v.engine_code} />
            <Row label="Configuration" value={v.engine_config} />
            <Row label="Cylinders" value={specs.cylinders} />
            <Row label="Displacement (cc)" value={specs.displacement_cc} />
            <Row label="Capacity (L)" value={v.engine_litres} />
            <Row label="Bore (mm)" value={specs.bore_mm} />
            <Row label="Stroke (mm)" value={specs.stroke_mm} />
            <Row label="Bore (in)" value={specs.bore_in} />
            <Row label="Stroke (in)" value={specs.stroke_in} />
            <Row label="Compression Ratio" value={specs.compression_ratio} />
            <Row label="Max Power" value={specs.max_power} />
            <Row label="Power (kW)" value={v.engine_kw} />
            <Row label="Max Torque" value={specs.max_torque} />
            <Row label="Torque (Nm)" value={specs.torque_nm} />
            <Row label="Firing Order" value={specs.firing_order} />
            <Row label="Fuel Type" value={v.fuel_type} />
          </Section>

          <Section title="Transmission & Drive">
            {Array.isArray(specs.transmissions) && specs.transmissions.length > 0 && (
              <Row label="Transmissions" value={specs.transmissions.join(' / ')} />
            )}
            <Row label="Transmission" value={specs.transmission ?? specs.transmission_description} />
            <Row label="Transmission Type" value={specs.transmission_type} />
            <Row label="Transmission Info" value={specs.transmission_info} />
            <Row label="Drivetrain" value={specs.drivetrain} />
            <Row label="Transfer Box" value={specs.transfer_box} />
            <Row label="4WD System" value={specs.awd_description} />
            <Row label="Final Drive" value={specs.final_drive} />
          </Section>

          <Section title="Performance">
            <Row label="0–100 km/h" value={specs["0_100_kmh"]} />
            <Row label="Top Speed (km/h)" value={specs.top_speed_kmh} />
            <Row label="Fuel Consumption (L/100km)" value={specs.consumption_l100km} />
            <Row label="CO₂ Emissions (g/km)" value={specs.co2_g_km} />
          </Section>

          <Section title="Brakes">
            <Row label="Front Brakes" value={specs.front_brake_desc} />
            <Row label="Front Brake Diameter (mm)" value={specs.front_brake_diameter_mm} />
            <Row label="Rear Brakes" value={specs.rear_brake_desc} />
            <Row label="Rear Brake Diameter (mm)" value={specs.rear_brake_diameter_mm} />
          </Section>

          <Section title="Wheels & Tyres">
            <Row label="Tyre" value={specs.tyre} />
            <Row label="Stud Pattern (PCD)" value={specs.wheel_pcd} />
            <Row label="Rim (Steel)" value={specs.rim_steel} />
            <Row label="Rim (Alloy)" value={specs.rim_alloy} />
            <Row label="Rim Material" value={specs.rim_material} />
            <Row label="Front Rim" value={specs.front_rim_desc} />
            <Row label="Front Rim Offset" value={specs.front_rim_offset} />
            <Row label="Rear Rim" value={specs.rear_rim_desc} />
            <Row label="Rear Rim Offset" value={specs.rear_rim_offset} />
            <Row label="Front Tyre" value={specs.front_tyre_desc} />
            <Row label="Front Tyre Pressure Min (psi)" value={specs.front_tyre_pressure_min_psi} />
            <Row label="Front Tyre Pressure Max (psi)" value={specs.front_tyre_pressure_max_psi} />
            <Row label="Rear Tyre" value={specs.rear_tyre_desc} />
            <Row label="Rear Tyre Pressure Min (psi)" value={specs.rear_tyre_pressure_min_psi} />
            <Row label="Rear Tyre Pressure Max (psi)" value={specs.rear_tyre_pressure_max_psi} />
            <Row label="Spare Tyre" value={specs.spare_tyre} />
            <Row label="Track Front (mm)" value={specs.track_front_mm} />
            <Row label="Track Rear (mm)" value={specs.track_rear_mm} />
            <Row label="Wheel Nut Torque (Nm)" value={specs.wheel_lug_torque_nm} />
            <Row label="Wheel Nut Spec" value={specs.wheel_nut_spec} />
          </Section>

          {(specs.oe_tyre_front_1 || specs.plus_size_front_1) && (
            <Section title="Tyre Options">
              {specs.oe_tyre_front_1 && <Row label="OE Option 1 Front" value={specs.oe_tyre_front_1} />}
              {specs.oe_tyre_rear_1 && <Row label="OE Option 1 Rear" value={specs.oe_tyre_rear_1} />}
              {specs.oe_tyre_front_2 && <Row label="OE Option 2 Front" value={specs.oe_tyre_front_2} />}
              {specs.oe_tyre_rear_2 && <Row label="OE Option 2 Rear" value={specs.oe_tyre_rear_2} />}
              {specs.plus_size_front_1 && <Row label="Plus Size Option 1 Front" value={specs.plus_size_front_1} />}
              {specs.plus_size_rear_1 && <Row label="Plus Size Option 1 Rear" value={specs.plus_size_rear_1} />}
              {specs.plus_size_front_2 && <Row label="Plus Size Option 2 Front" value={specs.plus_size_front_2} />}
              {specs.plus_size_rear_2 && <Row label="Plus Size Option 2 Rear" value={specs.plus_size_rear_2} />}
              {specs.plus_size_front_3 && <Row label="Plus Size Option 3 Front" value={specs.plus_size_front_3} />}
              {specs.plus_size_rear_3 && <Row label="Plus Size Option 3 Rear" value={specs.plus_size_rear_3} />}
            </Section>
          )}

          <Section title="Electrical">
            <Row label="Battery" value={specs.battery} />
            <Row label="Spark Plug" value={specs.spark_plug} />
            <Row label="Spark Plug Gap" value={specs.spark_plug_gap_in} />
            <Row label="Distributor Point Opening" value={specs.distributor_point_opening_in} />
            <Row label="Cam Angle Dwell" value={specs.cam_angle_dwell} />
            <Row label="Headlight" value={specs.headlight} />
          </Section>

          <Section title="Fluids & Capacities">
            <Row label="Fuel Tank (L)" value={specs.fuel_tank_litres} />
            <Row label="Engine Oil (L)" value={specs.engine_oil_litres} />
            <Row label="Engine Oil Spec" value={specs.engine_oil_spec} />
            <Row label="Engine Oil Service Refill (pints)" value={specs.oil_capacity_service_pints} />
            <Row label="Oil Filter Add (pints)" value={specs.oil_filter_add_pints} />
            <Row label="Coolant (L)" value={specs.coolant_litres} />
            <Row label="Cooling System (pints)" value={specs.cooling_capacity_pints} />
            <Row label="Manual Trans Oil (L)" value={specs.manual_trans_oil_litres} />
            <Row label="Manual Trans Oil Spec" value={specs.manual_trans_oil_spec} />
            <Row label="Auto Trans Oil (L)" value={specs.auto_trans_oil_litres} />
            <Row label="Auto Trans Oil Spec" value={specs.auto_trans_oil_spec} />
            <Row label="Front Diff Oil (L)" value={specs.front_diff_oil_litres} />
            <Row label="Rear Diff Oil (L)" value={specs.rear_diff_oil_litres} />
            <Row label="Transfer Oil (L)" value={specs.transfer_oil_litres} />
            <Row label="Transfer Oil Spec" value={specs.transfer_oil_spec} />
            <Row label="Rear Axle (pints)" value={specs.rear_axle_capacity_pints} />
            <Row label="Brake Fluid Spec" value={specs.brake_fluid_spec} />
          </Section>

          <Section title="Service">
            <Row label="Minor Service Interval (km)" value={specs.service_interval_km} />
            <Row label="Minor Service Interval (months)" value={specs.service_interval_months} />
          </Section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
