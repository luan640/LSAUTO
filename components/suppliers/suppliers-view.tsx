"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { SupplierFormDialog } from "./supplier-form-dialog";
import type { SupplierAccess } from "@/lib/types";

export function SuppliersView({ suppliers }: { suppliers: SupplierAccess[] }) {
  const [open, setOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<SupplierAccess | null>(null);

  function openNew() {
    setEditingSupplier(null);
    setOpen(true);
  }

  function openEdit(supplier: SupplierAccess) {
    setEditingSupplier(supplier);
    setOpen(true);
  }

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold md:text-2xl">Acessos fornecedores</h1>
        <Button onClick={openNew}>
          <Plus className="size-4" />
          Novo fornecedor
        </Button>
      </div>

      {suppliers.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Nenhum fornecedor cadastrado ainda.
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Mobile: cards */}
          <div className="flex flex-col gap-3 md:hidden">
            {suppliers.map((supplier) => (
              <Card
                key={supplier.id}
                className="cursor-pointer"
                onClick={() => openEdit(supplier)}
              >
                <CardContent className="flex flex-col gap-1 py-4">
                  <span className="text-sm font-medium">{supplier.name}</span>
                  {supplier.ecommerce_url && (
                    <a
                      href={supplier.ecommerce_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="truncate text-sm text-primary underline-offset-2 hover:underline"
                    >
                      {supplier.ecommerce_url}
                    </a>
                  )}
                  <div className="flex flex-wrap gap-x-4 text-sm text-muted-foreground">
                    <span>Login: {supplier.login || "-"}</span>
                    <span>Senha: {supplier.password || "-"}</span>
                  </div>
                  {supplier.notes && (
                    <p className="line-clamp-2 text-sm text-muted-foreground">
                      {supplier.notes}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Desktop: table */}
          <div className="hidden rounded-md border md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fornecedor</TableHead>
                  <TableHead>Link do e-commerce</TableHead>
                  <TableHead>Login</TableHead>
                  <TableHead>Senha</TableHead>
                  <TableHead>Observações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {suppliers.map((supplier) => (
                  <TableRow
                    key={supplier.id}
                    className="cursor-pointer"
                    onClick={() => openEdit(supplier)}
                  >
                    <TableCell>{supplier.name}</TableCell>
                    <TableCell className="max-w-[280px] truncate">
                      {supplier.ecommerce_url ? (
                        <a
                          href={supplier.ecommerce_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-primary underline-offset-2 hover:underline"
                        >
                          {supplier.ecommerce_url}
                        </a>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell>{supplier.login || "-"}</TableCell>
                    <TableCell>{supplier.password || "-"}</TableCell>
                    <TableCell className="max-w-[240px] truncate">
                      {supplier.notes || "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      <SupplierFormDialog open={open} onOpenChange={setOpen} supplier={editingSupplier} />
    </div>
  );
}
