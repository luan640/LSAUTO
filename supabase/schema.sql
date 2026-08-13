-- Tabela de vendas
create table if not exists public.sales (
  id uuid primary key default gen_random_uuid(),
  sale_date date not null,
  sale_value numeric(10, 2) not null default 0,
  payment_method text not null,
  delivery_type text not null check (delivery_type in ('retirada', 'frete')),
  cost numeric(10, 2) not null default 0,
  products text not null default '',
  status text not null default 'finalizado' check (status in ('finalizado', 'cancelado')),
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.sales
  add column if not exists status text not null default 'finalizado';

alter table public.sales
  drop constraint if exists sales_status_check;
alter table public.sales
  add constraint sales_status_check check (status in ('finalizado', 'cancelado'));

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

-- Tabela de despesas da CF Motos (tela independente, sem vínculo com as demais despesas)
create table if not exists public.cf_moto_expenses (
  id uuid primary key default gen_random_uuid(),
  description text not null,
  amount numeric(10, 2) not null default 0,
  start_date date not null,
  end_date date not null,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cf_moto_expenses_period_check check (end_date >= start_date)
);

create index if not exists cf_moto_expenses_start_date_idx on public.cf_moto_expenses (start_date desc);

drop trigger if exists set_cf_moto_expenses_updated_at on public.cf_moto_expenses;
create trigger set_cf_moto_expenses_updated_at
  before update on public.cf_moto_expenses
  for each row
  execute function public.set_updated_at();

-- RLS: qualquer usuário autenticado pode ler/escrever todas as despesas da CF Motos
alter table public.cf_moto_expenses enable row level security;

drop policy if exists "Authenticated users can manage cf moto expenses" on public.cf_moto_expenses;
create policy "Authenticated users can manage cf moto expenses"
  on public.cf_moto_expenses
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

-- Produtos da CF Motos (módulo de estoque, exclusivo desta loja)
create table if not exists public.cf_moto_products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sku text not null,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists cf_moto_products_sku_unique_idx
  on public.cf_moto_products (sku)
  where sku <> '';

create index if not exists cf_moto_products_name_idx on public.cf_moto_products (name);

drop trigger if exists set_cf_moto_products_updated_at on public.cf_moto_products;
create trigger set_cf_moto_products_updated_at
  before update on public.cf_moto_products
  for each row
  execute function public.set_updated_at();

alter table public.cf_moto_products enable row level security;

drop policy if exists "Authenticated users can manage cf moto products" on public.cf_moto_products;
create policy "Authenticated users can manage cf moto products"
  on public.cf_moto_products
  for all
  to authenticated
  using (true)
  with check (true);

-- Fornecedores da CF Motos (cadastro simples, próprio do módulo de estoque)
create table if not exists public.cf_moto_suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact text not null default '',
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists cf_moto_suppliers_name_idx on public.cf_moto_suppliers (name);

drop trigger if exists set_cf_moto_suppliers_updated_at on public.cf_moto_suppliers;
create trigger set_cf_moto_suppliers_updated_at
  before update on public.cf_moto_suppliers
  for each row
  execute function public.set_updated_at();

alter table public.cf_moto_suppliers enable row level security;

drop policy if exists "Authenticated users can manage cf moto suppliers" on public.cf_moto_suppliers;
create policy "Authenticated users can manage cf moto suppliers"
  on public.cf_moto_suppliers
  for all
  to authenticated
  using (true)
  with check (true);

-- Entradas de itens (extrato de compras) da CF Motos
create table if not exists public.cf_moto_stock_entries (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.cf_moto_products (id) on delete restrict,
  supplier_id uuid references public.cf_moto_suppliers (id) on delete set null,
  quantity numeric(10, 2) not null check (quantity > 0),
  unit_value numeric(10, 2) not null default 0 check (unit_value >= 0),
  entry_date date not null,
  notes text not null default '',
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);

create index if not exists cf_moto_stock_entries_product_id_idx on public.cf_moto_stock_entries (product_id);
create index if not exists cf_moto_stock_entries_entry_date_idx on public.cf_moto_stock_entries (entry_date desc);

alter table public.cf_moto_stock_entries enable row level security;

drop policy if exists "Authenticated users can manage cf moto stock entries" on public.cf_moto_stock_entries;
create policy "Authenticated users can manage cf moto stock entries"
  on public.cf_moto_stock_entries
  for all
  to authenticated
  using (true)
  with check (true);

-- Itens de venda da CF Motos (o que foi vendido, ligado ao produto do estoque)
create table if not exists public.cf_moto_sale_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.cf_moto_sales (id) on delete cascade,
  product_id uuid not null references public.cf_moto_products (id) on delete restrict,
  quantity numeric(10, 2) not null check (quantity > 0),
  unit_cost numeric(10, 2) not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists cf_moto_sale_items_sale_id_idx on public.cf_moto_sale_items (sale_id);
create index if not exists cf_moto_sale_items_product_id_idx on public.cf_moto_sale_items (product_id);

alter table public.cf_moto_sale_items enable row level security;

drop policy if exists "Authenticated users can manage cf moto sale items" on public.cf_moto_sale_items;
create policy "Authenticated users can manage cf moto sale items"
  on public.cf_moto_sale_items
  for all
  to authenticated
  using (true)
  with check (true);

-- Saídas manuais de estoque da CF Motos (ajuste de estoque, devolução ao
-- fornecedor, etc.) — não são vendas, mas também baixam a quantidade disponível.
create table if not exists public.cf_moto_stock_exits (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.cf_moto_products (id) on delete restrict,
  quantity numeric(10, 2) not null check (quantity > 0),
  reason text not null check (reason in ('ajuste_estoque', 'devolucao_fornecedor', 'outro')),
  exit_date date not null,
  notes text not null default '',
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);

create index if not exists cf_moto_stock_exits_product_id_idx on public.cf_moto_stock_exits (product_id);
create index if not exists cf_moto_stock_exits_exit_date_idx on public.cf_moto_stock_exits (exit_date desc);

alter table public.cf_moto_stock_exits enable row level security;

drop policy if exists "Authenticated users can manage cf moto stock exits" on public.cf_moto_stock_exits;
create policy "Authenticated users can manage cf moto stock exits"
  on public.cf_moto_stock_exits
  for all
  to authenticated
  using (true)
  with check (true);

-- View de estoque consolidado (quantidade, valor total, valor médio e última entrada por produto)
-- "quantidade" desconta as vendas e as saídas manuais. Já o "valor médio" é sempre o
-- custo médio de compra do produto (total comprado / quantidade comprada) e não
-- depende do saldo atual — continua mostrando o custo médio mesmo com estoque zerado,
-- pois ele representa "quanto em média aquele item é comprado", não o valor em estoque.
-- "last_entry_value" é o unit_value da entrada de estoque mais recente (por created_at),
-- usado como custo da venda em vez do valor médio.
create or replace view public.cf_moto_stock_summary
with (security_invoker = true) as
select
  p.id as product_id,
  p.name as product_name,
  p.sku as product_sku,
  coalesce(e.qty, 0) - coalesce(s.qty, 0) - coalesce(x.qty, 0) as quantity,
  case
    when coalesce(e.qty, 0) > 0
    then round((coalesce(e.qty, 0) - coalesce(s.qty, 0) - coalesce(x.qty, 0)) * (e.total_value / e.qty), 2)
    else 0
  end as total_value,
  case
    when coalesce(e.qty, 0) > 0
    then round(e.total_value / e.qty, 2)
    else 0
  end as average_value,
  coalesce(le.unit_value, 0) as last_entry_value
from public.cf_moto_products p
left join (
  select product_id, sum(quantity) as qty, sum(quantity * unit_value) as total_value
  from public.cf_moto_stock_entries
  group by product_id
) e on e.product_id = p.id
left join (
  select product_id, sum(quantity) as qty, sum(quantity * unit_cost) as total_cost
  from public.cf_moto_sale_items
  group by product_id
) s on s.product_id = p.id
left join (
  select product_id, sum(quantity) as qty
  from public.cf_moto_stock_exits
  group by product_id
) x on x.product_id = p.id
left join lateral (
  select se.unit_value
  from public.cf_moto_stock_entries se
  where se.product_id = p.id
  order by se.created_at desc
  limit 1
) le on true;

grant select on public.cf_moto_stock_summary to authenticated;

-- =========================================================================
-- Auto Peças LS: controle de estoque (produtos, entradas, itens de venda)
-- =========================================================================

-- Produtos cadastrados da Auto Peças LS
create table if not exists public.ls_products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sku text not null,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_ls_products_updated_at on public.ls_products;
create trigger set_ls_products_updated_at
  before update on public.ls_products
  for each row
  execute function public.set_updated_at();

alter table public.ls_products enable row level security;

drop policy if exists "Authenticated users can manage ls products" on public.ls_products;
create policy "Authenticated users can manage ls products"
  on public.ls_products
  for all
  to authenticated
  using (true)
  with check (true);

-- Entradas de itens (extrato de compras) da Auto Peças LS. O fornecedor reaproveita
-- o cadastro de Fornecedores já existente (supplier_accesses).
create table if not exists public.ls_stock_entries (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.ls_products (id) on delete restrict,
  supplier_id uuid references public.supplier_accesses (id) on delete set null,
  quantity numeric(10, 2) not null check (quantity > 0),
  unit_value numeric(10, 2) not null default 0 check (unit_value >= 0),
  entry_date date not null,
  notes text not null default '',
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);

create index if not exists ls_stock_entries_product_id_idx on public.ls_stock_entries (product_id);
create index if not exists ls_stock_entries_entry_date_idx on public.ls_stock_entries (entry_date desc);

alter table public.ls_stock_entries enable row level security;

drop policy if exists "Authenticated users can manage ls stock entries" on public.ls_stock_entries;
create policy "Authenticated users can manage ls stock entries"
  on public.ls_stock_entries
  for all
  to authenticated
  using (true)
  with check (true);

-- Itens de venda da Auto Peças LS (o que foi vendido, ligado ao produto do estoque).
-- Só existe para vendas registradas a partir da itemização por estoque; vendas
-- antigas continuam sem linhas aqui e usam o campo de texto livre "products".
create table if not exists public.ls_sale_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales (id) on delete cascade,
  product_id uuid not null references public.ls_products (id) on delete restrict,
  quantity numeric(10, 2) not null check (quantity > 0),
  unit_cost numeric(10, 2) not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists ls_sale_items_sale_id_idx on public.ls_sale_items (sale_id);
create index if not exists ls_sale_items_product_id_idx on public.ls_sale_items (product_id);

alter table public.ls_sale_items enable row level security;

drop policy if exists "Authenticated users can manage ls sale items" on public.ls_sale_items;
create policy "Authenticated users can manage ls sale items"
  on public.ls_sale_items
  for all
  to authenticated
  using (true)
  with check (true);

-- Saídas manuais de estoque da Auto Peças LS (ajuste de estoque, devolução ao
-- fornecedor, etc.) — não são vendas, mas também baixam a quantidade disponível.
create table if not exists public.ls_stock_exits (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.ls_products (id) on delete restrict,
  quantity numeric(10, 2) not null check (quantity > 0),
  reason text not null check (reason in ('ajuste_estoque', 'devolucao_fornecedor', 'outro')),
  exit_date date not null,
  notes text not null default '',
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);

create index if not exists ls_stock_exits_product_id_idx on public.ls_stock_exits (product_id);
create index if not exists ls_stock_exits_exit_date_idx on public.ls_stock_exits (exit_date desc);

alter table public.ls_stock_exits enable row level security;

drop policy if exists "Authenticated users can manage ls stock exits" on public.ls_stock_exits;
create policy "Authenticated users can manage ls stock exits"
  on public.ls_stock_exits
  for all
  to authenticated
  using (true)
  with check (true);

-- View de estoque consolidado (mesma lógica da cf_moto_stock_summary)
create or replace view public.ls_stock_summary
with (security_invoker = true) as
select
  p.id as product_id,
  p.name as product_name,
  p.sku as product_sku,
  coalesce(e.qty, 0) - coalesce(s.qty, 0) - coalesce(x.qty, 0) as quantity,
  case
    when coalesce(e.qty, 0) > 0
    then round((coalesce(e.qty, 0) - coalesce(s.qty, 0) - coalesce(x.qty, 0)) * (e.total_value / e.qty), 2)
    else 0
  end as total_value,
  case
    when coalesce(e.qty, 0) > 0
    then round(e.total_value / e.qty, 2)
    else 0
  end as average_value,
  coalesce(le.unit_value, 0) as last_entry_value
from public.ls_products p
left join (
  select product_id, sum(quantity) as qty, sum(quantity * unit_value) as total_value
  from public.ls_stock_entries
  group by product_id
) e on e.product_id = p.id
left join (
  select product_id, sum(quantity) as qty, sum(quantity * unit_cost) as total_cost
  from public.ls_sale_items
  group by product_id
) s on s.product_id = p.id
left join (
  select product_id, sum(quantity) as qty
  from public.ls_stock_exits
  group by product_id
) x on x.product_id = p.id
left join lateral (
  select se.unit_value
  from public.ls_stock_entries se
  where se.product_id = p.id
  order by se.created_at desc
  limit 1
) le on true;

grant select on public.ls_stock_summary to authenticated;

