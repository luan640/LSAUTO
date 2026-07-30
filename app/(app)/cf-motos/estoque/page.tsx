import { createClient } from "@/lib/supabase/server";
import { CfMotosEstoqueView } from "@/components/cf-motos/cf-motos-estoque-view";
import type { CfMotoStockSummary } from "@/lib/types";

export default async function CfMotosEstoquePage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("cf_moto_stock_summary")
    .select("*")
    .order("product_name", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return <CfMotosEstoqueView summary={(data ?? []) as CfMotoStockSummary[]} />;
}
