import { createClient } from "@/lib/supabase/server";

interface CorruptionRecord {
  consumption_id: number;
  meal_service_id: number;
  fecha: string;
  tipo_servicio: string;
  guest_id: number;
  guest_name: string;
  eleccion: string | null;
  menu_servido_id_current: number | null;
  menu_name_current: string | null;
  menu_a_id: number;
  menu_a_name: string;
  menu_b_id: number;
  menu_b_name: string;
  issue: string;
  menu_servido_id_should_be: number;
  menu_name_should_be: string;
}

async function auditAllCorruptions() {
  const supabase = await createClient();

  console.log("=== SCANNING ALL hostal_meal_consumption FOR DATA CORRUPTIONS ===\n");
  console.log("This will check every consumption record to detect:");
  console.log("  1. menu_servido_id doesn't match service's configured A or B menus");
  console.log("  2. menu_servido_id doesn't match what eleccion field expects\n");

  // Get all consumption records with their related data
  const { data: allConsumptions, error: consumError } = await supabase
    .from("hostal_meal_consumption")
    .select(`
      id,
      meal_service_id,
      guest_id,
      eleccion,
      menu_servido_id,
      hostal_guests(full_name),
      hostal_meal_services(fecha, tipo_servicio, menu_a_id, menu_b_id),
      hostal_menus!menu_servido_id(nombre)
    `);

  if (consumError) {
    console.error("❌ Error fetching consumptions:", consumError);
    return;
  }

  console.log(`Total consumption records found: ${allConsumptions?.length || 0}\n`);

  // Get all menus for reference
  const { data: allMenus } = await supabase
    .from("hostal_menus")
    .select("id, nombre");

  const menuMap: Record<number, string> = {};
  allMenus?.forEach((m: any) => {
    menuMap[m.id] = m.nombre;
  });

  const corruptions: CorruptionRecord[] = [];

  // Check each consumption
  allConsumptions?.forEach((consumption: any) => {
    const mealService = consumption.hostal_meal_services;
    const guest = consumption.hostal_guests;

    if (!mealService) {
      console.warn(`⚠️  Consumption ${consumption.id} has no meal_service`);
      return;
    }

    const menuAId = mealService.menu_a_id;
    const menuBId = mealService.menu_b_id;
    const menuAName = menuMap[menuAId] || "UNKNOWN";
    const menuBName = menuMap[menuBId] || "UNKNOWN";

    // If no menu_servido_id set and no eleccion, that's normal (not chosen yet)
    if (!consumption.menu_servido_id && !consumption.eleccion) {
      return;
    }

    // Check 1: menu_servido_id should match one of the configured menus
    if (consumption.menu_servido_id) {
      if (
        consumption.menu_servido_id !== menuAId &&
        consumption.menu_servido_id !== menuBId
      ) {
        // This menu_servido_id is NOT configured for this service
        const currentMenuName = consumption.hostal_menus?.nombre || "UNKNOWN";
        let issue = `menu_servido_id=${consumption.menu_servido_id} (${currentMenuName}) is NOT configured as A or B for this service`;

        let expectedMenuId: number | null = null;
        if (consumption.eleccion === "A") {
          expectedMenuId = menuAId;
        } else if (consumption.eleccion === "B") {
          expectedMenuId = menuBId;
        }

        if (expectedMenuId) {
          issue += `; eleccion=${consumption.eleccion} expects menu ${expectedMenuId}`;
        }

        corruptions.push({
          consumption_id: consumption.id,
          meal_service_id: consumption.meal_service_id,
          fecha: mealService.fecha,
          tipo_servicio: mealService.tipo_servicio,
          guest_id: consumption.guest_id,
          guest_name: guest?.full_name || "UNKNOWN",
          eleccion: consumption.eleccion,
          menu_servido_id_current: consumption.menu_servido_id,
          menu_name_current: currentMenuName,
          menu_a_id: menuAId,
          menu_a_name: menuAName,
          menu_b_id: menuBId,
          menu_b_name: menuBName,
          issue,
          menu_servido_id_should_be: expectedMenuId || (consumption.eleccion === "A" ? menuAId : menuBId),
          menu_name_should_be: expectedMenuId
            ? menuMap[expectedMenuId]
            : consumption.eleccion === "A"
            ? menuAName
            : menuBName,
        });
        return;
      }
    }

    // Check 2: If eleccion is set, menu_servido_id should match that choice
    if (consumption.eleccion && consumption.menu_servido_id) {
      const expectedMenuId =
        consumption.eleccion === "A" ? menuAId : menuBId;

      if (consumption.menu_servido_id !== expectedMenuId) {
        const currentMenuName = consumption.hostal_menus?.nombre || "UNKNOWN";
        const expectedMenuName =
          consumption.eleccion === "A" ? menuAName : menuBName;

        corruptions.push({
          consumption_id: consumption.id,
          meal_service_id: consumption.meal_service_id,
          fecha: mealService.fecha,
          tipo_servicio: mealService.tipo_servicio,
          guest_id: consumption.guest_id,
          guest_name: guest?.full_name || "UNKNOWN",
          eleccion: consumption.eleccion,
          menu_servido_id_current: consumption.menu_servido_id,
          menu_name_current: currentMenuName,
          menu_a_id: menuAId,
          menu_a_name: menuAName,
          menu_b_id: menuBId,
          menu_b_name: menuBName,
          issue: `eleccion=${consumption.eleccion} expects menu_id=${expectedMenuId} (${expectedMenuName}) but has menu_id=${consumption.menu_servido_id} (${currentMenuName})`,
          menu_servido_id_should_be: expectedMenuId,
          menu_name_should_be: expectedMenuName,
        });
      }
    }
  });

  console.log(`\n=== CORRUPTIONS FOUND: ${corruptions.length} ===\n`);

  if (corruptions.length === 0) {
    console.log("✅ No corruptions detected - all meal_consumption records are consistent!");
    return;
  }

  // Group by date for easier review
  const byDate: Record<string, CorruptionRecord[]> = {};
  corruptions.forEach((corr) => {
    if (!byDate[corr.fecha]) {
      byDate[corr.fecha] = [];
    }
    byDate[corr.fecha].push(corr);
  });

  // Display grouped by date
  Object.keys(byDate)
    .sort()
    .forEach((fecha) => {
      const recordsOnDate = byDate[fecha];
      console.log(`\n📅 DATE: ${fecha} (${recordsOnDate.length} corruptions)`);
      console.log("━".repeat(120));

      recordsOnDate.forEach((corr) => {
        console.log(
          `\nConsumption ID ${corr.consumption_id} | Service ${corr.meal_service_id} (${corr.tipo_servicio})`
        );
        console.log(
          `Guest: ${corr.guest_name} (ID ${corr.guest_id})`
        );
        console.log(
          `Elección: ${corr.eleccion || "NULL"}`
        );
        console.log(
          `Current menu_servido_id: ${corr.menu_servido_id_current} (${corr.menu_name_current})`
        );
        console.log(
          `Service configured menus:`
        );
        console.log(
          `  A: ID ${corr.menu_a_id} = ${corr.menu_a_name}`
        );
        console.log(
          `  B: ID ${corr.menu_b_id} = ${corr.menu_b_name}`
        );
        console.log(`Should be: ID ${corr.menu_servido_id_should_be} (${corr.menu_name_should_be})`);
        console.log(`❌ ISSUE: ${corr.issue}`);
      });
    });

  console.log("\n" + "=".repeat(120));
  console.log(`\n📊 SUMMARY`);
  console.log(`Total corruptions across all dates: ${corruptions.length}`);
  console.log(`\nBreakdown by date:`);
  Object.keys(byDate)
    .sort()
    .forEach((fecha) => {
      console.log(`  ${fecha}: ${byDate[fecha].length}`);
    });

  // Export as JSON for easy review
  console.log("\n=== CORRUPTION DATA (JSON FORMAT FOR IMPORT) ===\n");
  console.log(JSON.stringify(corruptions, null, 2));
}

auditAllCorruptions().catch(console.error);
