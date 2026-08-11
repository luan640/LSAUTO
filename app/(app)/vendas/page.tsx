import { createClient } from "@/lib/supabase/server";
import { SalesView } from "@/components/sales/sales-view";
import type { LsSaleItem, LsStockSummary, Sale } from "@/lib/types";

export default async function VendasPage() {
  const supabase = await createClient();
  const [salesRes, stockRes, saleItemsRes] = await Promise.all([
    supabase
      .from("sales")
      .select("*")
      .order("sale_date", { ascending: true })
      .order("created_at", { ascending: true }),
    supabase.from("ls_stock_summary").select("*").order("product_name", { ascending: true }),
    supabase.from("ls_sale_items").select("*"),
  ]);

  if (salesRes.error) {
    throw new Error(salesRes.error.message);
  }
  if (stockRes.error) {
    throw new Error(stockRes.error.message);
  }
  if (saleItemsRes.error) {
    throw new Error(saleItemsRes.error.message);
  }

  return (
    <SalesView
      sales={(salesRes.data ?? []) as Sale[]}
      stockOptions={(stockRes.data ?? []) as LsStockSummary[]}
      saleItems={(saleItemsRes.data ?? []) as LsSaleItem[]}
    />
  );
}
