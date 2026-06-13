-- Roomward — Migration 014
-- Corporate layer: audit trail + announcements + HR role.
--
-- Everything at this level is transparent within the org:
--   · Any org member can read audit_logs and announcements.
--   · Only admins, managers, and the new HR role can post announcements.
--   · Audit entries are written exclusively by security-definer triggers —
--     no row-level-insert policy exists, so clients can never fake an entry.

-- ── 1. Extend the role constraint to include 'hr' ─────────────────────────────
alter table profiles drop constraint if exists profiles_role_check;
alter table profiles add constraint profiles_role_check
  check (role in ('admin','manager','technician','viewer','hr'));

-- ── 2. Audit log ──────────────────────────────────────────────────────────────
create table if not exists audit_logs (
  id              uuid        primary key default gen_random_uuid(),
  organization_id uuid        not null references organizations(id) on delete cascade,
  actor_id        uuid        references profiles(id) on delete set null,
  actor_name      text,                           -- denormalized for deleted actors
  action          text        not null,            -- e.g. 'work_order.created'
  resource_type   text,                           -- 'work_order' | 'space' | 'profile'
  resource_id     uuid,
  resource_label  text,                           -- denormalized display name
  meta            jsonb       not null default '{}',
  created_at      timestamptz not null default now()
);

create index if not exists idx_audit_org_time on audit_logs(organization_id, created_at desc);

alter table audit_logs enable row level security;

-- All org members can read; only the system (security definer) writes.
create policy "org members read audit" on audit_logs
  for select using (
    organization_id in (
      select organization_id from profiles where id = auth.uid()
    )
  );

