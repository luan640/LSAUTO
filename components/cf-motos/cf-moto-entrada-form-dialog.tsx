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
import { DateInput } from "@/components/ui/date-input";
import { Label } from "@/components/ui/label";
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
  createCfMotoStockEntry,
  updateCfMotoStockEntry,
  deleteCfMotoStockEntry,
  createCfMotoSupplier,
} from "@/app/(app)/cf-motos/entradas/actions";
import type { CfMotoProduct, CfMotoStockEntry, CfMotoSupplier } from "@/lib/types";

const NO_SUPPLIER = "none";

type ProductOption = { value: string; label: string };

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function CfMotoEntradaFormDialog({
  open,
  onOpenChange,
  entry,
  products,
  suppliers,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry: CfMotoStockEntry | null;
  products: CfMotoProduct[];
  suppliers: CfMotoSupplier[];
}) {
  const [isPending, startTransition] = useTransition();
  const [isCreatingSupplier, startSupplierTransition] = useTransition();
  const [supplierId, setSupplierId] = useState(entry?.supplier_id ?? NO_SUPPLIER);
  const [extraSuppliers, setExtraSuppliers] = useState<CfMotoSupplier[]>([]);
  const [showNewSupplier, setShowNewSupplier] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState("");
  const [newSupplierContact, setNewSupplierContact] = useState("");

  const productItems = useMemo<ProductOption[]>(
    () => products.map((product) => ({ value: product.id, label: `${product.name} · ${product.sku}` })),
    [products],
  );
  const [productValue, setProductValue] = useState<ProductOption | null>(
    () => productItems.find((item) => item.value === entry?.product_id) ?? null,
  );

  const syncKey = open ? `open-${entry?.id ?? "new"}` : "closed";
  const [lastSyncKey, setLastSyncKey] = useState(syncKey);
  if (syncKey !== lastSyncKey) {
    setLastSyncKey(syncKey);
    if (open) {
      setSupplierId(entry?.supplier_id ?? NO_SUPPLIER);
      setExtraSuppliers([]);
      setShowNewSupplier(false);
      setNewSupplierName("");
      setNewSupplierContact("");
      setProductValue(productItems.find((item) => item.value === entry?.product_id) ?? null);
    }
  }

  const isEditing = !!entry;
  const supplierOptions = [...suppliers, ...extraSuppliers];
  const supplierSelectItems = [
    { value: NO_SUPPLIER, label: "Nenhum" },
    ...supplierOptions.map((supplier) => ({ value: supplier.id, label: supplier.name })),
  ];

  function handleCreateSupplier() {
    if (!newSupplierName.trim()) {
      toast.error("Informe o nome do fornecedor");
      return;
    }

    startSupplierTransition(async () => {
      try {
        const formData = new FormData();
        formData.set("name", newSupplierName.trim());
        formData.set("contact", newSupplierContact.trim());
        const created = await createCfMotoSupplier(formData);
        setExtraSuppliers((current) => [...current, created as CfMotoSupplier]);
        setSupplierId((created as CfMotoSupplier).id);
        setShowNewSupplier(false);
        setNewSupplierName("");
        setNewSupplierContact("");
        toast.success("Fornecedor cadastrado");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro ao cadastrar fornecedor");
      }
    });
  }

  function handleSubmit(formData: FormData) {
    formData.set("supplier_id", supplierId === NO_SUPPLIER ? "" : supplierId);

    startTransition(async () => {
      try {
        if (isEditing) {
          await updateCfMotoStockEntry(entry.id, formData);
          toast.success("Entrada atualizada");
        } else {
          await createCfMotoStockEntry(formData);
          toast.success("Entrada registrada");
        }
        onOpenChange(false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro ao salvar entrada");
      }
    });
  }

  function handleDelete() {
    if (!entry) return;
    if (!confirm("Excluir esta entrada?")) return;

    startTransition(async () => {
      try {
        await deleteCfMotoStockEntry(entry.id);
        toast.success("Entrada excluída");
        onOpenChange(false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro ao excluir entrada");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar entrada" : "Nova entrada"}</DialogTitle>
          <DialogDescription>
            Registre a entrada de um item no estoque da CF Motos.
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
                defaultValue={entry?.quantity ?? ""}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="unit_value">Valor unitário (R$)</Label>
              <Input
                id="unit_value"
                name="unit_value"
                type="number"
                step="0.01"
                min="0"
                required
                defaultValue={entry?.unit_value ?? ""}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="entry_date">Data da entrada</Label>
            <DateInput
              id="entry_date"
              name="entry_date"
              required
              defaultValue={entry?.entry_date ?? todayISO()}
            />
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="supplier_id">Fornecedor</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowNewSupplier((current) => !current)}
              >
                <Plus className="size-4" />
                Novo fornecedor
              </Button>
            </div>
            <Select
              items={supplierSelectItems}
              value={supplierId}
              onValueChange={(value) => setSupplierId(value ?? NO_SUPPLIER)}
            >
              <SelectTrigger className="w-full" id="supplier_id">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_SUPPLIER}>Nenhum</SelectItem>
                {supplierOptions.map((supplier) => (
                  <SelectItem key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {showNewSupplier && (
              <div className="flex flex-col gap-2 rounded-md border p-3">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="new_supplier_name">Nome do fornecedor</Label>
                  <Input
                    id="new_supplier_name"
                    value={newSupplierName}
                    onChange={(e) => setNewSupplierName(e.target.value)}
                    placeholder="Ex: Distribuidora XYZ"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="new_supplier_contact">Contato (opcional)</Label>
                  <Input
                    id="new_supplier_contact"
                    value={newSupplierContact}
                    onChange={(e) => setNewSupplierContact(e.target.value)}
                    placeholder="Telefone ou e-mail"
                  />
                </div>
                <Button
                  type="button"
                  size="sm"
                  className="self-end"
                  disabled={isCreatingSupplier}
                  onClick={handleCreateSupplier}
                >
                  Salvar fornecedor
                </Button>
              </div>
            )}
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
              {isEditing ? "Salvar alterações" : "Registrar entrada"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
