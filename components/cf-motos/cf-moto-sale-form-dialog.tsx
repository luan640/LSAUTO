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
import { Card, CardContent } from "@/components/ui/card";
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
import {
  createCfMotoSale,
  updateCfMotoSale,
  deleteCfMotoSale,
} from "@/app/(app)/cf-motos/actions";
import { formatCurrency } from "@/lib/format";
import type { CfMotoSale, CfMotoSaleItem, CfMotoStockSummary } from "@/lib/types";

const STATUS_LABELS: Record<CfMotoSale["status"], string> = {
  finalizado: "Finalizado",
  cancelado: "Cancelado",
};

type ProductOption = { value: string; label: string; average_value: number };

type ItemRow = { key: string; product: ProductOption | null; quantity: string };

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function emptyItemRow(key: string): ItemRow {
  return { key, product: null, quantity: "" };
}

function itemRowsFromSaleItems(
  saleItems: CfMotoSaleItem[],
  productOptions: ProductOption[],
): ItemRow[] {
  if (saleItems.length === 0) return [emptyItemRow("new-0")];

  return saleItems.map((item) => ({
    key: item.id,
    product: productOptions.find((option) => option.value === item.product_id) ?? null,
    quantity: String(item.quantity),
  }));
}

export function CfMotoSaleFormDialog({
  open,
  onOpenChange,
  sale,
  existingLinks,
  stockOptions,
  saleItems,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sale: CfMotoSale | null;
  existingLinks: string[];
  stockOptions: CfMotoStockSummary[];
  saleItems: CfMotoSaleItem[];
}) {
  const [isPending, startTransition] = useTransition();

  const isEditing = !!sale;
  const isItemized = !sale || saleItems.length > 0;

  const productOptions = useMemo<ProductOption[]>(
    () =>
      stockOptions.map((option) => ({
        value: option.product_id,
        label: `${option.product_name} · ${option.product_sku} · Estoque: ${option.quantity}`,
        average_value: option.average_value,
      })),
    [stockOptions],
  );

  const [items, setItems] = useState<ItemRow[]>(() =>
    itemRowsFromSaleItems(saleItems, productOptions),
  );

  const syncKey = open ? `open-${sale?.id ?? "new"}` : "closed";
  const [lastSyncKey, setLastSyncKey] = useState(syncKey);
  if (syncKey !== lastSyncKey) {
    setLastSyncKey(syncKey);
    if (open) {
      setItems(itemRowsFromSaleItems(saleItems, productOptions));
    }
  }

  function addItem() {
    setItems((current) => [...current, emptyItemRow(`new-${crypto.randomUUID()}`)]);
  }

  function removeItem(key: string) {
    setItems((current) => current.filter((item) => item.key !== key));
  }

  function updateItem(key: string, patch: Partial<ItemRow>) {
    setItems((current) => current.map((item) => (item.key === key ? { ...item, ...patch } : item)));
  }

  const computedCost = items.reduce((acc, item) => {
    if (!item.product) return acc;
    return acc + (Number(item.quantity) || 0) * item.product.average_value;
  }, 0);

  function handleSubmit(formData: FormData) {
    const link = String(formData.get("product_reference") ?? "").trim();

    if (link && existingLinks.includes(link)) {
      toast.error("Este link de venda já foi cadastrado");
      return;
    }

    if (isItemized) {
      const validItems = items.filter(
        (item) => item.product && (Number(item.quantity) || 0) > 0,
      );

      if (validItems.length === 0) {
        toast.error("Selecione ao menos um produto do estoque e a quantidade");
        return;
      }

      formData.set(
        "items",
        JSON.stringify(
          validItems.map((item) => ({
            product_id: item.product!.value,
            quantity: Number(item.quantity),
          })),
        ),
      );
    }

    startTransition(async () => {
      try {
        if (isEditing) {
          await updateCfMotoSale(sale.id, formData);
          toast.success("Venda atualizada");
        } else {
          await createCfMotoSale(formData);
          toast.success("Venda registrada");
        }
        onOpenChange(false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro ao salvar venda");
      }
    });
  }

  function handleDelete() {
    if (!sale) return;
    if (!confirm("Excluir esta venda?")) return;

    startTransition(async () => {
      try {
        await deleteCfMotoSale(sale.id);
        toast.success("Venda excluída");
        onOpenChange(false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro ao excluir venda");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar venda" : "Nova venda"}</DialogTitle>
          <DialogDescription>Registro de venda da CF Motos.</DialogDescription>
        </DialogHeader>

        <form action={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="sale_date">Data</Label>
              <DateInput
                id="sale_date"
                name="sale_date"
                required
                defaultValue={sale?.sale_date ?? todayISO()}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="sale_value">Valor de venda (R$)</Label>
              <Input
                id="sale_value"
                name="sale_value"
                type="number"
                step="0.01"
                min="0"
                required
                defaultValue={sale?.sale_value ?? ""}
              />
            </div>
          </div>

          {isItemized && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <Label>Produtos vendidos</Label>
                <Button type="button" variant="outline" size="sm" onClick={addItem}>
                  <Plus className="size-4" />
                  Adicionar produto
                </Button>
              </div>

              {productOptions.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Cadastre produtos em CF Motos · Produtos antes de registrar uma venda.
                </p>
              )}

              {items.map((item) => (
                <Card key={item.key}>
                  <CardContent className="flex flex-col gap-3 py-4">
                    <div className="flex flex-col gap-2">
                      <Label>Produto do estoque</Label>
                      <Combobox
                        items={productOptions}
                        value={item.product}
                        onValueChange={(value) => updateItem(item.key, { product: value })}
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

                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col gap-2">
                        <Label>Quantidade</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0.01"
                          value={item.quantity}
                          onChange={(e) => updateItem(item.key, { quantity: e.target.value })}
                        />
                      </div>
                      <div className="flex flex-col gap-2">
                        <Label>Custo do item</Label>
                        <Input
                          disabled
                          readOnly
                          value={formatCurrency(
                            (Number(item.quantity) || 0) * (item.product?.average_value ?? 0),
                          )}
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
                      Remover produto
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="cost">Custo (R$)</Label>
              {isItemized ? (
                <Input readOnly disabled value={formatCurrency(computedCost)} />
              ) : (
                <Input
                  id="cost"
                  name="cost"
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  defaultValue={sale?.cost ?? ""}
                />
              )}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="shopee_fee">Taxas Shopee (R$)</Label>
              <Input
                id="shopee_fee"
                name="shopee_fee"
                type="number"
                step="0.01"
                min="0"
                required
                defaultValue={sale?.shopee_fee ?? ""}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="status">Status</Label>
            <Select name="status" defaultValue={sale?.status ?? "finalizado"} required>
              <SelectTrigger id="status" className="w-full">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(STATUS_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="product_reference">Link da venda</Label>
            <Input
              id="product_reference"
              name="product_reference"
              type="url"
              placeholder="https://..."
              defaultValue={sale?.product_reference ?? ""}
            />
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
              {isEditing ? "Salvar alterações" : "Registrar venda"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
