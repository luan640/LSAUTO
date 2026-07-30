import { createClient } from "@/lib/supabase/server";
import { CfMotosEntradasView } from "@/components/cf-motos/cf-motos-entradas-view";
import type { CfMotoProduct, CfMotoStockEntry, CfMotoSupplier } from "@/lib/types";

export default async function CfMotosEntradasPage() {
  const supabase = await createClient();

  const [entriesRes, productsRes, suppliersRes] = await Promise.all([
    supabase
      .from("cf_moto_stock_entries")
      .select("*, product:cf_moto_products(*), supplier:cf_moto_suppliers(*)")
      .order("entry_date", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase.from("cf_moto_products").select("*").order("name", { ascending: true }),
    supabase.from("cf_moto_suppliers").select("*").order("name", { ascending: true }),
  ]);

  if (entriesRes.error) throw new Error(entriesRes.error.message);
  if (productsRes.error) throw new Error(productsRes.error.message);
  if (suppliersRes.error) throw new Error(suppliersRes.error.message);

  return (
    <CfMotosEntradasView
      entries={(entriesRes.data ?? []) as CfMotoStockEntry[]}
      products={(productsRes.data ?? []) as CfMotoProduct[]}
      suppliers={(suppliersRes.data ?? []) as CfMotoSupplier[]}
    />
  );
}
