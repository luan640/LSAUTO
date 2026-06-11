"use client";

import { useState, useTransition } from "react";
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
import { cn } from "@/lib/utils";
import { createSale, updateSale, deleteSale } from "@/app/(app)/vendas/actions";
import { PAYMENT_METHODS, type Sale } from "@/lib/types";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function SaleFormDialog({
  open,
  onOpenChange,
  sale,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sale: Sale | null;
}) {
  const [delivery, setDelivery] = useState<"retirada" | "frete">(
    sale?.delivery_type ?? "retirada",
  );
  const [isPending, startTransition] = useTransition();

  const isEditing = !!sale;

  function handleSubmit(formData: FormData) {
    formData.set("delivery_type", delivery);

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
            Preencha os dados da venda. O frete não é cobrado do cliente.
          </DialogDescription>
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

          <div className="grid grid-cols-2 gap-4">
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
          </div>

          <div className="flex flex-col gap-2">
            <Label>Entrega</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setDelivery("retirada")}
                className={cn(
                  "rounded-md border px-3 py-2 text-sm font-medium transition-colors",
                  delivery === "retirada"
                    ? "border-primary bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted",
                )}
              >
                Retirada
              </button>
              <button
                type="button"
                onClick={() => setDelivery("frete")}
                className={cn(
                  "rounded-md border px-3 py-2 text-sm font-medium transition-colors",
                  delivery === "frete"
                    ? "border-primary bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted",
                )}
              >
                Frete (não cobrado)
              </button>
            </div>
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
