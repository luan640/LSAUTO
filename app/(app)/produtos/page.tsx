import { createClient } from "@/lib/supabase/server";
import { ProdutosView } from "@/components/produtos/produtos-view";
import type { LsBrand, LsProduct } from "@/lib/types";

export default async function ProdutosPage() {
  const supabase = await createClient();
  const [productsRes, brandsRes] = await Promise.all([
    supabase
      .from("ls_products")
      .select("*, brand:ls_brands(*)")
      .order("name", { ascending: true }),
    supabase.from("ls_brands").select("*").order("name", { ascending: true }),
  ]);

  if (productsRes.error) {
    throw new Error(productsRes.error.message);
  }
  if (brandsRes.error) {
    throw new Error(brandsRes.error.message);
  }

  return (
    <ProdutosView
      products={(productsRes.data ?? []) as LsProduct[]}
      brandOptions={(brandsRes.data ?? []) as LsBrand[]}
    />
  );
}
