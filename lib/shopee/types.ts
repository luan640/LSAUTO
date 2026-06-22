export type ShopeeErrorResponse = {
  error: string;
  message: string;
  request_id: string;
};

export type ShopeeTokenResponse = {
  access_token: string;
  refresh_token: string;
  expire_in: number;
  shop_id?: number;
  error?: string;
  message?: string;
};

export type ShopeeShop = {
  shop_id: number;
  shop_name: string;
  access_token: string;
  refresh_token: string;
  access_token_expires_at: string;
  refresh_token_expires_at: string;
  created_at: string;
};

export type ShopeeOrderListItem = {
  order_sn: string;
};

export type ShopeeOrderDetail = {
  order_sn: string;
  order_status: string;
  total_amount: number;
  buyer_username: string;
  create_time: number;
};

export type ShopeeEscrowDetail = {
  order_sn: string;
  order_income?: {
    escrow_amount?: number;
    commission_fee?: number;
    service_fee?: number;
    seller_transaction_fee?: number;
  };
};
