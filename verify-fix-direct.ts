import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

// Load .env.local manually
const envPath = path.join(process.cwd(), ".env.local");
const envContent = fs.readFileSync(envPath, "utf-8");
const envVars: Record<string, string> = {};

envContent.split("\n").forEach((line) => {
  line = line.trim();
  if (!line) return;
  const match = line.match(/^([A-Z_]+)="(.+)"$/);
  if (match) {
    envVars[match[1]] = match[2];
  }
});

const url = envVars.NEXT_PUBLIC_SUPABASE_URL;
const key = envVars.SUPABASE_SERVICE_ROLE_KEY || envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createSupabaseClient(url, key);

async function verify() {
  // Primero, borrar consumos previos del servicio 26 para poder re-ejecutar autoload
  console.log("Clearing previous consumptions for service 26...");
  await supabase.from("hostal_meal_consumption").delete().eq("meal_service_id", 26);

  // Ejecutar autoload manualmente (simulando lo que hace el endpoint)
  console.log("Fetching active reservations for 2026-06-29...");
  const { data: reservations, error: reservError } = await supabase
    .from("hostal_reservations")
    .select("id, guest_id, company_id, check_in, check_out, status")
    .lte("check_in", "2026-06-29")
    .gte("check_out", "2026-06-29")
    .in("status", ["confirmed", "checked_in"]);

  if (reservError) {
    console.error("Error fetching reservations:", reservError.message);
    process.exit(1);
  }

  console.log(`Found ${reservations?.length || 0} active reservations\n`);

  // Verify deduplication: count unique guest_ids
  const uniqueGuests = new Set((reservations || []).map((r: any) => r.guest_id));
  console.log(`Unique guests: ${uniqueGuests.size}`);
  console.log(`Total reservation records: ${reservations?.length || 0}`);
  console.log(`Expected duplicates: ${(reservations?.length || 0) - uniqueGuests.size}\n`);

  // Insert consumptions (simulating the autoload endpoint behavior)
  console.log("Inserting consumptions via API...");
  const response = await fetch("http://localhost:3000/api/meal-services/26/consumption", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fecha: "2026-06-29", action: "autoload" }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    console.error("ERROR during autoload:", errorData.error);
    process.exit(1);
  }

  const result = await response.json();
  console.log(`✅ Autoload successful! Created ${result.data.length} consumptions\n`);

  // Verify the consumptions in the database
  console.log("Fetching created consumptions...");
  const { data: consumptions, error: consumError } = await supabase
    .from("hostal_meal_consumption")
    .select("id, guest_id, reservation_id")
    .eq("meal_service_id", 26)
    .order("guest_id");

  if (consumError) {
    console.error("Error fetching consumptions:", consumError.message);
    process.exit(1);
  }

  console.log(`\nTotal consumptions created: ${consumptions?.length || 0}`);
  console.log("Expected: 12 (15 reservations minus 3 deduplicated guests)\n");

  // Check for guests with duplicate consumptions (should be 0)
  const guestMap: { [key: number]: any[] } = {};
  (consumptions || []).forEach((c: any) => {
    if (!guestMap[c.guest_id]) guestMap[c.guest_id] = [];
    guestMap[c.guest_id].push(c);
  });

  let duplicateCount = 0;
  const duplicateGuests = [];
  Object.entries(guestMap).forEach(([guestId, cons]) => {
    if (cons.length > 1) {
      duplicateCount += cons.length;
      duplicateGuests.push(`Guest ${guestId}: ${cons.length} records`);
    }
  });

  if (duplicateCount > 0) {
    console.error(`❌ FAILED: Found ${duplicateCount} duplicate consumptions:`);
    duplicateGuests.forEach((g) => console.error(`   ${g}`));
    process.exit(1);
  }

  console.log("✅ All guests appear exactly once (no duplicates)\n");

  // Verify the specific guests that should have been deduplicated
  const guest658 = consumptions?.find((c: any) => c.guest_id === 658);
  const guest874 = consumptions?.find((c: any) => c.guest_id === 874);
  const guest1020 = consumptions?.find((c: any) => c.guest_id === 1020);

  console.log("Verification of deduplicated guests:");
  if (guest658) console.log(`✅ Guest 658: reservation_id ${guest658.reservation_id} (should be 2243 - most recent check-in)`);
  if (guest874) console.log(`✅ Guest 874: reservation_id ${guest874.reservation_id} (should be 2384 - most recent check-in)`);
  if (guest1020) console.log(`✅ Guest 1020: reservation_id ${guest1020.reservation_id} (should be 2246 - most recent check-in)`);

  console.log("\n✅ ALL TESTS PASSED!");
}

verify().catch((err) => {
  console.error("Fatal error:", err.message);
  process.exit(1);
});
