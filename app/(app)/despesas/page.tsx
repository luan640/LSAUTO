import { createClient } from "@/lib/supabase/server";
import { ExpensesView } from "@/components/expenses/expenses-view";
import type { Expense } from "@/lib/types";

export default async function DespesasPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("expenses")
    .select("*")
    .order("start_date", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return <ExpensesView expenses={(data ?? []) as Expense[]} />;
}
