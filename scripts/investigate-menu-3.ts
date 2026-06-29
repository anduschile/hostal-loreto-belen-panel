import { createClient } from "@/lib/supabase/server";

async function investigateMenu3() {
  const supabase = await createClient();

  console.log("=== INVESTIGATING MENU ID=3 ===\n");

  // Get the menu with id=3
  const { data: menu3, error: menuError } = await supabase
    .from("hostal_menus")
    .select("*")
    .eq("id", 3)
    .single();

  if (menuError) {
    console.error("❌ Error fetching menu 3:", menuError);
    return;
  }

  console.log("Menu ID=3 details:");
  console.log(JSON.stringify(menu3, null, 2));

  console.log("\n=== CHECK: Is menu_id=3 configured as A or B for ANY meal_service? ===\n");

  const { data: servicesA, error: errA } = await supabase
    .from("hostal_meal_services")
    .select("id, fecha, tipo_servicio, menu_a_id, menu_b_id")
    .eq("menu_a_id", 3);

  const { data: servicesB, error: errB } = await supabase
    .from("hostal_meal_services")
    .select("id, fecha, tipo_servicio, menu_a_id, menu_b_id")
    .eq("menu_b_id", 3);

  const allServices = [...(servicesA || []), ...(servicesB || [])];

  if (allServices.length > 0) {
    console.log(`Menu 3 is configured in ${allServices.length} services:`);
    allServices.forEach((s: any) => {
      const role = s.menu_a_id === 3 ? "A" : "B";
      console.log(`  Service ${s.id} (${s.fecha} ${s.tipo_servicio}): Menu 3 is option ${role}`);
    });
  } else {
    console.log("❌ Menu 3 is NOT configured as A or B in any meal_service");
  }

  console.log("\n=== CHECK: How many consumptions reference menu_servido_id=3? ===\n");

  const { data: consumptions3, error: consumError } = await supabase
    .from("hostal_meal_consumption")
    .select(`
      id,
      meal_service_id,
      guest_id,
      eleccion,
      hostal_guests(full_name),
      hostal_meal_services(fecha, tipo_servicio)
    `)
    .eq("menu_servido_id", 3);

  if (consumError) {
    console.error("❌ Error fetching consumptions with menu_id=3:", consumError);
    return;
  }

  console.log(`Found ${consumptions3?.length || 0} consumptions with menu_servido_id=3:\n`);

  if (consumptions3 && consumptions3.length > 0) {
    console.log("Consumption ID | Service ID | Date | Type | Guest ID | Guest Name | Elección");
    console.log("---|---|---|---|---|---|---");
    consumptions3.forEach((c: any) => {
      const guestName = c.hostal_guests?.full_name || "UNKNOWN";
      const fecha = c.hostal_meal_services?.fecha || "?";
      const tipo = c.hostal_meal_services?.tipo_servicio || "?";
      console.log(
        `${c.id} | ${c.meal_service_id} | ${fecha} | ${tipo} | ${c.guest_id} | ${guestName} | ${
          c.eleccion || "-"
        }`
      );
    });
  }
}

investigateMenu3().catch(console.error);
