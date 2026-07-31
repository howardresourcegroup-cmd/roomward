-- Roomward — Migration 015
-- Four capabilities that share one migration because they all extend the same
-- org/RLS spine:
--   1. Housekeeping room assignment — who is responsible for which room today.
--   2. Occupancy analytics — one settled row per night, plus forward forecast.
--   3. Food & Beverage — outlets, par-level stock, food-safety temperature logs.
--   4. Banquets — conference/event bookings against physical spaces.
-- Plus per-user dashboard layouts, so each person arranges their own home view.

-- ── 1. Housekeeping assignment ────────────────────────────────────────────────
alter table spaces add column if not exists housekeeper_id uuid references profiles(id) on delete set null;
alter table spaces add column if not exists housekeeping_assigned_at timestamptz;

comment on column spaces.housekeeper_id is 'Housekeeper responsible for this room; null = unassigned';

create index if not exists idx_spaces_housekeeper on spaces(housekeeper_id) where housekeeper_id is not null;

-- Audit who gets assigned what, reusing the 014 trigger helper.
create or replace function _audit_space_assignment()
returns trigger language plpgsql security definer set search_path = public, auth as $$
declare
  v_org  uuid;
  v_name text;
begin
  if old.housekeeper_id is not distinct from new.housekeeper_id then return new; end if;

  select b.organization_id into v_org
  from floors f join buildings b on b.id = f.building_id
  where f.id = new.floor_id;
  if v_org is null then return new; end if;

  if new.housekeeper_id is null then
    perform _log_audit(v_org, 'room.housekeeper_cleared', 'space', new.id, new.name, '{}');
  else
    select full_name into v_name from profiles where id = new.housekeeper_id;
    perform _log_audit(v_org, 'room.housekeeper_assigned', 'space', new.id, new.name,
      jsonb_build_object('housekeeper_id', new.housekeeper_id, 'housekeeper', v_name));
  end if;
  return new;
end $$;

drop trigger if exists trg_audit_space_assignment on spaces;
create trigger trg_audit_space_assignment
  after update on spaces
  for each row execute function _audit_space_assignment();

-- ── 2. Per-user dashboard layout ──────────────────────────────────────────────
-- Stored on the profile: it is personal preference, not org config, and it rides
-- along with the profile read the dashboard already performs.
alter table profiles add column if not exists dashboard_layout jsonb;

comment on column profiles.dashboard_layout is 'Per-user dashboard widget order/visibility; null = built-in default';

-- ── 3. Occupancy snapshots ────────────────────────────────────────────────────
-- One row per property per night. stay_date is the night begun, so the row for
-- 2026-07-29 is "the night of the 29th" — what a hotelier means by last night.
-- Future-dated rows are the forecast (is_actual = false).
create table if not exists occupancy_snapshots (
  id                   uuid        primary key default gen_random_uuid(),
  organization_id      uuid        not null references organizations(id) on delete cascade,
  building_id          uuid        references buildings(id) on delete cascade,
  stay_date            date        not null,
  rooms_total          integer     not null default 0,
  rooms_occupied       integer     not null default 0,
  rooms_out_of_service integer     not null default 0,
  arrivals             integer     not null default 0,
  departures           integer     not null default 0,
  adr_cents            integer,
  is_actual            boolean     not null default true,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  unique (organization_id, building_id, stay_date)
);

create index if not exists idx_occ_org_date on occupancy_snapshots(organization_id, stay_date desc);

alter table occupancy_snapshots enable row level security;

create policy "org members read occupancy" on occupancy_snapshots
  for select using (organization_id = my_org_id());

create policy "managers write occupancy" on occupancy_snapshots
  for all using (organization_id = my_org_id() and my_role() in ('admin','manager'));

