import { createClient } from "@/lib/supabase/server";
import { SalesView } from "@/components/sales/sales-view";
import type { Sale } from "@/lib/types";

export default async function VendasPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sales")
    .select("*")
    .order("sale_date", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return <SalesView sales={(data ?? []) as Sale[]} />;
}
