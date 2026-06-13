"use client";

import { useMemo, useState } from "react";
import { Filter, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DateInput } from "@/components/ui/date-input";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency, formatDate, formatPercent, profitMargin } from "@/lib/format";
import { QuoteFormDialog } from "./quote-form-dialog";
import type { Budget, SupplierAccess } from "@/lib/types";

const ALL_SUPPLIERS = "todos";

export function QuotesView({
  budgets,
  suppliers,
}: {
  budgets: Budget[];
  suppliers: SupplierAccess[];
}) {
  const [open, setOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [supplierId, setSupplierId] = useState<string>(ALL_SUPPLIERS);
  const [product, setProduct] = useState("");
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const supplierNames = useMemo(() => {
    const map = new Map<string, string>();
    for (const supplier of suppliers) {
      map.set(supplier.id, supplier.name);
    }
    return map;
  }, [suppliers]);

  const supplierFilterItems = useMemo(
    () => [
      { value: ALL_SUPPLIERS, label: "Todos" },
      ...suppliers.map((supplier) => ({ value: supplier.id, label: supplier.name })),
    ],
    [suppliers],
  );

  function openNew() {
    setEditingBudget(null);
    setOpen(true);
  }

  function openEdit(budget: Budget) {
    setEditingBudget(budget);
    setOpen(true);
  }

  function totals(budget: Budget) {
    return budget.items.reduce(
      (acc, item) => ({
        purchase: acc.purchase + item.purchase_value,
        sale: acc.sale + item.sale_value,
      }),
      { purchase: 0, sale: 0 },
    );
  }

  function suppliersOf(budget: Budget) {
    const names = new Set<string>();
    for (const item of budget.items) {
      if (item.supplier_id) {
        names.add(supplierNames.get(item.supplier_id) ?? "—");
      }
    }
    return Array.from(names);
  }

  const filteredBudgets = useMemo(() => {
    const productQuery = product.trim().toLowerCase();

    return budgets.filter((budget) => {
      if (dateFrom && budget.budget_date < dateFrom) return false;
      if (dateTo && budget.budget_date > dateTo) return false;
      if (supplierId !== ALL_SUPPLIERS) {
        const hasSupplier = budget.items.some((item) => item.supplier_id === supplierId);
        if (!hasSupplier) return false;
      }
      if (productQuery) {
        const matches = budget.items.some((item) =>
          item.product_reference.toLowerCase().includes(productQuery),
        );
        if (!matches) return false;
      }
      return true;
    });
  }, [budgets, dateFrom, dateTo, supplierId, product]);

  const activeFiltersCount = [
    dateFrom,
    dateTo,
    supplierId !== ALL_SUPPLIERS ? supplierId : "",
    product,
  ].filter(Boolean).length;

  const [filterResetKey, setFilterResetKey] = useState(0);

  function clearFilters() {
    setDateFrom("");
    setDateTo("");
    setSupplierId(ALL_SUPPLIERS);
    setProduct("");
    setFilterResetKey((key) => key + 1);
  }

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold md:text-2xl">Orçamentos</h1>
        <Button onClick={openNew}>
          <Plus className="size-4" />
          Novo Orçamento
        </Button>
      </div>

      {budgets.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Nenhum orçamento registrado ainda.
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Filtros: desktop inline */}
          <Card className="hidden md:block">
            <CardContent className="grid grid-cols-2 gap-3 py-4 md:grid-cols-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="filter_date_from">De</Label>
                <DateInput
                  key={`from-${filterResetKey}`}
                  id="filter_date_from"
                  onValueChange={setDateFrom}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="filter_date_to">Até</Label>
                <DateInput
                  key={`to-${filterResetKey}`}
                  id="filter_date_to"
                  onValueChange={setDateTo}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="filter_supplier">Fornecedor</Label>
                <Select
                  items={supplierFilterItems}
                  value={supplierId}
                  onValueChange={(value) => setSupplierId(value ?? ALL_SUPPLIERS)}
                >
                  <SelectTrigger id="filter_supplier" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_SUPPLIERS}>Todos</SelectItem>
                    {suppliers.map((supplier) => (
                      <SelectItem key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="filter_product">Produto</Label>
                <Input
                  id="filter_product"
                  placeholder="Buscar referência"
                  value={product}
                  onChange={(e) => setProduct(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Mobile: filtro */}
          <div className="flex items-center justify-end md:hidden">
            <Sheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
              <SheetTrigger
                render={<Button variant="outline" size="icon" className="relative" />}
              >
                <Filter className="size-4" />
                {activeFiltersCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
                    {activeFiltersCount}
                  </span>
                )}
                <span className="sr-only">Filtros</span>
              </SheetTrigger>
              <SheetContent side="bottom" className="rounded-t-xl" showCloseButton={false}>
                <SheetHeader className="flex-row items-center justify-between">
                  <Button variant="link" className="px-0 text-destructive" onClick={clearFilters}>
                    Limpar
                  </Button>
                  <SheetTitle>Filtros</SheetTitle>
                  <SheetClose render={<Button variant="ghost" size="sm" className="px-0" />}>
                    Fechar
                  </SheetClose>
                </SheetHeader>
                <div className="flex flex-col gap-4 px-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="filter_date_from_mobile">De</Label>
                      <DateInput
                        key={`from-mobile-${filterResetKey}`}
                        id="filter_date_from_mobile"
                        onValueChange={setDateFrom}
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="filter_date_to_mobile">Até</Label>
                      <DateInput
                        key={`to-mobile-${filterResetKey}`}
                        id="filter_date_to_mobile"
                        onValueChange={setDateTo}
                      />
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="filter_supplier_mobile">Fornecedor</Label>
                    <Select
                      items={supplierFilterItems}
                      value={supplierId}
                      onValueChange={(value) => setSupplierId(value ?? ALL_SUPPLIERS)}
                    >
                      <SelectTrigger id="filter_supplier_mobile" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={ALL_SUPPLIERS}>Todos</SelectItem>
                        {suppliers.map((supplier) => (
                          <SelectItem key={supplier.id} value={supplier.id}>
                            {supplier.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="filter_product_mobile">Produto</Label>
                    <Input
                      id="filter_product_mobile"
                      placeholder="Buscar referência"
                      value={product}
                      onChange={(e) => setProduct(e.target.value)}
                    />
                  </div>
                </div>
                <div className="p-4 pt-0">
                  <SheetClose render={<Button className="w-full" />}>
                    Aplicar{activeFiltersCount > 0 ? ` (${activeFiltersCount})` : ""}
                  </SheetClose>
                </div>
              </SheetContent>
            </Sheet>
          </div>

          {filteredBudgets.length === 0 && (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                Nenhum orçamento encontrado para os filtros selecionados.
              </CardContent>
            </Card>
          )}

          {/* Mobile: cards */}
          <div className="flex flex-col gap-3 md:hidden">
            {filteredBudgets.map((budget) => {
              const { purchase, sale } = totals(budget);
              return (
                <Card
                  key={budget.id}
                  className="cursor-pointer"
                  onClick={() => openEdit(budget)}
                >
                  <CardContent className="flex flex-col gap-3 py-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">
                        {formatDate(budget.budget_date)}
                      </span>
                      <span className="text-base font-semibold">{formatCurrency(sale)}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary">{budget.client_phone}</Badge>
                      <Badge variant="outline">
                        {budget.items.length} item{budget.items.length === 1 ? "" : "s"}
                      </Badge>
                      {suppliersOf(budget).map((name) => (
                        <Badge key={name} variant="outline">
                          {name}
                        </Badge>
                      ))}
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs text-muted-foreground">Compra</span>
                        <span>{formatCurrency(purchase)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs text-muted-foreground">Margem</span>
                        <span>{formatCurrency(sale - purchase)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs text-muted-foreground">% Margem</span>
                        <span>{formatPercent(profitMargin(sale, purchase))}</span>
                      </div>
                    </div>
                    <p className="line-clamp-2 text-sm text-muted-foreground">
                      {budget.items.map((item) => item.product_reference).join(", ")}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Desktop: table */}
          <div className="hidden rounded-md border md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Itens</TableHead>
                  <TableHead>Fornecedores</TableHead>
                  <TableHead>Total compra</TableHead>
                  <TableHead>Total venda</TableHead>
                  <TableHead>Margem</TableHead>
                  <TableHead>% Margem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBudgets.map((budget) => {
                  const { purchase, sale } = totals(budget);
                  return (
                    <TableRow
                      key={budget.id}
                      className="cursor-pointer"
                      onClick={() => openEdit(budget)}
                    >
                      <TableCell>{formatDate(budget.budget_date)}</TableCell>
                      <TableCell>{budget.client_phone}</TableCell>
                      <TableCell className="max-w-[240px] truncate">
                        {budget.items.map((item) => item.product_reference).join(", ")}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {suppliersOf(budget).join(", ") || "—"}
                      </TableCell>
                      <TableCell>{formatCurrency(purchase)}</TableCell>
                      <TableCell>{formatCurrency(sale)}</TableCell>
                      <TableCell>{formatCurrency(sale - purchase)}</TableCell>
                      <TableCell>{formatPercent(profitMargin(sale, purchase))}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      <QuoteFormDialog
        open={open}
        onOpenChange={setOpen}
        budget={editingBudget}
        suppliers={suppliers}
      />
    </div>
  );
}