-- ── 4. Food & Beverage ────────────────────────────────────────────────────────
create table if not exists fnb_outlets (
  id              uuid        primary key default gen_random_uuid(),
  organization_id uuid        not null references organizations(id) on delete cascade,
  space_id        uuid        references spaces(id) on delete set null,
  name            text        not null,
  kind            text        not null default 'restaurant'
                    check (kind in ('restaurant','bar','cafe','room_service','banquet_kitchen')),
  is_open         boolean     not null default true,
  opens_at        time,
  closes_at       time,
  seats           integer,
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists idx_fnb_outlets_org on fnb_outlets(organization_id);

create table if not exists fnb_inventory_items (
  id              uuid        primary key default gen_random_uuid(),
  organization_id uuid        not null references organizations(id) on delete cascade,
  outlet_id       uuid        references fnb_outlets(id) on delete set null,
  name            text        not null,
  category        text,
  unit            text        not null default 'each'
                    check (unit in ('each','case','lb','kg','liter','gallon','bottle')),
  on_hand         numeric(12,2) not null default 0,
  par_level       numeric(12,2) not null default 0,
  unit_cost_cents integer,
  supplier        text,
  last_counted_at timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists idx_fnb_inv_org on fnb_inventory_items(organization_id);

-- Food-safety temperature log. in_range is generated, never client-supplied, so
-- a failing reading cannot be recorded as a pass.
create table if not exists fnb_temp_logs (
  id              uuid        primary key default gen_random_uuid(),
  organization_id uuid        not null references organizations(id) on delete cascade,
  outlet_id       uuid        references fnb_outlets(id) on delete set null,
  asset_id        uuid        references assets(id) on delete set null,
  equipment_label text        not null,
  temp_f          numeric(6,2) not null,
  min_f           numeric(6,2) not null,
  max_f           numeric(6,2) not null,
  in_range        boolean     generated always as (temp_f >= min_f and temp_f <= max_f) stored,
  logged_by       uuid        references profiles(id) on delete set null,
  note            text,
  created_at      timestamptz not null default now()
);

create index if not exists idx_fnb_temp_org_time on fnb_temp_logs(organization_id, created_at desc);

alter table fnb_outlets          enable row level security;
alter table fnb_inventory_items  enable row level security;
alter table fnb_temp_logs        enable row level security;

create policy "org members read outlets" on fnb_outlets
  for select using (organization_id = my_org_id());
create policy "managers write outlets" on fnb_outlets
  for all using (organization_id = my_org_id() and my_role() in ('admin','manager'));

create policy "org members read fnb inventory" on fnb_inventory_items
  for select using (organization_id = my_org_id());
-- Stock counts are routine floor work, so any org member may adjust them.
create policy "org members write fnb inventory" on fnb_inventory_items
  for all using (organization_id = my_org_id());

create policy "org members read temp logs" on fnb_temp_logs
  for select using (organization_id = my_org_id());
-- Append-only by design: a temperature log that can be edited is not a record.
create policy "org members insert temp logs" on fnb_temp_logs
  for insert with check (organization_id = my_org_id());

-- ── 5. Banquets / conference rentals ──────────────────────────────────────────
create table if not exists banquet_events (
  id                uuid        primary key default gen_random_uuid(),
  organization_id   uuid        not null references organizations(id) on delete cascade,
  space_id          uuid        references spaces(id) on delete set null,
  name              text        not null,
  client_name       text        not null,
  client_email      text,
  client_phone      text,
  status            text        not null default 'inquiry'
                      check (status in ('inquiry','tentative','confirmed','in_progress','completed','cancelled')),
  setup_style       text        not null default 'banquet_rounds'
                      check (setup_style in ('theater','classroom','banquet_rounds','u_shape','boardroom','reception','hollow_square')),
  headcount         integer     not null default 0,
  starts_at         timestamptz not null,
  ends_at           timestamptz not null,
  setup_starts_at   timestamptz,
  teardown_ends_at  timestamptz,
  quoted_cents      integer,
  deposit_paid      boolean     not null default false,
  av_needs          text[]      not null default '{}',
  catering_notes    text,
  notes             text,
  created_by        uuid        references profiles(id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint banquet_time_order check (ends_at > starts_at)
);

create index if not exists idx_banquets_org_time on banquet_events(organization_id, starts_at);

alter table banquet_events enable row level security;

create policy "org members read banquets" on banquet_events
  for select using (organization_id = my_org_id());
create policy "managers write banquets" on banquet_events
  for all using (organization_id = my_org_id() and my_role() in ('admin','manager'));

-- ── 6. updated_at triggers ────────────────────────────────────────────────────
-- Postgres has no "create trigger if not exists"; drop first so a partial re-run
-- of this migration cannot fail on an already-created trigger.
drop trigger if exists trg_occ_updated      on occupancy_snapshots;
drop trigger if exists trg_outlets_updated  on fnb_outlets;
drop trigger if exists trg_fnbinv_updated   on fnb_inventory_items;
drop trigger if exists trg_banquets_updated on banquet_events;

create trigger trg_occ_updated       before update on occupancy_snapshots  for each row execute function update_updated_at();
create trigger trg_outlets_updated   before update on fnb_outlets          for each row execute function update_updated_at();
create trigger trg_fnbinv_updated    before update on fnb_inventory_items  for each row execute function update_updated_at();
create trigger trg_banquets_updated  before update on banquet_events       for each row execute function update_updated_at();

-- ── 7. Grant the new permissions to existing roles ────────────────────────────
-- Backfill by slug so orgs created before this migration gain the capabilities.
insert into role_permissions (role_id, permission)
select r.id, p
from roles r
cross join lateral (
  select unnest(
    case r.slug
      when 'admin'        then array['housekeeping.assign','reports.export','fnb.view','fnb.manage','banquets.view','banquets.manage']
      when 'manager'      then array['housekeeping.assign','reports.export','fnb.view','fnb.manage','banquets.view','banquets.manage']
      when 'housekeeping' then array['fnb.view']
      when 'front_desk'   then array['fnb.view','banquets.view']
      when 'hr'           then array['reports.export']
      when 'viewer'       then array['fnb.view','banquets.view']
      else array[]::text[]
    end
  ) as p
) as perms
on conflict do nothing;

-- ── 8. New orgs get the same defaults ─────────────────────────────────────────
create or replace function onboard_organization(org_name text, full_name text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  existing uuid;
  new_org uuid;
  base_slug text;
  r_admin uuid; r_manager uuid; r_maint uuid; r_hskp uuid; r_front uuid; r_hr uuid; r_viewer uuid;
begin
  if uid is null then raise exception 'Not authenticated'; end if;

  select organization_id into existing from profiles where id = uid;
  if existing is not null then return existing; end if;

  if org_name is null or btrim(org_name) = '' then
    raise exception 'Organization name is required';
  end if;

  base_slug := lower(regexp_replace(btrim(org_name), '[^a-zA-Z0-9]+', '-', 'g'));
  base_slug := btrim(base_slug, '-') || '-' || substr(replace(uid::text, '-', ''), 1, 6);

  insert into organizations (name, slug, plan)
  values (btrim(org_name), base_slug, 'starter')
  returning id into new_org;

  insert into roles (organization_id, name, slug, description, color, is_system) values
    (new_org, 'Administrator',    'admin',       'Full access to everything, including roles & settings',        'red',    true) returning id into r_admin;
  insert into roles (organization_id, name, slug, description, color, is_system) values
    (new_org, 'Manager',          'manager',     'Runs operations: work orders, team, buildings, integrations',  'indigo', true) returning id into r_manager;
  insert into roles (organization_id, name, slug, description, color, is_system) values
    (new_org, 'Maintenance Tech', 'maintenance', 'Field technician — works and closes assigned jobs',             'amber',  true) returning id into r_maint;
  insert into roles (organization_id, name, slug, description, color, is_system) values
    (new_org, 'Housekeeping',     'housekeeping','Updates room cleaning status, raises housekeeping issues',       'cyan',   true) returning id into r_hskp;
  insert into roles (organization_id, name, slug, description, color, is_system) values
    (new_org, 'Front Desk',       'front_desk',  'Logs guest-reported issues, views room status',                 'violet', true) returning id into r_front;
  insert into roles (organization_id, name, slug, description, color, is_system) values
    (new_org, 'HR',               'hr',          'Staff management: post announcements, push notifications, view audit', 'rose', true) returning id into r_hr;
  insert into roles (organization_id, name, slug, description, color, is_system) values
    (new_org, 'Viewer',           'viewer',      'Read-only access',                                              'zinc',   true) returning id into r_viewer;

  insert into role_permissions (role_id, permission) select r_admin, p from (values
    ('dashboard.view'),('buildings.view'),('buildings.create'),('buildings.edit'),('buildings.delete'),('buildings.edit_layout'),
    ('spaces.update_status'),('work_orders.view'),('work_orders.create'),('work_orders.edit'),('work_orders.assign'),('work_orders.complete'),('work_orders.delete'),
    ('team.view'),('team.manage'),('chat.participate'),('assets.view'),('assets.manage'),('reports.view'),('reports.export'),
    ('integrations.manage'),('settings.manage'),('roles.manage'),('announcements.manage'),
    ('housekeeping.assign'),('fnb.view'),('fnb.manage'),('banquets.view'),('banquets.manage')
  ) as t(p);

  insert into role_permissions (role_id, permission) select r_manager, p from (values
    ('dashboard.view'),('buildings.view'),('buildings.create'),('buildings.edit'),('buildings.edit_layout'),
    ('spaces.update_status'),('work_orders.view'),('work_orders.create'),('work_orders.edit'),('work_orders.assign'),('work_orders.complete'),('work_orders.delete'),
    ('team.view'),('team.manage'),('chat.participate'),('assets.view'),('assets.manage'),('reports.view'),('reports.export'),
    ('integrations.manage'),('settings.manage'),('roles.manage'),('announcements.manage'),
    ('housekeeping.assign'),('fnb.view'),('fnb.manage'),('banquets.view'),('banquets.manage')
  ) as t(p);

  insert into role_permissions (role_id, permission) select r_maint, p from (values
    ('dashboard.view'),('buildings.view'),('spaces.update_status'),
    ('work_orders.view'),('work_orders.edit'),('work_orders.complete'),
    ('team.view'),('chat.participate'),('assets.view')
  ) as t(p);

  insert into role_permissions (role_id, permission) select r_hskp, p from (values
    ('dashboard.view'),('buildings.view'),('spaces.update_status'),
    ('work_orders.view'),('work_orders.create'),('chat.participate'),('fnb.view')
  ) as t(p);

  insert into role_permissions (role_id, permission) select r_front, p from (values
    ('dashboard.view'),('buildings.view'),
    ('work_orders.view'),('work_orders.create'),('chat.participate'),
    ('fnb.view'),('banquets.view')
  ) as t(p);

  insert into role_permissions (role_id, permission) select r_hr, p from (values
    ('dashboard.view'),('buildings.view'),('work_orders.view'),
    ('team.view'),('team.manage'),('chat.participate'),('reports.view'),('reports.export'),('announcements.manage')
  ) as t(p);

  insert into role_permissions (role_id, permission) select r_viewer, p from (values
    ('dashboard.view'),('buildings.view'),('work_orders.view'),('team.view'),('assets.view'),('reports.view'),
    ('fnb.view'),('banquets.view')
  ) as t(p);

  update profiles set
    organization_id = new_org,
    role = 'admin',
    role_id = r_admin,
    full_name = coalesce(nullif(btrim(coalesce(onboard_organization.full_name, '')), ''), profiles.full_name)
  where id = uid;

  return new_org;
end $$;

grant execute on function onboard_organization(text, text) to authenticated;

-- ── 9. Demo seed for the new areas ────────────────────────────────────────────
-- Kept as its own function and called from start_demo, so _seed_demo_property
-- (migration 014) stays untouched.
create or replace function _seed_demo_ops(p_org uuid, p_owner uuid)
returns void language plpgsql security definer set search_path = public, auth as $$
declare
  v_building uuid;
  v_f1 uuid;
  v_rest uuid; v_bar uuid;
  v_hall uuid; v_dining uuid;
  u_maria uuid;
  d date;
  v_total int := 12;
  v_occ int;
begin
  select id into v_building from buildings where organization_id = p_org limit 1;
  if v_building is null then return; end if;
  select id into u_maria from profiles where organization_id = p_org and full_name = 'Maria Delgado' limit 1;

  select id into v_f1 from floors where building_id = v_building order by level limit 1;

  -- Real event spaces, so banquets attach to a ballroom rather than a guest room.
  insert into spaces (floor_id, name, type, status, position_x, position_y, width, height)
  values (v_f1, 'Grand Ballroom', 'event_space', 'operational', 1, 4, 6, 3)
  returning id into v_hall;
  insert into spaces (floor_id, name, type, status, position_x, position_y, width, height)
  values (v_f1, 'Conference Room B', 'event_space', 'operational', 8, 4, 3, 2);
  insert into spaces (floor_id, name, type, status, position_x, position_y, width, height)
  values (v_f1, 'Riverside Grill', 'dining', 'operational', 12, 4, 2, 3)
  returning id into v_dining;

  -- Give Maria a room board so the assignment view has something to show.
  if u_maria is not null then
    update spaces set housekeeper_id = u_maria, housekeeping_assigned_at = now()
    where floor_id in (select id from floors where building_id = v_building)
      and name in ('Room 103', 'Room 105', 'Room 106', 'Room 205');
  end if;

  -- Occupancy: 45 nights of settled history + 14 nights of forecast.
  -- Weekends run hotter, which makes the trend line read like a real property.
  for d in select generate_series(current_date - 45, current_date + 14, '1 day')::date loop
    v_occ := case when extract(dow from d) in (5, 6) then 9 + (extract(day from d)::int % 3)
                  else 5 + (extract(day from d)::int % 4) end;
    if v_occ > v_total then v_occ := v_total; end if;

    insert into occupancy_snapshots (
      organization_id, building_id, stay_date, rooms_total, rooms_occupied,
      rooms_out_of_service, arrivals, departures, adr_cents, is_actual
    ) values (
      p_org, v_building, d, v_total, v_occ,
      case when d = current_date then 1 else 0 end,
      greatest(0, v_occ - 3), greatest(0, v_occ - 4),
      case when extract(dow from d) in (5, 6) then 21900 else 16400 end,
      d < current_date
    )
    on conflict (organization_id, building_id, stay_date) do nothing;
  end loop;

  -- F&B outlets
  insert into fnb_outlets (organization_id, space_id, name, kind, is_open, opens_at, closes_at, seats, notes)
  values (p_org, v_dining, 'Riverside Grill', 'restaurant', true, '06:30', '22:00', 84, 'Main dining room, breakfast through dinner.')
  returning id into v_rest;
  insert into fnb_outlets (organization_id, name, kind, is_open, opens_at, closes_at, seats, notes)
  values (p_org, 'The Overlook Bar', 'bar', true, '16:00', '01:00', 40, 'Rooftop bar; closes early in bad weather.')
  returning id into v_bar;
  insert into fnb_outlets (organization_id, name, kind, is_open, opens_at, closes_at, seats)
  values (p_org, 'Lobby Cafe', 'cafe', true, '06:00', '14:00', 18);
  insert into fnb_outlets (organization_id, name, kind, is_open, opens_at, closes_at, seats)
  values (p_org, 'In-Room Dining', 'room_service', true, '06:00', '23:00', null);

  -- Inventory — a few deliberately below par so the reorder view has content.
  insert into fnb_inventory_items (organization_id, outlet_id, name, category, unit, on_hand, par_level, unit_cost_cents, supplier, last_counted_at) values
    (p_org, v_rest, 'Whole milk',            'dairy',     'gallon', 3,  12, 480,  'Sysco',          now() - interval '1 day'),
    (p_org, v_rest, 'Eggs, large',           'dairy',     'case',   2,  6,  3200, 'Sysco',          now() - interval '1 day'),
    (p_org, v_rest, 'Coffee beans, house',   'dry goods', 'lb',     18, 25, 1150, 'Counter Culture',now() - interval '2 days'),
    (p_org, v_rest, 'Romaine hearts',        'produce',   'case',   1,  4,  2800, 'Local Produce',  now() - interval '1 day'),
    (p_org, v_rest, 'Ribeye, 12oz',          'protein',   'each',   26, 20, 1420, 'Halperns',       now() - interval '3 days'),
    (p_org, v_bar,  'Tito''s Vodka 1L',      'liquor',    'bottle', 4,  9,  2400, 'Empire',         now() - interval '4 days'),
    (p_org, v_bar,  'Tonic water',           'mixer',     'case',   7,  6,  1900, 'Empire',         now() - interval '4 days'),
    (p_org, v_bar,  'Limes',                 'produce',   'lb',     2,  8,  240,  'Local Produce',  now() - interval '1 day');

  -- Temperature logs, including one failing reading (walk-in drifting warm).
  insert into fnb_temp_logs (organization_id, outlet_id, equipment_label, temp_f, min_f, max_f, logged_by, note, created_at) values
    (p_org, v_rest, 'Walk-in cooler',    38.0, 33, 41, u_maria, null,                              now() - interval '7 hours'),
    (p_org, v_rest, 'Walk-in freezer',   -2.0, -10, 5, u_maria, null,                              now() - interval '7 hours'),
    (p_org, v_rest, 'Line reach-in',     44.5, 33, 41, u_maria, 'Door seal looks worn — WO filed.', now() - interval '3 hours'),
    (p_org, v_bar,  'Bar cooler',        39.0, 33, 41, u_maria, null,                              now() - interval '2 hours'),
    (p_org, v_rest, 'Hot line steam well',152.0, 140, 180, u_maria, null,                          now() - interval '1 hour');

  -- Banquets — one live today, plus forward bookings.
  insert into banquet_events (
    organization_id, space_id, name, client_name, client_email, status, setup_style,
    headcount, starts_at, ends_at, setup_starts_at, teardown_ends_at,
    quoted_cents, deposit_paid, av_needs, catering_notes, created_by
  ) values
    (p_org, v_hall, 'Dawsonville Chamber Luncheon', 'Dawsonville Chamber of Commerce', 'events@dawsonvillechamber.org',
     'in_progress', 'banquet_rounds', 90,
     date_trunc('day', now()) + interval '11 hours', date_trunc('day', now()) + interval '14 hours',
     date_trunc('day', now()) + interval '8 hours',  date_trunc('day', now()) + interval '15 hours',
     450000, true, array['projector','lectern','mics: 2'], 'Plated lunch, 6 vegetarian, 2 gluten-free.', p_owner),

    (p_org, v_hall, 'Hartwell / Boyd Wedding Reception', 'Alicia Hartwell', 'alicia.hartwell@example.com',
     'confirmed', 'reception', 140,
     date_trunc('day', now()) + interval '9 days 17 hours', date_trunc('day', now()) + interval '9 days 23 hours',
     date_trunc('day', now()) + interval '9 days 12 hours', date_trunc('day', now()) + interval '10 days 1 hour',
     1280000, true, array['dance floor','uplighting','wireless mic'], 'Buffet, late-night snack at 10pm.', p_owner),

    (p_org, v_hall, 'Northstar Logistics — Q3 Sales Offsite', 'Northstar Logistics', 'ops@northstarlog.example.com',
     'confirmed', 'classroom', 45,
     date_trunc('day', now()) + interval '16 days 8 hours', date_trunc('day', now()) + interval '16 days 17 hours',
     date_trunc('day', now()) + interval '16 days 6 hours', date_trunc('day', now()) + interval '16 days 18 hours',
     620000, false, array['projector','flip charts','power drops'], 'Continental breakfast + working lunch.', p_owner),

    (p_org, v_hall, 'Gaines 60th Birthday', 'Marcus Gaines', 'mgaines@example.com',
     'tentative', 'reception', 60,
     date_trunc('day', now()) + interval '24 days 18 hours', date_trunc('day', now()) + interval '24 days 22 hours',
     null, null, 310000, false, array['bluetooth audio'], 'Passed apps, cash bar.', p_owner),

    (p_org, v_hall, 'Regional Board Meeting', 'Appalachian Health Partners', null,
     'inquiry', 'boardroom', 14,
     date_trunc('day', now()) + interval '31 days 9 hours', date_trunc('day', now()) + interval '31 days 12 hours',
     null, null, null, false, array['video conferencing'], null, p_owner);
end $$;

create or replace function start_demo()
returns uuid language plpgsql security definer set search_path = public, auth as $$
declare
  v_uid uuid := auth.uid();
  v_org uuid;
  v_existing uuid;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;

  select organization_id into v_existing from profiles where id = v_uid;
  if v_existing is not null then return v_existing; end if;

  insert into organizations (name, slug, plan, is_demo, demo_expires_at)
  values ('Grandview Demo Hotel', 'demo-' || replace(v_uid::text, '-', ''), 'pro', true, now() + interval '24 hours')
  returning id into v_org;

  update profiles set organization_id = v_org, role = 'admin', full_name = 'Demo Manager' where id = v_uid;

  insert into roles (organization_id, name, slug, description, color, is_system) values
    (v_org, 'Administrator',    'admin',       'Full access',                                        'red',    true),
    (v_org, 'Manager',          'manager',     'Runs operations',                                    'indigo', true),
    (v_org, 'Maintenance Tech', 'maintenance', 'Field technician',                                   'amber',  true),
    (v_org, 'Housekeeping',     'housekeeping','Room cleaning',                                       'cyan',   true),
    (v_org, 'Front Desk',       'front_desk',  'Guest issues',                                        'violet', true),
    (v_org, 'HR',               'hr',          'Staff management, announcements, audit visibility',  'rose',   true),
    (v_org, 'Viewer',           'viewer',      'Read-only',                                          'zinc',   true);

  perform _seed_demo_property(v_org, v_uid);
  perform _seed_demo_ops(v_org, v_uid);
  return v_org;
end $$;

revoke all on function start_demo() from public;
grant execute on function start_demo() to authenticated;
