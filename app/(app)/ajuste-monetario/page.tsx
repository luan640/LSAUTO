import { createClient } from "@/lib/supabase/server";
import { BalanceAdjustmentsView } from "@/components/balance-adjustments/balance-adjustments-view";
import type { LsBalanceAdjustment } from "@/lib/types";

export default async function AjusteMonetarioPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ls_balance_adjustments")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return <BalanceAdjustmentsView adjustments={(data ?? []) as LsBalanceAdjustment[]} />;
}
