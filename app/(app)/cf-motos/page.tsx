import { createClient } from "@/lib/supabase/server";
import { CfMotosView } from "@/components/cf-motos/cf-motos-view";
import type { CfMotoSale } from "@/lib/types";

export default async function CfMotosPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("cf_moto_sales")
    .select("*")
    .order("sale_date", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return <CfMotosView sales={(data ?? []) as CfMotoSale[]} />;
}
