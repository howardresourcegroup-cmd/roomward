-- Roomward — Migration 003
-- Modular role-based access control (RBAC).
-- Roles are org-scoped and fully configurable; permissions are a fixed catalog
-- of granular keys that each role can be granted or denied.
-- Run AFTER 001 and 002.

-- ─── Roles ────────────────────────────────────────────────────────────────────
create table roles (
  id               uuid primary key default uuid_generate_v4(),
  organization_id  uuid not null references organizations(id) on delete cascade,
  name             text not null,
  slug             text not null,
  description      text,
  color            text default 'zinc',          -- UI accent
  is_system        boolean default false,        -- system roles can't be deleted
  created_at       timestamptz default now(),
  unique (organization_id, slug)
);

-- ─── Role ↔ Permission grants ─────────────────────────────────────────────────
-- permission is a free-text key from the app's catalog (e.g. 'work_orders.create')
create table role_permissions (
  role_id     uuid not null references roles(id) on delete cascade,
  permission  text not null,
  primary key (role_id, permission)
);

-- ─── Link profiles to a role ──────────────────────────────────────────────────
-- Keep the legacy text `role` (used by existing coarse RLS) and add a richer role_id.
alter table profiles add column if not exists role_id uuid references roles(id) on delete set null;
-- Loosen the old check so custom role slugs (housekeeping, front_desk…) are allowed.
alter table profiles drop constraint if exists profiles_role_check;

create index on roles(organization_id);
create index on role_permissions(role_id);
create index on profiles(role_id);

-- ─── RLS ──────────────────────────────────────────────────────────────────────
alter table roles            enable row level security;
alter table role_permissions enable row level security;

create policy "view org roles" on roles for select using (organization_id = my_org_id());
create policy "manage org roles" on roles for all
  using (organization_id = my_org_id() and my_role() in ('admin','manager'));

create policy "view role perms" on role_permissions for select
  using (role_id in (select id from roles where organization_id = my_org_id()));
create policy "manage role perms" on role_permissions for all
  using (role_id in (select id from roles where organization_id = my_org_id()) and my_role() in ('admin','manager'));

-- Current user's effective permission set (used by the app)
create or replace function my_permissions()
returns setof text language sql stable security definer as $$
  select rp.permission
  from profiles p
  join role_permissions rp on rp.role_id = p.role_id
  where p.id = auth.uid()
$$;

-- ─── Seed default roles + permissions for the demo org ────────────────────────
do $$
declare
  org uuid := '00000000-0000-0000-0000-0000000000a1';
  r_admin uuid; r_manager uuid; r_maint uuid; r_hskp uuid; r_front uuid; r_viewer uuid;
begin
  if not exists (select 1 from organizations where id = org) then return; end if;

  insert into roles (organization_id, name, slug, description, color, is_system) values
    (org, 'Administrator',   'admin',       'Full access to everything, including roles & settings', 'red',     true) returning id into r_admin;
  insert into roles (organization_id, name, slug, description, color, is_system) values
    (org, 'Manager',         'manager',     'Runs operations: work orders, team, buildings, integrations', 'indigo', true) returning id into r_manager;
  insert into roles (organization_id, name, slug, description, color, is_system) values
    (org, 'Maintenance Tech','maintenance', 'Field technician — works and closes assigned jobs', 'amber',  true) returning id into r_maint;
  insert into roles (organization_id, name, slug, description, color, is_system) values
    (org, 'Housekeeping',    'housekeeping','Updates room cleaning status, raises housekeeping issues', 'cyan', true) returning id into r_hskp;
  insert into roles (organization_id, name, slug, description, color, is_system) values
    (org, 'Front Desk',      'front_desk',  'Logs guest-reported issues, views status', 'violet', true) returning id into r_front;
  insert into roles (organization_id, name, slug, description, color, is_system) values
    (org, 'Viewer',          'viewer',      'Read-only access', 'zinc', true) returning id into r_viewer;

  -- Admin → all permissions
  insert into role_permissions (role_id, permission) select r_admin, p from (values
    ('dashboard.view'),('buildings.view'),('buildings.create'),('buildings.edit'),('buildings.delete'),('buildings.edit_layout'),
    ('spaces.update_status'),('work_orders.view'),('work_orders.create'),('work_orders.edit'),('work_orders.assign'),('work_orders.complete'),('work_orders.delete'),
    ('team.view'),('team.manage'),('chat.participate'),('assets.view'),('assets.manage'),('reports.view'),('integrations.manage'),('settings.manage'),('roles.manage')
  ) as t(p);

  -- Manager → everything except roles.manage
  insert into role_permissions (role_id, permission) select r_manager, p from (values
    ('dashboard.view'),('buildings.view'),('buildings.create'),('buildings.edit'),('buildings.edit_layout'),
    ('spaces.update_status'),('work_orders.view'),('work_orders.create'),('work_orders.edit'),('work_orders.assign'),('work_orders.complete'),('work_orders.delete'),
    ('team.view'),('team.manage'),('chat.participate'),('assets.view'),('assets.manage'),('reports.view'),('integrations.manage'),('settings.manage')
  ) as t(p);

  -- Maintenance Tech
  insert into role_permissions (role_id, permission) select r_maint, p from (values
    ('dashboard.view'),('buildings.view'),('spaces.update_status'),
    ('work_orders.view'),('work_orders.edit'),('work_orders.complete'),
    ('team.view'),('chat.participate'),('assets.view')
  ) as t(p);

  -- Housekeeping
  insert into role_permissions (role_id, permission) select r_hskp, p from (values
    ('dashboard.view'),('buildings.view'),('spaces.update_status'),
    ('work_orders.view'),('work_orders.create'),('chat.participate')
  ) as t(p);

  -- Front Desk
  insert into role_permissions (role_id, permission) select r_front, p from (values
    ('dashboard.view'),('buildings.view'),
    ('work_orders.view'),('work_orders.create'),('chat.participate')
  ) as t(p);

  -- Viewer → read-only
  insert into role_permissions (role_id, permission) select r_viewer, p from (values
    ('dashboard.view'),('buildings.view'),('work_orders.view'),('team.view'),('assets.view'),('reports.view')
  ) as t(p);

  -- Map existing demo profiles to roles based on their legacy text role
  update profiles set role_id = r_manager where organization_id = org and role = 'manager';
  update profiles set role_id = r_maint   where organization_id = org and role = 'technician';
end $$;
