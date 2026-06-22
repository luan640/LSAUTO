"use client";

import { useTransition } from "react";
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
import { formatCurrency, formatDate } from "@/lib/format";
import { importShopeeOrderToSale, syncShopeeOrders } from "@/app/(app)/cf-motos/actions";
import type { ShopeeOrderRow } from "@/lib/types";

function dateOf(value: string | null) {
  if (!value) return "-";
  return formatDate(value.slice(0, 10));
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

  function handleImportShopeeOrder(orderId: string) {
    startTransition(async () => {
      try {
        await importShopeeOrderToSale(orderId);
        toast.success("Pedido importado para CF Motos");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro ao importar pedido");
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
                    <TableHead>Valor</TableHead>
                    <TableHead>Taxas Shopee</TableHead>
                    <TableHead>Valor a receber</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Sincronizado em</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {unlinkedShopeeOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell>{order.order_sn}</TableCell>
                      <TableCell>{dateOf(order.order_create_time)}</TableCell>
                      <TableCell>{order.buyer_username || "-"}</TableCell>
                      <TableCell>{formatCurrency(order.order_total)}</TableCell>
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
                      <TableCell>{order.order_status}</TableCell>
                      <TableCell>{dateOf(order.synced_at)}</TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          onClick={() => handleImportShopeeOrder(order.id)}
                          disabled={isPending}
                        >
                          Importar
                        </Button>
                      </TableCell>
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
