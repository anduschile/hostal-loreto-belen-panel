import fs from "fs";
import path from "path";
import { createClient } from "@/lib/supabase/server";

// Load .env.local
const envLocalPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envLocalPath)) {
  const envContent = fs.readFileSync(envLocalPath, "utf-8");
  envContent.split("\n").forEach((line) => {
    const [key, ...valueParts] = line.split("=");
    if (key && valueParts.length > 0) {
      let value = valueParts.join("=").trim();
      // Remove quotes if present
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      process.env[key.trim()] = value;
    }
  });
}

async function verifyService20() {
  const supabase = await createClient();

  console.log("=== SERVICE 20 (CENA 28-06-2026) CONFIGURATION ===\n");

  // 1. Get service config
  const { data: service } = await supabase
    .from("hostal_meal_services")
    .select("id, fecha, tipo_servicio, menu_a_id, menu_b_id")
    .eq("id", 20)
    .single();

  console.log(`Service 20 (${service?.fecha} ${service?.tipo_servicio}):`);
  console.log(`  Menu A ID: ${service?.menu_a_id}`);
  console.log(`  Menu B ID: ${service?.menu_b_id}\n`);

  // 2. Get the actual menu names for A and B
  const { data: menuConfigs } = await supabase
    .from("hostal_menus")
    .select("id, nombre")
    .in("id", [service?.menu_a_id, service?.menu_b_id]);

  console.log("CONFIGURED MENUS:");
  menuConfigs?.forEach((m: any) => {
    console.log(`  ID ${m.id}: ${m.nombre}`);
  });
  console.log("");

  // 3. Get all consumption records for service 20
  const { data: consumptions } = await supabase
    .from("hostal_meal_consumption")
    .select(
      `
      id,
      guest_id,
      eleccion,
      menu_servido_id,
      hostal_guests(full_name),
      hostal_menus!menu_servido_id(id, nombre)
    `
    )
    .eq("meal_service_id", 20)
    .order("id", { ascending: true });

  console.log(`=== CONSUMPTION RECORDS FOR SERVICE 20 (${consumptions?.length} records) ===\n`);
  console.log("ID | Guest | Elección | Menu Servido ID | Menu Name");
  console.log("---|-------|----------|-----------------|------------------------------------------");

  consumptions?.forEach((c: any) => {
    const guestName = c.hostal_guests?.full_name || "UNKNOWN";
    const menuName = c.hostal_menus?.nombre || "NULL";
    console.log(
      `${c.id} | ${guestName.padEnd(20)} | ${(c.eleccion || "-").padEnd(8)} | ${c.menu_servido_id.toString().padEnd(15)} | ${menuName}`
    );
  });

  console.log("\n=== VALIDATION LOGIC (What the audit script checked) ===\n");
  console.log("For each record, comparing:");
  console.log(
    `  - Record's menu_servido_id against Service 20's configured A (${service?.menu_a_id}) and B (${service?.menu_b_id})`
  );
  console.log(
    `  - If record's eleccion=A, it should point to menu_id ${service?.menu_a_id}`
  );
  console.log(
    `  - If record's eleccion=B, it should point to menu_id ${service?.menu_b_id}\n`
  );

  let issues = 0;
  consumptions?.forEach((c: any) => {
    const expectedMenuId =
      c.eleccion === "A" ? service?.menu_a_id : service?.menu_b_id;
    const isCorrect = c.menu_servido_id === expectedMenuId;

    if (!isCorrect) {
      console.log(
        `❌ ID ${c.id} (${c.hostal_guests?.full_name}): eleccion=${c.eleccion}, menu_servido_id=${c.menu_servido_id} (should be ${expectedMenuId})`
      );
      issues++;
    }
  });

  console.log("");
  if (issues === 0) {
    console.log("✅ All records match their service configuration");
  } else {
    console.log(`❌ Found ${issues} corruption(s)`);
  }
}

verifyService20().catch(console.error);
