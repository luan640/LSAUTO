"use client";

import { useMemo, useState } from "react";
import {
  startOfMonth,
  startOfYear,
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
import { formatCurrency } from "@/lib/format";
import type { Sale } from "@/lib/types";

const PERIODS = {
  mes_atual: "Mês atual",
  ultimos_3_meses: "Últimos 3 meses",
  ultimos_6_meses: "Últimos 6 meses",
  este_ano: "Este ano",
  tudo: "Tudo",
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

export function DashboardView({ sales }: { sales: Sale[] }) {
  const [period, setPeriod] = useState<PeriodKey>("ultimos_6_meses");

  const filtered = useMemo(() => {
    const start = periodStart(period);
    if (!start) return sales;
    return sales.filter((sale) => {
      const date = parseISO(sale.sale_date);
      return isAfter(date, start) || isEqual(date, start);
    });
  }, [sales, period]);

  const summary = useMemo(() => {
    const totalSales = filtered.reduce((acc, s) => acc + s.sale_value, 0);
    const totalCost = filtered.reduce((acc, s) => acc + s.cost, 0);
    return {
      totalSales,
      totalCost,
      profit: totalSales - totalCost,
      count: filtered.length,
    };
  }, [filtered]);

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
    const start = periodStart(period) ?? earliest;
    const end = isAfter(today, earliest) ? today : earliest;

    return eachDayOfInterval({ start, end }).map((date) => {
      const key = format(date, "yyyy-MM-dd");
      const value = map.get(key) ?? { revenue: 0, profit: 0 };
      return {
        day: format(date, "dd/MM", { locale: ptBR }),
        ...value,
      };
    });
  }, [filtered, period]);

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
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-xl font-semibold md:text-2xl">Painel</h1>
        <Select value={period} onValueChange={(v) => setPeriod(v as PeriodKey)}>
          <SelectTrigger className="w-44">
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
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
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
              Lucro
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-semibold md:text-2xl">
            {formatCurrency(summary.profit)}
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
