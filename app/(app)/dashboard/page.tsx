import { createClient } from "@/lib/supabase/server";
import { DashboardView } from "@/components/dashboard/dashboard-view";
import type { Sale } from "@/lib/types";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sales")
    .select("*")
    .order("sale_date", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return <DashboardView sales={(data ?? []) as Sale[]} />;
}
