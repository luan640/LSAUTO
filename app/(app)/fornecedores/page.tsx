import { createClient } from "@/lib/supabase/server";
import { SuppliersView } from "@/components/suppliers/suppliers-view";
import type { SupplierAccess } from "@/lib/types";

export default async function FornecedoresPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("supplier_accesses")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return <SuppliersView suppliers={(data ?? []) as SupplierAccess[]} />;
}
