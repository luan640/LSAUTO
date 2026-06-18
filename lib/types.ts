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
