"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CfMotoProductFormDialog } from "./cf-moto-product-form-dialog";
import type { CfMotoProduct } from "@/lib/types";

export function CfMotosProdutosView({ products }: { products: CfMotoProduct[] }) {
  const [open, setOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<CfMotoProduct | null>(null);
  const [search, setSearch] = useState("");

  function openNew() {
    setEditingProduct(null);
    setOpen(true);
  }

  function openEdit(product: CfMotoProduct) {
    setEditingProduct(product);
    setOpen(true);
  }

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return products;

    return products.filter(
      (product) =>
        product.name.toLowerCase().includes(query) || product.sku.toLowerCase().includes(query),
    );
  }, [products, search]);

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold md:text-2xl">CF Motos · Produtos</h1>
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
            <CardContent className="flex flex-col gap-2 py-4">
              <Label htmlFor="filter_search">Produto ou SKU</Label>
              <Input
                id="filter_search"
                placeholder="Buscar por nome ou SKU"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
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
                <CardContent className="flex items-center justify-between py-4">
                  <span className="text-sm font-medium">{product.name}</span>
                  <span className="text-sm text-muted-foreground">{product.sku}</span>
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.map((product) => (
                  <TableRow
                    key={product.id}
                    className="cursor-pointer"
                    onClick={() => openEdit(product)}
                  >
                    <TableCell>{product.name}</TableCell>
                    <TableCell>{product.sku}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      <CfMotoProductFormDialog open={open} onOpenChange={setOpen} product={editingProduct} />
    </div>
  );
}
