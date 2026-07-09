"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  KeyRound,
  LogOut,
  Plus,
  Bike,
  Plug,
  ChevronDown,
  Store,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { logout } from "@/app/(app)/actions";
import { SaleFormDialog } from "@/components/sales/sale-form-dialog";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  children?: { href: string; label: string }[];
};

const NAV_ITEMS: NavItem[] = [
  {
    href: "/vendas",
    label: "Auto Peças LS",
    icon: Store,
    children: [
      { href: "/vendas", label: "Vendas" },
      { href: "/orcamentos", label: "Orçamentos" },
      { href: "/despesas", label: "Despesas" },
      { href: "/dashboard", label: "Painel" },
    ],
  },
  {
    href: "/cf-motos",
    label: "CF Motos",
    icon: Bike,
    children: [
      { href: "/cf-motos/vendas", label: "Vendas" },
      { href: "/cf-motos/vendas-shopee", label: "Vendas Shopee" },
      { href: "/cf-motos/despesas", label: "Despesas" },
    ],
  },
  { href: "/fornecedores", label: "Fornecedores", icon: KeyRound },
  { href: "/integracoes", label: "Integrações", icon: Plug },
];

function pathMatches(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function isItemActive(item: NavItem, pathname: string) {
  if (item.children) {
    return item.children.some((child) => pathMatches(pathname, child.href));
  }
  return pathMatches(pathname, item.href);
}

function MobileNavItem({ item, pathname }: { item: NavItem; pathname: string }) {
  const Icon = item.icon;
  const active = isItemActive(item, pathname);
  const buttonClassName = cn(
    "flex flex-1 flex-col items-center justify-center gap-1 text-xs font-medium",
    active ? "text-primary" : "text-muted-foreground",
  );

  if (!item.children) {
    return (
      <Link href={item.href} className={buttonClassName}>
        <Icon className="size-5" />
        {item.label}
      </Link>
    );
  }

  return (
    <Sheet>
      <SheetTrigger render={<button type="button" className={buttonClassName} />}>
        <Icon className="size-5" />
        {item.label}
      </SheetTrigger>
      <SheetContent side="bottom" className="rounded-t-xl">
        <SheetHeader>
          <SheetTitle>{item.label}</SheetTitle>
        </SheetHeader>
        <div className="flex flex-col gap-1 p-4 pt-0">
          {item.children.map((child) => {
            const childActive = pathMatches(pathname, child.href);
            return (
              <SheetClose
                key={child.href}
                nativeButton={false}
                render={
                  <Link
                    href={child.href}
                    className={cn(
                      "rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                      childActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  />
                }
              >
                {child.label}
              </SheetClose>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function AppShell({
  email,
  children,
}: {
  email: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [newSaleOpen, setNewSaleOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(
    NAV_ITEMS.find((item) => item.children && isItemActive(item, pathname))?.href ?? null,
  );

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
            const active = isItemActive(item, pathname);

            if (!item.children) {
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
            }

            const isExpanded = expanded === item.href;

            return (
              <div key={item.href} className="flex flex-col">
                <button
                  type="button"
                  onClick={() => setExpanded(isExpanded ? null : item.href)}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <Icon className="size-4" />
                  <span className="flex-1 text-left">{item.label}</span>
                  <ChevronDown
                    className={cn("size-4 transition-transform", isExpanded && "rotate-180")}
                  />
                </button>
                {isExpanded && (
                  <div className="ml-4 mt-1 flex flex-col gap-1 border-l pl-3">
                    {item.children.map((child) => {
                      const childActive = pathMatches(pathname, child.href);
                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          className={cn(
                            "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                            childActive
                              ? "bg-primary text-primary-foreground"
                              : "text-muted-foreground hover:bg-muted hover:text-foreground",
                          )}
                        >
                          {child.label}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
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
          {NAV_ITEMS.slice(0, Math.ceil(NAV_ITEMS.length / 2)).map((item) => (
            <MobileNavItem key={item.href} item={item} pathname={pathname} />
          ))}
        </div>

        <div className="flex flex-1">
          {NAV_ITEMS.slice(Math.ceil(NAV_ITEMS.length / 2)).map((item) => (
            <MobileNavItem key={item.href} item={item} pathname={pathname} />
          ))}
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
