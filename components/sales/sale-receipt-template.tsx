import { forwardRef } from "react";
import {
  Calendar,
  Car,
  DollarSign,
  ShieldCheck,
  User,
} from "lucide-react";
import { PAYMENT_METHODS, type LsSaleItem, type PaymentMethod, type Sale } from "@/lib/types";
import { parseReceiptItems } from "@/lib/receipt/receipt-number";

type ReceiptRow = { description: string; quantity: number; sku: string; brand: string };

// Vendas itemizadas têm o produto real vinculado (SKU/marca de verdade); vendas
// antigas (texto livre, sem item de estoque) caem no fallback de texto, sem
// SKU/marca porque nunca existiu esse vínculo.
function buildReceiptRows(sale: Sale, saleItems: LsSaleItem[]): ReceiptRow[] {
  if (saleItems.length > 0) {
    return saleItems.map((item) => ({
      description: item.product?.name ?? "Produto",
      quantity: Number(item.quantity),
      sku: item.product?.sku ?? "—",
      brand: item.product?.brand?.name ?? "—",
    }));
  }

  return parseReceiptItems(sale.products).map((item) => ({
    ...item,
    sku: "—",
    brand: "—",
  }));
}

const RED = "#c8102e";
const RED_DARK = "#7a0000";
const BLACK = "#0b0b0c";

