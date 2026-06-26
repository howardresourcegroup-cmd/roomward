-- Roomward — Initial Schema
-- Run this in your Supabase SQL editor

create extension if not exists "uuid-ossp";

-- ─── Organizations ───────────────────────────────────────────────────────────
create table organizations (
  id           uuid primary key default uuid_generate_v4(),
  name         text not null,
  slug         text unique not null,
  plan         text default 'starter' check (plan in ('starter', 'pro', 'enterprise')),
  settings     jsonb default '{}',
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

-- ─── Profiles ────────────────────────────────────────────────────────────────
create table profiles (
  id               uuid primary key references auth.users(id) on delete cascade,
  organization_id  uuid references organizations(id) on delete cascade,
  full_name        text not null default '',
  avatar_url       text,
  role             text default 'viewer' check (role in ('admin','manager','technician','viewer')),
  phone            text,
  is_available     boolean default true,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

-- ─── Buildings ───────────────────────────────────────────────────────────────
create table buildings (
  id               uuid primary key default uuid_generate_v4(),
  organization_id  uuid not null references organizations(id) on delete cascade,
  name             text not null,
  address          text,
  city             text,
  state            text,
  type             text default 'office',
  image_url        text,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

-- ─── Floors ──────────────────────────────────────────────────────────────────
create table floors (
  id           uuid primary key default uuid_generate_v4(),
  building_id  uuid not null references buildings(id) on delete cascade,
  name         text not null,
  level        integer not null default 1,
  grid_cols    integer default 12,
  grid_rows    integer default 8,
  created_at   timestamptz default now()
);

-- ─── Spaces ──────────────────────────────────────────────────────────────────
create table spaces (
  id           uuid primary key default uuid_generate_v4(),
  floor_id     uuid not null references floors(id) on delete cascade,
  name         text not null,
  type         text default 'office',
  status       text default 'operational' check (status in (
                 'operational','needs_maintenance','offline',
                 'cleaning_required','inspection_due','emergency'
               )),
  position_x   integer default 1,
  position_y   integer default 1,
  width        integer default 1,
  height       integer default 1,
  qr_code      text,
  notes        text,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

-- ─── Assets ──────────────────────────────────────────────────────────────────
create table assets (
  id                    uuid primary key default uuid_generate_v4(),
  space_id              uuid references spaces(id) on delete set null,
  organization_id       uuid not null references organizations(id) on delete cascade,
  name                  text not null,
  type                  text,
  model                 text,
  serial_number         text,
  status                text default 'operational' check (status in ('operational','degraded','failed','maintenance')),
  last_maintenance_at   timestamptz,
  next_maintenance_at   timestamptz,
  created_at            timestamptz default now(),
  updated_at            timestamptz default now()
);

-- ─── Work Orders ─────────────────────────────────────────────────────────────
create table work_orders (
  id               uuid primary key default uuid_generate_v4(),
  organization_id  uuid not null references organizations(id) on delete cascade,
  space_id         uuid references spaces(id) on delete set null,
  asset_id         uuid references assets(id) on delete set null,
  created_by       uuid not null references profiles(id),
  assigned_to      uuid references profiles(id) on delete set null,
  title            text not null,
  description      text,
  status           text default 'open' check (status in (
                     'open','assigned','in_progress','waiting_parts','completed','cancelled'
                   )),
  priority         text default 'medium' check (priority in ('low','medium','high','critical')),
  category         text default 'general',
  photos           text[] default '{}',
  due_date         timestamptz,
  completed_at     timestamptz,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

-- ─── Work Order Comments ─────────────────────────────────────────────────────
create table work_order_comments (
  id              uuid primary key default uuid_generate_v4(),
  work_order_id   uuid not null references work_orders(id) on delete cascade,
  author_id       uuid not null references profiles(id),
  content         text not null,
  photos          text[] default '{}',
  created_at      timestamptz default now()
);

-- ─── Technician Assignments ──────────────────────────────────────────────────
create table technician_assignments (
  id              uuid primary key default uuid_generate_v4(),
  work_order_id   uuid not null references work_orders(id) on delete cascade,
  technician_id   uuid not null references profiles(id),
  assigned_at     timestamptz default now(),
  started_at      timestamptz,
  completed_at    timestamptz,
  notes           text
);

-- ─── Notifications ───────────────────────────────────────────────────────────
create table notifications (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references profiles(id) on delete cascade,
  title       text not null,
  body        text,
  type        text default 'system' check (type in ('work_order','alert','system')),
  read        boolean default false,
  data        jsonb default '{}',
  created_at  timestamptz default now()
);

-- ─── Indexes ─────────────────────────────────────────────────────────────────
create index on buildings(organization_id);
create index on floors(building_id);
create index on spaces(floor_id);
create index on spaces(status);
create index on work_orders(organization_id);
create index on work_orders(assigned_to);
create index on work_orders(status);
create index on work_orders(priority);
create index on work_orders(created_at desc);
create index on notifications(user_id, read);

-- ─── updated_at trigger ──────────────────────────────────────────────────────
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger trg_organizations_updated before update on organizations for each row execute function update_updated_at();
create trigger trg_profiles_updated      before update on profiles      for each row execute function update_updated_at();
create trigger trg_buildings_updated     before update on buildings     for each row execute function update_updated_at();
create trigger trg_spaces_updated        before update on spaces        for each row execute function update_updated_at();
create trigger trg_work_orders_updated   before update on work_orders   for each row execute function update_updated_at();
create trigger trg_assets_updated        before update on assets        for each row execute function update_updated_at();

-- ─── Row Level Security ──────────────────────────────────────────────────────
alter table organizations        enable row level security;
alter table profiles             enable row level security;
alter table buildings            enable row level security;
alter table floors               enable row level security;
alter table spaces               enable row level security;
alter table assets               enable row level security;
alter table work_orders          enable row level security;
alter table work_order_comments  enable row level security;
alter table technician_assignments enable row level security;
alter table notifications        enable row level security;

-- helper
create or replace function my_org_id()
returns uuid language sql stable security definer as $$
  select organization_id from profiles where id = auth.uid()
$$;

create or replace function my_role()
returns text language sql stable security definer as $$
  select role from profiles where id = auth.uid()
$$;

-- Organizations
create policy "view own org"     on organizations for select using (id = my_org_id());

-- Profiles
create policy "view org members" on profiles for select using (organization_id = my_org_id());
create policy "update own"       on profiles for update using (id = auth.uid());

-- Buildings
create policy "view buildings"   on buildings for select using (organization_id = my_org_id());
create policy "manage buildings" on buildings for all    using (organization_id = my_org_id() and my_role() in ('admin','manager'));

-- Floors
create policy "view floors"      on floors for select using (building_id in (select id from buildings where organization_id = my_org_id()));
create policy "manage floors"    on floors for all    using (building_id in (select id from buildings where organization_id = my_org_id()) and my_role() in ('admin','manager'));

-- Spaces
create policy "view spaces"      on spaces for select using (floor_id in (select f.id from floors f join buildings b on b.id = f.building_id where b.organization_id = my_org_id()));
create policy "manage spaces"    on spaces for all    using (floor_id in (select f.id from floors f join buildings b on b.id = f.building_id where b.organization_id = my_org_id()) and my_role() in ('admin','manager'));
create policy "tech update status" on spaces for update using (floor_id in (select f.id from floors f join buildings b on b.id = f.building_id where b.organization_id = my_org_id()));

-- Work Orders
create policy "view work orders"   on work_orders for select using (organization_id = my_org_id());
create policy "create work orders" on work_orders for insert with check (organization_id = my_org_id());
create policy "update work orders" on work_orders for update using (organization_id = my_org_id() and (assigned_to = auth.uid() or my_role() in ('admin','manager')));
create policy "delete work orders" on work_orders for delete using (organization_id = my_org_id() and my_role() in ('admin','manager'));

-- Comments
create policy "view comments"   on work_order_comments for select using (work_order_id in (select id from work_orders where organization_id = my_org_id()));
create policy "add comments"    on work_order_comments for insert with check (author_id = auth.uid() and work_order_id in (select id from work_orders where organization_id = my_org_id()));

-- Notifications
create policy "view own notifs"   on notifications for select using (user_id = auth.uid());
create policy "update own notifs" on notifications for update using (user_id = auth.uid());

-- ─── Auto-create profile on signup ───────────────────────────────────────────
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ─── Realtime ─────────────────────────────────────────────────────────────────
alter publication supabase_realtime add table spaces;
alter publication supabase_realtime add table work_orders;
alter publication supabase_realtime add table notifications;
alter publication supabase_realtime add table profiles;
