"use client";

import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Filter, Loader2, Plus, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DateInput } from "@/components/ui/date-input";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
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
import { formatCurrency, formatDate, formatPercent, profitMargin, salesMargin } from "@/lib/format";
import { buildReceiptNumberMap } from "@/lib/receipt/receipt-number";
import { renderNodeToPdf } from "@/lib/receipt/render-node-to-pdf";
import { SaleFormDialog } from "./sale-form-dialog";
import { SaleReceiptTemplate } from "./sale-receipt-template";
import {
  PAYMENT_METHODS,
  type LsCustomer,
  type LsSaleItem,
  type LsStockSummary,
  type Sale,
} from "@/lib/types";

const ALL_PAYMENT_METHODS = "todos";

function currentMonthRange() {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const toIso = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return { from: toIso(from), to: toIso(to) };
}

function StatusBadge({ status }: { status: Sale["status"] }) {
  return (
    <Badge variant={status === "cancelado" ? "destructive" : "default"}>
      {status === "cancelado" ? "Cancelado" : "Finalizado"}
    </Badge>
  );
}

export function SalesView({
  sales,
  stockOptions,
  saleItems,
  customerOptions,
}: {
  sales: Sale[];
  stockOptions: LsStockSummary[];
  saleItems: LsSaleItem[];
  customerOptions: LsCustomer[];
}) {
  const [open, setOpen] = useState(false);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const defaultRange = useMemo(() => currentMonthRange(), []);
  const [dateFrom, setDateFrom] = useState(defaultRange.from);
  const [dateTo, setDateTo] = useState(defaultRange.to);
  const [paymentMethod, setPaymentMethod] = useState<string>(ALL_PAYMENT_METHODS);
  const [product, setProduct] = useState("");
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [exportingSale, setExportingSale] = useState<Sale | null>(null);
  const receiptRef = useRef<HTMLDivElement>(null);

  const receiptNumberBySaleId = useMemo(() => buildReceiptNumberMap(sales), [sales]);

  function openNew() {
    setEditingSale(null);
    setOpen(true);
  }

  function openEdit(sale: Sale) {
    setEditingSale(sale);
    setOpen(true);
  }

  async function handleEmitReceipt(sale: Sale) {
    setExportingSale(sale);
    // Espera o template do recibo (fora da tela) renderizar com os dados da
    // venda antes de capturar — dois rAF garantem que o commit já pintou.
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    );

    try {
      if (!receiptRef.current) {
        throw new Error("Não foi possível montar o recibo");
      }
      const receiptNumber = receiptNumberBySaleId.get(sale.id) ?? "00000";
      await renderNodeToPdf(receiptRef.current, `recibo-venda-${receiptNumber}.pdf`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao gerar o recibo");
    } finally {
      setExportingSale(null);
    }
  }

  const editingSaleItems = useMemo(
    () => saleItems.filter((item) => item.sale_id === editingSale?.id),
    [saleItems, editingSale],
  );

  const exportingSaleItems = useMemo(
    () => saleItems.filter((item) => item.sale_id === exportingSale?.id),
    [saleItems, exportingSale],
  );

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

  const countedSales = useMemo(
    () => filteredSales.filter((sale) => sale.status !== "cancelado"),
    [filteredSales],
  );

  const totalProfit = countedSales.reduce(
    (acc, sale) => acc + (sale.sale_value - sale.cost),
    0,
  );

  const totalValue = countedSales.reduce((acc, sale) => acc + sale.sale_value, 0);

  const totalDiscount = countedSales.reduce((acc, sale) => acc + (sale.discount ?? 0), 0);

  const totalCost = countedSales.reduce((acc, sale) => acc + sale.cost, 0);

  const avgProfitMargin = countedSales.length
    ? countedSales.reduce(
        (acc, sale) => acc + profitMargin(sale.sale_value, sale.cost),
        0,
      ) / countedSales.length
    : 0;

  const avgSalesMargin = countedSales.length
    ? countedSales.reduce(
        (acc, sale) => acc + salesMargin(sale.sale_value, sale.cost),
        0,
      ) / countedSales.length
    : 0;

  const activeFiltersCount = [
    dateFrom !== defaultRange.from ? dateFrom : "",
    dateTo !== defaultRange.to ? dateTo : "",
    paymentMethod !== ALL_PAYMENT_METHODS ? paymentMethod : "",
    product,
  ].filter(Boolean).length;

  const [filterResetKey, setFilterResetKey] = useState(0);

  function clearFilters() {
    setDateFrom(defaultRange.from);
    setDateTo(defaultRange.to);
    setPaymentMethod(ALL_PAYMENT_METHODS);
    setProduct("");
    setFilterResetKey((key) => key + 1);
  }

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
          {/* Filtros: desktop inline */}
          <Card className="hidden md:block">
            <CardContent className="grid grid-cols-2 gap-3 py-4 md:grid-cols-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="filter_date_from">De</Label>
                <DateInput
                  key={`from-${filterResetKey}`}
                  id="filter_date_from"
                  defaultValue={dateFrom}
                  onValueChange={setDateFrom}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="filter_date_to">Até</Label>
                <DateInput
                  key={`to-${filterResetKey}`}
                  id="filter_date_to"
                  defaultValue={dateTo}
                  onValueChange={setDateTo}
                />
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

          {/* Mobile: lucro total + filtro */}
          <div className="flex items-center justify-between md:hidden">
            <span className="text-sm font-medium text-muted-foreground">
              Lucro total
            </span>
            <div className="flex items-center gap-3">
              <span className="text-base font-semibold">
                {formatCurrency(totalProfit)}
              </span>
              <Sheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
                <SheetTrigger
                  render={<Button variant="outline" size="icon" className="relative" />}
                >
                  <Filter className="size-4" />
                  {activeFiltersCount > 0 && (
                    <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
                      {activeFiltersCount}
                    </span>
                  )}
                  <span className="sr-only">Filtros</span>
                </SheetTrigger>
                <SheetContent side="bottom" className="rounded-t-xl" showCloseButton={false}>
                  <SheetHeader className="flex-row items-center justify-between">
                    <Button variant="link" className="px-0 text-destructive" onClick={clearFilters}>
                      Limpar
                    </Button>
                    <SheetTitle>Filtros</SheetTitle>
                    <SheetClose render={<Button variant="ghost" size="sm" className="px-0" />}>
                      Fechar
                    </SheetClose>
                  </SheetHeader>
                  <div className="flex flex-col gap-4 px-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex flex-col gap-2">
                        <Label htmlFor="filter_date_from_mobile">De</Label>
                        <DateInput
                          key={`from-mobile-${filterResetKey}`}
                          id="filter_date_from_mobile"
                          defaultValue={dateFrom}
                          onValueChange={setDateFrom}
                        />
                      </div>
                      <div className="flex flex-col gap-2">
                        <Label htmlFor="filter_date_to_mobile">Até</Label>
                        <DateInput
                          key={`to-mobile-${filterResetKey}`}
                          id="filter_date_to_mobile"
                          defaultValue={dateTo}
                          onValueChange={setDateTo}
                        />
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="filter_payment_mobile">Pagamento</Label>
                      <Select
                        value={paymentMethod}
                        onValueChange={(value) => setPaymentMethod(value ?? ALL_PAYMENT_METHODS)}
                      >
                        <SelectTrigger id="filter_payment_mobile" className="w-full">
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
                      <Label htmlFor="filter_product_mobile">Produto</Label>
                      <Input
                        id="filter_product_mobile"
                        placeholder="Buscar produto"
                        value={product}
                        onChange={(e) => setProduct(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="p-4 pt-0">
                    <SheetClose render={<Button className="w-full" />}>
                      Aplicar{activeFiltersCount > 0 ? ` (${activeFiltersCount})` : ""}
                    </SheetClose>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
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
                <CardContent className="flex flex-col gap-3 py-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      {formatDate(sale.sale_date)}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-base font-semibold">
                        {formatCurrency(sale.sale_value)}
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        aria-label="Emitir recibo"
                        disabled={exportingSale?.id === sale.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEmitReceipt(sale);
                        }}
                      >
                        {exportingSale?.id === sale.id ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Receipt className="size-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                  {sale.customer?.name && (
                    <span className="text-sm text-muted-foreground">{sale.customer.name}</span>
                  )}
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{sale.payment_method}</Badge>
                    <Badge variant="outline">
                      {sale.delivery_type === "frete" ? "Frete" : "Retirada"}
                    </Badge>
                    <StatusBadge status={sale.status} />
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs text-muted-foreground">Desconto</span>
                      <span>{sale.discount ? formatCurrency(sale.discount) : "—"}</span>
                    </div>
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs text-muted-foreground">Custo</span>
                      <span>{formatCurrency(sale.cost)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs text-muted-foreground">Lucro</span>
                      <span>{formatCurrency(sale.sale_value - sale.cost)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs text-muted-foreground">% Markup</span>
                      <span>{formatPercent(profitMargin(sale.sale_value, sale.cost))}</span>
                    </div>
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs text-muted-foreground">% Margem</span>
                      <span>{formatPercent(salesMargin(sale.sale_value, sale.cost))}</span>
                    </div>
                  </div>
                  {sale.products && (
                    <p className="line-clamp-2 text-sm text-muted-foreground">
                      {sale.products}
                    </p>
                  )}
                  {sale.notes && (
                    <p className="line-clamp-2 text-sm text-muted-foreground italic">
                      {sale.notes}
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
                  <TableHead className="text-base text-muted-foreground">Data</TableHead>
                  <TableHead className="text-base text-muted-foreground">Cliente</TableHead>
                  <TableHead className="text-base text-muted-foreground">Valor</TableHead>
                  <TableHead className="text-base text-muted-foreground">Desconto</TableHead>
                  <TableHead className="text-base text-muted-foreground">Pagamento</TableHead>
                  <TableHead className="text-base text-muted-foreground">Entrega</TableHead>
                  <TableHead className="text-base text-muted-foreground">Custo</TableHead>
                  <TableHead className="text-base text-muted-foreground">Lucro</TableHead>
                  <TableHead className="text-base text-muted-foreground">% Markup</TableHead>
                  <TableHead className="text-base text-muted-foreground">% Margem</TableHead>
                  <TableHead className="text-base text-muted-foreground">Produtos</TableHead>
                  <TableHead className="text-base text-muted-foreground">Observação</TableHead>
                  <TableHead className="text-base text-muted-foreground">Status</TableHead>
                  <TableHead className="text-base text-muted-foreground">Recibo</TableHead>
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
                    <TableCell>{sale.customer?.name ?? "—"}</TableCell>
                    <TableCell>{formatCurrency(sale.sale_value)}</TableCell>
                    <TableCell>{sale.discount ? formatCurrency(sale.discount) : "—"}</TableCell>
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
                    <TableCell>
                      {formatPercent(salesMargin(sale.sale_value, sale.cost))}
                    </TableCell>
                    <TableCell className="max-w-[240px] truncate">
                      {sale.products}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-muted-foreground">
                      {sale.notes}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={sale.status} />
                    </TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        aria-label="Emitir recibo"
                        disabled={exportingSale?.id === sale.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEmitReceipt(sale);
                        }}
                      >
                        {exportingSale?.id === sale.id ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Receipt className="size-4" />
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell>Total</TableCell>
                  <TableCell />
                  <TableCell>{formatCurrency(totalValue)}</TableCell>
                  <TableCell>{formatCurrency(totalDiscount)}</TableCell>
                  <TableCell colSpan={2} />
                  <TableCell>{formatCurrency(totalCost)}</TableCell>
                  <TableCell>{formatCurrency(totalProfit)}</TableCell>
                  <TableCell>{formatPercent(avgProfitMargin)}</TableCell>
                  <TableCell>{formatPercent(avgSalesMargin)}</TableCell>
                  <TableCell />
                  <TableCell />
                  <TableCell />
                  <TableCell />
                </TableRow>
              </TableFooter>
            </Table>
          </div>
        </>
      )}

      <SaleFormDialog
        open={open}
        onOpenChange={setOpen}
        sale={editingSale}
        stockOptions={stockOptions}
        saleItems={editingSaleItems}
        customerOptions={customerOptions}
      />

      {/* Template do recibo, renderizado fora da tela só pra ser capturado em PDF */}
      {exportingSale && (
        <div style={{ position: "fixed", top: 0, left: -10000, zIndex: -1 }}>
          <SaleReceiptTemplate
            ref={receiptRef}
            sale={exportingSale}
            saleItems={exportingSaleItems}
            receiptNumber={receiptNumberBySaleId.get(exportingSale.id) ?? "00000"}
          />
        </div>
      )}
    </div>
  );
}
