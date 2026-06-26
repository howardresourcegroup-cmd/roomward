-- Roomward — Migration 004
-- Self-serve onboarding. When a new user signs up they have a profile but no
-- organization. This SECURITY DEFINER function creates their org, seeds the
-- default roles + permissions, and makes them the Administrator — all scoped
-- strictly to the calling user (auth.uid()), so it's safe to expose.
-- Run AFTER 003.

create or replace function onboard_organization(org_name text, full_name text default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  existing uuid;
  new_org uuid;
  base_slug text;
  r_admin uuid; r_manager uuid; r_maint uuid; r_hskp uuid; r_front uuid; r_viewer uuid;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  -- Idempotent: if already in an org, just return it
  select organization_id into existing from profiles where id = uid;
  if existing is not null then
    return existing;
  end if;

  if org_name is null or btrim(org_name) = '' then
    raise exception 'Organization name is required';
  end if;

  base_slug := lower(regexp_replace(btrim(org_name), '[^a-zA-Z0-9]+', '-', 'g'));
  base_slug := btrim(base_slug, '-') || '-' || substr(replace(uid::text, '-', ''), 1, 6);

  insert into organizations (name, slug, plan)
  values (btrim(org_name), base_slug, 'starter')
  returning id into new_org;

  -- ── Default roles ──────────────────────────────────────────────────────────
  insert into roles (organization_id, name, slug, description, color, is_system) values
    (new_org, 'Administrator',    'admin',       'Full access to everything, including roles & settings', 'red',    true) returning id into r_admin;
  insert into roles (organization_id, name, slug, description, color, is_system) values
    (new_org, 'Manager',          'manager',     'Runs operations: work orders, team, buildings, integrations', 'indigo', true) returning id into r_manager;
  insert into roles (organization_id, name, slug, description, color, is_system) values
    (new_org, 'Maintenance Tech', 'maintenance', 'Field technician — works and closes assigned jobs', 'amber',  true) returning id into r_maint;
  insert into roles (organization_id, name, slug, description, color, is_system) values
    (new_org, 'Housekeeping',     'housekeeping','Updates room cleaning status, raises housekeeping issues', 'cyan', true) returning id into r_hskp;
  insert into roles (organization_id, name, slug, description, color, is_system) values
    (new_org, 'Front Desk',       'front_desk',  'Logs guest-reported issues, views status', 'violet', true) returning id into r_front;
  insert into roles (organization_id, name, slug, description, color, is_system) values
    (new_org, 'Viewer',           'viewer',      'Read-only access', 'zinc', true) returning id into r_viewer;

  -- ── Permissions per role ────────────────────────────────────────────────────
  insert into role_permissions (role_id, permission) select r_admin, p from (values
    ('dashboard.view'),('buildings.view'),('buildings.create'),('buildings.edit'),('buildings.delete'),('buildings.edit_layout'),
    ('spaces.update_status'),('work_orders.view'),('work_orders.create'),('work_orders.edit'),('work_orders.assign'),('work_orders.complete'),('work_orders.delete'),
    ('team.view'),('team.manage'),('chat.participate'),('assets.view'),('assets.manage'),('reports.view'),('integrations.manage'),('settings.manage'),('roles.manage')
  ) as t(p);

  insert into role_permissions (role_id, permission) select r_manager, p from (values
    ('dashboard.view'),('buildings.view'),('buildings.create'),('buildings.edit'),('buildings.edit_layout'),
    ('spaces.update_status'),('work_orders.view'),('work_orders.create'),('work_orders.edit'),('work_orders.assign'),('work_orders.complete'),('work_orders.delete'),
    ('team.view'),('team.manage'),('chat.participate'),('assets.view'),('assets.manage'),('reports.view'),('integrations.manage'),('settings.manage'),('roles.manage')
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

  insert into role_permissions (role_id, permission) select r_viewer, p from (values
    ('dashboard.view'),('buildings.view'),('work_orders.view'),('team.view'),('assets.view'),('reports.view')
  ) as t(p);

  -- ── Make the signer the Administrator ───────────────────────────────────────
  update profiles set
    organization_id = new_org,
    role = 'admin',
    role_id = r_admin,
    full_name = coalesce(nullif(btrim(coalesce(onboard_organization.full_name, '')), ''), profiles.full_name)
  where id = uid;

  return new_org;
end;
$$;

grant execute on function onboard_organization(text, text) to authenticated;
