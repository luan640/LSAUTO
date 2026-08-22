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
import {
  createLsCustomer,
  updateLsCustomer,
  deleteLsCustomer,
} from "@/app/(app)/clientes/actions";
import type { LsCustomer } from "@/lib/types";

export function CustomerFormDialog({
  open,
  onOpenChange,
  customer,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: LsCustomer | null;
  onCreated?: (customer: LsCustomer) => void;
}) {
  const [isPending, startTransition] = useTransition();

  const isEditing = !!customer;

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      try {
        if (isEditing) {
          await updateLsCustomer(customer.id, formData);
          toast.success("Cliente atualizado");
        } else {
          const created = await createLsCustomer(formData);
          toast.success("Cliente cadastrado");
          onCreated?.(created);
        }
        onOpenChange(false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro ao salvar cliente");
      }
    });
  }

  function handleDelete() {
    if (!customer) return;
    if (!confirm("Excluir este cliente?")) return;

    startTransition(async () => {
      try {
        await deleteLsCustomer(customer.id);
        toast.success("Cliente excluído");
        onOpenChange(false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro ao excluir cliente");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar cliente" : "Novo cliente"}</DialogTitle>
          <DialogDescription>
            Cadastre o cliente para poder vincular vendas a ele e preencher o
            recibo automaticamente.
          </DialogDescription>
        </DialogHeader>

        <form action={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Nome</Label>
            <Input
              id="name"
              name="name"
              required
              placeholder="Ex: João da Silva"
              defaultValue={customer?.name ?? ""}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="cpf">CPF</Label>
            <Input
              id="cpf"
              name="cpf"
              required
              placeholder="000.000.000-00"
              defaultValue={customer?.cpf ?? ""}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="phone">Telefone (opcional)</Label>
            <Input
              id="phone"
              name="phone"
              placeholder="(00) 00000-0000"
              defaultValue={customer?.phone ?? ""}
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
              {isEditing ? "Salvar alterações" : "Cadastrar cliente"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
