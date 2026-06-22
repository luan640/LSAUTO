import { createClient } from "@/lib/supabase/server";
import { CfMotosVendasView } from "@/components/cf-motos/cf-motos-vendas-view";
import type { CfMotoSale } from "@/lib/types";

export default async function CfMotosVendasPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("cf_moto_sales")
    .select("*")
    .order("sale_date", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return <CfMotosVendasView sales={(data ?? []) as CfMotoSale[]} />;
}
