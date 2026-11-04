-- Server queries use a restricted database role. Better Auth and migration
-- scripts retain the owner connection, while user data is protected by RLS.
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'techhub_app') then
    create role techhub_app nologin;
  end if;
end;
$$;

grant techhub_app to neondb_owner;
grant usage on schema public to techhub_app;
grant select on categories, tags, content_items, content_categories,
  content_tags, sources, ingestion_runs to techhub_app;
grant insert, update on content_items, content_categories, sources,
  ingestion_runs to techhub_app;
grant usage, select on all sequences in schema public to techhub_app;
grant select, update on profiles to techhub_app;
grant select, insert, delete on bookmarks, likes to techhub_app;

alter table profiles enable row level security;
alter table bookmarks enable row level security;
alter table likes enable row level security;

create policy profiles_owner on profiles
  for all to techhub_app
  using (user_id::text = current_setting('app.user_id', true))
  with check (user_id::text = current_setting('app.user_id', true));
create policy bookmarks_owner on bookmarks
  for all to techhub_app
  using (user_id::text = current_setting('app.user_id', true))
  with check (user_id::text = current_setting('app.user_id', true));
create policy likes_owner on likes
  for all to techhub_app
  using (user_id::text = current_setting('app.user_id', true))
  with check (user_id::text = current_setting('app.user_id', true));
