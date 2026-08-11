// Simula o consumo de estoque em pilha (LIFO): cada venda consome primeiro da
// entrada de compra mais recente disponível e só "fura" para entradas mais
// antigas quando a mais recente não tem quantidade suficiente.
// Compartilhado entre os módulos que controlam estoque (CF Motos, Auto Peças LS).

export type LedgerEntryEvent = {
  type: "entry";
  createdAt: string;
  quantity: number;
  unitValue: number;
};

export type LedgerSaleEvent = {
  type: "sale";
  createdAt: string;
  saleItemId: string;
  quantity: number;
};

export type LedgerEvent = LedgerEntryEvent | LedgerSaleEvent;

export function computeLifoCosts(events: LedgerEvent[]): Map<string, number> {
  const sorted = [...events].sort((a, b) => {
    const byTime = a.createdAt.localeCompare(b.createdAt);
    if (byTime !== 0) return byTime;
    if (a.type === b.type) return 0;
    return a.type === "entry" ? -1 : 1;
  });

  const stack: { remaining: number; unitValue: number }[] = [];
  let lastUnitValue = 0;
  const costBySaleItem = new Map<string, number>();

  for (const event of sorted) {
    if (event.type === "entry") {
      if (event.quantity <= 0) continue;
      stack.push({ remaining: event.quantity, unitValue: event.unitValue });
      lastUnitValue = event.unitValue;
      continue;
    }

    let remainingNeed = event.quantity;
    let totalCost = 0;

    while (remainingNeed > 0 && stack.length > 0) {
      const top = stack[stack.length - 1];
      const take = Math.min(top.remaining, remainingNeed);
      totalCost += take * top.unitValue;
      top.remaining -= take;
      remainingNeed -= take;
      if (top.remaining <= 1e-9) stack.pop();
    }

    // Sem entradas suficientes no histórico: usa o último preço conhecido para o restante.
    if (remainingNeed > 0) {
      totalCost += remainingNeed * lastUnitValue;
    }

    costBySaleItem.set(event.saleItemId, event.quantity > 0 ? totalCost / event.quantity : 0);
  }

  return costBySaleItem;
}
