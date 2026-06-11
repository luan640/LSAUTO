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
