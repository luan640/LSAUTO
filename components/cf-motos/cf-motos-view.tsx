"use client";

import { useMemo, useState } from "react";
import { Filter, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatDate, formatPercent } from "@/lib/format";
import { CfMotoSaleFormDialog } from "./cf-moto-sale-form-dialog";
import type { CfMotoSale } from "@/lib/types";

function profitOf(sale: CfMotoSale) {
  return sale.sale_value - sale.cost - sale.shopee_fee;
}

function shopeeFeePercent(sale: CfMotoSale) {
  if (sale.sale_value === 0) return 0;
  return sale.shopee_fee / sale.sale_value;
}

function marginPercent(sale: CfMotoSale) {
  if (sale.sale_value === 0) return 0;
  return profitOf(sale) / sale.sale_value;
}

function receivableOf(sale: CfMotoSale) {
  return sale.sale_value - sale.shopee_fee;
}

export function CfMotosView({ sales }: { sales: CfMotoSale[] }) {
  const [open, setOpen] = useState(false);
  const [editingSale, setEditingSale] = useState<CfMotoSale | null>(null);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [link, setLink] = useState("");
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  function openNew() {
    setEditingSale(null);
    setOpen(true);
  }

  function openEdit(sale: CfMotoSale) {
    setEditingSale(sale);
    setOpen(true);
  }

  const filteredSales = useMemo(() => {
    const linkQuery = link.trim().toLowerCase();

    return sales.filter((sale) => {
      if (dateFrom && sale.sale_date < dateFrom) return false;
      if (dateTo && sale.sale_date > dateTo) return false;
      if (linkQuery && !sale.product_reference.toLowerCase().includes(linkQuery)) {
        return false;
      }
      return true;
    });
  }, [sales, dateFrom, dateTo, link]);

  const existingLinks = useMemo(
    () =>
      sales
        .filter((sale) => sale.id !== editingSale?.id)
        .map((sale) => sale.product_reference)
        .filter(Boolean),
    [sales, editingSale],
  );

  const totalSaleValue = filteredSales.reduce((acc, sale) => acc + sale.sale_value, 0);
  const totalCost = filteredSales.reduce((acc, sale) => acc + sale.cost, 0);
  const totalShopeeFee = filteredSales.reduce((acc, sale) => acc + sale.shopee_fee, 0);
  const totalReceivable = sales.reduce((acc, sale) => acc + receivableOf(sale), 0);
  const totalProfit = filteredSales.reduce((acc, sale) => acc + profitOf(sale), 0);
  const avgShopeeFeePercent = totalSaleValue ? totalShopeeFee / totalSaleValue : 0;
  const avgMarginPercent = totalSaleValue ? totalProfit / totalSaleValue : 0;

  const activeFiltersCount = [dateFrom, dateTo, link].filter(Boolean).length;

  const [filterResetKey, setFilterResetKey] = useState(0);

  function clearFilters() {
    setDateFrom("");
    setDateTo("");
    setLink("");
    setFilterResetKey((key) => key + 1);
  }

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold md:text-2xl">CF Motos</h1>
        <Button onClick={openNew}>
          <Plus className="size-4" />
          Nova venda
        </Button>
      </div>

      {sales.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Nenhuma venda registrada ainda.
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Filtros: desktop inline */}
          <Card className="hidden md:block">
            <CardContent className="grid grid-cols-3 gap-3 py-4">
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
                <Label htmlFor="filter_link">Link da venda</Label>
                <Input
                  id="filter_link"
                  placeholder="Buscar link"
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Mobile: lucro total + filtro */}
          <div className="flex items-center justify-between md:hidden">
            <span className="text-sm font-medium text-muted-foreground">Lucro total</span>
            <div className="flex items-center gap-3">
              <span className="text-base font-semibold">{formatCurrency(totalProfit)}</span>
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
                      <Label htmlFor="filter_link_mobile">Link da venda</Label>
                      <Input
                        id="filter_link_mobile"
                        placeholder="Buscar link"
                        value={link}
                        onChange={(e) => setLink(e.target.value)}
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
          </div>

          {filteredSales.length === 0 && (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                Nenhuma venda encontrada para os filtros selecionados.
              </CardContent>
            </Card>
          )}

          {/* Mobile: cards */}
          <div className="flex flex-col gap-3 md:hidden">
            {filteredSales.map((sale) => (
              <Card
                key={sale.id}
                className="cursor-pointer"
                onClick={() => openEdit(sale)}
              >
                <CardContent className="flex flex-col gap-3 py-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{formatDate(sale.sale_date)}</span>
                    <span className="text-base font-semibold">
                      {formatCurrency(sale.sale_value)}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs text-muted-foreground">Custo</span>
                      <span>{formatCurrency(sale.cost)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs text-muted-foreground">Taxas Shopee</span>
                      <span>{formatCurrency(sale.shopee_fee)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs text-muted-foreground">Valor a receber</span>
                      <span>{formatCurrency(receivableOf(sale))}</span>
                    </div>
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs text-muted-foreground">Lucro</span>
                      <span>{formatCurrency(profitOf(sale))}</span>
                    </div>
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs text-muted-foreground">% Taxas Shopee</span>
                      <span>{formatPercent(shopeeFeePercent(sale))}</span>
                    </div>
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs text-muted-foreground">% Margem</span>
                      <span>{formatPercent(marginPercent(sale))}</span>
                    </div>
                  </div>
                  {sale.product_reference && (
                    <a
                      href={sale.product_reference}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="line-clamp-2 text-sm text-primary underline-offset-2 hover:underline"
                    >
                      {sale.product_reference}
                    </a>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Desktop: table */}
          <div className="hidden rounded-md border md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Valor de venda</TableHead>
                  <TableHead>Custo</TableHead>
                  <TableHead>Taxas Shopee</TableHead>
                  <TableHead>Valor a receber</TableHead>
                  <TableHead>Lucro</TableHead>
                  <TableHead>% Taxas Shopee</TableHead>
                  <TableHead>% Margem</TableHead>
                  <TableHead>Link da venda</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSales.map((sale) => (
                  <TableRow
                    key={sale.id}
                    className="cursor-pointer"
                    onClick={() => openEdit(sale)}
                  >
                    <TableCell>{formatDate(sale.sale_date)}</TableCell>
                    <TableCell>{formatCurrency(sale.sale_value)}</TableCell>
                    <TableCell>{formatCurrency(sale.cost)}</TableCell>
                    <TableCell>{formatCurrency(sale.shopee_fee)}</TableCell>
                    <TableCell>{formatCurrency(receivableOf(sale))}</TableCell>
                    <TableCell>{formatCurrency(profitOf(sale))}</TableCell>
                    <TableCell>{formatPercent(shopeeFeePercent(sale))}</TableCell>
                    <TableCell>{formatPercent(marginPercent(sale))}</TableCell>
                    <TableCell className="max-w-[240px] truncate">
                      {sale.product_reference ? (
                        <a
                          href={sale.product_reference}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-primary underline-offset-2 hover:underline"
                        >
                          {sale.product_reference}
                        </a>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell>Total</TableCell>
                  <TableCell>{formatCurrency(totalSaleValue)}</TableCell>
                  <TableCell>{formatCurrency(totalCost)}</TableCell>
                  <TableCell>{formatCurrency(totalShopeeFee)}</TableCell>
                  <TableCell>{formatCurrency(totalReceivable)}</TableCell>
                  <TableCell>{formatCurrency(totalProfit)}</TableCell>
                  <TableCell>{formatPercent(avgShopeeFeePercent)}</TableCell>
                  <TableCell>{formatPercent(avgMarginPercent)}</TableCell>
                  <TableCell />
                </TableRow>
              </TableFooter>
            </Table>
          </div>
        </>
      )}

      <CfMotoSaleFormDialog
        open={open}
        onOpenChange={setOpen}
        sale={editingSale}
        existingLinks={existingLinks}
      />
    </div>
  );
}
