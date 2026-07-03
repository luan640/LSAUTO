"use client";

import { useTransition, useState, useEffect } from "react";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/lib/format";
import { syncShopeeOrders, updateShopeeOrderProductCost } from "@/app/(app)/cf-motos/actions";
import type { ShopeeOrderRow } from "@/lib/types";

function ProductCostCell({ orderId, initialCost }: { orderId: string; initialCost: number | null }) {
  const [value, setValue] = useState(initialCost != null ? String(initialCost) : "");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setValue(initialCost != null ? String(initialCost) : "");
  }, [initialCost]);

  function handleBlur() {
    const parsed = value.trim() === "" ? null : Number(value.replace(",", "."));
    if (parsed === initialCost || (parsed != null && isNaN(parsed))) return;
    startTransition(async () => {
      try {
        await updateShopeeOrderProductCost(orderId, parsed);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro ao salvar custo");
      }
    });
  }

  return (
    <input
      type="text"
      inputMode="decimal"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={handleBlur}
      disabled={isPending}
      placeholder="0,00"
      className="w-24 rounded border border-input bg-background px-2 py-1 text-sm disabled:opacity-50"
    />
  );
}

function dateOf(value: string | null) {
  if (!value) return "-";
  const d = new Date(value);
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function CfMotosVendasShopeeView({
  unlinkedShopeeOrders,
}: {
  unlinkedShopeeOrders: ShopeeOrderRow[];
}) {
  const [isPending, startTransition] = useTransition();

  function handleSyncShopeeOrders() {
    startTransition(async () => {
      try {
        const result = await syncShopeeOrders();
        toast.success(`${result.synced} pedido(s) sincronizado(s)`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro ao sincronizar pedidos");
      }
    });
  }

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold md:text-2xl">CF Motos · Vendas Shopee</h1>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-base">Pedidos Shopee não vinculados</CardTitle>
          <Button variant="outline" size="sm" onClick={handleSyncShopeeOrders} disabled={isPending}>
            <RefreshCw className="size-4" />
            Sincronizar pedidos
          </Button>
        </CardHeader>
        <CardContent>
          {unlinkedShopeeOrders.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Nenhum pedido pendente de importação.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Pedido</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Comprador</TableHead>
                    <TableHead>Produto</TableHead>
                    <TableHead>Valor de Venda</TableHead>
                    <TableHead>Custo</TableHead>
                    <TableHead>Taxas Shopee</TableHead>
                    <TableHead>Valor a receber</TableHead>
                    <TableHead>Lucro</TableHead>
                    <TableHead>% Margem</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Sincronizado em</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {unlinkedShopeeOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell>{order.order_sn}</TableCell>
                      <TableCell>{dateOf(order.order_create_time)}</TableCell>
                      <TableCell>{order.buyer_username || "-"}</TableCell>
                      <TableCell>
                        {order.raw_payload?.order?.item_list?.map((item, i) => (
                          <div key={i} className="text-sm">
                            {item.item_name}
                            {item.model_name ? ` · ${item.model_name}` : ""}
                            {item.model_quantity_purchased && item.model_quantity_purchased > 1
                              ? ` (x${item.model_quantity_purchased})`
                              : ""}
                          </div>
                        )) ?? "-"}
                      </TableCell>
                      <TableCell>{formatCurrency(order.order_total)}</TableCell>
                      <TableCell>
                        <ProductCostCell orderId={order.id} initialCost={order.product_cost} />
                      </TableCell>
                      <TableCell>
                        {order.shopee_fee_total != null
                          ? formatCurrency(order.shopee_fee_total)
                          : "-"}
                      </TableCell>
                      <TableCell>
                        {order.escrow_amount != null
                          ? formatCurrency(order.escrow_amount)
                          : "-"}
                      </TableCell>
                      <TableCell>
                        {order.escrow_amount != null && order.product_cost != null
                          ? formatCurrency(order.escrow_amount - order.product_cost)
                          : "-"}
                      </TableCell>
                      <TableCell>
                        {order.escrow_amount != null && order.product_cost != null
                          ? `${(((order.escrow_amount - order.product_cost) / order.escrow_amount) * 100).toFixed(1)}%`
                          : "-"}
                      </TableCell>
                      <TableCell>{order.order_status}</TableCell>
                      <TableCell>{dateOf(order.synced_at)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
