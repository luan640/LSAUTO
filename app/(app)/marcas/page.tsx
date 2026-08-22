import { createClient } from "@/lib/supabase/server";
import { MarcasView } from "@/components/marcas/marcas-view";
import type { LsBrand } from "@/lib/types";

export default async function MarcasPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ls_brands")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return <MarcasView brands={(data ?? []) as LsBrand[]} />;
}
