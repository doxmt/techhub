create table "user" ("id" uuid default pg_catalog.gen_random_uuid() not null primary key, "name" text not null, "email" text not null unique, "emailVerified" boolean not null, "image" text, "createdAt" timestamptz default CURRENT_TIMESTAMP not null, "updatedAt" timestamptz default CURRENT_TIMESTAMP not null);

create table "session" ("id" uuid default pg_catalog.gen_random_uuid() not null primary key, "expiresAt" timestamptz not null, "token" text not null unique, "createdAt" timestamptz default CURRENT_TIMESTAMP not null, "updatedAt" timestamptz not null, "ipAddress" text, "userAgent" text, "userId" uuid not null references "user" ("id") on delete cascade);

create table "account" ("id" uuid default pg_catalog.gen_random_uuid() not null primary key, "accountId" text not null, "providerId" text not null, "userId" uuid not null references "user" ("id") on delete cascade, "accessToken" text, "refreshToken" text, "idToken" text, "accessTokenExpiresAt" timestamptz, "refreshTokenExpiresAt" timestamptz, "scope" text, "password" text, "createdAt" timestamptz default CURRENT_TIMESTAMP not null, "updatedAt" timestamptz not null);

create table "verification" ("id" uuid default pg_catalog.gen_random_uuid() not null primary key, "identifier" text not null, "value" text not null, "expiresAt" timestamptz not null, "createdAt" timestamptz default CURRENT_TIMESTAMP not null, "updatedAt" timestamptz default CURRENT_TIMESTAMP not null);

create index "session_userId_idx" on "session" ("userId");

create index "account_userId_idx" on "account" ("userId");

create index "verification_identifier_idx" on "verification" ("identifier");

-- Keep the existing TechHub UUID relations in sync with Better Auth users.
create or replace function sync_techhub_user_insert() returns trigger as $$
begin
  insert into legacy_users (id, email, created_at)
  values (new.id, new.email, new."createdAt")
  on conflict (id) do nothing;
  insert into profiles (user_id, email, nickname)
  values (new.id, new.email, left(new.name, 20))
  on conflict (user_id) do nothing;
  return new;
end;
$$ language plpgsql;

create trigger sync_techhub_user_insert_trigger
after insert on "user" for each row execute function sync_techhub_user_insert();

create or replace function sync_techhub_user_delete() returns trigger as $$
begin
  delete from legacy_users where id = old.id;
  return old;
end;
$$ language plpgsql;

create trigger sync_techhub_user_delete_trigger
after delete on "user" for each row execute function sync_techhub_user_delete();
