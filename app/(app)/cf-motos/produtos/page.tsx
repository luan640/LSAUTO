import { createClient } from "@/lib/supabase/server";
import { CfMotosProdutosView } from "@/components/cf-motos/cf-motos-produtos-view";
import type { CfMotoProduct } from "@/lib/types";

export default async function CfMotosProdutosPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("cf_moto_products")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return <CfMotosProdutosView products={(data ?? []) as CfMotoProduct[]} />;
}
