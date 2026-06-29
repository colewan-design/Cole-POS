-- ============================================================
-- ColePOS — Supabase / Postgres Schema
-- Run this in the Supabase SQL editor to set up the database.
-- ============================================================

create extension if not exists "pgcrypto";

-- ── Organizations & Stores ────────────────────────────────────────────────────

create table if not exists organizations (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  slug       text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists stores (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name            text not null,
  code            text not null,
  created_at      timestamptz not null default now(),
  unique (organization_id, code)
);

-- ── Users & Devices ───────────────────────────────────────────────────────────

create table if not exists users (
  id              uuid primary key references auth.users(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  full_name       text not null,
  username        text not null,
  status          text not null default 'active',
  created_at      timestamptz not null default now(),
  unique (organization_id, username)
);

create table if not exists devices (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  store_id        uuid not null references stores(id) on delete cascade,
  device_name     text not null,
  platform        text not null default 'web',
  app_version     text,
  pairing_code    text not null,
  status          text not null default 'active',
  last_seen_at    timestamptz,
  activated_at    timestamptz,
  created_at      timestamptz not null default now()
);

-- ── Memberships ───────────────────────────────────────────────────────────────

create table if not exists organization_memberships (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id         uuid not null references users(id) on delete cascade,
  role_key        text not null default 'cashier',
  unique (organization_id, user_id)
);

create table if not exists store_memberships (
  id       uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores(id) on delete cascade,
  user_id  uuid not null references users(id) on delete cascade,
  role_key text not null default 'cashier',
  unique (store_id, user_id)
);

-- ── Roles ─────────────────────────────────────────────────────────────────────

create table if not exists pos_roles (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  role_key        text not null,
  name            text not null,
  permissions     jsonb not null default '{}',
  deleted_at      timestamptz,
  created_at      timestamptz not null default now(),
  unique (organization_id, role_key)
);

-- ── Catalog ───────────────────────────────────────────────────────────────────

create table if not exists categories (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name            text not null,
  sort_order      int not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table if not exists products (
  id                    uuid primary key default gen_random_uuid(),
  organization_id       uuid not null references organizations(id) on delete cascade,
  category_id           uuid references categories(id) on delete set null,
  sku                   text not null,
  barcode               text not null default '',
  name                  text not null,
  product_type          text not null default 'standard',
  tax_rate              numeric(6,4) not null default 0.12,
  price_cents           int not null default 0,
  unit_label            text,
  image_url             text,
  image_attribution_url text,
  track_inventory       boolean not null default false,
  out_of_stock          boolean not null default false,
  low_stock_threshold   int,
  business_modes        text[] not null default '{}',
  is_active             boolean not null default true,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  unique (organization_id, sku)
);

-- ── Inventory ─────────────────────────────────────────────────────────────────

create table if not exists inventory_levels (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  store_id        uuid not null references stores(id) on delete cascade,
  product_id      uuid not null references products(id) on delete cascade,
  qty_on_hand     numeric(12,3) not null default 0,
  reorder_level   numeric(12,3),
  updated_at      timestamptz not null default now(),
  unique (store_id, product_id)
);

create table if not exists inventory_adjustments (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  store_id        uuid not null references stores(id) on delete cascade,
  device_id       uuid references devices(id),
  product_id      uuid not null references products(id) on delete cascade,
  order_id        uuid,
  adjustment_type text not null,
  quantity_delta  numeric(12,3) not null,
  reason          text,
  created_at      timestamptz not null default now()
);

-- ── Orders ────────────────────────────────────────────────────────────────────

create table if not exists orders (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  store_id        uuid not null references stores(id) on delete cascade,
  device_id       uuid references devices(id),
  user_id         uuid references users(id),
  ticket_number   text not null,
  business_mode   text not null,
  order_type      text not null,
  payment_method  text not null,
  subtotal_cents  int not null default 0,
  tax_cents       int not null default 0,
  total_cents     int not null default 0,
  tendered_cents  int not null default 0,
  change_cents    int not null default 0,
  completed_at    timestamptz not null default now(),
  created_at      timestamptz not null default now()
);

create table if not exists order_items (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references organizations(id) on delete cascade,
  store_id         uuid not null references stores(id) on delete cascade,
  order_id         uuid not null references orders(id) on delete cascade,
  product_id       uuid references products(id) on delete set null,
  product_name     text not null,
  quantity         numeric(12,3) not null default 1,
  unit_price_cents int not null default 0,
  line_total_cents int not null default 0,
  created_at       timestamptz not null default now()
);

-- ── Shifts & Cash ─────────────────────────────────────────────────────────────

create table if not exists shifts (
  id                  uuid primary key default gen_random_uuid(),
  organization_id     uuid not null references organizations(id) on delete cascade,
  store_id            uuid not null references stores(id) on delete cascade,
  device_id           uuid references devices(id),
  opened_by_user_id   uuid references users(id),
  closed_by_user_id   uuid references users(id),
  opening_cash_cents  int not null default 0,
  closing_cash_cents  int,
  cash_sales_cents    int not null default 0,
  pay_ins_cents       int not null default 0,
  pay_outs_cents      int not null default 0,
  expected_cash_cents int not null default 0,
  variance_cash_cents int,
  opened_at           timestamptz not null default now(),
  closed_at           timestamptz
);

create table if not exists cash_movements (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  store_id        uuid not null references stores(id) on delete cascade,
  shift_id        uuid not null references shifts(id) on delete cascade,
  user_id         uuid references users(id),
  movement_type   text not null,
  amount_cents    int not null,
  reason          text,
  created_at      timestamptz not null default now()
);

-- ── Sync helpers ──────────────────────────────────────────────────────────────

create table if not exists sync_events (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  store_id        uuid not null references stores(id) on delete cascade,
  device_id       uuid references devices(id),
  entity_type     text not null,
  entity_id       uuid not null,
  operation       text not null,
  payload         jsonb not null default '{}',
  idempotency_key text not null unique,
  received_at     timestamptz not null default now(),
  applied_at      timestamptz
);

create table if not exists sync_cursors (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  store_id        uuid not null references stores(id) on delete cascade,
  device_id       uuid references devices(id),
  cursor_name     text not null,
  cursor_value    text not null,
  updated_at      timestamptz not null default now(),
  unique (device_id, cursor_name)
);

-- ── updated_at triggers ───────────────────────────────────────────────────────

create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_categories_updated_at before update on categories  for each row execute function set_updated_at();
create trigger trg_products_updated_at   before update on products    for each row execute function set_updated_at();
create trigger trg_inv_levels_updated_at before update on inventory_levels for each row execute function set_updated_at();

-- ── Inventory deduction trigger ───────────────────────────────────────────────
-- Fires when order_items are inserted. Deducts from inventory_levels and
-- records an inventory_adjustment of type 'sale'. Only runs when
-- the product has track_inventory = true.

create or replace function deduct_inventory_on_order_item()
returns trigger language plpgsql as $$
declare
  v_track boolean;
begin
  select track_inventory into v_track from products where id = new.product_id;

  if v_track then
    insert into inventory_levels (organization_id, store_id, product_id, qty_on_hand)
    values (new.organization_id, new.store_id, new.product_id, -new.quantity)
    on conflict (store_id, product_id) do update
      set qty_on_hand = inventory_levels.qty_on_hand - new.quantity,
          updated_at  = now();

    insert into inventory_adjustments
      (organization_id, store_id, product_id, order_id, adjustment_type, quantity_delta)
    values
      (new.organization_id, new.store_id, new.product_id, new.order_id, 'sale', -new.quantity);
  end if;

  return new;
end;
$$;

create trigger trg_deduct_inventory
after insert on order_items
for each row execute function deduct_inventory_on_order_item();

-- ── Cash sales accumulator trigger ────────────────────────────────────────────
-- When a cash order is inserted, add its total to the open shift for that store.

create or replace function accumulate_cash_sales()
returns trigger language plpgsql as $$
begin
  if new.payment_method = 'cash' then
    update shifts
    set cash_sales_cents    = cash_sales_cents + new.total_cents,
        expected_cash_cents = expected_cash_cents + new.total_cents
    where store_id  = new.store_id
      and closed_at is null
    order by opened_at desc
    limit 1;
  end if;
  return new;
end;
$$;

create trigger trg_accumulate_cash_sales
after insert on orders
for each row execute function accumulate_cash_sales();

-- ── Row Level Security ────────────────────────────────────────────────────────
-- Uses auth.uid() and organization_memberships to scope every query to one org.
-- Staff log in with username@orgSlug.pos synthetic emails via Supabase Auth.

alter table organizations          enable row level security;
alter table stores                 enable row level security;
alter table users                  enable row level security;
alter table devices                enable row level security;
alter table organization_memberships enable row level security;
alter table store_memberships      enable row level security;
alter table pos_roles              enable row level security;
alter table categories             enable row level security;
alter table products               enable row level security;
alter table inventory_levels       enable row level security;
alter table inventory_adjustments  enable row level security;
alter table orders                 enable row level security;
alter table order_items            enable row level security;
alter table shifts                 enable row level security;
alter table cash_movements         enable row level security;
alter table sync_events            enable row level security;
alter table sync_cursors           enable row level security;

-- Helper: returns the organization_id for the current authenticated user.
-- Cached within the transaction (STABLE).
create or replace function user_org_id() returns uuid language sql stable as $$
  select organization_id
  from   organization_memberships
  where  user_id = auth.uid()
  limit  1
$$;

-- Organizations: read-only, any authenticated user may look up orgs by slug
-- so the client can resolve org_id from organizationSlug on login.
create policy "org_read" on organizations for select
  using (auth.uid() is not null);

-- Users: read/insert/update own org only
create policy "users_read"   on users for select using (organization_id = user_org_id());
create policy "users_insert" on users for insert with check (id = auth.uid());
create policy "users_update" on users for update using (id = auth.uid());

-- Memberships: read own org; insert allowed for bootstrap (first member) or by admins
create policy "memberships_read" on organization_memberships for select
  using (organization_id = user_org_id());

create policy "memberships_insert" on organization_memberships for insert
  with check (
    -- Bootstrap: first member of this org
    not exists (
      select 1 from organization_memberships
      where organization_id = new.organization_id
    )
    or
    -- Or: the inserter is already an admin
    exists (
      select 1 from organization_memberships
      where organization_id = new.organization_id
        and user_id          = auth.uid()
        and role_key         = 'admin'
    )
  );

create policy "memberships_update" on organization_memberships for update
  using (organization_id = user_org_id());

-- Generic org-isolation policy for all remaining tables
do $$
declare
  t text;
begin
  foreach t in array array[
    'stores','devices','store_memberships','pos_roles',
    'categories','products','inventory_levels','inventory_adjustments',
    'orders','order_items','shifts','cash_movements','sync_events','sync_cursors'
  ] loop
    execute format(
      'create policy org_isolation on %I using (organization_id = user_org_id())',
      t
    );
  end loop;
end;
$$;

-- ── Seed: first organization and store ────────────────────────────────────────
-- Edit these values and uncomment before running to bootstrap your first org.
--
-- insert into organizations (id, name, slug) values
--   ('00000000-0000-0000-0000-000000000001', 'Demo Coffee', 'demo-coffee');
--
-- insert into stores (id, organization_id, name, code) values
--   ('00000000-0000-0000-0000-000000000002',
--    '00000000-0000-0000-0000-000000000001',
--    'Main Branch', 'main');
