// src/app/panel/empresas/page.tsx
import { getCompanies } from "@/lib/data/companies";
import EmpresasClient from "./EmpresasClient";

export const dynamic = "force-dynamic";

export default async function EmpresasPage() {
  const companies = await getCompanies();

  return (
    <div className="p-6">
      <EmpresasClient initialCompanies={companies} />
    </div>
  );
}
