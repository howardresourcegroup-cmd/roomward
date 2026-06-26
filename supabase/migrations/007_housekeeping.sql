-- Roomward — Migration 007
-- Housekeeping status: a separate dimension from maintenance/operational status.
-- A room can be clean but need maintenance, or dirty but mechanically fine.
-- Lifecycle: dirty → in_progress → cleaned → ready  (+ out_of_service)
-- Run AFTER 006.

alter table spaces add column if not exists housekeeping_status text default 'ready'
  check (housekeeping_status in ('dirty','in_progress','cleaned','ready','out_of_service'));

create index if not exists spaces_housekeeping_idx on spaces(housekeeping_status);

-- Cleaning steps use the existing spaces.update_status permission;
-- the final "Mark Ready" (inspect) step is gated to managers/admins in the UI.

-- ─── Demo seed: give the Amicalola board a realistic mix ───────────────────────
do $$
declare org uuid := '00000000-0000-0000-0000-0000000000a1';
declare lodge_floors uuid[];
begin
  if not exists (select 1 from organizations where id = org) then return; end if;

  select array_agg(f.id) into lodge_floors
  from floors f join buildings b on b.id = f.building_id
  where b.organization_id = org;

  if lodge_floors is null then return; end if;

  -- Default all guest rooms / cabins to ready
  update spaces set housekeeping_status = 'ready'
   where floor_id = any(lodge_floors) and type in ('guest_room','suite','cabin');

  -- Rooms flagged cleaning_required become dirty
  update spaces set housekeeping_status = 'dirty'
   where floor_id = any(lodge_floors) and status = 'cleaning_required';

  -- A couple mid-cycle for a lively board
  update spaces set housekeeping_status = 'in_progress'
   where floor_id = any(lodge_floors) and name in ('Room 203','Room 305');
  update spaces set housekeeping_status = 'cleaned'
   where floor_id = any(lodge_floors) and name in ('Room 210','Cabin 2 — Deer Run');
  -- Out-of-service rooms reflect that
  update spaces set housekeeping_status = 'out_of_service'
   where floor_id = any(lodge_floors) and status = 'offline';
end $$;
