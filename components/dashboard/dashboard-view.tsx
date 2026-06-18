"use client";

import { useMemo, useState } from "react";
import {
  startOfDay,
  startOfMonth,
  startOfYear,
  subDays,
  subMonths,
  isAfter,
  isEqual,
  parseISO,
  format,
  eachDayOfInterval,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DateInput } from "@/components/ui/date-input";
import { formatCurrency } from "@/lib/format";
import type { Expense, Sale } from "@/lib/types";

const PERIODS = {
  hoje: "Hoje",
  ontem: "Ontem",
  mes_atual: "Mês atual",
  ultimos_3_meses: "Últimos 3 meses",
  ultimos_6_meses: "Últimos 6 meses",
  este_ano: "Este ano",
  tudo: "Tudo",
  personalizado: "Personalizado",
} as const;

type PeriodKey = keyof typeof PERIODS;

const PIE_COLORS = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#06b6d4", "#a855f7"];

function periodStart(period: PeriodKey): Date | null {
  const now = new Date();
  switch (period) {
    case "mes_atual":
      return startOfMonth(now);
    case "ultimos_3_meses":
      return startOfMonth(subMonths(now, 2));
    case "ultimos_6_meses":
      return startOfMonth(subMonths(now, 5));
    case "este_ano":
      return startOfYear(now);
    case "tudo":
    default:
      return null;
  }
}

function periodRange(
  period: PeriodKey,
  customStart: string,
  customEnd: string,
): { start: string | null; end: string | null } {
  const todayStr = format(new Date(), "yyyy-MM-dd");

  if (period === "hoje") {
    return { start: todayStr, end: todayStr };
  }

  if (period === "ontem") {
    const yesterdayStr = format(subDays(new Date(), 1), "yyyy-MM-dd");
    return { start: yesterdayStr, end: yesterdayStr };
  }

  if (period === "personalizado") {
    return { start: customStart || null, end: customEnd || null };
  }

  if (period === "tudo") {
    return { start: null, end: null };
  }

  const start = periodStart(period);
  return { start: start ? format(start, "yyyy-MM-dd") : null, end: todayStr };
}

