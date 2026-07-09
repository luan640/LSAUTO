import { createClient } from "@/lib/supabase/server";
import { CfMotosDespesasView } from "@/components/cf-motos/cf-motos-despesas-view";
import type { CfMotoExpense } from "@/lib/types";

export default async function CfMotosDespesasPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("cf_moto_expenses")
    .select("*")
    .order("start_date", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return <CfMotosDespesasView expenses={(data ?? []) as CfMotoExpense[]} />;
}