function formatCurrencyPlain(value: number) {
  return `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function IconCircle({
  children,
  size = 34,
  background = RED,
}: {
  children: React.ReactNode;
  size?: number;
  background?: string;
}) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "9999px",
        background,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      {children}
    </div>
  );
}

function CheckboxRow({ label, checked }: { label: string; checked: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8 }}>
      <div
        style={{
          width: 18,
          height: 18,
          border: `2px solid ${checked ? RED : "#111"}`,
          borderRadius: 3,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#fff",
          flexShrink: 0,
        }}
      >
        {checked && (
          <span style={{ color: RED, fontSize: 14, fontWeight: 900, lineHeight: 1 }}>✓</span>
        )}
      </div>
      <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: 0.3 }}>{label}</span>
    </div>
  );
}

export const SaleReceiptTemplate = forwardRef<
  HTMLDivElement,
  { sale: Sale; saleItems?: LsSaleItem[]; receiptNumber: string }
>(function SaleReceiptTemplate({ sale, saleItems = [], receiptNumber }, ref) {
  const items = buildReceiptRows(sale, saleItems);
  const [year, month, day] = sale.sale_date.split("-");
  const total = sale.sale_value;
  const discount = sale.discount ?? 0;
  const subtotal = total + discount;

  return (
    <div
      ref={ref}
      style={{
        width: 1400,
        background: "#ffffff",
        color: "#111111",
        fontFamily: "Arial, Helvetica, sans-serif",
        border: "1px solid #e5e5e5",
        borderRadius: 28,
        overflow: "hidden",
      }}
    >
      {/* Cabeçalho — imagem fiel ao modelo (padrao_recibo.png), com o número
          do recibo sobreposto na posição em que os dígitos originais foram
          apagados da arte */}
      <div style={{ position: "relative", width: "100%", lineHeight: 0 }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- captura por html2canvas exige <img> comum */}
        <img
          src="/receipt-header.png"
          alt="Auto Peças LS — Recibo de Pagamento"
          width={1402}
          height={300}
          style={{ display: "block", width: "100%", height: "auto" }}
        />
        <span
          style={{
            position: "absolute",
            left: "85.5%",
            top: "34.3%",
            transform: "translateY(-50%)",
            color: RED,
            fontSize: 30,
            fontWeight: 900,
            fontStyle: "italic",
            whiteSpace: "nowrap",
          }}
        >
          {receiptNumber}
        </span>
      </div>

      {/* Cliente / Data */}
      <div
        style={{
          margin: "22px 28px 0",
          border: "1px solid #e5e5e5",
          borderRadius: 18,
          padding: "20px 28px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 24,
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: 14, flex: 1 }}>
          <IconCircle background={BLACK}>
            <User size={18} color="#fff" />
          </IconCircle>
          <div style={{ display: "flex", flexDirection: "column", gap: 14, flex: 1 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
              <span style={{ fontWeight: 900, fontSize: 16 }}>CLIENTE:</span>
              {sale.customer?.name ? (
                <span style={{ fontWeight: 600, fontSize: 15 }}>{sale.customer.name}</span>
              ) : (
                <span style={{ flex: 1, borderBottom: "1.5px solid #111", height: 18 }} />
              )}
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
              <span style={{ fontWeight: 900, fontSize: 16 }}>CPF/CNPJ:</span>
              {sale.customer?.cpf ? (
                <span style={{ fontWeight: 600, fontSize: 15 }}>{sale.customer.cpf}</span>
              ) : (
                <span style={{ flex: 1, borderBottom: "1.5px solid #111", height: 18 }} />
              )}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <IconCircle background={BLACK}>
            <Calendar size={18} color="#fff" />
          </IconCircle>
          <span style={{ fontWeight: 900, fontSize: 16 }}>DATA:</span>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6, fontWeight: 700 }}>
            <span style={{ borderBottom: "1.5px solid #111", padding: "0 10px" }}>{day}</span>
            <span>/</span>
            <span style={{ borderBottom: "1.5px solid #111", padding: "0 10px" }}>{month}</span>
            <span>/</span>
            <span style={{ borderBottom: "1.5px solid #111", padding: "0 10px" }}>{year}</span>
          </div>
        </div>
      </div>

      {/* Tabela de itens */}
      <div style={{ margin: "22px 28px 0", borderRadius: 14, overflow: "hidden", border: "1px solid #e5e5e5" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "8% 36% 20% 20% 16%",
            background: BLACK,
          }}
        >
          {["ITEM", "DESCRIÇÃO DA PEÇA / PRODUTO", "SKU", "MARCA", "QTD."].map((label, index) => (
            <div
              key={label}
              style={{
                color: "#fff",
                fontWeight: 800,
                fontSize: 13,
                letterSpacing: 0.5,
                padding: "14px 16px",
                textAlign: index === 0 || index === 4 ? "center" : "left",
              }}
            >
              {label}
            </div>
          ))}
        </div>

        {items.length === 0 ? (
          <div
            style={{
              padding: "20px 16px",
              textAlign: "center",
              color: "#888",
              fontSize: 14,
              borderTop: "1px solid #eee",
            }}
          >
            —
          </div>
        ) : (
          items.map((item, index) => (
            <div
              key={`${item.description}-${index}`}
              style={{
                display: "grid",
                gridTemplateColumns: "8% 36% 20% 20% 16%",
                borderTop: "1px solid #eee",
              }}
            >
              <div style={{ padding: "14px 16px", textAlign: "center", fontWeight: 700 }}>
                {index + 1}
              </div>
              <div style={{ padding: "14px 16px", fontWeight: 600, textTransform: "uppercase" }}>
                {item.description}
              </div>
              <div style={{ padding: "14px 16px", color: "#333" }}>{item.sku}</div>
              <div style={{ padding: "14px 16px", color: "#333" }}>{item.brand}</div>
              <div style={{ padding: "14px 16px", textAlign: "center", fontWeight: 700 }}>
                {item.quantity}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagamento / Observações / Totais */}
      <div
        style={{
          margin: "22px 28px 0",
          display: "grid",
          gridTemplateColumns: "26fr 38fr 36fr",
          gap: 24,
          alignItems: "stretch",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <IconCircle background={BLACK} size={30}>
              <DollarSign size={16} color="#fff" />
            </IconCircle>
            <span style={{ fontWeight: 900, fontSize: 15, letterSpacing: 0.3 }}>
              FORMA DE PAGAMENTO
            </span>
          </div>
          <div style={{ marginLeft: 40 }}>
            {(PAYMENT_METHODS as readonly PaymentMethod[]).map((method) => (
              <CheckboxRow
                key={method}
                label={method.toUpperCase()}
                checked={method === sale.payment_method}
              />
            ))}
          </div>
        </div>

        <div>
          <span style={{ fontWeight: 900, fontSize: 15, letterSpacing: 0.3 }}>
            OBSERVAÇÕES:
          </span>
          <div
            style={{
              marginTop: 14,
              display: "flex",
              flexDirection: "column",
              gap: 18,
              fontSize: 14,
              color: "#333",
              lineHeight: 1.5,
            }}
          >
            {sale.receipt_notes ? (
              <span>{sale.receipt_notes}</span>
            ) : (
              <>
                <span style={{ borderBottom: "1px solid #ccc", height: 18 }} />
                <span style={{ borderBottom: "1px solid #ccc", height: 18 }} />
                <span style={{ borderBottom: "1px solid #ccc", height: 18 }} />
              </>
            )}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", borderRadius: 14, overflow: "hidden", border: "1px solid #e5e5e5", height: "fit-content" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "14px 20px",
              fontWeight: 800,
              fontSize: 15,
            }}
          >
            <span>SUBTOTAL</span>
            <span>{formatCurrencyPlain(subtotal)}</span>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "14px 20px",
              fontWeight: 800,
              fontSize: 15,
              borderTop: "1px solid #e5e5e5",
            }}
          >
            <span>DESCONTO</span>
            <span>{discount > 0 ? `- ${formatCurrencyPlain(discount)}` : "R$ 0,00"}</span>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "18px 20px",
              background: `linear-gradient(90deg, ${RED_DARK}, ${RED})`,
              fontWeight: 900,
              fontSize: 24,
              color: "#fff",
            }}
          >
            <span>TOTAL</span>
            <span>{formatCurrencyPlain(total)}</span>
          </div>
        </div>
      </div>

      {/* Assinaturas */}
      <div
        style={{
          margin: "36px 28px 0",
          display: "grid",
          gridTemplateColumns: "1fr auto 1fr",
          alignItems: "end",
          gap: 24,
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div style={{ borderBottom: "1.5px solid #111", height: 40 }} />
          <span style={{ fontSize: 14, fontWeight: 600, color: "#333" }}>
            Assinatura do Cliente
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: "0 32px" }}>
          <Car size={40} color="#d4d4d4" />
          <span
            style={{
              fontSize: 13,
              fontWeight: 800,
              color: "#333",
              textAlign: "center",
              lineHeight: 1.3,
            }}
          >
            PEÇAS DE QUALIDADE,
            <br />
            DESEMPENHO DE VERDADE!
          </span>
        </div>

        <div style={{ textAlign: "center" }}>
          <div style={{ borderBottom: "1.5px solid #111", height: 40 }} />
          <span style={{ fontSize: 14, fontWeight: 600, color: "#333" }}>
            Assinatura / Carimbo
          </span>
          <div style={{ fontSize: 14, fontWeight: 900 }}>AUTO PEÇAS LS</div>
        </div>
      </div>

      {/* Rodapé */}
      <div
        style={{
          marginTop: 30,
          background: BLACK,
          padding: "20px 28px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 14,
        }}
      >
        <IconCircle>
          <ShieldCheck size={18} color="#fff" />
        </IconCircle>
        <span style={{ color: "#fff", fontSize: 14, fontWeight: 700, lineHeight: 1.3 }}>
          TRABALHAMOS COM AS MELHORES MARCAS DO MERCADO!
        </span>
      </div>
    </div>
  );
});
