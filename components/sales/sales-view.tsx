"use client";

import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Popover as PopoverPrimitive } from "@base-ui/react/popover";
import {
  Archive,
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  DollarSign,
  Filter,
  Loader2,
  Percent,
  Plus,
  Receipt,
  RotateCcw,
  ShoppingCart,
  TrendingDown,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
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
import { cn } from "@/lib/utils";
import { formatCurrency, formatDate, formatPercent, salesMargin } from "@/lib/format";
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
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

function currentMonthRange() {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const toIso = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return { from: toIso(from), to: toIso(to) };
}

// Janela de mesma duração imediatamente anterior ao período selecionado, pra
// comparar faturamento/custo/lucro contra o período anterior nos cards do topo.
function previousPeriodRange(from: string, to: string) {
  const fromDate = new Date(`${from}T00:00:00`);
  const toDate = new Date(`${to}T00:00:00`);
  const days = Math.round((toDate.getTime() - fromDate.getTime()) / 86400000) + 1;

  const prevTo = new Date(fromDate);
  prevTo.setDate(prevTo.getDate() - 1);
  const prevFrom = new Date(prevTo);
  prevFrom.setDate(prevFrom.getDate() - (days - 1));

  const toIso = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return { from: toIso(prevFrom), to: toIso(prevTo) };
}

function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return (current - previous) / previous;
}

function saleMatchesFilters(
  sale: Sale,
  filters: { from: string; to: string; paymentMethod: string; productQuery: string; customerQuery: string },
) {
  if (filters.from && sale.sale_date < filters.from) return false;
  if (filters.to && sale.sale_date > filters.to) return false;
  if (filters.paymentMethod !== ALL_PAYMENT_METHODS && sale.payment_method !== filters.paymentMethod) {
    return false;
  }
  if (filters.productQuery && !sale.products.toLowerCase().includes(filters.productQuery)) {
    return false;
  }
  if (
    filters.customerQuery &&
    !(sale.customer?.name ?? "").toLowerCase().includes(filters.customerQuery)
  ) {
    return false;
  }
  return true;
}

function marginBadgeClassName(margin: number) {
  if (margin < 0) return "bg-red-50 text-red-600";
  if (margin >= 0.3) return "bg-green-50 text-green-600";
  return "bg-amber-50 text-amber-600";
}

function windowedPages(current: number, total: number, size = 5) {
  if (total <= size) return Array.from({ length: total }, (_, i) => i + 1);
  let start = Math.max(1, current - Math.floor(size / 2));
  const end = Math.min(total, start + size - 1);
  start = Math.max(1, end - size + 1);
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

function StatusBadge({ status }: { status: Sale["status"] }) {
  return (
    <Badge variant={status === "cancelado" ? "destructive" : "default"}>
      {status === "cancelado" ? "Cancelado" : "Finalizado"}
    </Badge>
  );
}

function StatCard({
  label,
  value,
  helper,
  delta,
  icon: Icon,
  iconClassName,
}: {
  label: string;
  value: string;
  helper: string;
  delta?: number | null;
  icon: LucideIcon;
  iconClassName: string;
}) {
  return (
    <Card size="sm">
      <CardContent className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">{label}</span>
          <span className="text-xl font-semibold">{value}</span>
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            {helper}
            {delta !== undefined && delta !== null && (
              <span
                className={cn(
                  "flex items-center gap-0.5 font-medium",
                  delta >= 0 ? "text-green-600" : "text-red-600",
                )}
              >
                {delta >= 0 ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
                {formatPercent(Math.abs(delta))}
              </span>
            )}
          </span>
        </div>
        <div
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-full",
            iconClassName,
          )}
        >
          <Icon className="size-4" />
        </div>
      </CardContent>
    </Card>
  );
}

