"use client";

import { useTransition } from "react";
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
import {
  createCfMotoSale,
  updateCfMotoSale,
  deleteCfMotoSale,
} from "@/app/(app)/cf-motos/actions";
import type { CfMotoSale } from "@/lib/types";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function CfMotoSaleFormDialog({
  open,
  onOpenChange,
  sale,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sale: CfMotoSale | null;
}) {
  const [isPending, startTransition] = useTransition();

  const isEditing = !!sale;

  function handleSubmit(formData: FormData) {
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

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="cost">Custo (R$)</Label>
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
