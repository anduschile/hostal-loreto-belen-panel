// src/app/(panel)/empresas/page.tsx
import { getCompanies } from "@/lib/data/companies";
import EmpresasClient from "./EmpresasClient";
import { Suspense } from "react";

export default async function EmpresasPage() {
  const companies = await getCompanies();

  return (
    <Suspense fallback={<div>Cargando empresas...</div>}>
      <EmpresasClient initialCompanies={companies} />
    </Suspense>
  );
}