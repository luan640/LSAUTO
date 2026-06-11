"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DateInput } from "@/components/ui/date-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency, formatDate, formatPercent, profitMargin } from "@/lib/format";
import { SaleFormDialog } from "./sale-form-dialog";
import { PAYMENT_METHODS, type Sale } from "@/lib/types";

const ALL_PAYMENT_METHODS = "todos";

export function SalesView({ sales }: { sales: Sale[] }) {
  const [open, setOpen] = useState(false);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<string>(ALL_PAYMENT_METHODS);
  const [product, setProduct] = useState("");

  function openNew() {
    setEditingSale(null);
    setOpen(true);
  }

  function openEdit(sale: Sale) {
    setEditingSale(sale);
    setOpen(true);
  }

  const filteredSales = useMemo(() => {
    const productQuery = product.trim().toLowerCase();

    return sales.filter((sale) => {
      if (dateFrom && sale.sale_date < dateFrom) return false;
      if (dateTo && sale.sale_date > dateTo) return false;
      if (paymentMethod !== ALL_PAYMENT_METHODS && sale.payment_method !== paymentMethod) {
        return false;
      }
      if (productQuery && !sale.products.toLowerCase().includes(productQuery)) {
        return false;
      }
      return true;
    });
  }, [sales, dateFrom, dateTo, paymentMethod, product]);

  const totalProfit = filteredSales.reduce(
    (acc, sale) => acc + (sale.sale_value - sale.cost),
    0,
  );

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold md:text-2xl">Vendas</h1>
        <Button onClick={openNew}>
          <Plus className="size-4" />
          Nova Venda
        </Button>
      </div>

      {sales.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Nenhuma venda registrada ainda.
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardContent className="grid grid-cols-2 gap-3 py-4 md:grid-cols-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="filter_date_from">De</Label>
                <DateInput id="filter_date_from" onValueChange={setDateFrom} />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="filter_date_to">Até</Label>
                <DateInput id="filter_date_to" onValueChange={setDateTo} />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="filter_payment">Pagamento</Label>
                <Select
                  value={paymentMethod}
                  onValueChange={(value) => setPaymentMethod(value ?? ALL_PAYMENT_METHODS)}
                >
                  <SelectTrigger id="filter_payment" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_PAYMENT_METHODS}>Todos</SelectItem>
                    {PAYMENT_METHODS.map((method) => (
                      <SelectItem key={method} value={method}>
                        {method}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="filter_product">Produto</Label>
                <Input
                  id="filter_product"
                  placeholder="Buscar produto"
                  value={product}
                  onChange={(e) => setProduct(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Mobile: cards */}
          <div className="flex items-center justify-between md:hidden">
            <span className="text-sm font-medium text-muted-foreground">
              Lucro total
            </span>
            <span className="text-base font-semibold">
              {formatCurrency(totalProfit)}
            </span>
          </div>
          {filteredSales.length === 0 && (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                Nenhuma venda encontrada para os filtros selecionados.
              </CardContent>
            </Card>
          )}
          <div className="flex flex-col gap-3 md:hidden">
            {filteredSales.map((sale) => (
              <Card
                key={sale.id}
                className="cursor-pointer"
                onClick={() => openEdit(sale)}
              >
                <CardContent className="flex flex-col gap-2 py-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      {formatDate(sale.sale_date)}
                    </span>
                    <span className="text-base font-semibold">
                      {formatCurrency(sale.sale_value)}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">{sale.payment_method}</Badge>
                    <Badge variant="outline">
                      {sale.delivery_type === "frete" ? "Frete" : "Retirada"}
                    </Badge>
                    <span className="ml-auto text-sm text-muted-foreground">
                      Custo: {formatCurrency(sale.cost)}
                    </span>
                    <Badge variant="outline">
                      {formatPercent(profitMargin(sale.sale_value, sale.cost))}
                    </Badge>
                  </div>
                  {sale.products && (
                    <p className="line-clamp-2 text-sm text-muted-foreground">
                      {sale.products}
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
                  <TableHead>Data</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Pagamento</TableHead>
                  <TableHead>Entrega</TableHead>
                  <TableHead>Custo</TableHead>
                  <TableHead>Lucro</TableHead>
                  <TableHead>% Lucro</TableHead>
                  <TableHead>Produtos</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSales.map((sale) => (
                  <TableRow
                    key={sale.id}
                    className="cursor-pointer"
                    onClick={() => openEdit(sale)}
                  >
                    <TableCell>{formatDate(sale.sale_date)}</TableCell>
                    <TableCell>{formatCurrency(sale.sale_value)}</TableCell>
                    <TableCell>{sale.payment_method}</TableCell>
                    <TableCell>
                      {sale.delivery_type === "frete" ? "Frete" : "Retirada"}
                    </TableCell>
                    <TableCell>{formatCurrency(sale.cost)}</TableCell>
                    <TableCell>
                      {formatCurrency(sale.sale_value - sale.cost)}
                    </TableCell>
                    <TableCell>
                      {formatPercent(profitMargin(sale.sale_value, sale.cost))}
                    </TableCell>
                    <TableCell className="max-w-[240px] truncate">
                      {sale.products}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={5}>Total</TableCell>
                  <TableCell>{formatCurrency(totalProfit)}</TableCell>
                  <TableCell colSpan={2} />
                </TableRow>
              </TableFooter>
            </Table>
          </div>
        </>
      )}

      <SaleFormDialog open={open} onOpenChange={setOpen} sale={editingSale} />
    </div>
  );
}
