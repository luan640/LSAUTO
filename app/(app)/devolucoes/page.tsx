import { createClient } from "@/lib/supabase/server";
import { DevolucoesView } from "@/components/devolucoes/devolucoes-view";
import type { LsProduct, LsStockExit, SupplierAccess } from "@/lib/types";

export default async function DevolucoesPage() {
  const supabase = await createClient();

  const [returnsRes, productsRes, suppliersRes] = await Promise.all([
    supabase
      .from("ls_stock_exits")
      .select("*, product:ls_products(*), supplier:supplier_accesses(*)")
      .eq("reason", "devolucao_fornecedor")
      .order("exit_date", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase.from("ls_products").select("*").order("name", { ascending: true }),
    supabase.from("supplier_accesses").select("*").order("name", { ascending: true }),
  ]);

  if (returnsRes.error) throw new Error(returnsRes.error.message);
  if (productsRes.error) throw new Error(productsRes.error.message);
  if (suppliersRes.error) throw new Error(suppliersRes.error.message);

  return (
    <DevolucoesView
      returns={(returnsRes.data ?? []) as LsStockExit[]}
      products={(productsRes.data ?? []) as LsProduct[]}
      suppliers={(suppliersRes.data ?? []) as SupplierAccess[]}
    />
  );
}
