import { getConnectionStatus } from "@/lib/shopee/tokens";
import { IntegracoesView } from "@/components/integracoes/integracoes-view";

export default async function IntegracoesPage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string; error?: string }>;
}) {
  const { connected, error: connectError } = await searchParams;
  const status = await getConnectionStatus();

  return (
    <IntegracoesView status={status} connected={connected === "1"} connectError={connectError} />
  );
}
