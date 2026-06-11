"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReceiptText, LayoutDashboard, KeyRound, LogOut, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { logout } from "@/app/(app)/actions";
import { SaleFormDialog } from "@/components/sales/sale-form-dialog";

const NAV_ITEMS = [
  { href: "/vendas", label: "Vendas", icon: ReceiptText },
  { href: "/dashboard", label: "Painel", icon: LayoutDashboard },
  { href: "/fornecedores", label: "Fornecedores", icon: KeyRound },
];

export function AppShell({
  email,
  children,
}: {
  email: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [newSaleOpen, setNewSaleOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      {/* Sidebar (desktop) */}
      <aside className="hidden md:flex md:w-56 md:flex-col md:border-r md:bg-sidebar">
        <div className="flex h-16 items-center px-4">
          <span className="text-lg font-semibold">Controle de Vendas</span>
        </div>
        <nav className="flex flex-1 flex-col gap-1 px-2">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon className="size-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="flex flex-col gap-2 border-t p-3">
          <span className="truncate px-1 text-xs text-muted-foreground">
            {email}
          </span>
          <form action={logout}>
            <button
              type="submit"
              className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <LogOut className="size-4" />
              Sair
            </button>
          </form>
        </div>
      </aside>

      {/* Top bar (mobile) */}
      <header className="flex h-14 items-center justify-between border-b px-4 md:hidden">
        <span className="text-base font-semibold">Controle de Vendas</span>
        <form action={logout}>
          <button
            type="submit"
            aria-label="Sair"
            className="flex items-center justify-center rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <LogOut className="size-5" />
          </button>
        </form>
      </header>

      <main className="flex-1 pb-16 md:pb-0">{children}</main>

      {/* Bottom nav (mobile) */}
      <nav className="fixed inset-x-0 bottom-0 z-50 flex h-16 items-center border-t bg-background md:hidden">
        <div className="flex flex-1">
          {NAV_ITEMS.slice(0, Math.ceil(NAV_ITEMS.length / 2)).map((item) => {
            const Icon = item.icon;
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-1 flex-col items-center justify-center gap-1 text-xs font-medium",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <Icon className="size-5" />
                {item.label}
              </Link>
            );
          })}
        </div>

        <div className="flex flex-1">
          {NAV_ITEMS.slice(Math.ceil(NAV_ITEMS.length / 2)).map((item) => {
            const Icon = item.icon;
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-1 flex-col items-center justify-center gap-1 text-xs font-medium",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <Icon className="size-5" />
                {item.label}
              </Link>
            );
          })}
        </div>

        <button
          type="button"
          aria-label="Nova venda"
          onClick={() => setNewSaleOpen(true)}
          className="absolute left-1/2 top-0 flex size-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg"
        >
          <Plus className="size-7" />
        </button>
      </nav>

      <SaleFormDialog open={newSaleOpen} onOpenChange={setNewSaleOpen} sale={null} />
    </div>
  );
}
