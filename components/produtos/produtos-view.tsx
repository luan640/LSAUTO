"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ProductFormDialog } from "./product-form-dialog";
import type { LsBrand, LsProduct } from "@/lib/types";

export function ProdutosView({
  products,
  brandOptions = [],
}: {
  products: LsProduct[];
  brandOptions?: LsBrand[];
}) {
  const [open, setOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<LsProduct | null>(null);
  const [search, setSearch] = useState("");
  const [hideInactive, setHideInactive] = useState(false);

  function openNew() {
    setEditingProduct(null);
    setOpen(true);
  }

  function openEdit(product: LsProduct) {
    setEditingProduct(product);
    setOpen(true);
  }

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();

    return products.filter((product) => {
      if (hideInactive && !product.active) return false;
      if (!query) return true;
      return (
        product.name.toLowerCase().includes(query) ||
        product.sku.toLowerCase().includes(query) ||
        (product.brand?.name ?? "").toLowerCase().includes(query)
      );
    });
  }, [products, search, hideInactive]);

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold md:text-2xl">Auto Peças LS · Produtos</h1>
        <Button onClick={openNew}>
          <Plus className="size-4" />
          Novo produto
        </Button>
      </div>

      {products.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Nenhum produto cadastrado ainda.
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Filtro */}
          <Card>
            <CardContent className="flex flex-col gap-4 py-4 md:flex-row md:items-end md:justify-between">
              <div className="flex flex-col gap-2">
                <Label htmlFor="filter_search">Produto, SKU ou marca</Label>
                <Input
                  id="filter_search"
                  placeholder="Buscar por nome, SKU ou marca"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <label
                htmlFor="filter_hide_inactive"
                className="flex items-center gap-2 text-sm font-medium cursor-pointer"
              >
                <Checkbox
                  id="filter_hide_inactive"
                  checked={hideInactive}
                  onCheckedChange={setHideInactive}
                />
                Ocultar produtos inativos
              </label>
            </CardContent>
          </Card>

          {filteredProducts.length === 0 && (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                Nenhum produto encontrado para a busca.
              </CardContent>
            </Card>
          )}

          {/* Mobile: cards */}
          <div className="flex flex-col gap-3 md:hidden">
            {filteredProducts.map((product) => (
              <Card
                key={product.id}
                className="cursor-pointer"
                onClick={() => openEdit(product)}
              >
                <CardContent className={cn("flex flex-col gap-1 py-4", !product.active && "opacity-60")}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{product.name}</span>
                    <span className="text-sm text-muted-foreground">{product.sku}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      {product.brand?.name ?? "—"}
                    </span>
                    {!product.active && (
                      <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
                        Inativo
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Desktop: table */}
          <div className="hidden rounded-md border md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Marca</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.map((product) => (
                  <TableRow
                    key={product.id}
                    className={cn("cursor-pointer", !product.active && "opacity-60")}
                    onClick={() => openEdit(product)}
                  >
                    <TableCell>{product.name}</TableCell>
                    <TableCell>{product.sku}</TableCell>
                    <TableCell>{product.brand?.name ?? "—"}</TableCell>
                    <TableCell>
                      {product.active ? (
                        "Ativo"
                      ) : (
                        <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
                          Inativo
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      <ProductFormDialog
        open={open}
        onOpenChange={setOpen}
        product={editingProduct}
        brandOptions={brandOptions}
      />
    </div>
  );
}