export function DashboardView({ sales, expenses }: { sales: Sale[]; expenses: Expense[] }) {
  const [period, setPeriod] = useState<PeriodKey>("mes_atual");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  const filtered = useMemo(() => {
    if (period === "hoje") {
      const todayStr = format(new Date(), "yyyy-MM-dd");
      return sales.filter((sale) => sale.sale_date === todayStr);
    }

    if (period === "ontem") {
      const yesterdayStr = format(subDays(new Date(), 1), "yyyy-MM-dd");
      return sales.filter((sale) => sale.sale_date === yesterdayStr);
    }

    if (period === "personalizado") {
      if (!customStart && !customEnd) return sales;
      return sales.filter((sale) => {
        if (customStart && sale.sale_date < customStart) return false;
        if (customEnd && sale.sale_date > customEnd) return false;
        return true;
      });
    }

    const start = periodStart(period);
    if (!start) return sales;
    return sales.filter((sale) => {
      const date = parseISO(sale.sale_date);
      return isAfter(date, start) || isEqual(date, start);
    });
  }, [sales, period, customStart, customEnd]);

  const filteredExpenses = useMemo(() => {
    const { start, end } = periodRange(period, customStart, customEnd);
    return expenses.filter((expense) => {
      if (start && expense.end_date < start) return false;
      if (end && expense.start_date > end) return false;
      return true;
    });
  }, [expenses, period, customStart, customEnd]);

  const totalExpenses = useMemo(
    () => filteredExpenses.reduce((acc, expense) => acc + expense.amount, 0),
    [filteredExpenses],
  );

  const summary = useMemo(() => {
    const totalSales = filtered.reduce((acc, s) => acc + s.sale_value, 0);
    const totalCost = filtered.reduce((acc, s) => acc + s.cost, 0);
    return {
      totalSales,
      totalCost,
      profit: totalSales - totalCost - totalExpenses,
      count: filtered.length,
    };
  }, [filtered, totalExpenses]);

  const monthly = useMemo(() => {
    const map = new Map<string, { revenue: number; profit: number }>();
    for (const sale of filtered) {
      const date = parseISO(sale.sale_date);
      const key = format(date, "yyyy-MM");
      const entry = map.get(key) ?? { revenue: 0, profit: 0 };
      entry.revenue += sale.sale_value;
      entry.profit += sale.sale_value - sale.cost;
      map.set(key, entry);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => ({
        month: format(parseISO(`${key}-01`), "MMM/yy", { locale: ptBR }),
        ...value,
      }));
  }, [filtered]);

  const daily = useMemo(() => {
    if (filtered.length === 0) return [];

    const map = new Map<string, { revenue: number; profit: number }>();
    for (const sale of filtered) {
      const date = parseISO(sale.sale_date);
      const key = format(date, "yyyy-MM-dd");
      const entry = map.get(key) ?? { revenue: 0, profit: 0 };
      entry.revenue += sale.sale_value;
      entry.profit += sale.sale_value - sale.cost;
      map.set(key, entry);
    }

    const dates = filtered.map((sale) => parseISO(sale.sale_date));
    const earliest = dates.reduce((a, b) => (a < b ? a : b));
    const today = new Date();

    let start: Date;
    let end: Date;
    if (period === "hoje") {
      start = startOfDay(today);
      end = startOfDay(today);
    } else if (period === "ontem") {
      start = startOfDay(subDays(today, 1));
      end = startOfDay(subDays(today, 1));
    } else if (period === "personalizado") {
      start = customStart ? parseISO(customStart) : earliest;
      end = customEnd ? parseISO(customEnd) : isAfter(today, earliest) ? today : earliest;
    } else {
      start = periodStart(period) ?? earliest;
      end = isAfter(today, earliest) ? today : earliest;
    }

    return eachDayOfInterval({ start, end }).map((date) => {
      const key = format(date, "yyyy-MM-dd");
      const value = map.get(key) ?? { revenue: 0, profit: 0 };
      return {
        day: format(date, "dd/MM", { locale: ptBR }),
        ...value,
      };
    });
  }, [filtered, period, customStart, customEnd]);

  const byPaymentMethod = useMemo(() => {
    const map = new Map<string, number>();
    for (const sale of filtered) {
      map.set(sale.payment_method, (map.get(sale.payment_method) ?? 0) + sale.sale_value);
    }
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [filtered]);

  const byDelivery = useMemo(() => {
    const map = new Map<string, number>();
    for (const sale of filtered) {
      const label = sale.delivery_type === "frete" ? "Frete" : "Retirada";
      map.set(label, (map.get(label) ?? 0) + 1);
    }
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [filtered]);

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h1 className="text-xl font-semibold md:text-2xl">Painel</h1>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Select value={period} onValueChange={(v) => setPeriod(v as PeriodKey)}>
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(PERIODS).map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {period === "personalizado" && (
            <div className="flex items-center gap-2">
              <DateInput
                id="dashboard_date_from"
                onValueChange={setCustomStart}
              />
              <span className="text-sm text-muted-foreground">até</span>
              <DateInput
                id="dashboard_date_to"
                onValueChange={setCustomEnd}
              />
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Faturamento
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-semibold md:text-2xl">
            {formatCurrency(summary.totalSales)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Custo
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-semibold md:text-2xl">
            {formatCurrency(summary.totalCost)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Despesas
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-semibold md:text-2xl">
            {formatCurrency(totalExpenses)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Lucro
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-1">
            <span className="text-xl font-semibold md:text-2xl">
              {formatCurrency(summary.profit)}
            </span>
            <span className="text-xs text-muted-foreground">
              Faturamento - Custo - Despesas
            </span>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Vendas
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-semibold md:text-2xl">
            {summary.count}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Registros diários</CardTitle>
        </CardHeader>
        <CardContent className="h-72">
          {daily.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem dados para o período.</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={daily}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" fontSize={12} />
                <YAxis
                  fontSize={12}
                  tickFormatter={(value) => formatCurrency(value as number)}
                  width={90}
                />
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  name="Faturamento"
                  stroke="#6366f1"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="profit"
                  name="Lucro"
                  stroke="#22c55e"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Evolução de faturamento e lucro</CardTitle>
        </CardHeader>
        <CardContent className="h-72">
          {monthly.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem dados para o período.</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthly}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" fontSize={12} />
                <YAxis
                  fontSize={12}
                  tickFormatter={(value) => formatCurrency(value as number)}
                  width={90}
                />
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                <Legend />
                <Bar dataKey="revenue" name="Faturamento" fill="#6366f1" radius={4} />
                <Bar dataKey="profit" name="Lucro" fill="#22c55e" radius={4} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Faturamento por forma de pagamento</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            {byPaymentMethod.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem dados para o período.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={byPaymentMethod}
                    dataKey="value"
                    nameKey="name"
                    outerRadius={80}
                    label={(entry) => entry.name}
                  >
                    {byPaymentMethod.map((entry, index) => (
                      <Cell key={entry.name} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Vendas por tipo de entrega</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            {byDelivery.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem dados para o período.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={byDelivery}
                    dataKey="value"
                    nameKey="name"
                    outerRadius={80}
                    label={(entry) => `${entry.name}: ${entry.value}`}
                  >
                    {byDelivery.map((entry, index) => (
                      <Cell key={entry.name} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
