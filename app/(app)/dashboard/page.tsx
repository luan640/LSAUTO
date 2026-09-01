import { createClient } from "@/lib/supabase/server";
import { DashboardView } from "@/components/dashboard/dashboard-view";
import type { Expense, LsBalanceAdjustment, LsStockSummary, Sale } from "@/lib/types";

export default async function DashboardPage() {
  const supabase = await createClient();

  const [salesRes, expensesRes, stockRes, adjustmentsRes, supplierCreditsRes] = await Promise.all([
    supabase.from("sales").select("*").order("sale_date", { ascending: true }),
    supabase.from("expenses").select("*").order("start_date", { ascending: true }),
    supabase.from("ls_stock_summary").select("total_value"),
    supabase.from("ls_balance_adjustments").select("amount"),
    supabase
      .from("ls_stock_exits")
      .select("credit_amount, supplier:supplier_accesses(name)")
      .eq("reason", "devolucao_fornecedor"),
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

  if (supplierCreditsRes.error) {
    throw new Error(supplierCreditsRes.error.message);
  }

  const totalStockValue = (stockRes.data as Pick<LsStockSummary, "total_value">[]).reduce(
    (acc, item) => acc + item.total_value,
    0,
  );

  const totalBalanceAdjustments = (
    adjustmentsRes.data as Pick<LsBalanceAdjustment, "amount">[]
  ).reduce((acc, item) => acc + item.amount, 0);

  const supplierCredits = supplierCreditsRes.data as unknown as {
    credit_amount: number;
    supplier: { name: string } | null;
  }[];

  const totalSupplierCredit = supplierCredits.reduce((acc, item) => acc + item.credit_amount, 0);

  const creditBySupplierMap = new Map<string, number>();
  for (const item of supplierCredits) {
    const name = item.supplier?.name ?? "Sem fornecedor";
    creditBySupplierMap.set(name, (creditBySupplierMap.get(name) ?? 0) + item.credit_amount);
  }
  const creditBySupplier = Array.from(creditBySupplierMap.entries())
    .map(([name, total]) => ({ name, total }))
    .sort((a, b) => b.total - a.total);

  return (
    <DashboardView
      sales={(salesRes.data ?? []) as Sale[]}
      expenses={(expensesRes.data ?? []) as Expense[]}
      totalStockValue={totalStockValue}
      totalBalanceAdjustments={totalBalanceAdjustments}
      totalSupplierCredit={totalSupplierCredit}
      creditBySupplier={creditBySupplier}
    />
  );
}
