-- Add trade photo support, telegram chat linking, and trade-photos bucket

alter table public.trades
  add column if not exists photo_url text;

alter table public.profiles
  add column if not exists telegram_chat_id text unique;

insert into storage.buckets (id, name, public)
values ('trade-photos', 'trade-photos', true)
on conflict (id) do nothing;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'trade_photos_select_public'
  ) then
    create policy "trade_photos_select_public"
      on storage.objects for select
      using (bucket_id = 'trade-photos');
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'trade_photos_insert_auth'
  ) then
    create policy "trade_photos_insert_auth"
      on storage.objects for insert
      with check (
        bucket_id = 'trade-photos'
        and auth.role() = 'authenticated'
      );
  end if;
end $$;