function PeriodFilter({
  dateFrom,
  dateTo,
  onChangeFrom,
  onChangeTo,
  resetKey,
  open,
  onOpenChange,
}: {
  dateFrom: string;
  dateTo: string;
  onChangeFrom: (value: string) => void;
  onChangeTo: (value: string) => void;
  resetKey: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <PopoverPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <PopoverPrimitive.Trigger className="flex h-8 w-full items-center gap-2 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30">
        <Calendar className="size-4 shrink-0 text-muted-foreground" />
        <span className="flex-1 truncate text-left">
          {formatDate(dateFrom)} — {formatDate(dateTo)}
        </span>
        <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Positioner className="z-50 outline-none" sideOffset={6} align="start">
          <PopoverPrimitive.Popup className="w-72 origin-(--transform-origin) rounded-lg bg-popover p-3 text-popover-foreground shadow-md ring-1 ring-foreground/10 duration-100 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-2">
                <Label htmlFor="filter_date_from">De</Label>
                <DateInput
                  key={`from-${resetKey}`}
                  id="filter_date_from"
                  defaultValue={dateFrom}
                  onValueChange={onChangeFrom}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="filter_date_to">Até</Label>
                <DateInput
                  key={`to-${resetKey}`}
                  id="filter_date_to"
                  defaultValue={dateTo}
                  onValueChange={onChangeTo}
                />
              </div>
            </div>
          </PopoverPrimitive.Popup>
        </PopoverPrimitive.Positioner>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
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
  const [customerFilter, setCustomerFilter] = useState("");
  const [periodOpen, setPeriodOpen] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [exportingSale, setExportingSale] = useState<Sale | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [pageSize, setPageSize] = useState(20);
  const [page, setPage] = useState(1);
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

  const productQuery = product.trim().toLowerCase();
  const customerQuery = customerFilter.trim().toLowerCase();

  const filteredSales = useMemo(
    () =>
      sales.filter((sale) =>
        saleMatchesFilters(sale, { from: dateFrom, to: dateTo, paymentMethod, productQuery, customerQuery }),
      ),
    [sales, dateFrom, dateTo, paymentMethod, productQuery, customerQuery],
  );

  const sortedSales = useMemo(() => {
    const copy = [...filteredSales];
    copy.sort((a, b) => {
      const cmp = a.sale_date.localeCompare(b.sale_date) || a.created_at.localeCompare(b.created_at);
      return sortDir === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [filteredSales, sortDir]);

  // Volta pra primeira página sempre que um filtro (ou o tamanho da página)
  // muda, pra não deixar o usuário "perdido" numa página que não existe mais.
  const filtersKey = `${dateFrom}|${dateTo}|${paymentMethod}|${productQuery}|${customerQuery}|${pageSize}`;
  const [lastFiltersKey, setLastFiltersKey] = useState(filtersKey);
  if (filtersKey !== lastFiltersKey) {
    setLastFiltersKey(filtersKey);
    setPage(1);
  }

  const totalSalesCount = sortedSales.length;
  const pageCount = Math.max(1, Math.ceil(totalSalesCount / pageSize));
  const safePage = Math.min(page, pageCount);
  const pageStart = totalSalesCount === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const pageEnd = Math.min(safePage * pageSize, totalSalesCount);
  const paginatedSales = sortedSales.slice((safePage - 1) * pageSize, safePage * pageSize);

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

  const avgSalesMargin = salesMargin(totalValue, totalCost);

  const previousRange = useMemo(() => previousPeriodRange(dateFrom, dateTo), [dateFrom, dateTo]);

  const previousTotals = useMemo(() => {
    const previousCounted = sales.filter(
      (sale) =>
        sale.status !== "cancelado" &&
        saleMatchesFilters(sale, {
          from: previousRange.from,
          to: previousRange.to,
          paymentMethod,
          productQuery,
          customerQuery,
        }),
    );
    const value = previousCounted.reduce((acc, sale) => acc + sale.sale_value, 0);
    const cost = previousCounted.reduce((acc, sale) => acc + sale.cost, 0);
    return { value, cost, profit: value - cost };
  }, [sales, previousRange, paymentMethod, productQuery, customerQuery]);

  const activeFiltersCount = [
    dateFrom !== defaultRange.from ? dateFrom : "",
    dateTo !== defaultRange.to ? dateTo : "",
    paymentMethod !== ALL_PAYMENT_METHODS ? paymentMethod : "",
    product,
    customerFilter,
  ].filter(Boolean).length;

  const [filterResetKey, setFilterResetKey] = useState(0);

  function clearFilters() {
    setDateFrom(defaultRange.from);
    setDateTo(defaultRange.to);
    setPaymentMethod(ALL_PAYMENT_METHODS);
    setProduct("");
    setCustomerFilter("");
    setFilterResetKey((key) => key + 1);
  }

  function toggleSort() {
    setSortDir((current) => (current === "asc" ? "desc" : "asc"));
  }

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-0.5">
          <h1 className="text-xl font-semibold md:text-2xl">Vendas</h1>
          <p className="hidden text-sm text-muted-foreground md:block">
            Acompanhe e gerencie todas as vendas realizadas.
          </p>
        </div>
        <Button onClick={openNew} className="bg-red-600 text-white hover:bg-red-700">
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
          {/* Cards de estatística: desktop */}
          <div className="hidden gap-3 md:grid md:grid-cols-3 lg:grid-cols-5">
            <StatCard
              label="Vendas no período"
              value={String(countedSales.length)}
              helper="Total de vendas"
              icon={ShoppingCart}
              iconClassName="bg-red-50 text-red-600"
            />
            <StatCard
              label="Faturamento"
              value={formatCurrency(totalValue)}
              helper="Total de vendas"
              delta={percentChange(totalValue, previousTotals.value)}
              icon={DollarSign}
              iconClassName="bg-green-50 text-green-600"
            />
            <StatCard
              label="Custo"
              value={formatCurrency(totalCost)}
              helper="Total de custos"
              delta={percentChange(totalCost, previousTotals.cost)}
              icon={Archive}
              iconClassName="bg-neutral-100 text-neutral-600"
            />
            <StatCard
              label="Lucro"
              value={formatCurrency(totalProfit)}
              helper="Total de lucro"
              delta={percentChange(totalProfit, previousTotals.profit)}
              icon={TrendingUp}
              iconClassName="bg-green-50 text-green-600"
            />
            <StatCard
              label="Margem média"
              value={formatPercent(avgSalesMargin)}
              helper="Sobre o faturamento"
              icon={Percent}
              iconClassName="bg-purple-50 text-purple-600"
            />
          </div>

          {/* Filtros: desktop inline */}
          <Card className="hidden md:block">
            <CardContent className="flex flex-wrap items-end gap-3 py-4">
              <div className="flex min-w-48 flex-col gap-2">
                <Label>Período</Label>
                <PeriodFilter
                  dateFrom={dateFrom}
                  dateTo={dateTo}
                  onChangeFrom={setDateFrom}
                  onChangeTo={setDateTo}
                  resetKey={filterResetKey}
                  open={periodOpen}
                  onOpenChange={setPeriodOpen}
                />
              </div>
              <div className="flex min-w-36 flex-col gap-2">
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
              <div className="flex min-w-40 flex-1 flex-col gap-2">
                <Label htmlFor="filter_product">Produto</Label>
                <Input
                  id="filter_product"
                  placeholder="Buscar produto"
                  value={product}
                  onChange={(e) => setProduct(e.target.value)}
                />
              </div>
              <div className="flex min-w-40 flex-1 flex-col gap-2">
                <Label htmlFor="filter_customer">Cliente</Label>
                <Input
                  id="filter_customer"
                  placeholder="Buscar cliente"
                  value={customerFilter}
                  onChange={(e) => setCustomerFilter(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="relative"
                  onClick={() => setPeriodOpen(true)}
                >
                  <Filter className="size-4" />
                  Filtros
                  {activeFiltersCount > 0 && (
                    <span className="flex size-4 items-center justify-center rounded-full bg-red-600 text-[10px] font-medium text-white">
                      {activeFiltersCount}
                    </span>
                  )}
                </Button>
                <Button type="button" variant="outline" onClick={clearFilters}>
                  <RotateCcw className="size-4" />
                  Limpar
                </Button>
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
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="filter_customer_mobile">Cliente</Label>
                      <Input
                        id="filter_customer_mobile"
                        placeholder="Buscar cliente"
                        value={customerFilter}
                        onChange={(e) => setCustomerFilter(e.target.value)}
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
            {paginatedSales.map((sale) => (
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
                  <TableHead className="text-base text-muted-foreground">
                    <button
                      type="button"
                      onClick={toggleSort}
                      className="flex items-center gap-1 hover:text-foreground"
                    >
                      Data
                      <ChevronDown
                        className={cn("size-3.5 transition-transform", sortDir === "desc" && "rotate-180")}
                      />
                    </button>
                  </TableHead>
                  <TableHead className="text-base text-muted-foreground">Cliente</TableHead>
                  <TableHead className="text-base text-muted-foreground">Valor</TableHead>
                  <TableHead className="text-base text-muted-foreground">Desconto</TableHead>
                  <TableHead className="text-base text-muted-foreground">Pagamento</TableHead>
                  <TableHead className="text-base text-muted-foreground">Entrega</TableHead>
                  <TableHead className="text-base text-muted-foreground">Custo</TableHead>
                  <TableHead className="text-base text-muted-foreground">Lucro</TableHead>
                  <TableHead className="text-base text-muted-foreground">% Margem</TableHead>
                  <TableHead className="text-base text-muted-foreground">Produtos</TableHead>
                  <TableHead className="text-base text-muted-foreground">Observação</TableHead>
                  <TableHead className="text-base text-muted-foreground">Status</TableHead>
                  <TableHead className="text-base text-muted-foreground">Recibo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedSales.map((sale) => {
                  const margin = salesMargin(sale.sale_value, sale.cost);
                  return (
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
                        <span
                          className={cn(
                            "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                            marginBadgeClassName(margin),
                          )}
                        >
                          {formatPercent(margin)}
                        </span>
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
                  );
                })}
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
                  <TableCell>{formatPercent(avgSalesMargin)}</TableCell>
                  <TableCell />
                  <TableCell />
                  <TableCell />
                  <TableCell />
                </TableRow>
              </TableFooter>
            </Table>

            {/* Paginação */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3">
              <span className="text-sm text-muted-foreground">
                Mostrando {pageStart} a {pageEnd} de {totalSalesCount} vendas
              </span>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Linhas por página</span>
                  <Select
                    value={String(pageSize)}
                    onValueChange={(value) => setPageSize(Number(value ?? pageSize))}
                  >
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PAGE_SIZE_OPTIONS.map((size) => (
                        <SelectItem key={size} value={String(size)}>
                          {size}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    disabled={safePage === 1}
                    onClick={() => setPage(1)}
                    aria-label="Primeira página"
                  >
                    <ChevronsLeft className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    disabled={safePage === 1}
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                    aria-label="Página anterior"
                  >
                    <ChevronLeft className="size-4" />
                  </Button>
                  {windowedPages(safePage, pageCount).map((pageNumber) => (
                    <Button
                      key={pageNumber}
                      type="button"
                      variant="outline"
                      size="icon-sm"
                      className={
                        pageNumber === safePage
                          ? "border-red-600 bg-red-600 text-white hover:bg-red-700"
                          : undefined
                      }
                      onClick={() => setPage(pageNumber)}
                    >
                      {pageNumber}
                    </Button>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    disabled={safePage === pageCount}
                    onClick={() => setPage((current) => Math.min(pageCount, current + 1))}
                    aria-label="Próxima página"
                  >
                    <ChevronRight className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    disabled={safePage === pageCount}
                    onClick={() => setPage(pageCount)}
                    aria-label="Última página"
                  >
                    <ChevronsRight className="size-4" />
                  </Button>
                </div>
              </div>
            </div>
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
