"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  createSale,
  updateSale,
  deleteSale,
  cancelSale,
  previewSaleItemsCost,
} from "@/app/(app)/vendas/actions";
import { formatCurrency } from "@/lib/format";
import { PAYMENT_METHODS, type LsSaleItem, type LsStockSummary, type Sale } from "@/lib/types";

type ProductOption = { value: string; label: string; quantity: number };

type ItemRow = { key: string; product: ProductOption | null; quantity: string };

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function emptyItemRow(key: string): ItemRow {
  return { key, product: null, quantity: "" };
}

function itemRowsFromSaleItems(
  saleItems: LsSaleItem[],
  productOptions: ProductOption[],
): ItemRow[] {
  if (saleItems.length === 0) return [emptyItemRow("new-0")];

  return saleItems.map((item) => ({
    key: item.id,
    product: productOptions.find((option) => option.value === item.product_id) ?? null,
    quantity: String(item.quantity),
  }));
}

function initialItemCosts(saleItems: LsSaleItem[]): Record<string, number> {
  return Object.fromEntries(saleItems.map((item) => [item.id, Number(item.unit_cost) || 0]));
}

// Quantidade originalmente vendida por item já salvo, indexada pelo id do item
// (mesma coisa que a "key" da linha quando ela já existe). Usado para devolver
// ao estoque disponível a quantidade que essa venda já havia consumido, ao editar.
function originalItemQuantities(
  saleItems: LsSaleItem[],
): Record<string, { product_id: string; quantity: number }> {
  return Object.fromEntries(
    saleItems.map((item) => [item.id, { product_id: item.product_id, quantity: Number(item.quantity) }]),
  );
}

function availableQuantity(
  item: ItemRow,
  original: Record<string, { product_id: string; quantity: number }>,
): number {
  if (!item.product) return 0;
  const owned = original[item.key];
  const returned = owned && owned.product_id === item.product.value ? owned.quantity : 0;
  return item.product.quantity + returned;
}

