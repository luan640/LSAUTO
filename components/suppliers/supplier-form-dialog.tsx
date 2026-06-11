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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  createSupplierAccess,
  updateSupplierAccess,
  deleteSupplierAccess,
} from "@/app/(app)/fornecedores/actions";
import type { SupplierAccess } from "@/lib/types";

export function SupplierFormDialog({
  open,
  onOpenChange,
  supplier,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplier: SupplierAccess | null;
}) {
  const [isPending, startTransition] = useTransition();

  const isEditing = !!supplier;

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      try {
        if (isEditing) {
          await updateSupplierAccess(supplier.id, formData);
          toast.success("Fornecedor atualizado");
        } else {
          await createSupplierAccess(formData);
          toast.success("Fornecedor cadastrado");
        }
        onOpenChange(false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro ao salvar fornecedor");
      }
    });
  }

  function handleDelete() {
    if (!supplier) return;
    if (!confirm("Excluir este fornecedor?")) return;

    startTransition(async () => {
      try {
        await deleteSupplierAccess(supplier.id);
        toast.success("Fornecedor excluído");
        onOpenChange(false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro ao excluir fornecedor");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar fornecedor" : "Novo fornecedor"}</DialogTitle>
          <DialogDescription>
            Dados de acesso ao e-commerce do fornecedor.
          </DialogDescription>
        </DialogHeader>

        <form action={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Nome do fornecedor</Label>
            <Input
              id="name"
              name="name"
              required
              defaultValue={supplier?.name ?? ""}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="ecommerce_url">Link do e-commerce</Label>
            <Input
              id="ecommerce_url"
              name="ecommerce_url"
              type="url"
              placeholder="https://..."
              defaultValue={supplier?.ecommerce_url ?? ""}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="login">Login</Label>
              <Input
                id="login"
                name="login"
                defaultValue={supplier?.login ?? ""}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                name="password"
                type="text"
                autoComplete="off"
                defaultValue={supplier?.password ?? ""}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              name="notes"
              rows={3}
              defaultValue={supplier?.notes ?? ""}
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
              {isEditing ? "Salvar alterações" : "Cadastrar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
