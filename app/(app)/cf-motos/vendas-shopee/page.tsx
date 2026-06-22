import { createClient } from "@/lib/supabase/server";
import { CfMotosVendasShopeeView } from "@/components/cf-motos/cf-motos-vendas-shopee-view";
import type { ShopeeOrderRow } from "@/lib/types";

export default async function CfMotosVendasShopeePage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("shopee_orders")
    .select("*")
    .is("linked_cf_moto_sale_id", null)
    .order("order_create_time", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return <CfMotosVendasShopeeView unlinkedShopeeOrders={(data ?? []) as ShopeeOrderRow[]} />;
}
