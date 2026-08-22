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
import { BrandFormDialog } from "./brand-form-dialog";
import type { LsBrand } from "@/lib/types";

export function MarcasView({ brands }: { brands: LsBrand[] }) {
  const [open, setOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<LsBrand | null>(null);
  const [search, setSearch] = useState("");

  function openNew() {
    setEditingBrand(null);
    setOpen(true);
  }

  function openEdit(brand: LsBrand) {
    setEditingBrand(brand);
    setOpen(true);
  }

  const filteredBrands = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return brands;

    return brands.filter((brand) => brand.name.toLowerCase().includes(query));
  }, [brands, search]);

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold md:text-2xl">Auto Peças LS · Marcas</h1>
        <Button onClick={openNew}>
          <Plus className="size-4" />
          Nova marca
        </Button>
      </div>

      {brands.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Nenhuma marca cadastrada ainda.
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Filtro */}
          <Card>
            <CardContent className="flex flex-col gap-2 py-4">
              <Label htmlFor="filter_search">Nome</Label>
              <Input
                id="filter_search"
                placeholder="Buscar por nome"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="uppercase placeholder:normal-case"
              />
            </CardContent>
          </Card>

          {filteredBrands.length === 0 && (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                Nenhuma marca encontrada para a busca.
              </CardContent>
            </Card>
          )}

          {/* Mobile: cards */}
          <div className="flex flex-col gap-3 md:hidden">
            {filteredBrands.map((brand) => (
              <Card key={brand.id} className="cursor-pointer" onClick={() => openEdit(brand)}>
                <CardContent className="py-4">
                  <span className="text-sm font-medium">{brand.name}</span>
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBrands.map((brand) => (
                  <TableRow key={brand.id} className="cursor-pointer" onClick={() => openEdit(brand)}>
                    <TableCell>{brand.name}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      <BrandFormDialog open={open} onOpenChange={setOpen} brand={editingBrand} />
    </div>
  );
}
