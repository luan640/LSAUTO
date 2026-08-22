import type { Sale } from "@/lib/types";

// Número sequencial do recibo: posição da venda na ordem cronológica de
// criação (a mais antiga é a Nº 00001), formatado com 5 dígitos.
export function buildReceiptNumberMap(sales: Sale[]): Map<string, string> {
  const ordered = [...sales].sort((a, b) => a.created_at.localeCompare(b.created_at));

  return new Map(
    ordered.map((sale, index) => [sale.id, String(index + 1).padStart(5, "0")]),
  );
}

export type ReceiptItem = {
  description: string;
  quantity: number;
};

// Divide o texto de produtos da venda em linhas de item. Reconhece o padrão
// "{quantidade}x {produto}" usado nas vendas itemizadas (buildProductsSummary);
// caso contrário trata a linha inteira como descrição única.
export function parseReceiptItems(products: string): ReceiptItem[] {
  const trimmed = products.trim();
  if (!trimmed) return [];

  const lines = trimmed.split(/\r?\n/).flatMap((line) => line.split(","));

  return lines
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = line.match(/^(\d+(?:[.,]\d+)?)\s*x\s+(.+)$/i);
      if (match) {
        return {
          quantity: Number(match[1].replace(",", ".")) || 1,
          description: match[2].trim(),
        };
      }
      return { quantity: 1, description: line };
    });
}
