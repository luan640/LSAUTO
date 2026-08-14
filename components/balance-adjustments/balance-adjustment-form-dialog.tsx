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
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  createLsBalanceAdjustment,
  updateLsBalanceAdjustment,
  deleteLsBalanceAdjustment,
} from "@/app/(app)/ajuste-monetario/actions";
import type { LsBalanceAdjustment } from "@/lib/types";

type AdjustmentType = "aumentar" | "diminuir";

export function BalanceAdjustmentFormDialog({
  open,
  onOpenChange,
  adjustment,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  adjustment: LsBalanceAdjustment | null;
}) {
  const [isPending, startTransition] = useTransition();
  const [type, setType] = useState<AdjustmentType>(
    (adjustment?.amount ?? 0) < 0 ? "diminuir" : "aumentar",
  );

  const isEditing = !!adjustment;

  const syncKey = `${open}-${adjustment?.id ?? "new"}`;
  const [lastSyncKey, setLastSyncKey] = useState(syncKey);
  if (syncKey !== lastSyncKey) {
    setLastSyncKey(syncKey);
    setType((adjustment?.amount ?? 0) < 0 ? "diminuir" : "aumentar");
  }

  function handleSubmit(formData: FormData) {
    formData.set("type", type);

    startTransition(async () => {
      try {
        if (isEditing) {
          await updateLsBalanceAdjustment(adjustment.id, formData);
          toast.success("Ajuste atualizado");
        } else {
          await createLsBalanceAdjustment(formData);
          toast.success("Ajuste registrado");
        }
        onOpenChange(false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro ao salvar ajuste");
      }
    });
  }

  function handleDelete() {
    if (!adjustment) return;
    if (!confirm("Excluir este ajuste?")) return;

    startTransition(async () => {
      try {
        await deleteLsBalanceAdjustment(adjustment.id);
        toast.success("Ajuste excluído");
        onOpenChange(false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro ao excluir ajuste");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar ajuste" : "Novo ajuste"}</DialogTitle>
          <DialogDescription>
            Use para bater o saldo do sistema com o valor físico em caixa.
          </DialogDescription>
        </DialogHeader>

        <form action={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="description">Descrição</Label>
            <Input
              id="description"
              name="description"
              required
              placeholder="Ex: Diferença entre caixa físico e sistema"
              defaultValue={adjustment?.description ?? ""}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="amount">Valor (R$)</Label>
            <Input
              id="amount"
              name="amount"
              type="number"
              step="0.01"
              min="0.01"
              required
              defaultValue={adjustment ? Math.abs(adjustment.amount) : ""}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label>Tipo</Label>
            <RadioGroup
              value={type}
              onValueChange={(value) => setType(value as AdjustmentType)}
              className="grid grid-cols-2 gap-2"
            >
              <RadioGroupItem value="aumentar">Aumentar saldo</RadioGroupItem>
              <RadioGroupItem value="diminuir">Diminuir saldo</RadioGroupItem>
            </RadioGroup>
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
              {isEditing ? "Salvar alterações" : "Registrar ajuste"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
