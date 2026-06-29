import { createClient } from "@/lib/supabase/server";

async function prepareCorrections() {
  const supabase = await createClient();

  console.log("=== CORRECTION PLAN FOR SERVICE 21 (CENA 2026-06-29) ===\n");

  // Get the service details
  const { data: service } = await supabase
    .from("hostal_meal_services")
    .select("id, fecha, tipo_servicio, menu_a_id, menu_b_id")
    .eq("id", 21)
    .single();

  if (!service) {
    console.error("Service 21 not found");
    return;
  }

  console.log(`Service 21 (${service.fecha} ${service.tipo_servicio}):`);
  console.log(`  Menu A ID: ${service.menu_a_id}`);
  console.log(`  Menu B ID: ${service.menu_b_id}\n`);

  // Get the menu names
  const { data: menus } = await supabase
    .from("hostal_menus")
    .select("id, nombre")
    .in("id", [service.menu_a_id, service.menu_b_id]);

  const menuMap: Record<number, string> = {};
  menus?.forEach((m) => {
    menuMap[m.id] = m.nombre;
  });

  console.log(`Configured menus:`);
  console.log(`  A (${service.menu_a_id}): ${menuMap[service.menu_a_id]}`);
  console.log(`  B (${service.menu_b_id}): ${menuMap[service.menu_b_id]}\n`);

  // Get the corrupted records
  const { data: corrupted } = await supabase
    .from("hostal_meal_consumption")
    .select(`
      id,
      guest_id,
      eleccion,
      menu_servido_id,
      hostal_guests(full_name),
      hostal_menus!menu_servido_id(nombre)
    `)
    .eq("meal_service_id", 21)
    .in("id", [64, 61, 62]); // The three corrupted records

  console.log("=== PROPOSED CORRECTIONS ===\n");

  const corrections: Array<{
    consumption_id: number;
    guest_name: string;
    guest_id: number;
    eleccion: string;
    menu_servido_id_current: number;
    menu_name_current: string;
    menu_servido_id_new: number;
    menu_name_new: string;
  }> = [];

  corrupted?.forEach((c: any) => {
    const guestName = c.hostal_guests?.full_name || "UNKNOWN";
    const currentMenuName = c.hostal_menus?.nombre || "NULL";

    // Determine correct menu_servido_id based on eleccion
    let correctMenuId: number;
    if (c.eleccion === "A") {
      correctMenuId = service.menu_a_id;
    } else if (c.eleccion === "B") {
      correctMenuId = service.menu_b_id;
    } else {
      console.error(`❌ ERROR: Guest ${c.guest_id} has no eleccion value`);
      return;
    }

    const correctMenuName = menuMap[correctMenuId];

    corrections.push({
      consumption_id: c.id,
      guest_name: guestName,
      guest_id: c.guest_id,
      eleccion: c.eleccion,
      menu_servido_id_current: c.menu_servido_id,
      menu_name_current: currentMenuName,
      menu_servido_id_new: correctMenuId,
      menu_name_new: correctMenuName,
    });
  });

  // Display in table format
  console.log("Guest (ID) | Elección | Current → New Menu ID | Current → New Menu Name");
  console.log("---|---|---|---");

  corrections.forEach((corr) => {
    console.log(
      `${corr.guest_name} (${corr.guest_id}) | ${corr.eleccion} | ${corr.menu_servido_id_current} → ${corr.menu_servido_id_new} | ${corr.menu_name_current} → ${corr.menu_name_new}`
    );
  });

  console.log("\n=== SQL UPDATE STATEMENTS ===\n");

  corrections.forEach((corr) => {
    console.log(
      `UPDATE hostal_meal_consumption SET menu_servido_id = ${corr.menu_servido_id_new} WHERE id = ${corr.consumption_id};`
    );
  });

  console.log("\n=== TYPESCRIPT CODE TO EXECUTE ===\n");
  console.log("const updates = [");
  corrections.forEach((corr) => {
    console.log(`  { id: ${corr.consumption_id}, menu_servido_id: ${corr.menu_servido_id_new} },`);
  });
  console.log("];");

  console.log("\n=== IMPACT ANALYSIS ===\n");
  console.log("✅ Affected records: 3");
  console.log("✅ Only field being updated: menu_servido_id");
  console.log("✅ Source of truth (eleccion) remains unchanged");
  console.log("✅ This will fix the meal report display for these 3 guests");
  console.log("✅ All 3 corrections are based on the eleccion field");
  console.log("✅ No data loss - only fixing references");
}

prepareCorrections().catch(console.error);
