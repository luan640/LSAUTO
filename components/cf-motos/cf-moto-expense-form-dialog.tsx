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
  createCfMotoExpense,
  updateCfMotoExpense,
  deleteCfMotoExpense,
} from "@/app/(app)/cf-motos/despesas/actions";
import type { CfMotoExpense } from "@/lib/types";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function CfMotoExpenseFormDialog({
  open,
  onOpenChange,
  expense,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expense: CfMotoExpense | null;
}) {
  const [isPending, startTransition] = useTransition();

  const isEditing = !!expense;

  function handleSubmit(formData: FormData) {
    const startDate = String(formData.get("start_date"));
    const endDate = String(formData.get("end_date"));

    if (endDate < startDate) {
      toast.error("A data final não pode ser anterior à data inicial");
      return;
    }

    startTransition(async () => {
      try {
        if (isEditing) {
          await updateCfMotoExpense(expense.id, formData);
          toast.success("Despesa atualizada");
        } else {
          await createCfMotoExpense(formData);
          toast.success("Despesa registrada");
        }
        onOpenChange(false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro ao salvar despesa");
      }
    });
  }

  function handleDelete() {
    if (!expense) return;
    if (!confirm("Excluir esta despesa?")) return;

    startTransition(async () => {
      try {
        await deleteCfMotoExpense(expense.id);
        toast.success("Despesa excluída");
        onOpenChange(false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro ao excluir despesa");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar despesa" : "Nova despesa"}</DialogTitle>
          <DialogDescription>
            Informe o período de dias ao qual a despesa da CF Motos se refere.
          </DialogDescription>
        </DialogHeader>

        <form action={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="description">Descrição</Label>
            <Input
              id="description"
              name="description"
              required
              placeholder="Ex: ADS"
              defaultValue={expense?.description ?? ""}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="amount">Valor (R$)</Label>
            <Input
              id="amount"
              name="amount"
              type="number"
              step="0.01"
              min="0"
              required
              defaultValue={expense?.amount ?? ""}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="start_date">Início do período</Label>
              <DateInput
                id="start_date"
                name="start_date"
                required
                defaultValue={expense?.start_date ?? todayISO()}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="end_date">Fim do período</Label>
              <DateInput
                id="end_date"
                name="end_date"
                required
                defaultValue={expense?.end_date ?? todayISO()}
              />
            </div>
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
              {isEditing ? "Salvar alterações" : "Registrar despesa"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
