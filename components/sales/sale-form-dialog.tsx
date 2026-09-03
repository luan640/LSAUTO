"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Check, Package, Plus, ShoppingCart, Trash2, Truck } from "lucide-react";
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
import { CustomerFormDialog } from "@/components/customers/customer-form-dialog";
import { cn } from "@/lib/utils";
import {
  createSale,
  updateSale,
  cancelSale,
  previewSaleItemsCost,
} from "@/app/(app)/vendas/actions";
import { formatCurrency } from "@/lib/format";
import {
  PAYMENT_METHODS,
  type LsCustomer,
  type LsSaleItem,
  type LsStockSummary,
  type Sale,
} from "@/lib/types";

type ProductOption = { value: string; label: string; quantity: number; active: boolean };

type CustomerOption = { value: string; label: string };

const NO_CUSTOMER_OPTION: CustomerOption = { value: "", label: "Nenhum cliente selecionado" };

function customerToOption(customer: LsCustomer): CustomerOption {
  return { value: customer.id, label: `${customer.name} · ${customer.cpf}` };
}

type ItemRow = { key: string; product: ProductOption | null; quantity: string };

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

// O campo "Valor de venda" exibido no formulário é o subtotal (bruto, antes do
// desconto); sale_value no banco guarda o valor líquido. Ao editar, reconstrói
// o bruto somando o desconto de volta.
function initialGrossValue(sale: Sale | null): string {
  if (!sale) return "";
  return String(Number(sale.sale_value) + Number(sale.discount ?? 0));
}

