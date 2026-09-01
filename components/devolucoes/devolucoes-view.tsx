"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DateInput } from "@/components/ui/date-input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/format";
import { DevolucaoFormDialog } from "./devolucao-form-dialog";
import type { LsProduct, LsStockExit, SupplierAccess } from "@/lib/types";

export function DevolucoesView({
  returns,
  products,
  suppliers,
}: {
  returns: LsStockExit[];
  products: LsProduct[];
  suppliers: SupplierAccess[];
}) {
  const [open, setOpen] = useState(false);
  const [editingReturn, setEditingReturn] = useState<LsStockExit | null>(null);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [search, setSearch] = useState("");

  function openNew() {
    setEditingReturn(null);
    setOpen(true);
  }

  function openEdit(item: LsStockExit) {
    setEditingReturn(item);
    setOpen(true);
  }

  const creditBySupplier = useMemo(() => {
    const map = new Map<string, { name: string; total: number }>();
    for (const item of returns) {
      const key = item.supplier_id ?? "sem-fornecedor";
      const name = item.supplier?.name ?? "Sem fornecedor";
      const entry = map.get(key) ?? { name, total: 0 };
      entry.total += item.credit_amount;
      map.set(key, entry);
    }
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [returns]);

  const totalCredit = useMemo(
    () => returns.reduce((acc, item) => acc + item.credit_amount, 0),
    [returns],
  );

  const filteredReturns = useMemo(() => {
    const query = search.trim().toLowerCase();

    return returns.filter((item) => {
      if (dateFrom && item.exit_date < dateFrom) return false;
      if (dateTo && item.exit_date > dateTo) return false;
      if (query) {
        const matchesProduct = item.product?.name.toLowerCase().includes(query) ?? false;
        const matchesSku = item.product?.sku.toLowerCase().includes(query) ?? false;
        const matchesSupplier = item.supplier?.name.toLowerCase().includes(query) ?? false;
        if (!matchesProduct && !matchesSku && !matchesSupplier) return false;
      }
      return true;
    });
  }, [returns, dateFrom, dateTo, search]);

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold md:text-2xl">Auto Peças LS · Devoluções</h1>
        <Button onClick={openNew} disabled={products.length === 0 || suppliers.length === 0}>
          <Plus className="size-4" />
          Nova devolução
        </Button>
      </div>

      {products.length === 0 && (
        <Card>
          <CardContent className="py-6 text-center text-sm text-muted-foreground">
            Cadastre ao menos um produto antes de registrar uma devolução.
          </CardContent>
        </Card>
      )}

      {products.length > 0 && suppliers.length === 0 && (
        <Card>
          <CardContent className="py-6 text-center text-sm text-muted-foreground">
            Cadastre ao menos um fornecedor antes de registrar uma devolução.
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Card>
          <CardContent className="flex flex-col gap-1 py-4">
            <span className="text-sm font-medium text-muted-foreground">
              Crédito total com fornecedores
            </span>
            <span className="text-xl font-semibold md:text-2xl">
              {formatCurrency(totalCredit)}
            </span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col gap-2 py-4">
            <span className="text-sm font-medium text-muted-foreground">Crédito por fornecedor</span>
            {creditBySupplier.length === 0 ? (
              <span className="text-sm text-muted-foreground">Nenhum crédito registrado.</span>
            ) : (
              <ul className="flex flex-col gap-1">
                {creditBySupplier.map((item) => (
                  <li key={item.name} className="flex items-center justify-between text-sm">
                    <span className="truncate">{item.name}</span>
                    <span className="font-medium">{formatCurrency(item.total)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {returns.length > 0 && (
        <Card>
          <CardContent className="grid grid-cols-2 gap-3 py-4 md:grid-cols-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="filter_date_from">De</Label>
              <DateInput id="filter_date_from" onValueChange={setDateFrom} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="filter_date_to">Até</Label>
              <DateInput id="filter_date_to" onValueChange={setDateTo} />
            </div>
            <div className="col-span-2 flex flex-col gap-2">
              <Label htmlFor="filter_search">Produto, SKU ou fornecedor</Label>
              <Input
                id="filter_search"
                placeholder="Buscar"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {returns.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Nenhuma devolução registrada ainda.
          </CardContent>
        </Card>
      ) : filteredReturns.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Nenhuma devolução encontrada para os filtros selecionados.
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Mobile: cards */}
          <div className="flex flex-col gap-3 md:hidden">
            {filteredReturns.map((item) => (
              <Card key={item.id} className="cursor-pointer" onClick={() => openEdit(item)}>
                <CardContent className="flex flex-col gap-1 py-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      {item.product?.name ?? "Produto removido"}
                    </span>
                    <span className="text-base font-semibold">
                      {formatCurrency(item.credit_amount)}
                    </span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {formatDate(item.exit_date)} · Qtd: {item.quantity} ·{" "}
                    {item.supplier?.name ?? "Sem fornecedor"}
                  </span>
                  {item.notes && (
                    <span className="text-xs text-muted-foreground">{item.notes}</span>
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
                  <TableHead>Produto</TableHead>
                  <TableHead>Quantidade</TableHead>
                  <TableHead>Fornecedor</TableHead>
                  <TableHead>Crédito gerado</TableHead>
                  <TableHead>Observação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReturns.map((item) => (
                  <TableRow key={item.id} className="cursor-pointer" onClick={() => openEdit(item)}>
                    <TableCell>{formatDate(item.exit_date)}</TableCell>
                    <TableCell>{item.product?.name ?? "Produto removido"}</TableCell>
                    <TableCell>{item.quantity}</TableCell>
                    <TableCell>{item.supplier?.name ?? "-"}</TableCell>
                    <TableCell>{formatCurrency(item.credit_amount)}</TableCell>
                    <TableCell className="max-w-[200px] truncate text-muted-foreground">
                      {item.notes || "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      <DevolucaoFormDialog
        open={open}
        onOpenChange={setOpen}
        supplierReturn={editingReturn}
        products={products}
        suppliers={suppliers}
      />
    </div>
  );
}