-- ── 3. Announcements ──────────────────────────────────────────────────────────
create table if not exists announcements (
  id              uuid        primary key default gen_random_uuid(),
  organization_id uuid        not null references organizations(id) on delete cascade,
  author_id       uuid        references profiles(id) on delete set null,
  title           text        not null,
  body            text        not null,
  target_roles    text[]      not null default '{}',   -- empty = all org members
  pinned          boolean     not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists idx_ann_org_time on announcements(organization_id, created_at desc);

alter table announcements enable row level security;

create policy "org members read announcements" on announcements
  for select using (
    organization_id in (
      select organization_id from profiles where id = auth.uid()
    )
  );

create policy "admin manager hr post announcements" on announcements
  for insert with check (
    exists (
      select 1 from profiles
      where id = auth.uid()
        and organization_id = announcements.organization_id
        and role in ('admin', 'manager', 'hr')
    )
  );

create policy "author updates own announcement" on announcements
  for update using (author_id = auth.uid());

create policy "admin deletes announcements" on announcements
  for delete using (
    exists (
      select 1 from profiles
      where id = auth.uid()
        and organization_id = announcements.organization_id
        and role = 'admin'
    )
  );

-- ── 4. Audit helper (security definer — called by triggers below) ─────────────
create or replace function _log_audit(
  p_org           uuid,
  p_action        text,
  p_resource_type text,
  p_resource_id   uuid,
  p_resource_label text,
  p_meta          jsonb default '{}'
) returns void language plpgsql security definer set search_path = public, auth as $$
declare
  v_actor uuid  := auth.uid();
  v_name  text;
begin
  if v_actor is not null then
    select full_name into v_name from profiles where id = v_actor;
  end if;
  insert into audit_logs
    (organization_id, actor_id, actor_name, action, resource_type, resource_id, resource_label, meta)
  values
    (p_org, v_actor, v_name, p_action, p_resource_type, p_resource_id, p_resource_label, p_meta);
exception when others then
  null; -- audit errors must never surface to users
end $$;

-- ── 5. Work-order trigger ─────────────────────────────────────────────────────
create or replace function _audit_work_order()
returns trigger language plpgsql security definer set search_path = public, auth as $$
begin
  if tg_op = 'INSERT' then
    perform _log_audit(
      new.organization_id, 'work_order.created', 'work_order', new.id, new.title,
      jsonb_build_object('priority', new.priority, 'category', new.category, 'status', new.status)
    );
  elsif tg_op = 'UPDATE' then
    if old.status <> new.status then
      perform _log_audit(
        new.organization_id, 'work_order.status_changed', 'work_order', new.id, new.title,
        jsonb_build_object('from', old.status, 'to', new.status)
      );
    end if;
    if old.assigned_to is distinct from new.assigned_to and new.assigned_to is not null then
      perform _log_audit(
        new.organization_id, 'work_order.assigned', 'work_order', new.id, new.title,
        jsonb_build_object('assignee_id', new.assigned_to)
      );
    end if;
  end if;
  return new;
end $$;

drop trigger if exists trg_audit_work_orders on work_orders;
create trigger trg_audit_work_orders
  after insert or update on work_orders
  for each row execute function _audit_work_order();

-- ── 6. Space trigger (needs org lookup from floor → building) ─────────────────
create or replace function _audit_space()
returns trigger language plpgsql security definer set search_path = public, auth as $$
declare v_org uuid;
begin
  select b.organization_id into v_org
  from floors f join buildings b on b.id = f.building_id
  where f.id = new.floor_id;
  if v_org is null then return new; end if;

  if old.status <> new.status then
    perform _log_audit(v_org, 'room.status_changed', 'space', new.id, new.name,
      jsonb_build_object('from', old.status, 'to', new.status));
  end if;
  if old.housekeeping_status is distinct from new.housekeeping_status then
    perform _log_audit(v_org, 'room.housekeeping_changed', 'space', new.id, new.name,
      jsonb_build_object('from', coalesce(old.housekeeping_status::text, 'ready'), 'to', coalesce(new.housekeeping_status::text, 'ready')));
  end if;
  if old.occupancy is distinct from new.occupancy then
    perform _log_audit(v_org, 'room.occupancy_changed', 'space', new.id, new.name,
      jsonb_build_object('from', coalesce(old.occupancy::text, 'vacant'), 'to', coalesce(new.occupancy::text, 'vacant'), 'guest', new.guest_name));
  end if;
  return new;
end $$;

drop trigger if exists trg_audit_spaces on spaces;
create trigger trg_audit_spaces
  after update on spaces
  for each row execute function _audit_space();

-- ── 7. Profile trigger (staff joins, role changes) ────────────────────────────
create or replace function _audit_profile()
returns trigger language plpgsql security definer set search_path = public, auth as $$
begin
  if tg_op = 'UPDATE' and new.organization_id is not null then
    if old.organization_id is distinct from new.organization_id and old.organization_id is null then
      perform _log_audit(new.organization_id, 'staff.joined', 'profile', new.id, new.full_name, '{}');
    end if;
    if old.role is distinct from new.role then
      perform _log_audit(new.organization_id, 'staff.role_changed', 'profile', new.id, new.full_name,
        jsonb_build_object('from', old.role, 'to', new.role));
    end if;
  end if;
  return new;
end $$;

drop trigger if exists trg_audit_profiles on profiles;
create trigger trg_audit_profiles
  after update on profiles
  for each row execute function _audit_profile();

-- ── 8. Add HR role to onboard_organization ────────────────────────────────────
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

  -- Permissions
  insert into role_permissions (role_id, permission) select r_admin, p from (values
    ('dashboard.view'),('buildings.view'),('buildings.create'),('buildings.edit'),('buildings.delete'),('buildings.edit_layout'),
    ('spaces.update_status'),('work_orders.view'),('work_orders.create'),('work_orders.edit'),('work_orders.assign'),('work_orders.complete'),('work_orders.delete'),
    ('team.view'),('team.manage'),('chat.participate'),('assets.view'),('assets.manage'),('reports.view'),
    ('integrations.manage'),('settings.manage'),('roles.manage'),('announcements.manage')
  ) as t(p);

  insert into role_permissions (role_id, permission) select r_manager, p from (values
    ('dashboard.view'),('buildings.view'),('buildings.create'),('buildings.edit'),('buildings.edit_layout'),
    ('spaces.update_status'),('work_orders.view'),('work_orders.create'),('work_orders.edit'),('work_orders.assign'),('work_orders.complete'),('work_orders.delete'),
    ('team.view'),('team.manage'),('chat.participate'),('assets.view'),('assets.manage'),('reports.view'),
    ('integrations.manage'),('settings.manage'),('roles.manage'),('announcements.manage')
  ) as t(p);

  insert into role_permissions (role_id, permission) select r_maint, p from (values
    ('dashboard.view'),('buildings.view'),('spaces.update_status'),
    ('work_orders.view'),('work_orders.edit'),('work_orders.complete'),
    ('team.view'),('chat.participate'),('assets.view')
  ) as t(p);

  insert into role_permissions (role_id, permission) select r_hskp, p from (values
    ('dashboard.view'),('buildings.view'),('spaces.update_status'),
    ('work_orders.view'),('work_orders.create'),('chat.participate')
  ) as t(p);

  insert into role_permissions (role_id, permission) select r_front, p from (values
    ('dashboard.view'),('buildings.view'),
    ('work_orders.view'),('work_orders.create'),('chat.participate')
  ) as t(p);

  insert into role_permissions (role_id, permission) select r_hr, p from (values
    ('dashboard.view'),('buildings.view'),('work_orders.view'),
    ('team.view'),('team.manage'),('chat.participate'),('reports.view'),('announcements.manage')
  ) as t(p);

  insert into role_permissions (role_id, permission) select r_viewer, p from (values
    ('dashboard.view'),('buildings.view'),('work_orders.view'),('team.view'),('assets.view'),('reports.view')
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

-- ── 9. Add HR to start_demo + seed demo announcements ────────────────────────
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
  return v_org;
end $$;

revoke all on function start_demo() from public;
revoke all on function end_demo()   from public;
grant execute on function start_demo() to authenticated;
grant execute on function end_demo()   to authenticated;

-- ── 10. Update seed to include demo announcements ─────────────────────────────
create or replace function _seed_demo_property(p_org uuid, p_owner uuid)
returns void language plpgsql security definer set search_path = public, auth as $$
declare
  v_building uuid := gen_random_uuid();
  v_f1 uuid := gen_random_uuid();
  v_f2 uuid := gen_random_uuid();
  u_maria uuid := gen_random_uuid();
  u_carlos uuid := gen_random_uuid();
  r_maint uuid; r_hskp uuid;
  tag text := replace(p_org::text, '-', '');
  fl record;
begin
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
                          banned_until, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  values
    ('00000000-0000-0000-0000-000000000000', u_maria, 'authenticated','authenticated',
     format('maria+%s@demo.roomward.app', tag), '', now(), 'infinity',
     '{"provider":"email","providers":["email"]}', '{"full_name":"Maria Delgado"}', now(), now()),
    ('00000000-0000-0000-0000-000000000000', u_carlos,'authenticated','authenticated',
     format('carlos+%s@demo.roomward.app', tag), '', now(), 'infinity',
     '{"provider":"email","providers":["email"]}', '{"full_name":"Carlos Rivera"}', now(), now());

  select id into r_maint from roles where organization_id = p_org and slug = 'maintenance'  limit 1;
  select id into r_hskp  from roles where organization_id = p_org and slug = 'housekeeping' limit 1;
  update profiles set organization_id = p_org, role = 'manager',    role_id = r_hskp,  full_name = 'Maria Delgado', is_available = true  where id = u_maria;
  update profiles set organization_id = p_org, role = 'technician', role_id = r_maint, full_name = 'Carlos Rivera', is_available = true  where id = u_carlos;

  insert into buildings (id, organization_id, name, address, city, state, type)
  values (v_building, p_org, 'Grandview Demo Hotel', '500 Riverside Dr', 'Dawsonville', 'GA', 'hotel');

  insert into floors (id, building_id, name, level, grid_cols, grid_rows, scale_ft_per_cell) values
    (v_f1, v_building, 'Floor 1', 1, 14, 7, 5),
    (v_f2, v_building, 'Floor 2', 2, 14, 7, 5);

  for fl in select * from (values (v_f1, 100), (v_f2, 200)) as t(fid, base)
  loop
    insert into spaces (
      floor_id, name, type, status,
      position_x, position_y, width, height,
      housekeeping_status, occupancy,
      guest_name, checked_in_at, expected_checkout_at
    )
    select
      fl.fid, 'Room ' || (fl.base + i), 'guest_room',
      case when fl.base + i = 104 then 'emergency' when i = 2 then 'needs_maintenance' when i = 5 then 'cleaning_required' else 'operational' end,
      1 + ((i - 1) % 6) * 2, 1, 2, 2,
      case when i = 5 then 'dirty' when i = 3 then 'in_progress' when i = 6 then 'cleaned' else 'ready' end,
      case when i in (1, 4) then 'occupied' when i = 2 then 'arriving' when i = 6 then 'departing' else 'vacant' end,
      case
        when i = 1 and fl.base = 100 then 'Sarah Mitchell'
        when i = 1 and fl.base = 200 then 'David Kim'
        when i = 4 and fl.base = 100 then 'James Okafor'
        when i = 4 and fl.base = 200 then 'Priya Sharma'
        when i = 2                   then 'Chen Family'
        when i = 6 and fl.base = 100 then 'Robert Park'
        when i = 6 and fl.base = 200 then 'Amara Osei'
        else null
      end,
      case when i in (1, 4) then now() - interval '2 days' when i = 6 then now() - interval '3 days' else null end,
      case
        when i in (1, 4) then date_trunc('day', now()) + interval '1 day 12 hours'
        when i = 2       then date_trunc('day', now()) + interval '15 hours'
        when i = 6       then date_trunc('day', now()) + interval '12 hours'
        else null
      end
    from generate_series(1, 6) as i;
  end loop;

  insert into assets (organization_id, name, type, model, serial_number, status, next_maintenance_at) values
    (p_org, 'Rooftop HVAC',       'HVAC',    'Carrier 50XC060',     'DEMO-HVAC',  'maintenance', now() + interval '2 days'),
    (p_org, 'Pool Pump — Main',   'Pool',    'Pentair IntelliFlo',  'DEMO-PUMP',  'operational', now() + interval '90 days');

  insert into work_orders (organization_id, space_id, created_by, assigned_to, title, description, status, priority, category, due_date, completed_at, created_at) values
    (p_org, (select s.id from spaces s join floors f on f.id=s.floor_id where f.building_id=v_building and s.name='Room 104'),
      p_owner, u_carlos, 'No A/C — guest reports room not cooling', 'Thermostat unresponsive; room flagged for service.', 'in_progress', 'critical', 'hvac', now() + interval '4 hours', null, now() - interval '2 hours'),
    (p_org, (select s.id from spaces s join floors f on f.id=s.floor_id where f.building_id=v_building and s.name='Room 105'),
      p_owner, u_maria, 'Deep clean before check-in', 'Turn the room before the 3pm arrival.', 'in_progress', 'medium', 'housekeeping', now() + interval '3 hours', null, now() - interval '1 hour'),
    (p_org, (select s.id from spaces s join floors f on f.id=s.floor_id where f.building_id=v_building and s.name='Room 202'),
      p_owner, u_carlos, 'Leaky bathroom faucet', 'Needs a new cartridge on the hot side.', 'assigned', 'low', 'plumbing', now() + interval '2 days', null, now() - interval '5 hours'),
    (p_org, (select s.id from spaces s join floors f on f.id=s.floor_id where f.building_id=v_building and s.name='Room 203'),
      p_owner, null, 'TV remote not pairing', 'Swap or re-pair the remote.', 'open', 'low', 'electrical', now() + interval '2 days', null, now() - interval '3 hours'),
    (p_org, (select s.id from spaces s join floors f on f.id=s.floor_id where f.building_id=v_building and s.name='Room 106'),
      p_owner, u_carlos, 'Replace burnt-out vanity bulb', 'One of three bulbs is out.', 'completed', 'low', 'electrical', now() - interval '1 day', now() - interval '20 hours', now() - interval '1 day');

  -- Seed announcements (pinned first, so the corporate board shows content immediately)
  insert into announcements (organization_id, author_id, title, body, target_roles, pinned, created_at, updated_at) values
    (p_org, p_owner,
     'Welcome to Roomward',
     'Your property operations dashboard is live. Use the Property Map to monitor room status in real time, log work orders from any device, and keep housekeeping in sync with the front desk. Check the Corporate board for announcements and the full audit trail.',
     '{}', true, now() - interval '3 days', now() - interval '3 days'),
    (p_org, p_owner,
     'Pool area closed for maintenance — today 8am–2pm',
     'The pool and surrounding deck will be closed from 8am to 2pm for scheduled pump maintenance. Please inform guests who inquire at the front desk. Carlos Rivera is handling the repair.',
     ARRAY['front_desk', 'housekeeping'], false, now() - interval '1 hour', now() - interval '1 hour');

  -- Seed audit entries directly (triggers fire on work_order inserts above, but
  -- let auth.uid() be the actor. Add a few manual room entries for richness.)
  insert into audit_logs (organization_id, actor_id, actor_name, action, resource_type, resource_id, resource_label, meta, created_at) values
    (p_org, u_maria, 'Maria Delgado', 'room.housekeeping_changed', 'space',
      (select s.id from spaces s join floors f on f.id=s.floor_id where f.building_id=v_building and s.name='Room 106'),
      'Room 106', '{"from":"dirty","to":"cleaned"}', now() - interval '25 hours'),
    (p_org, u_maria, 'Maria Delgado', 'room.housekeeping_changed', 'space',
      (select s.id from spaces s join floors f on f.id=s.floor_id where f.building_id=v_building and s.name='Room 106'),
      'Room 106', '{"from":"cleaned","to":"ready"}', now() - interval '24 hours'),
    (p_org, u_carlos, 'Carlos Rivera', 'room.occupancy_changed', 'space',
      (select s.id from spaces s join floors f on f.id=s.floor_id where f.building_id=v_building and s.name='Room 101'),
      'Room 101', '{"from":"arriving","to":"occupied","guest":"Sarah Mitchell"}', now() - interval '2 days'),
    (p_org, p_owner, 'Demo Manager', 'announcement.posted', 'announcement',
      null, 'Welcome to Roomward', '{}', now() - interval '3 days');
end $$;