function initialDiscount(sale: Sale | null): string {
  if (!sale || !sale.discount) return "";
  return String(sale.discount);
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
  customerOptions = [],
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sale: Sale | null;
  stockOptions?: LsStockSummary[];
  saleItems?: LsSaleItem[];
  customerOptions?: LsCustomer[];
}) {
  const [delivery, setDelivery] = useState<"retirada" | "frete">(
    sale?.delivery_type ?? "retirada",
  );
  const [grossValue, setGrossValue] = useState(() => initialGrossValue(sale));
  const [discount, setDiscount] = useState(() => initialDiscount(sale));
  const [isPending, startTransition] = useTransition();
  const [isCancelling, startCancelTransition] = useTransition();
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [newCustomerDialogOpen, setNewCustomerDialogOpen] = useState(false);

  const isEditing = !!sale;
  const isItemized = !sale || saleItems.length > 0;
  const isCancelled = sale?.status === "cancelado";

  const productOptions = useMemo<ProductOption[]>(
    () =>
      stockOptions.map((option) => ({
        value: option.product_id,
        label: `${option.product_name} · ${option.product_sku} · Estoque: ${option.quantity}`,
        quantity: Number(option.quantity) || 0,
        active: option.product_active,
      })),
    [stockOptions],
  );

  // Produto desativado some das opções pra novos itens, mas continua aparecendo
  // normalmente se já estiver numa venda existente (não perde o histórico).
  const selectableProductOptions = useMemo(
    () => productOptions.filter((option) => option.active),
    [productOptions],
  );

  const originalQuantities = useMemo(() => originalItemQuantities(saleItems), [saleItems]);

  const [items, setItems] = useState<ItemRow[]>(() =>
    itemRowsFromSaleItems(saleItems, productOptions),
  );
  const [itemCosts, setItemCosts] = useState<Record<string, number>>(() =>
    initialItemCosts(saleItems),
  );
  const [isCostPending, startCostTransition] = useTransition();

  const customerSelectOptions = useMemo<CustomerOption[]>(
    () => [NO_CUSTOMER_OPTION, ...customerOptions.map(customerToOption)],
    [customerOptions],
  );

  function initialCustomer(): CustomerOption {
    if (sale?.customer) return customerToOption(sale.customer);
    const found = sale?.customer_id
      ? customerOptions.find((c) => c.id === sale.customer_id)
      : undefined;
    return found ? customerToOption(found) : NO_CUSTOMER_OPTION;
  }

  const [customer, setCustomer] = useState<CustomerOption>(initialCustomer);

  const syncKey = open ? `open-${sale?.id ?? "new"}` : "closed";
  const [lastSyncKey, setLastSyncKey] = useState(syncKey);
  if (syncKey !== lastSyncKey) {
    setLastSyncKey(syncKey);
    if (open) {
      setDelivery(sale?.delivery_type ?? "retirada");
      setItems(itemRowsFromSaleItems(saleItems, productOptions));
      setItemCosts(initialItemCosts(saleItems));
      setCustomer(initialCustomer());
      setGrossValue(initialGrossValue(sale));
      setDiscount(initialDiscount(sale));
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
          { excludeSaleId: sale?.id },
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
  }, [itemsSignature, sale?.id, isItemized, isCancelled]);

  const computedCost = items.reduce((acc, item) => {
    if (!item.product) return acc;
    return acc + (Number(item.quantity) || 0) * (itemCosts[item.key] ?? 0);
  }, 0);

  const stockOverflowItems = items.filter(
    (item) =>
      item.product && (Number(item.quantity) || 0) > availableQuantity(item, originalQuantities),
  );

  const grossValueNumber = Number(grossValue) || 0;
  const discountNumber = Number(discount) || 0;
  const totalValue = Math.max(grossValueNumber - discountNumber, 0);

  function handleSubmit(formData: FormData) {
    formData.set("delivery_type", delivery);
    formData.set("sale_value", String(totalValue));
    formData.set("discount", String(discountNumber));

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

  function handleConfirmCancelSale() {
    if (!sale) return;

    if (!cancelReason.trim()) {
      toast.error("Informe o motivo do cancelamento");
      return;
    }

    startCancelTransition(async () => {
      try {
        await cancelSale(sale.id, cancelReason);
        toast.success(
          isItemized ? "Venda cancelada e item devolvido ao estoque" : "Venda cancelada",
        );
        setCancelDialogOpen(false);
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
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <ShoppingCart className="size-4" />
            </div>
            <div className="flex flex-col gap-1">
              <DialogTitle>{isEditing ? "Editar venda" : "Nova venda"}</DialogTitle>
              <DialogDescription>
                {isCancelled
                  ? "Venda cancelada — o item já retornou ao estoque."
                  : "O frete não é cobrado do cliente."}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {isCancelled && sale.cancel_reason && (
          <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm">
            <span className="font-medium">Motivo do cancelamento: </span>
            {sale.cancel_reason}
          </div>
        )}

        <form action={handleSubmit} className="flex flex-col gap-4">
          <fieldset disabled={isCancelled} className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={grossValue}
                  onChange={(e) => setGrossValue(e.target.value)}
                />
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
            </div>

            <Card size="sm">
              <CardContent className="flex flex-col gap-2">
                <Label>Entrega</Label>
                <RadioGroup
                  value={delivery}
                  onValueChange={(value) => setDelivery(value as "retirada" | "frete")}
                  className="grid grid-cols-2 gap-2"
                >
                  <RadioGroupItem
                    value="retirada"
                    className="items-center gap-2 rounded-lg border p-3 font-normal has-[[data-checked]]:border-primary has-[[data-checked]]:bg-primary/5"
                  >
                    <Package className="size-4 text-muted-foreground" />
                    Retirada
                  </RadioGroupItem>
                  <RadioGroupItem
                    value="frete"
                    className="items-center gap-2 rounded-lg border p-3 font-normal has-[[data-checked]]:border-primary has-[[data-checked]]:bg-primary/5"
                  >
                    <Truck className="size-4 text-muted-foreground" />
                    Frete (não cobrado)
                  </RadioGroupItem>
                </RadioGroup>
              </CardContent>
            </Card>

            <Card size="sm">
              <CardContent className="flex flex-col gap-2">
                <Label>Cliente (opcional)</Label>
                <div className="flex gap-2">
                  <Combobox
                    items={customerSelectOptions}
                    value={customer}
                    onValueChange={(value) => setCustomer(value ?? NO_CUSTOMER_OPTION)}
                    autoHighlight
                  >
                    <ComboboxInputGroup className="flex-1">
                      <ComboboxInput placeholder="Buscar por nome ou CPF" />
                      <ComboboxTrigger />
                    </ComboboxInputGroup>
                    <ComboboxContent>
                      {(option: CustomerOption) => (
                        <ComboboxItem key={option.value} value={option}>
                          {option.label}
                        </ComboboxItem>
                      )}
                    </ComboboxContent>
                  </Combobox>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setNewCustomerDialogOpen(true)}
                    aria-label="Novo cliente"
                  >
                    <Plus className="size-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Vincule pra o nome e CPF saírem preenchidos no recibo.
                </p>
              </CardContent>
            </Card>

            <Card size="sm">
              <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="notes">Observação interna</Label>
                  <Textarea
                    id="notes"
                    name="notes"
                    placeholder="Anotação só pra uso interno (opcional)"
                    rows={3}
                    defaultValue={sale?.notes ?? ""}
                  />
                  <p className="text-xs text-muted-foreground">Não aparece no recibo.</p>
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="receipt_notes">Observação do recibo</Label>
                  <Textarea
                    id="receipt_notes"
                    name="receipt_notes"
                    placeholder="Texto que sai impresso no recibo (opcional)"
                    rows={3}
                    defaultValue={sale?.receipt_notes ?? ""}
                  />
                  <p className="text-xs text-muted-foreground">Aparece no campo Observações do recibo.</p>
                </div>
              </CardContent>
            </Card>

            {isItemized ? (
              <Card size="sm">
                <CardContent className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <Label>Produtos vendidos</Label>
                    <Button type="button" variant="outline" size="sm" onClick={addItem}>
                      <Plus className="size-4" />
                      Adicionar produto
                    </Button>
                  </div>

                  {selectableProductOptions.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Cadastre produtos ativos em Auto Peças LS · Produtos antes de registrar uma
                      venda.
                    </p>
                  ) : (
                    <div className="hidden grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_2.25rem] gap-3 px-1 text-xs font-medium text-muted-foreground sm:grid">
                      <span>Produto do estoque</span>
                      <span>Quantidade</span>
                      <span>Custo do item (R$)</span>
                      <span />
                    </div>
                  )}

                  {items.map((item) => {
                    const maxQuantity = availableQuantity(item, originalQuantities);
                    const isOverStock = item.product && (Number(item.quantity) || 0) > maxQuantity;

                    return (
                      <div
                        key={item.key}
                        className="grid grid-cols-1 items-start gap-3 rounded-lg border p-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_2.25rem] sm:border-0 sm:p-0"
                      >
                        <div className="flex flex-col gap-2">
                          <Label className="sm:hidden">Produto do estoque</Label>
                          <Combobox
                            items={selectableProductOptions}
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

                        <div className="flex flex-col gap-2">
                          <Label className="sm:hidden">Quantidade</Label>
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
                          <Label className="sm:hidden">Custo do item</Label>
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

                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          className="justify-self-end text-destructive sm:mt-0"
                          onClick={() => removeItem(item.key)}
                          disabled={items.length === 1}
                        >
                          <Trash2 className="size-4" />
                          <span className="sr-only">Remover produto</span>
                        </Button>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
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

            <div
              className={cn(
                "grid grid-cols-1 gap-4",
                isItemized && "sm:grid-cols-2",
              )}
            >
              {isItemized && (
                <Card size="sm">
                  <CardContent className="flex flex-col gap-1">
                    <span className="text-xs text-muted-foreground">
                      Custo total dos itens (R$)
                    </span>
                    <span className="text-lg font-semibold">
                      {formatCurrency(computedCost)}
                    </span>
                  </CardContent>
                </Card>
              )}

              <Card size="sm">
                <CardContent className="flex flex-col gap-2">
                  <span className="text-xs text-muted-foreground">Resumo da venda</span>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{formatCurrency(grossValueNumber)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <Label htmlFor="discount" className="font-normal text-muted-foreground">
                      Desconto (R$)
                    </Label>
                    <Input
                      id="discount"
                      type="number"
                      step="0.01"
                      min="0"
                      className="h-8 w-28 text-right"
                      value={discount}
                      onChange={(e) => setDiscount(e.target.value)}
                      placeholder="0,00"
                    />
                  </div>
                  <div className="flex items-center justify-between border-t pt-2 text-sm font-semibold">
                    <span>Total da venda</span>
                    <span>{formatCurrency(totalValue)}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </fieldset>

          <DialogFooter className="flex-wrap gap-2 sm:justify-between">
            {isEditing && !isCancelled ? (
              <Button
                type="button"
                variant="destructive"
                onClick={() => {
                  setCancelReason("");
                  setCancelDialogOpen(true);
                }}
                disabled={isPending || isCancelling}
              >
                Cancelar venda
              </Button>
            ) : (
              <span />
            )}
            {!isCancelled && (
              <Button
                type="submit"
                disabled={isPending || (isItemized && stockOverflowItems.length > 0)}
              >
                <Check className="size-4" />
                {isEditing ? "Salvar alterações" : "Registrar venda"}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>

      <CustomerFormDialog
        open={newCustomerDialogOpen}
        onOpenChange={setNewCustomerDialogOpen}
        customer={null}
        onCreated={(created) => setCustomer(customerToOption(created))}
      />

      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cancelar venda</DialogTitle>
            <DialogDescription>
              {isItemized
                ? "O item vendido volta para o estoque. Informe o motivo do cancelamento."
                : "Informe o motivo do cancelamento."}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-2">
            <Label htmlFor="cancel_reason">Motivo do cancelamento</Label>
            <Textarea
              id="cancel_reason"
              rows={3}
              placeholder="Ex: cliente desistiu da compra, item com defeito..."
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setCancelDialogOpen(false)}
              disabled={isCancelling}
            >
              Voltar
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleConfirmCancelSale}
              disabled={isCancelling || !cancelReason.trim()}
            >
              Confirmar cancelamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
