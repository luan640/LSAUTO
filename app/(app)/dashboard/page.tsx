import { createClient } from "@/lib/supabase/server";
import { DashboardView } from "@/components/dashboard/dashboard-view";
import type { Expense, LsBalanceAdjustment, LsStockSummary, Sale } from "@/lib/types";

export default async function DashboardPage() {
  const supabase = await createClient();

  const [salesRes, expensesRes, stockRes, adjustmentsRes] = await Promise.all([
    supabase.from("sales").select("*").order("sale_date", { ascending: true }),
    supabase.from("expenses").select("*").order("start_date", { ascending: true }),
    supabase.from("ls_stock_summary").select("total_value"),
    supabase.from("ls_balance_adjustments").select("amount"),
  ]);

  if (salesRes.error) {
    throw new Error(salesRes.error.message);
  }

  if (expensesRes.error) {
    throw new Error(expensesRes.error.message);
  }

  if (stockRes.error) {
    throw new Error(stockRes.error.message);
  }

  if (adjustmentsRes.error) {
    throw new Error(adjustmentsRes.error.message);
  }

  const totalStockValue = (stockRes.data as Pick<LsStockSummary, "total_value">[]).reduce(
    (acc, item) => acc + item.total_value,
    0,
  );

  const totalBalanceAdjustments = (
    adjustmentsRes.data as Pick<LsBalanceAdjustment, "amount">[]
  ).reduce((acc, item) => acc + item.amount, 0);

  return (
    <DashboardView
      sales={(salesRes.data ?? []) as Sale[]}
      expenses={(expensesRes.data ?? []) as Expense[]}
      totalStockValue={totalStockValue}
      totalBalanceAdjustments={totalBalanceAdjustments}
    />
  );
}
