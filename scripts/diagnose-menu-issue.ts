import { createClient } from "@/lib/supabase/server";

async function diagnoseMenuIssue() {
  const supabase = await createClient();

  console.log("=== STEP 1: Find meal_service_id for Cena on 2026-06-29 ===\n");

  // Find the meal service for Cena on 2026-06-29
  const { data: mealService, error: msError } = await supabase
    .from("hostal_meal_services")
    .select("id, fecha, tipo_servicio, menu_a_id, menu_b_id")
    .eq("fecha", "2026-06-29")
    .eq("tipo_servicio", "cena")
    .single();

  if (msError || !mealService) {
    console.error("❌ Error fetching meal service:", msError);
    return;
  }

  console.log(`✅ Found meal_service_id: ${mealService.id}`);
  console.log(`   Fecha: ${mealService.fecha}`);
  console.log(`   Tipo: ${mealService.tipo_servicio}`);
  console.log(`   Menu A ID: ${mealService.menu_a_id}`);
  console.log(`   Menu B ID: ${mealService.menu_b_id}`);

  // Get the configured menu names for this service
  const { data: menusConfig, error: menusConfigError } = await supabase
    .from("hostal_menus")
    .select("id, nombre")
    .in("id", [mealService.menu_a_id, mealService.menu_b_id]);

  if (!menusConfigError && menusConfig) {
    console.log("\n   Configured menus for this service:");
    menusConfig.forEach((m: any) => {
      const label = m.id === mealService.menu_a_id ? "A" : "B";
      console.log(`     ${label}: ${m.nombre}`);
    });
  }

  console.log("\n=== STEP 2: Query meal_consumption for this service ===\n");

  // Query the consumption records for this service
  // Including: id, guest_id, eleccion, menu_servido_id, menu name
  const { data: consumptions, error: consumError } = await supabase
    .from("hostal_meal_consumption")
    .select(`
      id,
      guest_id,
      eleccion,
      menu_servido_id,
      hostal_guests(full_name),
      hostal_menus!menu_servido_id(id, nombre)
    `)
    .eq("meal_service_id", mealService.id);

  if (consumError) {
    console.error("❌ Error fetching consumptions:", consumError);
    return;
  }

  console.log(`Found ${consumptions?.length || 0} consumption records:\n`);

  if (!consumptions || consumptions.length === 0) {
    console.log("No consumptions found for this service.");
    return;
  }

  console.log(
    "ID | Guest ID | Guest Name             | Elección | Menu Servido ID | Menu Name"
  );
  console.log(
    "---|----------|------------------------|----------|-----------------|----------------------------------"
  );

  consumptions.forEach((c: any) => {
    const guestName = c.hostal_guests?.full_name || "UNKNOWN";
    const menuName = c.hostal_menus?.nombre || "NULL";
    const eleccion = c.eleccion || "-";
    const menuServidoId = c.menu_servido_id || "NULL";

    console.log(
      `${c.id.toString().padEnd(2)} | ${c.guest_id
        .toString()
        .padEnd(8)} | ${guestName.padEnd(24)} | ${eleccion.padEnd(8)} | ${menuServidoId
        .toString()
        .padEnd(15)} | ${menuName}`
    );
  });

  console.log("\n=== STEP 3: Identify anomalies ===\n");

  // Check for menu_servido_id that don't match A or B
  const configMenuIds = [mealService.menu_a_id, mealService.menu_b_id];
  const anomalies = consumptions.filter(
    (c: any) =>
      c.menu_servido_id &&
      !configMenuIds.includes(c.menu_servido_id)
  );

  if (anomalies.length > 0) {
    console.log(
      `⚠️  FOUND ${anomalies.length} ANOMALIES - menu_servido_id pointing to non-configured menus:\n`
    );
    anomalies.forEach((c: any) => {
      const guestName = c.hostal_guests?.full_name || "UNKNOWN";
      const menuName = c.hostal_menus?.nombre || "NULL";
      console.log(
        `   Guest ${c.guest_id} (${guestName}): menu_servido_id=${c.menu_servido_id} (${menuName})`
      );
      console.log(
        `      Elección recorded: ${c.eleccion || "NULL"}`
      );
    });
  } else {
    console.log("✅ No anomalies found - all menu_servido_id match configured A/B menus");
  }

  console.log("\n=== STEP 4: Check for mismatches between elección and menu_servido_id ===\n");

  // For each record, verify elección matches the menu_servido_id
  const menuById: Record<number, { nombre: string; isA: boolean; isB: boolean }> = {};
  const menuConfigMap: Record<number, string> = {};

  menusConfig?.forEach((m: any) => {
    menuConfigMap[m.id] = m.nombre;
    menuById[m.id] = {
      nombre: m.nombre,
      isA: m.id === mealService.menu_a_id,
      isB: m.id === mealService.menu_b_id,
    };
  });

  const mismatches = consumptions.filter((c: any) => {
    if (!c.eleccion || !c.menu_servido_id) return false;

    const expectedMenuId =
      c.eleccion === "A"
        ? mealService.menu_a_id
        : mealService.menu_b_id;

    return c.menu_servido_id !== expectedMenuId;
  });

  if (mismatches.length > 0) {
    console.log(
      `⚠️  FOUND ${mismatches.length} MISMATCHES - elección doesn't match menu_servido_id:\n`
    );
    mismatches.forEach((c: any) => {
      const guestName = c.hostal_guests?.full_name || "UNKNOWN";
      const expectedMenuId =
        c.eleccion === "A"
          ? mealService.menu_a_id
          : mealService.menu_b_id;
      const expectedMenuName = menuConfigMap[expectedMenuId];
      const actualMenuName = c.hostal_menus?.nombre || "NULL";

      console.log(
        `   Guest ${c.guest_id} (${guestName}):`
      );
      console.log(
        `      Elección: ${c.eleccion}`
      );
      console.log(
        `      Expected menu_servido_id: ${expectedMenuId} (${expectedMenuName})`
      );
      console.log(
        `      Actual menu_servido_id: ${c.menu_servido_id} (${actualMenuName})`
      );
    });
  } else {
    console.log("✅ No mismatches - elección consistently matches menu_servido_id");
  }
}

diagnoseMenuIssue().catch(console.error);
