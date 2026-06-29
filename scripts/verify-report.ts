import { getMealReportData } from "@/lib/data/meal-report";

async function verifyReport() {
  console.log("=== REGENERATING MEAL REPORT FOR 2026-06-29 ===\n");

  try {
    const reportData = await getMealReportData(
      "2026-06-29",
      "2026-06-29",
      undefined,
      "cena"
    );

    console.log(`Found ${reportData.length} consumption records\n`);

    // Filter for the 3 guests we corrected
    const targetGuests = ["Fernando Cid", "José de la Torre", "CRISTIAN PERANCHIGUAY"];
    const correctedRecords = reportData.filter((row) =>
      targetGuests.some((guest) =>
        row.guest_full_name.toUpperCase().includes(guest.toUpperCase())
      )
    );

    console.log("CORRECTED RECORDS IN REPORT:\n");
    console.log("Guest | Menu Name | Elección | Company");
    console.log("---|---|---|---");

    correctedRecords.forEach((row) => {
      console.log(
        `${row.guest_full_name.padEnd(20)} | ${row.menu_nombre.padEnd(40)} | ${(row.eleccion || "-").padEnd(8)} | ${row.company_name || "N/A"}`
      );
    });

    console.log("\n=== VALIDATION ===\n");

    const fernandoCid = correctedRecords.find((r) =>
      r.guest_full_name.toUpperCase().includes("FERNANDO CID")
    );
    const joseDeTorre = correctedRecords.find((r) =>
      r.guest_full_name.toUpperCase().includes("JOSÉ DE LA TORRE")
    );
    const cristian = correctedRecords.find((r) =>
      r.guest_full_name.toUpperCase().includes("CRISTIAN PERANCHIGUAY")
    );

    const checks = [
      {
        guest: "Fernando Cid",
        record: fernandoCid,
        expectedEleccion: "B",
        expectedMenuName: "POLLO ESTOFADO CON PURÉ",
      },
      {
        guest: "José de la Torre",
        record: joseDeTorre,
        expectedEleccion: "A",
        expectedMenuName: "Pasta con salsa Boloñesa",
      },
      {
        guest: "CRISTIAN PERANCHIGUAY",
        record: cristian,
        expectedEleccion: "B",
        expectedMenuName: "POLLO ESTOFADO CON PURÉ",
      },
    ];

    let allPassed = true;

    checks.forEach((check) => {
      if (!check.record) {
        console.log(`❌ ${check.guest}: NOT FOUND IN REPORT`);
        allPassed = false;
        return;
      }

      const eleccionMatch = check.record.eleccion === check.expectedEleccion;
      const menuMatch = check.record.menu_nombre
        .toUpperCase()
        .includes(check.expectedMenuName.toUpperCase());

      if (eleccionMatch && menuMatch) {
        console.log(
          `✅ ${check.guest}: Elección ${check.expectedEleccion}, Menu: ${check.record.menu_nombre}`
        );
      } else {
        console.log(`❌ ${check.guest}: MISMATCH`);
        if (!eleccionMatch) {
          console.log(
            `   Elección: Expected ${check.expectedEleccion}, got ${check.record.eleccion}`
          );
        }
        if (!menuMatch) {
          console.log(
            `   Menu: Expected "${check.expectedMenuName}", got "${check.record.menu_nombre}"`
          );
        }
        allPassed = false;
      }
    });

    console.log("\n" + "=".repeat(50));
    if (allPassed) {
      console.log("✅ REPORT VERIFICATION SUCCESSFUL - All 3 guests show correct menus");
    } else {
      console.log("❌ REPORT VERIFICATION FAILED");
    }
  } catch (error: any) {
    console.error("❌ Error generating report:", error.message);
  }
}

verifyReport().catch(console.error);
