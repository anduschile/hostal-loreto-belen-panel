// src/lib/data/companies.ts
import { createClient } from "@supabase/supabase-js";
import type { Company } from "@/types/hostal";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function getCompanies(): Promise<Company[]> {
  const { data, error } = await supabase
    .from("hostal_companies")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    console.error("Error fetching companies:", error);
    throw new Error(error.message);
  }

  return (data ?? []) as Company[];
}

export async function getCompanyById(id: number): Promise<Company | null> {
  const { data, error } = await supabase
    .from("hostal_companies")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error(`Error fetching company with id ${id}:`, error);
    return null;
  }

  return data as Company;
}

export async function createCompany(
  companyData: Omit<Company, "id" | "created_at" | "updated_at">
): Promise<Company> {
  const { data, error } = await supabase
    .from("hostal_companies")
    .insert([companyData])
    .select()
    .single();

  if (error) {
    console.error("Error creating company:", error);
    // 👇 AHORA propagamos el mensaje real de Supabase
    throw new Error(error.message);
  }

  return data as Company;
}

export async function updateCompany(
  id: number,
  companyData: Partial<Omit<Company, "id" | "created_at" | "updated_at">>
): Promise<Company> {
  const { data, error } = await supabase
    .from("hostal_companies")
    .update(companyData)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error(`Error updating company with id ${id}:`, error);
    throw new Error(error.message);
  }

  return data as Company;
}

export async function deleteCompany(id: number): Promise<void> {
  const { error } = await supabase
    .from("hostal_companies")
    .delete()
    .eq("id", id);

  if (error) {
    console.error(`Error deleting company with id ${id}:`, error);
    throw new Error(error.message);
  }
}
