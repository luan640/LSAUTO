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
import { createLsBrand, updateLsBrand, deleteLsBrand } from "@/app/(app)/marcas/actions";
import type { LsBrand } from "@/lib/types";

export function BrandFormDialog({
  open,
  onOpenChange,
  brand,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brand: LsBrand | null;
  onCreated?: (brand: LsBrand) => void;
}) {
  const [isPending, startTransition] = useTransition();

  const isEditing = !!brand;

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      try {
        if (isEditing) {
          await updateLsBrand(brand.id, formData);
          toast.success("Marca atualizada");
        } else {
          const created = await createLsBrand(formData);
          toast.success("Marca cadastrada");
          onCreated?.(created);
        }
        onOpenChange(false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro ao salvar marca");
      }
    });
  }

  function handleDelete() {
    if (!brand) return;
    if (!confirm("Excluir esta marca?")) return;

    startTransition(async () => {
      try {
        await deleteLsBrand(brand.id);
        toast.success("Marca excluída");
        onOpenChange(false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro ao excluir marca");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar marca" : "Nova marca"}</DialogTitle>
          <DialogDescription>
            Cadastre as marcas usadas nos produtos da Auto Peças LS.
          </DialogDescription>
        </DialogHeader>

        <form action={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Nome</Label>
            <Input
              id="name"
              name="name"
              required
              placeholder="Ex: Bosch"
              defaultValue={brand?.name ?? ""}
              className="uppercase placeholder:normal-case"
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
              {isEditing ? "Salvar alterações" : "Cadastrar marca"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
