export const PAYMENT_METHODS = ["Pix", "Cartão", "Dinheiro", "Transferência", "Outro"] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export type DeliveryType = "retirada" | "frete";

export type Sale = {
  id: string;
  sale_date: string;
  sale_value: number;
  payment_method: PaymentMethod;
  delivery_type: DeliveryType;
  cost: number;
  products: string;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type SaleInput = Omit<Sale, "id" | "created_by" | "created_at" | "updated_at">;

export type SupplierAccess = {
  id: string;
  name: string;
  ecommerce_url: string;
  login: string;
  password: string;
  notes: string;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type SupplierAccessInput = Omit<
  SupplierAccess,
  "id" | "created_by" | "created_at" | "updated_at"
>;

export type BudgetItem = {
  id: string;
  budget_id: string;
  product_reference: string;
  supplier_id: string | null;
  purchase_value: number;
  sale_value: number;
};

export type BudgetItemInput = Omit<BudgetItem, "id" | "budget_id">;

export type Budget = {
  id: string;
  client_phone: string;
  budget_date: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  items: BudgetItem[];
};

export type BudgetInput = {
  client_phone: string;
  budget_date: string;
  items: BudgetItemInput[];
};

export type Expense = {
  id: string;
  description: string;
  amount: number;
  start_date: string;
  end_date: string;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type ExpenseInput = Omit<Expense, "id" | "created_by" | "created_at" | "updated_at">;

export const CF_MOTO_SALE_STATUSES = ["finalizado", "cancelado"] as const;

export type CfMotoSaleStatus = (typeof CF_MOTO_SALE_STATUSES)[number];

export type CfMotoSale = {
  id: string;
  sale_date: string;
  sale_value: number;
  cost: number;
  shopee_fee: number;
  product_reference: string;
  status: CfMotoSaleStatus;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type CfMotoSaleInput = Omit<
  CfMotoSale,
  "id" | "created_by" | "created_at" | "updated_at"
>;

export type CfMotoExpense = {
  id: string;
  description: string;
  amount: number;
  start_date: string;
  end_date: string;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type CfMotoExpenseInput = Omit<
  CfMotoExpense,
  "id" | "created_by" | "created_at" | "updated_at"
>;

export type CfMotoProduct = {
  id: string;
  name: string;
  sku: string;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type CfMotoProductInput = Omit<
  CfMotoProduct,
  "id" | "created_by" | "created_at" | "updated_at"
>;

export type CfMotoSupplier = {
  id: string;
  name: string;
  contact: string;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type CfMotoSupplierInput = Omit<
  CfMotoSupplier,
  "id" | "created_by" | "created_at" | "updated_at"
>;

export type CfMotoStockEntry = {
  id: string;
  product_id: string;
  supplier_id: string | null;
  quantity: number;
  unit_value: number;
  entry_date: string;
  notes: string;
  created_by: string;
  created_at: string;
  product?: CfMotoProduct;
  supplier?: CfMotoSupplier | null;
};

export type CfMotoStockEntryInput = Omit<
  CfMotoStockEntry,
  "id" | "created_by" | "created_at" | "product" | "supplier"
>;

export type CfMotoSaleItem = {
  id: string;
  sale_id: string;
  product_id: string;
  quantity: number;
  unit_cost: number;
  created_at: string;
};

export type CfMotoStockSummary = {
  product_id: string;
  product_name: string;
  product_sku: string;
  quantity: number;
  total_value: number;
  average_value: number;
  last_entry_value: number;
};

export type ShopeeOrderRow = {
  id: string;
  shop_id: number;
  order_sn: string;
  order_status: string;
  order_total: number;
  escrow_amount: number | null;
  shopee_fee_total: number | null;
  buyer_username: string;
  order_create_time: string | null;
  product_cost: number | null;
  linked_cf_moto_sale_id: string | null;
  synced_at: string;
  raw_payload: {
    order?: { item_list?: { item_name: string; model_name?: string; model_quantity_purchased?: number }[] };
    escrow?: unknown;
  } | null;
};
