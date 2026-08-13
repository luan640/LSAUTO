"use client";

import { useMemo, useState } from "react";
import { Plus, ArrowDownToLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { STOCK_EXIT_REASON_LABELS } from "@/lib/types";
import { EntradaFormDialog } from "./entrada-form-dialog";
import { SaidaFormDialog } from "./saida-form-dialog";
import type { LsProduct, LsStockEntry, LsStockExit, SupplierAccess } from "@/lib/types";

export function EntradasView({
  entries,
  exits,
  products,
  suppliers,
}: {
  entries: LsStockEntry[];
  exits: LsStockExit[];
  products: LsProduct[];
  suppliers: SupplierAccess[];
}) {
  const [open, setOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<LsStockEntry | null>(null);
  const [saidaOpen, setSaidaOpen] = useState(false);
  const [editingExit, setEditingExit] = useState<LsStockExit | null>(null);
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

  function openNewSaida() {
    setEditingExit(null);
    setSaidaOpen(true);
  }

  function openEditSaida(exit: LsStockExit) {
    setEditingExit(exit);
    setSaidaOpen(true);
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

  const filteredExits = useMemo(() => {
    const query = search.trim().toLowerCase();

    return exits.filter((exit) => {
      if (dateFrom && exit.exit_date < dateFrom) return false;
      if (dateTo && exit.exit_date > dateTo) return false;
      if (query) {
        const matchesName = exit.product?.name.toLowerCase().includes(query) ?? false;
        const matchesSku = exit.product?.sku.toLowerCase().includes(query) ?? false;
        if (!matchesName && !matchesSku) return false;
      }
      return true;
    });
  }, [exits, dateFrom, dateTo, search]);

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold md:text-2xl">Auto Peças LS · Entrada de Itens</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={openNewSaida} disabled={products.length === 0}>
            <ArrowDownToLine className="size-4" />
            Saída de itens
          </Button>
          <Button onClick={openNew} disabled={products.length === 0}>
            <Plus className="size-4" />
            Nova entrada
          </Button>
        </div>
      </div>

      {products.length === 0 && (
        <Card>
          <CardContent className="py-6 text-center text-sm text-muted-foreground">
            Cadastre ao menos um produto antes de registrar uma entrada.
          </CardContent>
        </Card>
      )}

      {(entries.length > 0 || exits.length > 0) && (
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
      )}

      {entries.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Nenhuma entrada registrada ainda.
          </CardContent>
        </Card>
      ) : (
        <>
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

      {exits.length > 0 && (
        <>
          <h2 className="text-lg font-semibold">Saídas de estoque</h2>

          {filteredExits.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                Nenhuma saída encontrada para os filtros selecionados.
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Mobile: cards */}
              <div className="flex flex-col gap-3 md:hidden">
                {filteredExits.map((exit) => (
                  <Card key={exit.id} className="cursor-pointer" onClick={() => openEditSaida(exit)}>
                    <CardContent className="flex flex-col gap-1 py-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">
                          {exit.product?.name ?? "Produto removido"}
                        </span>
                        <Badge variant="secondary">{STOCK_EXIT_REASON_LABELS[exit.reason]}</Badge>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {formatDate(exit.exit_date)} · Qtd: {exit.quantity}
                      </span>
                      {exit.notes && (
                        <span className="text-xs text-muted-foreground">{exit.notes}</span>
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
                      <TableHead>Motivo</TableHead>
                      <TableHead>Observação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredExits.map((exit) => (
                      <TableRow
                        key={exit.id}
                        className="cursor-pointer"
                        onClick={() => openEditSaida(exit)}
                      >
                        <TableCell>{formatDate(exit.exit_date)}</TableCell>
                        <TableCell>{exit.product?.name ?? "Produto removido"}</TableCell>
                        <TableCell>{exit.quantity}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{STOCK_EXIT_REASON_LABELS[exit.reason]}</Badge>
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate text-muted-foreground">
                          {exit.notes || "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </>
      )}

      <EntradaFormDialog
        open={open}
        onOpenChange={setOpen}
        entry={editingEntry}
        products={products}
        suppliers={suppliers}
      />
      <SaidaFormDialog
        open={saidaOpen}
        onOpenChange={setSaidaOpen}
        exit={editingExit}
        products={products}
      />
    </div>
  );
}
