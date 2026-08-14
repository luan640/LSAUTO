import { createClient } from "@/lib/supabase/server";
import { EstoqueView } from "@/components/produtos/estoque-view";
import type { LsStockSummary } from "@/lib/types";

export default async function EstoquePage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ls_stock_summary")
    .select("*")
    .order("product_name", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return <EstoqueView summary={(data ?? []) as LsStockSummary[]} />;
}
