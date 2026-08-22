"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
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
  Combobox,
  ComboboxContent,
  ComboboxInput,
  ComboboxInputGroup,
  ComboboxItem,
  ComboboxTrigger,
} from "@/components/ui/combobox";
import { BrandFormDialog } from "@/components/marcas/brand-form-dialog";
import { createLsProduct, updateLsProduct, setLsProductActive } from "@/app/(app)/produtos/actions";
import type { LsBrand, LsProduct } from "@/lib/types";

type BrandOption = { value: string; label: string };

const NO_BRAND_OPTION: BrandOption = { value: "", label: "Nenhuma marca selecionada" };

function brandToOption(brand: LsBrand): BrandOption {
  return { value: brand.id, label: brand.name };
}

export function ProductFormDialog({
  open,
  onOpenChange,
  product,
  brandOptions = [],
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: LsProduct | null;
  brandOptions?: LsBrand[];
}) {
  const [isPending, startTransition] = useTransition();
  const [newBrandDialogOpen, setNewBrandDialogOpen] = useState(false);

  const isEditing = !!product;

  const brandSelectOptions = useMemo<BrandOption[]>(
    () => [NO_BRAND_OPTION, ...brandOptions.map(brandToOption)],
    [brandOptions],
  );

  function initialBrand(): BrandOption {
    if (product?.brand) return brandToOption(product.brand);
    const found = product?.brand_id
      ? brandOptions.find((b) => b.id === product.brand_id)
      : undefined;
    return found ? brandToOption(found) : NO_BRAND_OPTION;
  }

  const [brand, setBrand] = useState<BrandOption>(initialBrand);

  const syncKey = open ? `open-${product?.id ?? "new"}` : "closed";
  const [lastSyncKey, setLastSyncKey] = useState(syncKey);
  if (syncKey !== lastSyncKey) {
    setLastSyncKey(syncKey);
    if (open) {
      setBrand(initialBrand());
    }
  }

  function handleSubmit(formData: FormData) {
    formData.set("brand_id", brand.value);

    startTransition(async () => {
      try {
        if (isEditing) {
          await updateLsProduct(product.id, formData);
          toast.success("Produto atualizado");
        } else {
          await createLsProduct(formData);
          toast.success("Produto cadastrado");
        }
        onOpenChange(false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro ao salvar produto");
      }
    });
  }

  function handleToggleActive() {
    if (!product) return;
    const nextActive = !product.active;
    if (!nextActive && !confirm("Desativar este produto? Ele deixa de aparecer nas vendas.")) return;

    startTransition(async () => {
      try {
        await setLsProductActive(product.id, nextActive);
        toast.success(nextActive ? "Produto ativado" : "Produto desativado");
        onOpenChange(false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro ao atualizar produto");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isEditing ? "Editar produto" : "Novo produto"}
            {isEditing && !product.active && (
              <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
                Inativo
              </span>
            )}
          </DialogTitle>
          <DialogDescription>
            Cadastre os produtos usados no estoque da Auto Peças LS.
          </DialogDescription>
        </DialogHeader>

        <form action={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Nome</Label>
            <Input
              id="name"
              name="name"
              required
              placeholder="Ex: Filtro de óleo"
              defaultValue={product?.name ?? ""}
              className="uppercase placeholder:normal-case"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="sku">SKU</Label>
            <Input
              id="sku"
              name="sku"
              required
              placeholder="Ex: FO-001"
              defaultValue={product?.sku ?? ""}
              className="uppercase placeholder:normal-case"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label>Marca (opcional)</Label>
            <div className="flex gap-2">
              <Combobox
                items={brandSelectOptions}
                value={brand}
                onValueChange={(value) => setBrand(value ?? NO_BRAND_OPTION)}
                autoHighlight
              >
                <ComboboxInputGroup className="flex-1">
                  <ComboboxInput placeholder="Buscar por nome" />
                  <ComboboxTrigger />
                </ComboboxInputGroup>
                <ComboboxContent>
                  {(option: BrandOption) => (
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
                onClick={() => setNewBrandDialogOpen(true)}
                aria-label="Nova marca"
              >
                <Plus className="size-4" />
              </Button>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:justify-between">
            {isEditing ? (
              <Button
                type="button"
                variant={product.active ? "destructive" : "outline"}
                onClick={handleToggleActive}
                disabled={isPending}
              >
                {product.active ? "Desativar" : "Ativar"}
              </Button>
            ) : (
              <span />
            )}
            <Button type="submit" disabled={isPending}>
              {isEditing ? "Salvar alterações" : "Cadastrar produto"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>

      <BrandFormDialog
        open={newBrandDialogOpen}
        onOpenChange={setNewBrandDialogOpen}
        brand={null}
        onCreated={(created) => setBrand(brandToOption(created))}
      />
    </Dialog>
  );
}
