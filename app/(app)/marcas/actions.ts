"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { LsBrand, LsBrandInput } from "@/lib/types";

function parseLsBrandInput(formData: FormData): LsBrandInput {
  return {
    name: String(formData.get("name") ?? "").trim().toUpperCase(),
  };
}

export async function createLsBrand(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const brand = parseLsBrandInput(formData);

  const { data: inserted, error } = await supabase
    .from("ls_brands")
    .insert({ ...brand, created_by: user?.id })
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/marcas");
  revalidatePath("/produtos");

  return inserted as LsBrand;
}

export async function updateLsBrand(id: string, formData: FormData) {
  const supabase = await createClient();
  const brand = parseLsBrandInput(formData);

  const { error } = await supabase.from("ls_brands").update(brand).eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/marcas");
  revalidatePath("/produtos");
}

export async function deleteLsBrand(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("ls_brands").delete().eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/marcas");
  revalidatePath("/produtos");
}
