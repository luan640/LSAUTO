"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { LsCustomer, LsCustomerInput } from "@/lib/types";

function parseLsCustomerInput(formData: FormData): LsCustomerInput {
  return {
    name: String(formData.get("name") ?? ""),
    cpf: String(formData.get("cpf") ?? ""),
    phone: String(formData.get("phone") ?? ""),
  };
}

export async function createLsCustomer(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const customer = parseLsCustomerInput(formData);

  const { data: inserted, error } = await supabase
    .from("ls_customers")
    .insert({ ...customer, created_by: user?.id })
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/clientes");
  revalidatePath("/vendas");

  return inserted as LsCustomer;
}

export async function updateLsCustomer(id: string, formData: FormData) {
  const supabase = await createClient();
  const customer = parseLsCustomerInput(formData);

  const { error } = await supabase.from("ls_customers").update(customer).eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/clientes");
  revalidatePath("/vendas");
}

export async function deleteLsCustomer(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("ls_customers").delete().eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/clientes");
  revalidatePath("/vendas");
}
