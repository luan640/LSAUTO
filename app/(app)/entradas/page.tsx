import { createClient } from "@/lib/supabase/server";
import { EntradasView } from "@/components/entradas/entradas-view";
import type { LsProduct, LsStockEntry, SupplierAccess } from "@/lib/types";

export default async function EntradasPage() {
  const supabase = await createClient();

  const [entriesRes, productsRes, suppliersRes] = await Promise.all([
    supabase
      .from("ls_stock_entries")
      .select("*, product:ls_products(*), supplier:supplier_accesses(*)")
      .order("entry_date", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase.from("ls_products").select("*").order("name", { ascending: true }),
    supabase.from("supplier_accesses").select("*").order("name", { ascending: true }),
  ]);

  if (entriesRes.error) throw new Error(entriesRes.error.message);
  if (productsRes.error) throw new Error(productsRes.error.message);
  if (suppliersRes.error) throw new Error(suppliersRes.error.message);

  return (
    <EntradasView
      entries={(entriesRes.data ?? []) as LsStockEntry[]}
      products={(productsRes.data ?? []) as LsProduct[]}
      suppliers={(suppliersRes.data ?? []) as SupplierAccess[]}
    />
  );
}
