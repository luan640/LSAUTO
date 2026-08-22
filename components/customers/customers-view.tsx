"use client";

import { useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
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
import { CustomerFormDialog } from "./customer-form-dialog";
import type { LsCustomer } from "@/lib/types";

function formatDateTime(isoDate: string) {
  return format(parseISO(isoDate), "dd/MM/yyyy HH:mm", { locale: ptBR });
}

export function CustomersView({ customers }: { customers: LsCustomer[] }) {
  const [open, setOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<LsCustomer | null>(null);
  const [search, setSearch] = useState("");

  function openNew() {
    setEditingCustomer(null);
    setOpen(true);
  }

  function openEdit(customer: LsCustomer) {
    setEditingCustomer(customer);
    setOpen(true);
  }

  const filteredCustomers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return customers;

    return customers.filter(
      (customer) =>
        customer.name.toLowerCase().includes(query) || customer.cpf.toLowerCase().includes(query),
    );
  }, [customers, search]);

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold md:text-2xl">Auto Peças LS · Clientes</h1>
        <Button onClick={openNew}>
          <Plus className="size-4" />
          Novo cliente
        </Button>
      </div>

      {customers.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Nenhum cliente cadastrado ainda.
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Filtro */}
          <Card>
            <CardContent className="flex flex-col gap-2 py-4">
              <Label htmlFor="filter_search">Nome ou CPF</Label>
              <Input
                id="filter_search"
                placeholder="Buscar por nome ou CPF"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </CardContent>
          </Card>

          {filteredCustomers.length === 0 && (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                Nenhum cliente encontrado para a busca.
              </CardContent>
            </Card>
          )}

          {/* Mobile: cards */}
          <div className="flex flex-col gap-3 md:hidden">
            {filteredCustomers.map((customer) => (
              <Card
                key={customer.id}
                className="cursor-pointer"
                onClick={() => openEdit(customer)}
              >
                <CardContent className="flex flex-col gap-1 py-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{customer.name}</span>
                    <span className="text-sm text-muted-foreground">{customer.cpf}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>{customer.phone || "—"}</span>
                    <span>{formatDateTime(customer.created_at)}</span>
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
                  <TableHead>CPF</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Cadastrado em</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCustomers.map((customer) => (
                  <TableRow
                    key={customer.id}
                    className="cursor-pointer"
                    onClick={() => openEdit(customer)}
                  >
                    <TableCell>{customer.name}</TableCell>
                    <TableCell>{customer.cpf}</TableCell>
                    <TableCell>{customer.phone || "—"}</TableCell>
                    <TableCell>{formatDateTime(customer.created_at)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      <CustomerFormDialog open={open} onOpenChange={setOpen} customer={editingCustomer} />
    </div>
  );
}
