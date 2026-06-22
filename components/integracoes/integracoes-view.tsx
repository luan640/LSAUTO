"use client";

import { useEffect, useTransition } from "react";
import { toast } from "sonner";
import { Plug, Unplug } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/format";
import { disconnectShopee, startShopeeAuth } from "@/app/(app)/integracoes/actions";
import type { ShopeeConnectionStatus } from "@/lib/shopee/tokens";

const CONNECT_ERROR_MESSAGES: Record<string, string> = {
  invalid_state: "Sessão de conexão expirada, tente novamente",
  missing_params: "A Shopee não retornou os dados esperados",
  token_exchange_failed: "Falha ao trocar o código de autorização por um token",
};

function dateOf(value: string | null) {
  if (!value) return "-";
  return formatDate(value.slice(0, 10));
}

export function IntegracoesView({
  status,
  connected,
  connectError,
}: {
  status: ShopeeConnectionStatus | null;
  connected: boolean;
  connectError?: string;
}) {
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (connected) toast.success("Loja Shopee conectada");
    if (connectError) {
      toast.error(CONNECT_ERROR_MESSAGES[connectError] ?? "Falha ao conectar com a Shopee");
    }
  }, [connected, connectError]);

  function handleConnect() {
    startTransition(async () => {
      await startShopeeAuth();
    });
  }

  function handleDisconnect() {
    if (!confirm("Desconectar a loja Shopee?")) return;
    startTransition(async () => {
      try {
        await disconnectShopee();
        toast.success("Loja desconectada");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro ao desconectar");
      }
    });
  }

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
      <h1 className="text-xl font-semibold md:text-2xl">Integrações</h1>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Plug className="size-4" />
            Shopee
          </CardTitle>
        </CardHeader>
        <CardContent>
          {status ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">Conectado</Badge>
                  <span className="text-sm font-medium">
                    {status.shopName || `Loja ${status.shopId}`}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">
                  Conectado desde {dateOf(status.connectedSince)}
                </span>
              </div>
              <Button variant="destructive" onClick={handleDisconnect} disabled={isPending}>
                <Unplug className="size-4" />
                Desconectar
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-sm text-muted-foreground">
                Nenhuma loja Shopee conectada
              </span>
              <Button onClick={handleConnect} disabled={isPending}>
                <Plug className="size-4" />
                Conectar com a Shopee
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
