import { createClient } from "@/lib/supabase/server";
import { ProdutosView } from "@/components/produtos/produtos-view";
import type { LsProduct } from "@/lib/types";

export default async function ProdutosPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ls_products")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return <ProdutosView products={(data ?? []) as LsProduct[]} />;
}
