-- Paid events: price on events, payment proof + review status on tickets
-- Run in Supabase SQL editor

alter table events add column if not exists price numeric(10,2) not null default 0;

alter table tickets add column if not exists payment_screenshot_url text;
alter table tickets add column if not exists payment_status text not null default 'not_required'
  check (payment_status in ('not_required', 'pending', 'approved', 'rejected'));

insert into storage.buckets (id, name, public)
values ('payment-proofs', 'payment-proofs', true)
on conflict (id) do nothing;

create policy "public can view payment proofs" on storage.objects
  for select using (bucket_id = 'payment-proofs');

create policy "members can upload payment proofs" on storage.objects
  for insert with check (bucket_id = 'payment-proofs');
