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
import { EntradaFormDialog } from "./entrada-form-dialog";
import type { LsProduct, LsStockEntry, SupplierAccess } from "@/lib/types";

export function EntradasView({
  entries,
  products,
  suppliers,
}: {
  entries: LsStockEntry[];
  products: LsProduct[];
  suppliers: SupplierAccess[];
}) {
  const [open, setOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<LsStockEntry | null>(null);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [search, setSearch] = useState("");

  function openNew() {
    setEditingEntry(null);
    setOpen(true);
  }

  function openEdit(entry: LsStockEntry) {
    setEditingEntry(entry);
    setOpen(true);
  }

  const filteredEntries = useMemo(() => {
    const query = search.trim().toLowerCase();

    return entries.filter((entry) => {
      if (dateFrom && entry.entry_date < dateFrom) return false;
      if (dateTo && entry.entry_date > dateTo) return false;
      if (query) {
        const matchesName = entry.product?.name.toLowerCase().includes(query) ?? false;
        const matchesSku = entry.product?.sku.toLowerCase().includes(query) ?? false;
        if (!matchesName && !matchesSku) return false;
      }
      return true;
    });
  }, [entries, dateFrom, dateTo, search]);

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold md:text-2xl">Auto Peças LS · Entrada de Itens</h1>
        <Button onClick={openNew} disabled={products.length === 0}>
          <Plus className="size-4" />
          Nova entrada
        </Button>
      </div>

      {products.length === 0 && (
        <Card>
          <CardContent className="py-6 text-center text-sm text-muted-foreground">
            Cadastre ao menos um produto antes de registrar uma entrada.
          </CardContent>
        </Card>
      )}

      {entries.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Nenhuma entrada registrada ainda.
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Filtros */}
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
                <Label htmlFor="filter_search">Produto ou SKU</Label>
                <Input
                  id="filter_search"
                  placeholder="Buscar por nome ou SKU"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {filteredEntries.length === 0 && (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                Nenhuma entrada encontrada para os filtros selecionados.
              </CardContent>
            </Card>
          )}

          {/* Mobile: cards */}
          <div className="flex flex-col gap-3 md:hidden">
            {filteredEntries.map((entry) => (
              <Card key={entry.id} className="cursor-pointer" onClick={() => openEdit(entry)}>
                <CardContent className="flex flex-col gap-1 py-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      {entry.product?.name ?? "Produto removido"}
                    </span>
                    <span className="text-base font-semibold">
                      {formatCurrency(entry.quantity * entry.unit_value)}
                    </span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {formatDate(entry.entry_date)} · Qtd: {entry.quantity} ·{" "}
                    {entry.supplier?.name ?? "Sem fornecedor"}
                  </span>
                  {entry.notes && (
                    <span className="text-xs text-muted-foreground">{entry.notes}</span>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Desktop: extrato table */}
          <div className="hidden rounded-md border md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead>Quantidade</TableHead>
                  <TableHead>Valor unitário</TableHead>
                  <TableHead>Valor total</TableHead>
                  <TableHead>Fornecedor</TableHead>
                  <TableHead>Observação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEntries.map((entry) => (
                  <TableRow key={entry.id} className="cursor-pointer" onClick={() => openEdit(entry)}>
                    <TableCell>{formatDate(entry.entry_date)}</TableCell>
                    <TableCell>{entry.product?.name ?? "Produto removido"}</TableCell>
                    <TableCell>{entry.quantity}</TableCell>
                    <TableCell>{formatCurrency(entry.unit_value)}</TableCell>
                    <TableCell>{formatCurrency(entry.quantity * entry.unit_value)}</TableCell>
                    <TableCell>{entry.supplier?.name ?? "-"}</TableCell>
                    <TableCell className="max-w-[200px] truncate text-muted-foreground">
                      {entry.notes || "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      <EntradaFormDialog
        open={open}
        onOpenChange={setOpen}
        entry={editingEntry}
        products={products}
        suppliers={suppliers}
      />
    </div>
  );
}
