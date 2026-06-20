"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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

export function CfMotosView({ sales }: { sales: CfMotoSale[] }) {
  const [open, setOpen] = useState(false);
  const [editingSale, setEditingSale] = useState<CfMotoSale | null>(null);

  function openNew() {
    setEditingSale(null);
    setOpen(true);
  }

  function openEdit(sale: CfMotoSale) {
    setEditingSale(sale);
    setOpen(true);
  }

  const totalSaleValue = sales.reduce((acc, sale) => acc + sale.sale_value, 0);
  const totalCost = sales.reduce((acc, sale) => acc + sale.cost, 0);
  const totalShopeeFee = sales.reduce((acc, sale) => acc + sale.shopee_fee, 0);
  const totalProfit = sales.reduce((acc, sale) => acc + profitOf(sale), 0);
  const avgShopeeFeePercent = totalSaleValue ? totalShopeeFee / totalSaleValue : 0;
  const avgMarginPercent = totalSaleValue ? totalProfit / totalSaleValue : 0;

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
          {/* Mobile: cards */}
          <div className="flex flex-col gap-3 md:hidden">
            {sales.map((sale) => (
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
                  <TableHead>Lucro</TableHead>
                  <TableHead>% Taxas Shopee</TableHead>
                  <TableHead>% Margem</TableHead>
                  <TableHead>Link da venda</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sales.map((sale) => (
                  <TableRow
                    key={sale.id}
                    className="cursor-pointer"
                    onClick={() => openEdit(sale)}
                  >
                    <TableCell>{formatDate(sale.sale_date)}</TableCell>
                    <TableCell>{formatCurrency(sale.sale_value)}</TableCell>
                    <TableCell>{formatCurrency(sale.cost)}</TableCell>
                    <TableCell>{formatCurrency(sale.shopee_fee)}</TableCell>
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

      <CfMotoSaleFormDialog open={open} onOpenChange={setOpen} sale={editingSale} />
    </div>
  );
}
