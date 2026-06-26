-- Roomward — Migration 005
-- Assets RLS policies (table had RLS on but no policies → deny-all) + demo seed.
-- Run AFTER 004.

-- ─── RLS policies ─────────────────────────────────────────────────────────────
drop policy if exists "view assets"   on assets;
drop policy if exists "manage assets" on assets;

create policy "view assets" on assets for select
  using (organization_id = my_org_id());

create policy "manage assets" on assets for all
  using (organization_id = my_org_id() and my_role() in ('admin','manager'));

-- ─── Seed demo equipment for Amicalola ────────────────────────────────────────
do $$
declare org uuid := '00000000-0000-0000-0000-0000000000a1';
begin
  if not exists (select 1 from organizations where id = org) then return; end if;
  if exists (select 1 from assets where organization_id = org) then return; end if; -- idempotent

  insert into assets (organization_id, name, type, model, serial_number, status, next_maintenance_at) values
    (org, 'HVAC Unit 1 — Rooftop',       'HVAC',       'Carrier 50XC060',     'CC2310-0441', 'operational', now() + interval '75 days'),
    (org, 'HVAC Unit 2 — Rooftop',       'HVAC',       'Carrier 50XC060',     'CC2310-0442', 'maintenance', now() + interval '2 days'),
    (org, 'Commercial Dishwasher',        'Kitchen',    'Hobart AM15',         'HB-98234',    'operational', now() + interval '100 days'),
    (org, 'Pool Pump — Main',             'Pool',       'Pentair IntelliFlo',  'PF-00123',    'operational', now() + interval '120 days'),
    (org, 'Emergency Generator',          'Electrical', 'Generac QT150',       'GN-7712',     'operational', now() + interval '45 days'),
    (org, 'Elevator — Unit 1',            'Elevator',   'Otis Gen2',           'OT-00451',    'operational', now() + interval '88 days'),
    (org, 'Ice Machine — Floor 2',        'Kitchen',    'Manitowoc UDF0140A',  'MT-33291',    'operational', now() + interval '60 days'),
    (org, 'Boiler — Domestic Hot Water',  'Plumbing',   'Lochinvar Knight 85', 'LK-10034',    'degraded',    now() - interval '5 days'),
    (org, 'Security System — Lodge',      'Security',   'Bosch B5512',         'BS-22914',    'operational', now() + interval '40 days'),
    (org, 'Laundry Washer x3',            'Laundry',    'Maytag MHN33PD',      'MW-3x-001',   'operational', now() + interval '70 days');
end $$;
