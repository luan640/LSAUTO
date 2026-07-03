-- Tabela de vendas
create table if not exists public.sales (
  id uuid primary key default gen_random_uuid(),
  sale_date date not null,
  sale_value numeric(10, 2) not null default 0,
  payment_method text not null,
  delivery_type text not null check (delivery_type in ('retirada', 'frete')),
  cost numeric(10, 2) not null default 0,
  products text not null default '',
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists sales_sale_date_idx on public.sales (sale_date desc);

-- Mantém updated_at atualizado automaticamente
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_sales_updated_at on public.sales;
create trigger set_sales_updated_at
  before update on public.sales
  for each row
  execute function public.set_updated_at();

-- RLS: qualquer usuário autenticado pode ler/escrever todas as vendas
alter table public.sales enable row level security;

drop policy if exists "Authenticated users can manage sales" on public.sales;
create policy "Authenticated users can manage sales"
  on public.sales
  for all
  to authenticated
  using (true)
  with check (true);

-- Tabela de acessos de fornecedores
create table if not exists public.supplier_accesses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  ecommerce_url text not null default '',
  login text not null default '',
  password text not null default '',
  notes text not null default '',
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists supplier_accesses_name_idx on public.supplier_accesses (name);

drop trigger if exists set_supplier_accesses_updated_at on public.supplier_accesses;
create trigger set_supplier_accesses_updated_at
  before update on public.supplier_accesses
  for each row
  execute function public.set_updated_at();

-- RLS: qualquer usuário autenticado pode ler/escrever todos os acessos de fornecedores
alter table public.supplier_accesses enable row level security;

drop policy if exists "Authenticated users can manage supplier accesses" on public.supplier_accesses;
create policy "Authenticated users can manage supplier accesses"
  on public.supplier_accesses
  for all
  to authenticated
  using (true)
  with check (true);

-- Tabela de orçamentos (cabeçalho)
create table if not exists public.budgets (
  id uuid primary key default gen_random_uuid(),
  client_phone text not null default '',
  budget_date date not null,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists budgets_budget_date_idx on public.budgets (budget_date desc);

drop trigger if exists set_budgets_updated_at on public.budgets;
create trigger set_budgets_updated_at
  before update on public.budgets
  for each row
  execute function public.set_updated_at();

-- RLS: qualquer usuário autenticado pode ler/escrever todos os orçamentos
alter table public.budgets enable row level security;

drop policy if exists "Authenticated users can manage budgets" on public.budgets;
create policy "Authenticated users can manage budgets"
  on public.budgets
  for all
  to authenticated
  using (true)
  with check (true);

-- Itens do orçamento (cada item pode ter referência e fornecedor diferentes)
create table if not exists public.budget_items (
  id uuid primary key default gen_random_uuid(),
  budget_id uuid not null references public.budgets (id) on delete cascade,
  product_reference text not null default '',
  supplier_id uuid references public.supplier_accesses (id) on delete set null,
  purchase_value numeric(10, 2) not null default 0,
  sale_value numeric(10, 2) not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists budget_items_budget_id_idx on public.budget_items (budget_id);

-- RLS: qualquer usuário autenticado pode ler/escrever todos os itens de orçamento
alter table public.budget_items enable row level security;

drop policy if exists "Authenticated users can manage budget items" on public.budget_items;
create policy "Authenticated users can manage budget items"
  on public.budget_items
  for all
  to authenticated
  using (true)
  with check (true);

-- Tabela de despesas (cada despesa cobre um período de dias)
create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  description text not null,
  amount numeric(10, 2) not null default 0,
  start_date date not null,
  end_date date not null,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint expenses_period_check check (end_date >= start_date)
);

create index if not exists expenses_start_date_idx on public.expenses (start_date desc);

drop trigger if exists set_expenses_updated_at on public.expenses;
create trigger set_expenses_updated_at
  before update on public.expenses
  for each row
  execute function public.set_updated_at();

-- RLS: qualquer usuário autenticado pode ler/escrever todas as despesas
alter table public.expenses enable row level security;

drop policy if exists "Authenticated users can manage expenses" on public.expenses;
create policy "Authenticated users can manage expenses"
  on public.expenses
  for all
  to authenticated
  using (true)
  with check (true);

-- Tabela de vendas da CF Motos (tela independente, sem vínculo com as demais)
create table if not exists public.cf_moto_sales (
  id uuid primary key default gen_random_uuid(),
  sale_date date not null,
  sale_value numeric(10, 2) not null default 0,
  cost numeric(10, 2) not null default 0,
  shopee_fee numeric(10, 2) not null default 0,
  product_reference text not null default '',
  status text not null default 'finalizado' check (status in ('finalizado', 'cancelado')),
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists cf_moto_sales_sale_date_idx on public.cf_moto_sales (sale_date desc);

-- Impede cadastrar o mesmo link de venda mais de uma vez (ignora valores vazios)
create unique index if not exists cf_moto_sales_product_reference_unique_idx
  on public.cf_moto_sales (product_reference)
  where product_reference <> '';

drop trigger if exists set_cf_moto_sales_updated_at on public.cf_moto_sales;
create trigger set_cf_moto_sales_updated_at
  before update on public.cf_moto_sales
  for each row
  execute function public.set_updated_at();

-- RLS: qualquer usuário autenticado pode ler/escrever todas as vendas da CF Motos
alter table public.cf_moto_sales enable row level security;

drop policy if exists "Authenticated users can manage cf moto sales" on public.cf_moto_sales;
create policy "Authenticated users can manage cf moto sales"
  on public.cf_moto_sales
  for all
  to authenticated
  using (true)
  with check (true);

-- Tabela de credenciais/tokens das lojas Shopee conectadas (Open Platform API v2).
-- Nenhuma policy de RLS criada de propósito: nem anon nem authenticated têm
-- acesso a esta tabela. Toda leitura/escrita passa pelo admin client
-- (service role, server-only) em lib/supabase/admin.ts.
create table if not exists public.shopee_shops (
  id uuid primary key default gen_random_uuid(),
  shop_id bigint not null unique,
  shop_name text not null default '',
  access_token text not null,
  refresh_token text not null,
  access_token_expires_at timestamptz not null,
  refresh_token_expires_at timestamptz not null,
  connected_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_shopee_shops_updated_at on public.shopee_shops;
create trigger set_shopee_shops_updated_at
  before update on public.shopee_shops
  for each row
  execute function public.set_updated_at();

alter table public.shopee_shops enable row level security;

-- Pedidos sincronizados da Shopee (não sensíveis: leitura liberada a
-- authenticated; escrita só via admin client, que é quem executa o sync).
create table if not exists public.shopee_orders (
  id uuid primary key default gen_random_uuid(),
  shop_id bigint not null references public.shopee_shops (shop_id) on delete cascade,
  order_sn text not null unique,
  order_status text not null default '',
  order_total numeric(10, 2) not null default 0,
  escrow_amount numeric(10, 2),
  shopee_fee_total numeric(10, 2),
  buyer_username text not null default '',
  order_create_time timestamptz,
  raw_payload jsonb,
  product_cost numeric(10, 2),
  linked_cf_moto_sale_id uuid references public.cf_moto_sales (id) on delete set null,
  synced_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists shopee_orders_shop_id_idx on public.shopee_orders (shop_id);
create index if not exists shopee_orders_linked_idx on public.shopee_orders (linked_cf_moto_sale_id);

drop trigger if exists set_shopee_orders_updated_at on public.shopee_orders;
create trigger set_shopee_orders_updated_at
  before update on public.shopee_orders
  for each row
  execute function public.set_updated_at();

alter table public.shopee_orders enable row level security;

drop policy if exists "Authenticated users can read shopee orders" on public.shopee_orders;
create policy "Authenticated users can read shopee orders"
  on public.shopee_orders
  for select
  to authenticated
  using (true);

