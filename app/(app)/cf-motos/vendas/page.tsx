import { createClient } from "@/lib/supabase/server";
import { CfMotosVendasView } from "@/components/cf-motos/cf-motos-vendas-view";
import type { CfMotoExpense, CfMotoSale, CfMotoSaleItem, CfMotoStockSummary } from "@/lib/types";

export default async function CfMotosVendasPage() {
  const supabase = await createClient();
  const [salesResult, expensesResult, stockResult, saleItemsResult] = await Promise.all([
    supabase
      .from("cf_moto_sales")
      .select("*")
      .order("sale_date", { ascending: true })
      .order("created_at", { ascending: true }),
    supabase.from("cf_moto_expenses").select("*").order("start_date", { ascending: true }),
    supabase.from("cf_moto_stock_summary").select("*").order("product_name", { ascending: true }),
    supabase.from("cf_moto_sale_items").select("*"),
  ]);

  if (salesResult.error) {
    throw new Error(salesResult.error.message);
  }
  if (expensesResult.error) {
    throw new Error(expensesResult.error.message);
  }
  if (stockResult.error) {
    throw new Error(stockResult.error.message);
  }
  if (saleItemsResult.error) {
    throw new Error(saleItemsResult.error.message);
  }

  return (
    <CfMotosVendasView
      sales={(salesResult.data ?? []) as CfMotoSale[]}
      expenses={(expensesResult.data ?? []) as CfMotoExpense[]}
      stockOptions={(stockResult.data ?? []) as CfMotoStockSummary[]}
      saleItems={(saleItemsResult.data ?? []) as CfMotoSaleItem[]}
    />
  );
}