export function SaleFormDialog({
  open,
  onOpenChange,
  sale,
  stockOptions = [],
  saleItems = [],
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sale: Sale | null;
  stockOptions?: LsStockSummary[];
  saleItems?: LsSaleItem[];
}) {
  const [delivery, setDelivery] = useState<"retirada" | "frete">(
    sale?.delivery_type ?? "retirada",
  );
  const [isPending, startTransition] = useTransition();
  const [isCancelling, startCancelTransition] = useTransition();

  const isEditing = !!sale;
  const isItemized = !sale || saleItems.length > 0;
  const isCancelled = sale?.status === "cancelado";

  const productOptions = useMemo<ProductOption[]>(
    () =>
      stockOptions.map((option) => ({
        value: option.product_id,
        label: `${option.product_name} · ${option.product_sku} · Estoque: ${option.quantity}`,
        quantity: Number(option.quantity) || 0,
      })),
    [stockOptions],
  );

  const originalQuantities = useMemo(() => originalItemQuantities(saleItems), [saleItems]);

  const [items, setItems] = useState<ItemRow[]>(() =>
    itemRowsFromSaleItems(saleItems, productOptions),
  );
  const [itemCosts, setItemCosts] = useState<Record<string, number>>(() =>
    initialItemCosts(saleItems),
  );
  const [isCostPending, startCostTransition] = useTransition();

  const syncKey = open ? `open-${sale?.id ?? "new"}` : "closed";
  const [lastSyncKey, setLastSyncKey] = useState(syncKey);
  if (syncKey !== lastSyncKey) {
    setLastSyncKey(syncKey);
    if (open) {
      setDelivery(sale?.delivery_type ?? "retirada");
      setItems(itemRowsFromSaleItems(saleItems, productOptions));
      setItemCosts(initialItemCosts(saleItems));
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

  const itemsSignature = items
    .map((item) => `${item.product?.value ?? ""}:${item.quantity}`)
    .join("|");

  // Busca no servidor o custo LIFO real (última entrada, "furando" pra entradas
  // anteriores quando a quantidade excede o que a mais recente tinha disponível),
  // pra o preview do modal bater com o que será gravado ao salvar.
  useEffect(() => {
    if (!isItemized || isCancelled) return;

    const validItems = items.filter(
      (item) => item.product && (Number(item.quantity) || 0) > 0,
    );

    if (validItems.length === 0) {
      startCostTransition(() => {
        setItemCosts({});
      });
      return;
    }

    startCostTransition(async () => {
      try {
        const result = await previewSaleItemsCost(
          validItems.map((item) => ({
            product_id: item.product!.value,
            quantity: Number(item.quantity),
          })),
          { excludeSaleId: sale?.id, asOfCreatedAt: sale?.created_at },
        );

        setItemCosts(
          Object.fromEntries(
            validItems.map((item, index) => [item.key, result[index]?.unit_cost ?? 0]),
          ),
        );
      } catch {
        // Preview é só exibição; o custo real é recalculado no servidor ao salvar.
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemsSignature, sale?.id, sale?.created_at, isItemized, isCancelled]);

  const computedCost = items.reduce((acc, item) => {
    if (!item.product) return acc;
    return acc + (Number(item.quantity) || 0) * (itemCosts[item.key] ?? 0);
  }, 0);

  const stockOverflowItems = items.filter(
    (item) =>
      item.product && (Number(item.quantity) || 0) > availableQuantity(item, originalQuantities),
  );

  function handleSubmit(formData: FormData) {
    formData.set("delivery_type", delivery);

    if (isItemized) {
      const validItems = items.filter(
        (item) => item.product && (Number(item.quantity) || 0) > 0,
      );

      if (validItems.length === 0) {
        toast.error("Selecione ao menos um produto do estoque e a quantidade");
        return;
      }

      if (stockOverflowItems.length > 0) {
        toast.error(
          `Quantidade maior que o estoque disponível: ${stockOverflowItems
            .map((item) => item.product!.label.split(" · ")[0])
            .join(", ")}`,
        );
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
          await updateSale(sale.id, formData);
          toast.success("Venda atualizada");
        } else {
          await createSale(formData);
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
        await deleteSale(sale.id);
        toast.success("Venda excluída");
        onOpenChange(false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro ao excluir venda");
      }
    });
  }

  function handleCancelSale() {
    if (!sale) return;
    if (!confirm("Cancelar esta venda? O item vendido volta para o estoque.")) return;

    startCancelTransition(async () => {
      try {
        await cancelSale(sale.id);
        toast.success("Venda cancelada e item devolvido ao estoque");
        onOpenChange(false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro ao cancelar venda");
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setDelivery(sale?.delivery_type ?? "retirada");
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar venda" : "Nova venda"}</DialogTitle>
          <DialogDescription>
            {isCancelled
              ? "Venda cancelada — o item já retornou ao estoque."
              : "O frete não é cobrado do cliente."}
          </DialogDescription>
        </DialogHeader>

        <form action={handleSubmit} className="flex flex-col gap-4">
          <fieldset disabled={isCancelled} className="flex flex-col gap-4">
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

            <div className="flex flex-col gap-2">
              <Label htmlFor="payment_method">Forma de pagamento</Label>
              <Select
                name="payment_method"
                defaultValue={sale?.payment_method ?? PAYMENT_METHODS[0]}
                required
              >
                <SelectTrigger id="payment_method" className="w-full">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((method) => (
                    <SelectItem key={method} value={method}>
                      {method}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <Label>Entrega</Label>
              <RadioGroup
                value={delivery}
                onValueChange={(value) => setDelivery(value as "retirada" | "frete")}
                className="grid grid-cols-2 gap-2"
              >
                <RadioGroupItem value="retirada">Retirada</RadioGroupItem>
                <RadioGroupItem value="frete">Frete (não cobrado)</RadioGroupItem>
              </RadioGroup>
            </div>

            {isItemized ? (
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
                    Cadastre produtos em Auto Peças LS · Produtos antes de registrar uma venda.
                  </p>
                )}

                {items.map((item) => {
                  const maxQuantity = availableQuantity(item, originalQuantities);
                  const isOverStock = item.product && (Number(item.quantity) || 0) > maxQuantity;

                  return (
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
                              max={item.product ? maxQuantity : undefined}
                              aria-invalid={isOverStock || undefined}
                              className={isOverStock ? "border-destructive" : undefined}
                              value={item.quantity}
                              onChange={(e) => updateItem(item.key, { quantity: e.target.value })}
                            />
                            {item.product && (
                              <p
                                className={
                                  isOverStock
                                    ? "text-xs text-destructive"
                                    : "text-xs text-muted-foreground"
                                }
                              >
                                {isOverStock
                                  ? `Estoque disponível: ${maxQuantity}`
                                  : `Disponível: ${maxQuantity}`}
                              </p>
                            )}
                          </div>
                          <div className="flex flex-col gap-2">
                            <Label>Custo do item</Label>
                            <Input
                              disabled
                              readOnly
                              value={
                                isCostPending
                                  ? "Calculando..."
                                  : formatCurrency(
                                      (Number(item.quantity) || 0) * (itemCosts[item.key] ?? 0),
                                    )
                              }
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
                  );
                })}

                <div className="flex flex-col gap-2">
                  <Label htmlFor="cost">Custo (R$)</Label>
                  <Input readOnly disabled value={formatCurrency(computedCost)} />
                </div>
              </div>
            ) : (
              <>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="cost">Custo da venda (R$)</Label>
                  <Input
                    id="cost"
                    name="cost"
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    defaultValue={sale?.cost ?? ""}
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="products">Produtos vendidos</Label>
                  <Textarea
                    id="products"
                    name="products"
                    placeholder="Cole aqui a lista de produtos vendidos"
                    rows={4}
                    defaultValue={sale?.products ?? ""}
                  />
                </div>
              </>
            )}
          </fieldset>

          <DialogFooter className="flex-wrap gap-2 sm:justify-between">
            {isEditing ? (
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={isPending || isCancelling}
                >
                  Excluir
                </Button>
                {isItemized && !isCancelled && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancelSale}
                    disabled={isPending || isCancelling}
                  >
                    Cancelar venda
                  </Button>
                )}
              </div>
            ) : (
              <span />
            )}
            {!isCancelled && (
              <Button
                type="submit"
                disabled={isPending || (isItemized && stockOverflowItems.length > 0)}
              >
                {isEditing ? "Salvar alterações" : "Registrar venda"}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
