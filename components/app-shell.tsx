"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu as MenuPrimitive } from "@base-ui/react/menu";
import {
  LogOut,
  Plus,
  Bike,
  Store,
  Plug,
  ChevronDown,
  Users,
  Building2,
  Tag,
  Package,
  Warehouse,
  PackagePlus,
  Undo2,
  ShoppingCart,
  ShoppingBag,
  FileText,
  Receipt,
  Scale,
  LayoutDashboard,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { logout } from "@/app/(app)/actions";
import { SaleFormDialog } from "@/components/sales/sale-form-dialog";
import type { LsCustomer, LsStockSummary } from "@/lib/types";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

type NavChild = { href: string; label: string; icon: LucideIcon };
type NavGroup = { label: string; items: NavChild[] };
type Company = {
  key: string;
  label: string;
  logo?: string;
  icon: LucideIcon;
  groups: NavGroup[];
};

const COMPANIES: Company[] = [
  {
    key: "auto-pecas-ls",
    label: "Auto Peças LS",
    logo: "/logo-auto-pecas.png",
    icon: Store,
    groups: [
      {
        label: "Cadastros",
        items: [
          { href: "/clientes", label: "Clientes", icon: Users },
          { href: "/fornecedores", label: "Fornecedores", icon: Building2 },
          { href: "/marcas", label: "Marcas", icon: Tag },
        ],
      },
      {
        label: "Produtos",
        items: [
          { href: "/produtos", label: "Produtos", icon: Package },
          { href: "/estoque", label: "Estoque", icon: Warehouse },
          { href: "/entradas", label: "Entrada de Itens", icon: PackagePlus },
          { href: "/devolucoes", label: "Devoluções", icon: Undo2 },
        ],
      },
      {
        label: "Vendas",
        items: [
          { href: "/vendas", label: "Vendas", icon: ShoppingCart },
          { href: "/orcamentos", label: "Orçamentos", icon: FileText },
        ],
      },
      {
        label: "Financeiro",
        items: [
          { href: "/despesas", label: "Despesas", icon: Receipt },
          { href: "/ajuste-monetario", label: "Ajuste Monetário", icon: Scale },
          { href: "/dashboard", label: "Painel", icon: LayoutDashboard },
        ],
      },
    ],
  },
  {
    key: "cf-motos",
    label: "CF Motos",
    icon: Bike,
    groups: [
      {
        label: "Vendas",
        items: [
          { href: "/cf-motos/vendas", label: "Vendas", icon: ShoppingCart },
          { href: "/cf-motos/vendas-shopee", label: "Vendas Shopee", icon: ShoppingBag },
        ],
      },
      {
        label: "Produtos",
        items: [
          { href: "/cf-motos/produtos", label: "Produtos", icon: Package },
          { href: "/cf-motos/estoque", label: "Estoque", icon: Warehouse },
          { href: "/cf-motos/entradas", label: "Entrada de Itens", icon: PackagePlus },
        ],
      },
      {
        label: "Financeiro",
        items: [{ href: "/cf-motos/despesas", label: "Despesas", icon: Receipt }],
      },
    ],
  },
];

const STANDALONE_ITEM: NavChild = { href: "/integracoes", label: "Integrações", icon: Plug };

function pathMatches(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function companyHasActiveItem(company: Company, pathname: string) {
  return company.groups.some((group) => group.items.some((item) => pathMatches(pathname, item.href)));
}

function activeCompanyForPathname(pathname: string): Company {
  return COMPANIES.find((company) => companyHasActiveItem(company, pathname)) ?? COMPANIES[0];
}

function CompanyBadge({ company, size = 36 }: { company: Company; size?: number }) {
  if (company.logo) {
    return (
      <Image
        src={company.logo}
        alt={company.label}
        width={size}
        height={size}
        className="shrink-0 rounded-full object-contain"
        style={{ width: size, height: size }}
      />
    );
  }

  const Icon = company.icon;
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600"
      style={{ width: size, height: size }}
    >
      <Icon className="size-1/2" />
    </div>
  );
}

function CompanySwitcher({ activeCompany }: { activeCompany: Company }) {
  return (
    <MenuPrimitive.Root>
      <MenuPrimitive.Trigger className="flex w-full items-center gap-3 rounded-xl bg-neutral-900 px-3 py-2.5 text-left transition-colors outline-none hover:bg-neutral-800 focus-visible:ring-3 focus-visible:ring-ring/50">
        <CompanyBadge company={activeCompany} />
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-sm font-semibold text-white">{activeCompany.label}</span>
          <span className="text-xs text-neutral-400">Empresa ativa</span>
        </div>
        <ChevronDown className="size-4 shrink-0 text-neutral-400" />
      </MenuPrimitive.Trigger>
      <MenuPrimitive.Portal>
        <MenuPrimitive.Positioner className="z-50 outline-none" sideOffset={6} align="start">
          <MenuPrimitive.Popup className="w-(--anchor-width) min-w-56 origin-(--transform-origin) rounded-lg bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10 duration-100 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95">
            {COMPANIES.map((company) => {
              const active = company.key === activeCompany.key;
              return (
                <MenuPrimitive.Item
                  key={company.key}
                  render={<Link href={company.groups[0].items[0].href} />}
                  className={cn(
                    "flex cursor-default items-center gap-3 rounded-md px-2 py-2 text-sm outline-none select-none",
                    active
                      ? "bg-primary/10 font-medium text-primary"
                      : "text-foreground data-highlighted:bg-muted",
                  )}
                >
                  <CompanyBadge company={company} size={28} />
                  {company.label}
                </MenuPrimitive.Item>
              );
            })}
          </MenuPrimitive.Popup>
        </MenuPrimitive.Positioner>
      </MenuPrimitive.Portal>
    </MenuPrimitive.Root>
  );
}

function DesktopNavLink({ item, pathname }: { item: NavChild; pathname: string }) {
  const Icon = item.icon;
  const active = pathMatches(pathname, item.href);

  return (
    <Link
      href={item.href}
      className={cn(
        "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-red-50 text-red-600"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      <Icon className="size-4" />
      {item.label}
    </Link>
  );
}

function MobileNavItem({
  label,
  icon: Icon,
  active,
  href,
  groups,
  pathname,
}: {
  label: string;
  icon: LucideIcon;
  active: boolean;
  href?: string;
  groups?: NavGroup[];
  pathname: string;
}) {
  const buttonClassName = cn(
    "flex flex-1 flex-col items-center justify-center gap-1 text-xs font-medium",
    active ? "text-primary" : "text-muted-foreground",
  );

  if (!groups) {
    return (
      <Link href={href!} className={buttonClassName}>
        <Icon className="size-5" />
        {label}
      </Link>
    );
  }

  return (
    <Sheet>
      <SheetTrigger render={<button type="button" className={buttonClassName} />}>
        <Icon className="size-5" />
        {label}
      </SheetTrigger>
      <SheetContent side="bottom" className="rounded-t-xl">
        <SheetHeader>
          <SheetTitle>{label}</SheetTitle>
        </SheetHeader>
        <div className="flex flex-col gap-3 p-4 pt-0">
          {groups.map((group) => (
            <div key={group.label} className="flex flex-col gap-1">
              <span className="px-3 text-xs font-semibold tracking-wide text-red-600 uppercase">
                {group.label}
              </span>
              {group.items.map((child) => {
                const childActive = pathMatches(pathname, child.href);
                const ChildIcon = child.icon;
                return (
                  <SheetClose
                    key={child.href}
                    nativeButton={false}
                    render={
                      <Link
                        href={child.href}
                        className={cn(
                          "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                          childActive
                            ? "bg-red-50 text-red-600"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground",
                        )}
                      />
                    }
                  >
                    <ChildIcon className="size-4" />
                    {child.label}
                  </SheetClose>
                );
              })}
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function AppShell({
  email,
  stockOptions,
  customerOptions,
  children,
}: {
  email: string;
  stockOptions: LsStockSummary[];
  customerOptions: LsCustomer[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [newSaleOpen, setNewSaleOpen] = useState(false);
  const activeCompany = activeCompanyForPathname(pathname);

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      {/* Sidebar (desktop) */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:border-r md:bg-sidebar">
        <div className="flex items-center gap-3 px-4 py-4">
          <Image
            src="/logo-auto-pecas.png"
            alt="Logo"
            width={40}
            height={40}
            className="shrink-0 rounded-full object-contain"
          />
          <div className="flex flex-col">
            <span className="text-sm font-semibold leading-tight">Controle de Vendas</span>
            <span className="text-xs leading-snug text-muted-foreground">
              Gerencie suas empresas com mais controle e eficiência
            </span>
          </div>
        </div>

        <div className="px-3 pb-3">
          <CompanySwitcher activeCompany={activeCompany} />
        </div>

        <nav className="flex flex-1 flex-col gap-4 overflow-y-auto px-3 pb-3">
          {activeCompany.groups.map((group) => (
            <div key={group.label} className="flex flex-col gap-1">
              <span className="px-3 text-xs font-semibold tracking-wide text-red-600 uppercase">
                {group.label}
              </span>
              {group.items.map((item) => (
                <DesktopNavLink key={item.href} item={item} pathname={pathname} />
              ))}
            </div>
          ))}

          <div className="mt-auto flex flex-col gap-1 border-t pt-3">
            <DesktopNavLink item={STANDALONE_ITEM} pathname={pathname} />
          </div>
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

      <main className="min-w-0 flex-1 pb-16 md:pb-0">{children}</main>

      {/* Bottom nav (mobile) */}
      <nav className="fixed inset-x-0 bottom-0 z-50 flex h-16 items-center border-t bg-background md:hidden">
        <div className="flex flex-1">
          {COMPANIES.map((company) => (
            <MobileNavItem
              key={company.key}
              label={company.label}
              icon={company.icon}
              active={companyHasActiveItem(company, pathname)}
              groups={company.groups}
              pathname={pathname}
            />
          ))}
        </div>

        <div className="flex flex-1">
          <MobileNavItem
            label={STANDALONE_ITEM.label}
            icon={STANDALONE_ITEM.icon}
            active={pathMatches(pathname, STANDALONE_ITEM.href)}
            href={STANDALONE_ITEM.href}
            pathname={pathname}
          />
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

      <SaleFormDialog
        open={newSaleOpen}
        onOpenChange={setNewSaleOpen}
        sale={null}
        stockOptions={stockOptions}
        customerOptions={customerOptions}
      />
    </div>
  );
}
