import { createClient } from "@/lib/supabase/server";
import { CustomersView } from "@/components/customers/customers-view";
import type { LsCustomer } from "@/lib/types";

export default async function ClientesPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ls_customers")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return <CustomersView customers={(data ?? []) as LsCustomer[]} />;
}
