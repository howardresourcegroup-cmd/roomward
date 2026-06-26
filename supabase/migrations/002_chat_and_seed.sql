-- Roomward — Migration 002
-- Team chat (encrypted at rest) + seed data for Amicalola Falls demo
-- Run AFTER 001_initial_schema.sql

-- ═══════════════════════════════════════════════════════════════════════════
--  TEAM CHAT
-- ═══════════════════════════════════════════════════════════════════════════
-- Messages are stored encrypted at rest (Supabase/Postgres AES-256) and
-- transmitted over TLS 1.3. RLS guarantees a user only ever sees messages
-- from channels in their own organization.

create table channels (
  id               uuid primary key default uuid_generate_v4(),
  organization_id  uuid not null references organizations(id) on delete cascade,
  name             text not null,
  description      text,
  is_private       boolean default false,
  created_by       uuid references profiles(id),
  created_at       timestamptz default now()
);

create table channel_members (
  channel_id  uuid not null references channels(id) on delete cascade,
  user_id     uuid not null references profiles(id) on delete cascade,
  joined_at   timestamptz default now(),
  primary key (channel_id, user_id)
);

create table messages (
  id              uuid primary key default uuid_generate_v4(),
  channel_id      uuid not null references channels(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  author_id       uuid not null references profiles(id),
  body            text not null,
  -- Optional: link a message to a work order or space for context
  work_order_id   uuid references work_orders(id) on delete set null,
  space_id        uuid references spaces(id) on delete set null,
  edited          boolean default false,
  created_at      timestamptz default now()
);

create index on channels(organization_id);
create index on messages(channel_id, created_at desc);
create index on messages(organization_id);
create index on channel_members(user_id);

-- updated_at not needed; messages are immutable except `edited` flag

-- ─── RLS ──────────────────────────────────────────────────────────────────────
alter table channels        enable row level security;
alter table channel_members enable row level security;
alter table messages        enable row level security;

-- Channels: visible to members of your org
create policy "view org channels" on channels for select
  using (organization_id = my_org_id());
create policy "create channels"   on channels for insert
  with check (organization_id = my_org_id());

-- Channel membership
create policy "view memberships"  on channel_members for select
  using (channel_id in (select id from channels where organization_id = my_org_id()));
create policy "join channels"     on channel_members for insert
  with check (user_id = auth.uid());

-- Messages: read if the channel is in your org; write only as yourself
create policy "read org messages" on messages for select
  using (organization_id = my_org_id());
create policy "send messages"     on messages for insert
  with check (author_id = auth.uid() and organization_id = my_org_id());
create policy "edit own messages" on messages for update
  using (author_id = auth.uid());
create policy "delete own messages" on messages for delete
  using (author_id = auth.uid());

-- Realtime for chat
alter publication supabase_realtime add table messages;
alter publication supabase_realtime add table channels;

-- ═══════════════════════════════════════════════════════════════════════════
--  SEED DATA — Amicalola Falls State Park & Lodge
-- ═══════════════════════════════════════════════════════════════════════════
-- Run this block only on a fresh project to populate the demo org.
-- NOTE: profiles are created via auth signup; seed users here are placeholders
-- you can attach to real auth.users ids after inviting the team.

insert into organizations (id, name, slug, plan) values
  ('00000000-0000-0000-0000-0000000000a1', 'Amicalola Falls State Park & Lodge', 'amicalola-falls', 'pro')
on conflict (id) do nothing;

-- Buildings
insert into buildings (id, organization_id, name, address, city, state, type) values
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000a1', 'Amicalola Falls Lodge',      '418 Amicalola Falls State Park Rd', 'Dawsonville', 'GA', 'hotel'),
  ('00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-0000000000a1', 'Mountain View Cabins',       '418 Amicalola Falls State Park Rd', 'Dawsonville', 'GA', 'hotel'),
  ('00000000-0000-0000-0000-0000000000b3', '00000000-0000-0000-0000-0000000000a1', 'Guest Services & Recreation','418 Amicalola Falls State Park Rd', 'Dawsonville', 'GA', 'hotel')
on conflict (id) do nothing;

-- Floors (lodge)
insert into floors (id, building_id, name, level, grid_cols, grid_rows) values
  ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000b1', 'Ground Floor', 1, 14, 7),
  ('00000000-0000-0000-0000-0000000000f2', '00000000-0000-0000-0000-0000000000b1', 'Floor 2',      2, 14, 7),
  ('00000000-0000-0000-0000-0000000000f3', '00000000-0000-0000-0000-0000000000b1', 'Floor 3',      3, 14, 7)
on conflict (id) do nothing;

-- A starter set of guest-room spaces (full set is loaded by the app seed script)
insert into spaces (floor_id, name, type, status, position_x, position_y, width, height) values
  ('00000000-0000-0000-0000-0000000000f2', 'Room 201', 'guest_room', 'operational',       1, 1, 2, 2),
  ('00000000-0000-0000-0000-0000000000f2', 'Room 202', 'guest_room', 'cleaning_required', 3, 1, 2, 2),
  ('00000000-0000-0000-0000-0000000000f2', 'Room 204', 'guest_room', 'needs_maintenance', 7, 1, 2, 2),
  ('00000000-0000-0000-0000-0000000000f3', 'Room 306', 'guest_room', 'emergency',        11, 1, 2, 2)
on conflict do nothing;

-- A default General channel for the org
insert into channels (id, organization_id, name, description) values
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a1', 'general', 'Team-wide updates')
on conflict (id) do nothing;
