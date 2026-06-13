"use client";

import { useState, useTransition } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { createBudget, updateBudget, deleteBudget } from "@/app/(app)/orcamentos/actions";
import { formatCurrency, formatPercent, profitMargin } from "@/lib/format";
import type { Budget, SupplierAccess } from "@/lib/types";

const NO_SUPPLIER = "none";

type ItemRow = {
  key: string;
  product_reference: string;
  supplier_id: string;
  purchase_value: string;
  sale_value: string;
};

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function emptyItem(key: string): ItemRow {
  return { key, product_reference: "", supplier_id: NO_SUPPLIER, purchase_value: "", sale_value: "" };
}

function itemsFromBudget(budget: Budget | null): ItemRow[] {
  if (!budget || budget.items.length === 0) return [emptyItem("new-0")];

  return budget.items.map((item) => ({
    key: item.id,
    product_reference: item.product_reference,
    supplier_id: item.supplier_id ?? NO_SUPPLIER,
    purchase_value: String(item.purchase_value),
    sale_value: String(item.sale_value),
  }));
}

export function QuoteFormDialog({
  open,
  onOpenChange,
  budget,
  suppliers,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  budget: Budget | null;
  suppliers: SupplierAccess[];
}) {
  const [items, setItems] = useState<ItemRow[]>(() => itemsFromBudget(budget));
  const [isPending, startTransition] = useTransition();

  const isEditing = !!budget;

  const supplierSelectItems = [
    { value: NO_SUPPLIER, label: "Nenhum" },
    ...suppliers.map((supplier) => ({ value: supplier.id, label: supplier.name })),
  ];

  const syncKey = open ? `open-${budget?.id ?? "new"}` : "closed";
  const [lastSyncKey, setLastSyncKey] = useState(syncKey);
  if (syncKey !== lastSyncKey) {
    setLastSyncKey(syncKey);
    if (open) {
      setItems(itemsFromBudget(budget));
    }
  }

  function addItem() {
    setItems((current) => [...current, emptyItem(`new-${crypto.randomUUID()}`)]);
  }

  function removeItem(key: string) {
    setItems((current) => current.filter((item) => item.key !== key));
  }

  function updateItem(key: string, patch: Partial<ItemRow>) {
    setItems((current) =>
      current.map((item) => (item.key === key ? { ...item, ...patch } : item)),
    );
  }

  const totalPurchase = items.reduce((acc, item) => acc + (Number(item.purchase_value) || 0), 0);
  const totalSale = items.reduce((acc, item) => acc + (Number(item.sale_value) || 0), 0);

  function handleSubmit(formData: FormData) {
    const validItems = items.filter((item) => item.product_reference.trim() !== "");

    if (validItems.length === 0) {
      toast.error("Adicione ao menos um item com referência");
      return;
    }

    formData.set(
      "items",
      JSON.stringify(
        validItems.map((item) => ({
          product_reference: item.product_reference,
          supplier_id: item.supplier_id === NO_SUPPLIER ? null : item.supplier_id,
          purchase_value: Number(item.purchase_value) || 0,
          sale_value: Number(item.sale_value) || 0,
        })),
      ),
    );

    startTransition(async () => {
      try {
        if (isEditing) {
          await updateBudget(budget.id, formData);
          toast.success("Orçamento atualizado");
        } else {
          await createBudget(formData);
          toast.success("Orçamento registrado");
        }
        onOpenChange(false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro ao salvar orçamento");
      }
    });
  }

  function handleDelete() {
    if (!budget) return;
    if (!confirm("Excluir este orçamento?")) return;

    startTransition(async () => {
      try {
        await deleteBudget(budget.id);
        toast.success("Orçamento excluído");
        onOpenChange(false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro ao excluir orçamento");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange} disablePointerDismissal>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar orçamento" : "Novo orçamento"}</DialogTitle>
          <DialogDescription>Preencha os dados do orçamento.</DialogDescription>
        </DialogHeader>

        <form action={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="client_phone">Telefone do cliente</Label>
              <Input
                id="client_phone"
                name="client_phone"
                type="tel"
                placeholder="(00) 00000-0000"
                required
                defaultValue={budget?.client_phone ?? ""}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="budget_date">Data</Label>
              <DateInput
                id="budget_date"
                name="budget_date"
                required
                defaultValue={budget?.budget_date ?? todayISO()}
              />
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <Label>Itens</Label>
              <Button type="button" variant="outline" size="sm" onClick={addItem}>
                <Plus className="size-4" />
                Adicionar item
              </Button>
            </div>

            {items.map((item) => (
              <Card key={item.key}>
                <CardContent className="flex flex-col gap-3 py-4">
                  <div className="flex flex-col gap-2">
                    <Label>Referência do produto</Label>
                    <Input
                      placeholder="Referência do produto"
                      value={item.product_reference}
                      onChange={(e) => updateItem(item.key, { product_reference: e.target.value })}
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <Label>Fornecedor</Label>
                    <Select
                      items={supplierSelectItems}
                      value={item.supplier_id}
                      onValueChange={(value) =>
                        updateItem(item.key, { supplier_id: value ?? NO_SUPPLIER })
                      }
                    >
                      <SelectTrigger className="w-full">
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
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-2">
                      <Label>Valor de compra (R$)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.purchase_value}
                        onChange={(e) => updateItem(item.key, { purchase_value: e.target.value })}
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label>Valor de venda (R$)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.sale_value}
                        onChange={(e) => updateItem(item.key, { sale_value: e.target.value })}
                      />
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="self-end text-destructive"
                    onClick={() => removeItem(item.key)}
                    disabled={items.length === 1}
                  >
                    <Trash2 className="size-4" />
                    Remover item
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardContent className="grid grid-cols-3 gap-2 py-4 text-sm">
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">Total compra</span>
                <span className="font-medium">{formatCurrency(totalPurchase)}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">Total venda</span>
                <span className="font-medium">{formatCurrency(totalSale)}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">Margem</span>
                <span className="font-medium">
                  {formatCurrency(totalSale - totalPurchase)} (
                  {formatPercent(profitMargin(totalSale, totalPurchase))})
                </span>
              </div>
            </CardContent>
          </Card>

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
              {isEditing ? "Salvar alterações" : "Registrar orçamento"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
