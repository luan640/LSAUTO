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
import { createLsStockExit, updateLsStockExit, deleteLsStockExit } from "@/app/(app)/entradas/actions";
import { STOCK_EXIT_REASONS, STOCK_EXIT_REASON_LABELS } from "@/lib/types";
import type { LsProduct, LsStockExit } from "@/lib/types";

type ProductOption = { value: string; label: string };

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function SaidaFormDialog({
  open,
  onOpenChange,
  exit,
  products,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exit: LsStockExit | null;
  products: LsProduct[];
}) {
  const [isPending, startTransition] = useTransition();
  const [reason, setReason] = useState(exit?.reason ?? STOCK_EXIT_REASONS[0]);

  const reasonItems = useMemo(
    () => STOCK_EXIT_REASONS.map((value) => ({ value, label: STOCK_EXIT_REASON_LABELS[value] })),
    [],
  );

  const productItems = useMemo<ProductOption[]>(
    () => products.map((product) => ({ value: product.id, label: `${product.name} · ${product.sku}` })),
    [products],
  );
  const [productValue, setProductValue] = useState<ProductOption | null>(
    () => productItems.find((item) => item.value === exit?.product_id) ?? null,
  );

  const syncKey = open ? `open-${exit?.id ?? "new"}` : "closed";
  const [lastSyncKey, setLastSyncKey] = useState(syncKey);
  if (syncKey !== lastSyncKey) {
    setLastSyncKey(syncKey);
    if (open) {
      setReason(exit?.reason ?? STOCK_EXIT_REASONS[0]);
      setProductValue(productItems.find((item) => item.value === exit?.product_id) ?? null);
    }
  }

  const isEditing = !!exit;

  function handleSubmit(formData: FormData) {
    formData.set("reason", reason);

    startTransition(async () => {
      try {
        if (isEditing) {
          await updateLsStockExit(exit.id, formData);
          toast.success("Saída atualizada");
        } else {
          await createLsStockExit(formData);
          toast.success("Saída registrada");
        }
        onOpenChange(false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro ao salvar saída");
      }
    });
  }

  function handleDelete() {
    if (!exit) return;
    if (!confirm("Excluir esta saída?")) return;

    startTransition(async () => {
      try {
        await deleteLsStockExit(exit.id);
        toast.success("Saída excluída");
        onOpenChange(false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro ao excluir saída");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar saída" : "Nova saída de estoque"}</DialogTitle>
          <DialogDescription>
            Registre uma baixa de estoque que não é venda: ajuste de estoque, devolução ao
            fornecedor, etc.
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
                defaultValue={exit?.quantity ?? ""}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="exit_date">Data da saída</Label>
              <DateInput
                id="exit_date"
                name="exit_date"
                required
                defaultValue={exit?.exit_date ?? todayISO()}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="reason">Motivo</Label>
            <Select
              items={reasonItems}
              value={reason}
              onValueChange={(value) => setReason(value ?? reason)}
            >
              <SelectTrigger className="w-full" id="reason">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {STOCK_EXIT_REASONS.map((value) => (
                  <SelectItem key={value} value={value}>
                    {STOCK_EXIT_REASON_LABELS[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="notes">Observação (opcional)</Label>
            <Textarea
              id="notes"
              name="notes"
              rows={2}
              placeholder="Detalhes sobre a saída"
              defaultValue={exit?.notes ?? ""}
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
              {isEditing ? "Salvar alterações" : "Registrar saída"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
