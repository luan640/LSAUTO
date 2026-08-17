"use client";

import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/format";
import type { CfMotoStockSummary } from "@/lib/types";

export function CfMotosEstoqueView({ summary }: { summary: CfMotoStockSummary[] }) {
  const [search, setSearch] = useState("");
  const [onlyAvailable, setOnlyAvailable] = useState(false);

  const filteredSummary = useMemo(() => {
    const query = search.trim().toLowerCase();

    return summary.filter((item) => {
      if (onlyAvailable && item.quantity <= 0) return false;
      if (!query) return true;
      return (
        item.product_name.toLowerCase().includes(query) ||
        item.product_sku.toLowerCase().includes(query)
      );
    });
  }, [summary, search, onlyAvailable]);

  const totalQuantity = filteredSummary.reduce((acc, item) => acc + item.quantity, 0);
  const totalValue = filteredSummary.reduce((acc, item) => acc + item.total_value, 0);

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold md:text-2xl">CF Motos · Estoque</h1>
      </div>

      {summary.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Nenhum produto cadastrado ainda.
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Filtros */}
          <Card>
            <CardContent className="flex flex-col gap-4 py-4 md:flex-row md:items-end md:justify-between">
              <div className="flex flex-col gap-2">
                <Label htmlFor="filter_search">Produto ou SKU</Label>
                <Input
                  id="filter_search"
                  placeholder="Buscar por nome ou SKU"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <label
                htmlFor="filter_only_available"
                className="flex items-center gap-2 text-sm font-medium cursor-pointer"
              >
                <Checkbox
                  id="filter_only_available"
                  checked={onlyAvailable}
                  onCheckedChange={setOnlyAvailable}
                />
                Somente disponível em estoque
              </label>
            </CardContent>
          </Card>

          {filteredSummary.length === 0 && (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                Nenhum produto encontrado para a busca.
              </CardContent>
            </Card>
          )}

          {/* Mobile: cards */}
          <div className="flex flex-col gap-3 md:hidden">
            {filteredSummary.map((item) => (
              <Card key={item.product_id}>
                <CardContent className="flex flex-col gap-1 py-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{item.product_name}</span>
                    <span className="text-sm text-muted-foreground">{item.product_sku}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span className={cn(item.quantity === 0 && "font-medium text-destructive")}>
                      Qtd: {item.quantity}
                    </span>
                    <span>Médio: {formatCurrency(item.average_value)}</span>
                  </div>
                  <span className="text-base font-semibold">
                    {formatCurrency(item.total_value)}
                  </span>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Desktop: table */}
          <div className="hidden rounded-md border md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Quantidade</TableHead>
                  <TableHead>Valor total em estoque</TableHead>
                  <TableHead>Valor médio</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSummary.map((item) => (
                  <TableRow key={item.product_id}>
                    <TableCell>{item.product_name}</TableCell>
                    <TableCell>{item.product_sku}</TableCell>
                    <TableCell
                      className={cn(item.quantity === 0 && "font-medium text-destructive")}
                    >
                      {item.quantity}
                    </TableCell>
                    <TableCell>{formatCurrency(item.total_value)}</TableCell>
                    <TableCell>{formatCurrency(item.average_value)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell>Total</TableCell>
                  <TableCell />
                  <TableCell>{totalQuantity}</TableCell>
                  <TableCell>{formatCurrency(totalValue)}</TableCell>
                  <TableCell />
                </TableRow>
              </TableFooter>
            </Table>
          </div>
        </>
      )}
    </div>
  );
}
