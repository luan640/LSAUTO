"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
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
import {
  createSupplierReturn,
  updateSupplierReturn,
  deleteSupplierReturn,
} from "@/app/(app)/devolucoes/actions";
import type { LsProduct, LsStockExit, SupplierAccess } from "@/lib/types";

type ProductOption = { value: string; label: string };

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function DevolucaoFormDialog({
  open,
  onOpenChange,
  supplierReturn,
  products,
  suppliers,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplierReturn: LsStockExit | null;
  products: LsProduct[];
  suppliers: SupplierAccess[];
}) {
  const [isPending, startTransition] = useTransition();
  const [supplierId, setSupplierId] = useState(supplierReturn?.supplier_id ?? "");

  const productItems = useMemo<ProductOption[]>(
    () => products.map((product) => ({ value: product.id, label: `${product.name} · ${product.sku}` })),
    [products],
  );
  const [productValue, setProductValue] = useState<ProductOption | null>(
    () => productItems.find((item) => item.value === supplierReturn?.product_id) ?? null,
  );

  const syncKey = open ? `open-${supplierReturn?.id ?? "new"}` : "closed";
  const [lastSyncKey, setLastSyncKey] = useState(syncKey);
  if (syncKey !== lastSyncKey) {
    setLastSyncKey(syncKey);
    if (open) {
      setSupplierId(supplierReturn?.supplier_id ?? "");
      setProductValue(productItems.find((item) => item.value === supplierReturn?.product_id) ?? null);
    }
  }

  const isEditing = !!supplierReturn;

  function handleSubmit(formData: FormData) {
    formData.set("supplier_id", supplierId);

    startTransition(async () => {
      try {
        if (isEditing) {
          await updateSupplierReturn(supplierReturn.id, formData);
          toast.success("Devolução atualizada");
        } else {
          await createSupplierReturn(formData);
          toast.success("Devolução registrada");
        }
        onOpenChange(false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro ao salvar devolução");
      }
    });
  }

  function handleDelete() {
    if (!supplierReturn) return;
    if (!confirm("Excluir esta devolução?")) return;

    startTransition(async () => {
      try {
        await deleteSupplierReturn(supplierReturn.id);
        toast.success("Devolução excluída");
        onOpenChange(false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro ao excluir devolução");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar devolução" : "Nova devolução ao fornecedor"}</DialogTitle>
          <DialogDescription>
            Registre um item devolvido ao fornecedor e o valor do crédito que ele deixou em vez de
            devolver o dinheiro.
          </DialogDescription>
        </DialogHeader>

        <form action={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="product_id">Produto</Label>
            <Combobox
              items={productItems}
              value={productValue}
              onValueChange={(value) => setProductValue(value)}
              name="product_id"
              autoHighlight
              required
            >
              <ComboboxInputGroup>
                <ComboboxInput id="product_id" placeholder="Buscar por nome ou SKU" />
                <ComboboxTrigger />
              </ComboboxInputGroup>
              <ComboboxContent>
                {(item: ProductOption) => (
                  <ComboboxItem key={item.value} value={item}>
                    {item.label}
                  </ComboboxItem>
                )}
              </ComboboxContent>
            </Combobox>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="supplier_id">Fornecedor</Label>
            <Select
              items={suppliers.map((supplier) => ({ value: supplier.id, label: supplier.name }))}
              value={supplierId || null}
              onValueChange={(value) => setSupplierId(value ?? "")}
            >
              <SelectTrigger className="w-full" id="supplier_id">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
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

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="quantity">Quantidade</Label>
              <Input
                id="quantity"
                name="quantity"
                type="number"
                step="0.01"
                min="0.01"
                required
                defaultValue={supplierReturn?.quantity ?? ""}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="exit_date">Data da devolução</Label>
              <DateInput
                id="exit_date"
                name="exit_date"
                required
                defaultValue={supplierReturn?.exit_date ?? todayISO()}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="credit_amount">Valor do crédito gerado (R$)</Label>
            <Input
              id="credit_amount"
              name="credit_amount"
              type="number"
              step="0.01"
              min="0"
              required
              defaultValue={supplierReturn?.credit_amount ?? ""}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="notes">Observação (opcional)</Label>
            <Textarea
              id="notes"
              name="notes"
              rows={2}
              placeholder="Detalhes sobre a devolução"
              defaultValue={supplierReturn?.notes ?? ""}
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
              {isEditing ? "Salvar alterações" : "Registrar devolução"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
