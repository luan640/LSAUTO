import { createClient } from "@/lib/supabase/server";
import { CfMotosVendasView } from "@/components/cf-motos/cf-motos-vendas-view";
import type { CfMotoExpense, CfMotoSale } from "@/lib/types";

export default async function CfMotosVendasPage() {
  const supabase = await createClient();
  const [salesResult, expensesResult] = await Promise.all([
    supabase
      .from("cf_moto_sales")
      .select("*")
      .order("sale_date", { ascending: true })
      .order("created_at", { ascending: true }),
    supabase.from("cf_moto_expenses").select("*").order("start_date", { ascending: true }),
  ]);

  if (salesResult.error) {
    throw new Error(salesResult.error.message);
  }
  if (expensesResult.error) {
    throw new Error(expensesResult.error.message);
  }

  return (
    <CfMotosVendasView
      sales={(salesResult.data ?? []) as CfMotoSale[]}
      expenses={(expensesResult.data ?? []) as CfMotoExpense[]}
    />
  );
}
