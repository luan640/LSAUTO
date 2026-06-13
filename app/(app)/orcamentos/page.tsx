import { createClient } from "@/lib/supabase/server";
import { QuotesView } from "@/components/quotes/quotes-view";
import type { Budget, SupplierAccess } from "@/lib/types";

export default async function OrcamentosPage() {
  const supabase = await createClient();

  const [budgetsRes, suppliersRes] = await Promise.all([
    supabase
      .from("budgets")
      .select("*, items:budget_items(*)")
      .order("budget_date", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase.from("supplier_accesses").select("*").order("name", { ascending: true }),
  ]);

  if (budgetsRes.error) {
    throw new Error(budgetsRes.error.message);
  }

  if (suppliersRes.error) {
    throw new Error(suppliersRes.error.message);
  }

  return (
    <QuotesView
      budgets={(budgetsRes.data ?? []) as Budget[]}
      suppliers={(suppliersRes.data ?? []) as SupplierAccess[]}
    />
  );
}
