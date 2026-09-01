"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { LsStockExitInput } from "@/lib/types";

function parseSupplierReturnInput(formData: FormData): LsStockExitInput {
  return {
    product_id: String(formData.get("product_id") ?? ""),
    supplier_id: String(formData.get("supplier_id") ?? "") || null,
    quantity: Number(formData.get("quantity")) || 0,
    credit_amount: Number(formData.get("credit_amount")) || 0,
    reason: "devolucao_fornecedor",
    exit_date: String(formData.get("exit_date") ?? ""),
    notes: String(formData.get("notes") ?? ""),
  };
}

// Garante que a quantidade devolvida não passe do estoque disponível agora. Ao
// editar uma devolução, devolve ao saldo disponível a quantidade que ela já consumia.
async function assertReturnStockAvailable(
  supabase: Awaited<ReturnType<typeof createClient>>,
  productId: string,
  quantity: number,
  excludeExitId?: string,
) {
  const { data: summary, error } = await supabase
    .from("ls_stock_summary")
    .select("product_name, quantity")
    .eq("product_id", productId)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  let available = Number(summary.quantity) || 0;

  if (excludeExitId) {
    const { data: existing, error: existingError } = await supabase
      .from("ls_stock_exits")
      .select("quantity")
      .eq("id", excludeExitId)
      .single();

    if (existingError) {
      throw new Error(existingError.message);
    }

    available += Number(existing.quantity) || 0;
  }

  if (quantity > available) {
    throw new Error(
      `Quantidade maior que o estoque disponível de "${summary.product_name}" (${available})`,
    );
  }
}

export async function createSupplierReturn(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const supplierReturn = parseSupplierReturnInput(formData);

  if (!supplierReturn.supplier_id) {
    throw new Error("Selecione o fornecedor");
  }

  await assertReturnStockAvailable(supabase, supplierReturn.product_id, supplierReturn.quantity);

  const { error } = await supabase
    .from("ls_stock_exits")
    .insert({ ...supplierReturn, created_by: user?.id });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/devolucoes");
  revalidatePath("/entradas");
  revalidatePath("/estoque");
  revalidatePath("/dashboard");
}

export async function updateSupplierReturn(id: string, formData: FormData) {
  const supabase = await createClient();
  const supplierReturn = parseSupplierReturnInput(formData);

  if (!supplierReturn.supplier_id) {
    throw new Error("Selecione o fornecedor");
  }

  await assertReturnStockAvailable(
    supabase,
    supplierReturn.product_id,
    supplierReturn.quantity,
    id,
  );

  const { error } = await supabase.from("ls_stock_exits").update(supplierReturn).eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/devolucoes");
  revalidatePath("/entradas");
  revalidatePath("/estoque");
  revalidatePath("/dashboard");
}

export async function deleteSupplierReturn(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("ls_stock_exits").delete().eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/devolucoes");
  revalidatePath("/entradas");
  revalidatePath("/estoque");
  revalidatePath("/dashboard");
}
