"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { SupplierAccessInput } from "@/lib/types";

function parseSupplierInput(formData: FormData): SupplierAccessInput {
  return {
    name: String(formData.get("name") ?? ""),
    ecommerce_url: String(formData.get("ecommerce_url") ?? ""),
    login: String(formData.get("login") ?? ""),
    password: String(formData.get("password") ?? ""),
    notes: String(formData.get("notes") ?? ""),
  };
}

export async function createSupplierAccess(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const supplier = parseSupplierInput(formData);

  const { error } = await supabase
    .from("supplier_accesses")
    .insert({ ...supplier, created_by: user?.id });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/fornecedores");
}

export async function updateSupplierAccess(id: string, formData: FormData) {
  const supabase = await createClient();
  const supplier = parseSupplierInput(formData);

  const { error } = await supabase
    .from("supplier_accesses")
    .update(supplier)
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/fornecedores");
}

export async function deleteSupplierAccess(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("supplier_accesses").delete().eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/fornecedores");
}
