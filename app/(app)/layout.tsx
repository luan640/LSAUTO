import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/app-shell";
import type { LsCustomer, LsStockSummary } from "@/lib/types";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [{ data: stockOptions }, { data: customerOptions }] = await Promise.all([
    supabase.from("ls_stock_summary").select("*").order("product_name", { ascending: true }),
    supabase.from("ls_customers").select("*").order("name", { ascending: true }),
  ]);

  return (
    <AppShell
      email={user.email ?? ""}
      stockOptions={(stockOptions ?? []) as LsStockSummary[]}
      customerOptions={(customerOptions ?? []) as LsCustomer[]}
    >
      {children}
    </AppShell>
  );
}
