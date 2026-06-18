import { createClient } from "@/lib/supabase/server";
import { DashboardView } from "@/components/dashboard/dashboard-view";
import type { Expense, Sale } from "@/lib/types";

export default async function DashboardPage() {
  const supabase = await createClient();

  const [salesRes, expensesRes] = await Promise.all([
    supabase.from("sales").select("*").order("sale_date", { ascending: true }),
    supabase.from("expenses").select("*").order("start_date", { ascending: true }),
  ]);

  if (salesRes.error) {
    throw new Error(salesRes.error.message);
  }

  if (expensesRes.error) {
    throw new Error(expensesRes.error.message);
  }

  return (
    <DashboardView
      sales={(salesRes.data ?? []) as Sale[]}
      expenses={(expensesRes.data ?? []) as Expense[]}
    />
  );
}
