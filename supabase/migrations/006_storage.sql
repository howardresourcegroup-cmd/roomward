-- Roomward — Migration 006
-- Storage bucket for work-order photos + access policies.
-- Run AFTER 005.

-- Public bucket so photo URLs render without signing; uploads require auth.
insert into storage.buckets (id, name, public)
values ('work-order-photos', 'work-order-photos', true)
on conflict (id) do nothing;

-- Authenticated users can upload
drop policy if exists "wo photos upload" on storage.objects;
create policy "wo photos upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'work-order-photos');

-- Anyone can read (public bucket)
drop policy if exists "wo photos read" on storage.objects;
create policy "wo photos read" on storage.objects for select
  using (bucket_id = 'work-order-photos');

-- Uploaders can delete their own
drop policy if exists "wo photos delete" on storage.objects;
create policy "wo photos delete" on storage.objects for delete to authenticated
  using (bucket_id = 'work-order-photos' and owner = auth.uid());
