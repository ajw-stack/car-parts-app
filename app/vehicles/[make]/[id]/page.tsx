import { supabaseServer } from "../../../lib/supabaseServer";
import Header from "../../../components/Header";

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

export default async function VehicleDetailPage({ params }: { params: Promise<{ make: string; id: string }> }) {
  const { make: makeSlug, id } = await params;

  const { data: v, error } = await supabaseServer
    .from("vehicles")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !v) {
    return (
      <div className="min-h-screen flex flex-col bg-[#141414]">
        <Header />
        <main className="flex-1 bg-white flex items-center justify-center">
          <p className="text-gray-400">Vehicle not found.</p>
        </main>
      </div>
    );
  }

  const specs = (v.specs as Record<string, any>) ?? {};

  return (
    <div className="min-h-screen flex flex-col bg-[#141414]">
      <Header />

      <main className="flex-1 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-8">
          {/* Back link */}
          <a href={`/vehicles/${makeSlug}`} className="text-sm text-gray-400 hover:text-gray-600">
            ← Back to {v.make}
          </a>

          {/* Title */}
          <div className="mt-3">
            <h1 className="text-2xl font-bold text-[#111827]">
              {v.make} {v.series} {v.model}
            </h1>
            {v.grade && <p className="mt-0.5 text-gray-500">{v.grade}</p>}
          </div>

          {/* Core specs */}
          <Section title="General">
            <Row label="Make" value={v.make} />
            <Row label="Model" value={v.model} />
            <Row label="Series" value={v.series} />
            <Row label="Grade" value={v.grade} />
            <Row label="Year From" value={v.year_from} />
            <Row label="Year To" value={v.year_to} />
            <Row label="Notes" value={v.notes} />
            <Row label="Country of Origin" value={specs.country_of_origin} />
            <Row label="VIN Sample" value={specs.vin_sample} />
            <Row label="Warranty" value={specs.warranty} />
            <Row label="RRP" value={specs.rrp} />
          </Section>

          <Section title="Body">
            <Row label="Body Type" value={specs.body} />
            <Row label="Market Body" value={specs.market_body} />
            <Row label="Market Segment" value={specs.market_segment} />
            <Row label="Doors" value={specs.doors} />
            <Row label="Length (mm)" value={specs.length_mm} />
            <Row label="Width (mm)" value={specs.width_mm} />
            <Row label="Height (mm)" value={specs.height_mm} />
            <Row label="Ground Clearance (mm)" value={specs.ground_clearance_mm} />
            <Row label="Kerb Mass (kg)" value={specs.kerb_mass_kg} />
            <Row label="GVM (kg)" value={specs.gvm_kg} />
          </Section>

          <Section title="Engine">
            <Row label="Engine Code" value={v.engine_code} />
            <Row label="Description" value={specs.engine_description} />
            <Row label="Configuration" value={v.engine_config} />
            <Row label="Cylinders" value={specs.cylinders} />
            <Row label="Capacity (L)" value={v.engine_litres} />
            <Row label="Max Power" value={specs.max_power} />
            <Row label="Power (kW)" value={v.engine_kw} />
            <Row label="Max Torque" value={specs.max_torque} />
            <Row label="Torque (Nm)" value={specs.torque_nm} />
            <Row label="Fuel Type" value={v.fuel_type} />
          </Section>

          <Section title="Transmission & Drive">
            <Row label="Transmission" value={specs.transmission_description} />
            <Row label="Transmission Type" value={specs.transmission_type} />
            <Row label="Transmission Info" value={specs.transmission_info} />
            <Row label="Transfer Box" value={specs.transfer_box} />
            <Row label="4WD System" value={specs.awd_description} />
            <Row label="Final Drive" value={specs.final_drive} />
          </Section>

          <Section title="Brakes">
            <Row label="Front Brakes" value={specs.front_brake_desc} />
            <Row label="Front Brake Diameter (mm)" value={specs.front_brake_diameter_mm} />
            <Row label="Rear Brakes" value={specs.rear_brake_desc} />
            <Row label="Rear Brake Diameter (mm)" value={specs.rear_brake_diameter_mm} />
          </Section>

          <Section title="Wheels & Tyres">
            <Row label="Stud Pattern (PCD)" value={specs.wheel_pcd} />
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

          <Section title="Service">
            <Row label="Minor Service Interval (km)" value={specs.service_interval_km} />
            <Row label="Minor Service Interval (months)" value={specs.service_interval_months} />
          </Section>
        </div>
      </main>

      <footer className="border-t border-[#1A1A1A] bg-[#141414] py-4 text-center text-xs text-white/40">
        © {new Date().getFullYear()} Global Parts Catalogue
      </footer>
    </div>
  );
}
