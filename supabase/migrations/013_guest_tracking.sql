-- Roomward — Migration 013
-- Per-room guest tracking: check-in / check-out timestamps and guest name.
--
-- These three nullable columns give each room a live guest context.
-- checked_in_at / expected_checkout_at drive the drill-down stats panel.
-- All three are nullable — common spaces (lobby, gym) never have a guest.

alter table spaces add column if not exists guest_name            text;
alter table spaces add column if not exists checked_in_at         timestamptz;
alter table spaces add column if not exists expected_checkout_at  timestamptz;

comment on column spaces.guest_name           is 'Display-only guest name for current stay; null when vacant';
comment on column spaces.checked_in_at        is 'Timestamp guest checked in; null when vacant or pre-arrival';
comment on column spaces.expected_checkout_at is 'Expected check-out time for current (or arriving) guest';

-- ── Update demo seed to include guest tracking ─────────────────────────────
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
  -- Two banned teammates so work orders have real assignees (cleaned up with the org).
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

  -- scale_ft_per_cell = 5: each grid cell = 5 ft, so a 2×2 room = 100 sq ft
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
      fl.fid,
      'Room ' || (fl.base + i),
      'guest_room',
      -- Maintenance/emergency statuses
      case
        when fl.base + i = 104 then 'emergency'
        when i = 2             then 'needs_maintenance'
        when i = 5             then 'cleaning_required'
        else 'operational'
      end,
      1 + ((i - 1) % 6) * 2, 1, 2, 2,
      -- Housekeeping
      case
        when i = 5 then 'dirty'
        when i = 3 then 'in_progress'
        when i = 6 then 'cleaned'
        else 'ready'
      end,
      -- Occupancy
      case
        when i in (1, 4) then 'occupied'
        when i = 2       then 'arriving'
        when i = 6       then 'departing'
        else 'vacant'
      end,
      -- Guest name — occupied (i=1 vs i=4 differ by floor), arriving, departing
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
      -- checked_in_at: occupied = 2 days ago, departing = 3 days ago
      case
        when i in (1, 4) then now() - interval '2 days'
        when i = 6       then now() - interval '3 days'
        else null
      end,
      -- expected_checkout_at: occupied = tomorrow noon, arriving = today 3pm, departing = today noon
      case
        when i in (1, 4) then date_trunc('day', now()) + interval '1 day 12 hours'
        when i = 2       then date_trunc('day', now()) + interval '15 hours'
        when i = 6       then date_trunc('day', now()) + interval '12 hours'
        else null
      end
    from generate_series(1, 6) as i;
  end loop;

  -- Assets
  insert into assets (organization_id, name, type, model, serial_number, status, next_maintenance_at) values
    (p_org, 'Rooftop HVAC',       'HVAC',    'Carrier 50XC060',     'DEMO-HVAC',  'maintenance', now() + interval '2 days'),
    (p_org, 'Pool Pump — Main',   'Pool',    'Pentair IntelliFlo',  'DEMO-PUMP',  'operational', now() + interval '90 days');

  -- Work orders
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
end $$;
