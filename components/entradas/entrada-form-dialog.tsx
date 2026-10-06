"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DateInput } from "@/components/ui/date-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Combobox,
  ComboboxContent,
  ComboboxInput,
  ComboboxInputGroup,
  ComboboxItem,
  ComboboxTrigger,
} from "@/components/ui/combobox";
import { formatCurrency } from "@/lib/format";
import {
  createLsStockEntries,
  updateLsStockEntry,
  deleteLsStockEntry,
} from "@/app/(app)/entradas/actions";
import type { LsProduct, LsStockEntry, SupplierAccess } from "@/lib/types";

const NO_SUPPLIER = "none";

type ProductOption = { value: string; label: string };

type EntryItemRow = {
  key: string;
  product: ProductOption | null;
  quantity: string;
  unitValue: string;
};

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function emptyRow(key: string): EntryItemRow {
  return { key, product: null, quantity: "", unitValue: "" };
}

export function EntradaFormDialog({
  open,
  onOpenChange,
  entry,
  products,
  suppliers,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry: LsStockEntry | null;
  products: LsProduct[];
  suppliers: SupplierAccess[];
}) {
  const [isPending, startTransition] = useTransition();
  const [supplierId, setSupplierId] = useState(entry?.supplier_id ?? NO_SUPPLIER);

  const productItems = useMemo<ProductOption[]>(
    () => products.map((product) => ({ value: product.id, label: `${product.name} · ${product.sku}` })),
    [products],
  );

  function rowsFromEntry(): EntryItemRow[] {
    if (!entry) return [emptyRow("new-0")];
    return [
      {
        key: entry.id,
        product: productItems.find((item) => item.value === entry.product_id) ?? null,
        quantity: String(entry.quantity),
        unitValue: String(entry.unit_value),
      },
    ];
  }

  const [rows, setRows] = useState<EntryItemRow[]>(rowsFromEntry);

  const syncKey = open ? `open-${entry?.id ?? "new"}` : "closed";
  const [lastSyncKey, setLastSyncKey] = useState(syncKey);
  if (syncKey !== lastSyncKey) {
    setLastSyncKey(syncKey);
    if (open) {
      setSupplierId(entry?.supplier_id ?? NO_SUPPLIER);
      setRows(rowsFromEntry());
    }
  }

  const isEditing = !!entry;
  const supplierSelectItems = [
    { value: NO_SUPPLIER, label: "Nenhum" },
    ...suppliers.map((supplier) => ({ value: supplier.id, label: supplier.name })),
  ];

  function addRow() {
    setRows((current) => [...current, emptyRow(`new-${crypto.randomUUID()}`)]);
  }

  function removeRow(key: string) {
    setRows((current) => current.filter((row) => row.key !== key));
  }

  function updateRow(key: string, patch: Partial<EntryItemRow>) {
    setRows((current) => current.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  }

  // Um mesmo produto não pode aparecer em duas linhas da entrada.
  function productOptionsForRow(rowKey: string) {
    const chosenElsewhere = new Set(
      rows
        .filter((row) => row.key !== rowKey && row.product)
        .map((row) => row.product!.value),
    );
    return productItems.filter((option) => !chosenElsewhere.has(option.value));
  }

  const totalValue = rows.reduce(
    (acc, row) => acc + (Number(row.quantity) || 0) * (Number(row.unitValue) || 0),
    0,
  );

  function handleSubmit(formData: FormData) {
    const validRows = rows.filter(
      (row) => row.product && (Number(row.quantity) || 0) > 0 && row.unitValue !== "",
    );

    if (validRows.length === 0) {
      toast.error("Adicione ao menos um item com produto, quantidade e valor unitário");
      return;
    }

    const selectedSupplier = supplierId === NO_SUPPLIER ? "" : supplierId;
    formData.set("supplier_id", selectedSupplier);

    if (isEditing) {
      const row = validRows[0];
      formData.set("product_id", row.product!.value);
      formData.set("quantity", row.quantity);
      formData.set("unit_value", row.unitValue);
    } else {
      formData.set(
        "items",
        JSON.stringify(
          validRows.map((row) => ({
            product_id: row.product!.value,
            quantity: Number(row.quantity),
            unit_value: Number(row.unitValue) || 0,
          })),
        ),
      );
    }

    startTransition(async () => {
      try {
        if (isEditing) {
          await updateLsStockEntry(entry.id, formData);
          toast.success("Entrada atualizada");
        } else {
          await createLsStockEntries(formData);
          toast.success(
            validRows.length === 1 ? "Entrada registrada" : `${validRows.length} itens registrados`,
          );
        }
        onOpenChange(false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro ao salvar entrada");
      }
    });
  }

  function handleDelete() {
    if (!entry) return;
    if (!confirm("Excluir esta entrada?")) return;

    startTransition(async () => {
      try {
        await deleteLsStockEntry(entry.id);
        toast.success("Entrada excluída");
        onOpenChange(false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro ao excluir entrada");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar entrada" : "Nova entrada"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Registre a entrada de um item no estoque da Auto Peças LS."
              : "Registre os itens de uma nota fiscal de uma vez só."}
          </DialogDescription>
        </DialogHeader>

        <form action={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="entry_date">Data da entrada</Label>
              <DateInput
                id="entry_date"
                name="entry_date"
                required
                defaultValue={entry?.entry_date ?? todayISO()}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="supplier_id">Fornecedor</Label>
              <Select
                items={supplierSelectItems}
                value={supplierId}
                onValueChange={(value) => setSupplierId(value ?? NO_SUPPLIER)}
              >
                <SelectTrigger className="w-full" id="supplier_id">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_SUPPLIER}>Nenhum</SelectItem>
                  {suppliers.map((supplier) => (
                    <SelectItem key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {suppliers.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Nenhum fornecedor cadastrado ainda — cadastre em &quot;Fornecedores&quot;.
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <Label>Itens</Label>
              {!isEditing && (
                <Button type="button" variant="outline" size="sm" onClick={addRow}>
                  <Plus className="size-4" />
                  Adicionar item
                </Button>
              )}
            </div>

            {rows.map((row) => {
              const lineTotal = (Number(row.quantity) || 0) * (Number(row.unitValue) || 0);

              return (
                <div
                  key={row.key}
                  className="grid grid-cols-1 gap-3 rounded-lg border p-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,0.7fr)_minmax(0,1fr)_auto] sm:items-end"
                >
                  <div className="flex flex-col gap-2">
                    <Label className="sm:hidden">Produto</Label>
                    <Combobox
                      items={productOptionsForRow(row.key)}
                      value={row.product}
                      onValueChange={(value) => updateRow(row.key, { product: value })}
                      autoHighlight
                    >
                      <ComboboxInputGroup>
                        <ComboboxInput placeholder="Buscar por nome ou SKU" />
                        <ComboboxTrigger />
                      </ComboboxInputGroup>
                      <ComboboxContent>
                        {(option: ProductOption) => (
                          <ComboboxItem key={option.value} value={option}>
                            {option.label}
                          </ComboboxItem>
                        )}
                      </ComboboxContent>
                    </Combobox>
                  </div>

                  <div className="flex flex-col gap-2">
                    <Label className="sm:hidden">Quantidade</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0.01"
                      placeholder="Qtd"
                      value={row.quantity}
                      onChange={(e) => updateRow(row.key, { quantity: e.target.value })}
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <Label className="sm:hidden">Valor unitário (R$)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="Valor unit."
                      value={row.unitValue}
                      onChange={(e) => updateRow(row.key, { unitValue: e.target.value })}
                    />
                    {lineTotal > 0 && (
                      <span className="text-xs text-muted-foreground">
                        Total: {formatCurrency(lineTotal)}
                      </span>
                    )}
                  </div>

                  {!isEditing && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="justify-self-end text-destructive"
                      onClick={() => removeRow(row.key)}
                      disabled={rows.length === 1}
                      aria-label="Remover item"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  )}
                </div>
              );
            })}

          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="notes">Observação (opcional)</Label>
            <Textarea
              id="notes"
              name="notes"
              rows={2}
              placeholder="Ex: nota fiscal, condição de pagamento..."
              defaultValue={entry?.notes ?? ""}
            />
          </div>

          <div className="flex items-center justify-between border-t pt-4">
            <span className="text-sm text-muted-foreground">Total da entrada</span>
            <span className="text-lg font-semibold">{formatCurrency(totalValue)}</span>
          </div>

          <DialogFooter className="gap-2 sm:justify-between">
            {isEditing ? (
              <Button
                type="button"
                variant="destructive"
                onClick={handleDelete}
                disabled={isPending}
              >
                Excluir
              </Button>
            ) : (
              <span />
            )}
            <Button type="submit" disabled={isPending}>
              {isEditing ? "Salvar alterações" : "Registrar entrada"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
