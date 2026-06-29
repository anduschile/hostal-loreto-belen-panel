import { createClient } from "@/lib/supabase/server";

async function finalVerification() {
  const supabase = await createClient();

  console.log("=== FINAL VERIFICATION BEFORE UPDATE ===\n");
  console.log("Checking rows 64, 61, 62 in hostal_meal_consumption\n");

  const rowIds = [64, 61, 62];

  const { data: rows, error } = await supabase
    .from("hostal_meal_consumption")
    .select(`
      id,
      guest_id,
      eleccion,
      menu_servido_id,
      hostal_guests(full_name)
    `)
    .in("id", rowIds);

  if (error) {
    console.error("❌ Error fetching rows:", error);
    return;
  }

  console.log("ID | Guest ID | Guest Name             | Elección | Menu Servido ID (current)");
  console.log("---|----------|------------------------|----------|------------------------");

  const expectedGuestMapping: Record<number, { name: string; guestId: number }> = {
    64: { name: "Fernando Cid", guestId: 651 },
    61: { name: "José de la Torre", guestId: 1012 },
    62: { name: "CRISTIAN PERANCHIGUAY", guestId: 505 },
  };

  let allCorrect = true;

  rows?.forEach((row: any) => {
    const expected = expectedGuestMapping[row.id];
    const guestName = row.hostal_guests?.full_name || "UNKNOWN";
    const guestIdMatches = row.guest_id === expected.guestId;
    const nameMatches = guestName.toUpperCase() === expected.name.toUpperCase();

    const checkmark = guestIdMatches && nameMatches ? "✅" : "❌";

    if (!guestIdMatches || !nameMatches) {
      allCorrect = false;
    }

    console.log(
      `${row.id} | ${row.guest_id.toString().padEnd(8)} | ${checkmark} ${guestName.padEnd(22)} | ${row.eleccion?.padEnd(8) || "-".padEnd(8)} | ${row.menu_servido_id}`
    );

    if (!guestIdMatches) {
      console.log(
        `      ⚠️  MISMATCH: Expected guest_id ${expected.guestId}, got ${row.guest_id}`
      );
    }
    if (!nameMatches) {
      console.log(
        `      ⚠️  MISMATCH: Expected name "${expected.name}", got "${guestName}"`
      );
    }
  });

  console.log("\n=== VERIFICATION RESULT ===\n");

  if (allCorrect && rows?.length === 3) {
    console.log("✅ ALL CHECKS PASSED - Ready to update");
    console.log("\nRows to update:");
    rows.forEach((row: any) => {
      const newMenuId = row.eleccion === "A" ? 5 : 6;
      console.log(
        `  Row ${row.id}: guest_id=${row.guest_id}, eleccion=${row.eleccion}, menu_servido_id ${row.menu_servido_id} → ${newMenuId}`
      );
    });
  } else {
    console.log("❌ VERIFICATION FAILED - DO NOT PROCEED WITH UPDATE");
    if (rows?.length !== 3) {
      console.log(`   Expected 3 rows, got ${rows?.length || 0}`);
    }
  }
}

finalVerification().catch(console.error);
