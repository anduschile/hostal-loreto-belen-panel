import { createClient } from "@/lib/supabase/server";

async function executeCorrections() {
  const supabase = await createClient();

  console.log("=== EXECUTING CORRECTIONS ===\n");

  const corrections = [
    { id: 64, menu_servido_id: 6, guest: "Fernando Cid (651)" },
    { id: 61, menu_servido_id: 5, guest: "José de la Torre (1012)" },
    { id: 62, menu_servido_id: 6, guest: "CRISTIAN PERANCHIGUAY (505)" },
  ];

  for (const correction of corrections) {
    console.log(
      `Updating row ${correction.id} (${correction.guest}): menu_servido_id → ${correction.menu_servido_id}`
    );

    const { error } = await supabase
      .from("hostal_meal_consumption")
      .update({ menu_servido_id: correction.menu_servido_id })
      .eq("id", correction.id);

    if (error) {
      console.error(`❌ ERROR updating row ${correction.id}:`, error.message);
      return;
    }

    console.log(`   ✅ Success`);
  }

  console.log("\n=== VERIFICATION AFTER UPDATE ===\n");

  const { data: updated, error: verifyError } = await supabase
    .from("hostal_meal_consumption")
    .select(`
      id,
      guest_id,
      eleccion,
      menu_servido_id,
      hostal_guests(full_name),
      hostal_menus!menu_servido_id(nombre)
    `)
    .in("id", [64, 61, 62]);

  if (verifyError) {
    console.error("❌ Error verifying updates:", verifyError);
    return;
  }

  console.log("ID | Guest | Elección | Menu Servido ID | Menu Name");
  console.log("---|-------|----------|-----------------|----------------------------------");

  updated?.forEach((row: any) => {
    const guestName = row.hostal_guests?.full_name || "UNKNOWN";
    const menuName = row.hostal_menus?.nombre || "NULL";
    console.log(
      `${row.id} | ${guestName.padEnd(20)} | ${row.eleccion?.padEnd(8) || "-"} | ${row.menu_servido_id.toString().padEnd(15)} | ${menuName}`
    );
  });

  console.log("\n=== FINAL VALIDATION ===\n");

  const expectedResults = [
    { id: 64, expectedMenuId: 6, expectedMenuName: "POLLO ESTOFADO CON PURÉ" },
    { id: 61, expectedMenuId: 5, expectedMenuName: "Pasta con salsa Boloñesa" },
    { id: 62, expectedMenuId: 6, expectedMenuName: "POLLO ESTOFADO CON PURÉ" },
  ];

  let allValid = true;

  expectedResults.forEach((expected) => {
    const row = updated?.find((r: any) => r.id === expected.id);
    if (!row) {
      console.log(`❌ Row ${expected.id} not found after update`);
      allValid = false;
      return;
    }

    const menuIdMatch = row.menu_servido_id === expected.expectedMenuId;
    const menuNameMatch =
      row.hostal_menus?.nombre?.trim().toUpperCase() ===
      expected.expectedMenuName.trim().toUpperCase();

    if (menuIdMatch && menuNameMatch) {
      console.log(`✅ Row ${expected.id}: Correct (menu_id=${expected.expectedMenuId}, ${expected.expectedMenuName})`);
    } else {
      console.log(`❌ Row ${expected.id}: MISMATCH`);
      if (!menuIdMatch) {
        console.log(
          `   Expected menu_id ${expected.expectedMenuId}, got ${row.menu_servido_id}`
        );
      }
      if (!menuNameMatch) {
        console.log(
          `   Expected "${expected.expectedMenuName}", got "${row.hostal_menus?.nombre}"`
        );
      }
      allValid = false;
    }
  });

  console.log("\n" + "=".repeat(50));
  if (allValid) {
    console.log("✅ ALL CORRECTIONS APPLIED SUCCESSFULLY");
  } else {
    console.log("❌ SOME CORRECTIONS FAILED VALIDATION");
  }
}

executeCorrections().catch(console.error);
