-- ============================================================================
-- Mess Manager — Supabase schema (Phase 1). Postgres + Auth + RLS.
-- Paste as one script into the Supabase SQL editor (idempotent — safe to re-run).
-- ============================================================================

-- ------------------------------- TABLES -------------------------------------
create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  full_name    text not null default '',
  contact      text not null default '',
  avatar_color text not null default '',
  avatar_url   text,
  notif_prefs  jsonb not null default
    '{"mealReminder":true,"dueReminder":true,"bookingReminder":true,"activity":true}'::jsonb,
  created_at   timestamptz not null default now()
);

create table if not exists public.messes (
  id          text primary key,
  name        text not null,
  max_members integer not null default 6,
  address     text,
  start_date  date not null,
  currency    text not null default 'BDT',
  code        text not null,
  owner_id    uuid not null references public.profiles(id) on delete cascade,
  settings    jsonb not null,
  created_at  timestamptz not null default now()
);
create index if not exists messes_owner_idx on public.messes(owner_id);
create index if not exists messes_code_idx  on public.messes(upper(code));

create table if not exists public.members (
  id           text primary key,
  mess_id      text not null references public.messes(id) on delete cascade,
  user_id      uuid references public.profiles(id) on delete set null,
  name         text not null,
  contact      text,
  role         text not null default 'member' check (role in ('owner','manager','member')),
  active       boolean not null default true,
  joined_at    timestamptz not null default now(),
  left_at      timestamptz,
  avatar_color text not null default ''
);
create index if not exists members_mess_idx on public.members(mess_id);
create index if not exists members_user_idx on public.members(user_id);

create table if not exists public.meals (
  id         text primary key,
  mess_id    text not null references public.messes(id) on delete cascade,
  member_id  text not null,
  date       date not null,
  breakfast  integer not null default 0,
  lunch      integer not null default 0,
  dinner     integer not null default 0,
  updated_at timestamptz not null default now()
);
create index if not exists meals_mess_idx on public.meals(mess_id);
create unique index if not exists meals_unique_idx on public.meals(mess_id, member_id, date);

create table if not exists public.guest_meals (
  id             text primary key,
  mess_id        text not null references public.messes(id) on delete cascade,
  host_member_id text not null,
  guest_name     text not null,
  date           date not null,
  type           text not null check (type in ('breakfast','lunch','dinner')),
  count          integer not null default 1,
  created_at     timestamptz not null default now()
);
create index if not exists guest_meals_mess_idx on public.guest_meals(mess_id);

create table if not exists public.bazars (
  id              text primary key,
  mess_id         text not null references public.messes(id) on delete cascade,
  date            date not null,
  buyer_member_id text not null,
  items           jsonb not null default '[]'::jsonb,
  note            text,
  receipt         text,
  created_at      timestamptz not null default now()
);
create index if not exists bazars_mess_idx on public.bazars(mess_id);

create table if not exists public.expenses (
  id                text primary key,
  mess_id           text not null references public.messes(id) on delete cascade,
  date              date not null,
  category          text not null,
  amount            double precision not null default 0,
  paid_by_member_id text not null,
  description       text,
  split             text check (split in ('equal','meal','custom')),
  custom_shares     jsonb,
  receipt           text,
  created_at        timestamptz not null default now()
);
create index if not exists expenses_mess_idx on public.expenses(mess_id);

create table if not exists public.payments (
  id         text primary key,
  mess_id    text not null references public.messes(id) on delete cascade,
  member_id  text not null,
  amount     double precision not null default 0,
  date       date not null,
  method     text not null check (method in ('Cash','bKash','Nagad','Bank','Other')),
  note       text,
  created_at timestamptz not null default now()
);
create index if not exists payments_mess_idx on public.payments(mess_id);

-- from_member_id / to_member_id may hold the '__fund__' sentinel -> plain text, no member FK.
create table if not exists public.settlements (
  id             text primary key,
  mess_id        text not null references public.messes(id) on delete cascade,
  month          text not null,
  from_member_id text not null,
  to_member_id   text not null,
  amount         double precision not null default 0,
  settled        boolean not null default false,
  settled_at     timestamptz
);
create index if not exists settlements_mess_idx on public.settlements(mess_id);
create unique index if not exists settlements_unique_idx
  on public.settlements(mess_id, month, from_member_id, to_member_id);

-- ------------------- RLS HELPERS (SECURITY DEFINER, no recursion) -----------
create or replace function public.is_member_of(p_mess_id text)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.members m
    where m.mess_id = p_mess_id and m.user_id = auth.uid() and m.active
  );
$$;

create or replace function public.mess_role(p_mess_id text)
returns text language sql security definer stable set search_path = public as $$
  select m.role from public.members m
  where m.mess_id = p_mess_id and m.user_id = auth.uid() and m.active
  limit 1;
$$;

-- ------------------------- AUTH: profile lifecycle --------------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, contact, avatar_color)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'fullName', ''),
    coalesce(new.raw_user_meta_data->>'contact', new.email, ''),
    coalesce(new.raw_user_meta_data->>'avatarColor', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.handle_profile_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.full_name is distinct from old.full_name then
    update public.members set name = new.full_name where user_id = new.id;
  end if;
  return new;
end;
$$;
drop trigger if exists on_profile_updated on public.profiles;
create trigger on_profile_updated
  after update on public.profiles for each row execute function public.handle_profile_update();

-- ------------------------------- RPCs ---------------------------------------
create or replace function public.create_mess(
  p_mess_id text, p_member_id text, p_name text, p_max_members integer,
  p_address text, p_start_date date, p_currency text, p_code text, p_settings jsonb
) returns public.messes language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_profile public.profiles; v_mess public.messes;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  select * into v_profile from public.profiles where id = v_uid;
  insert into public.messes(id,name,max_members,address,start_date,currency,code,owner_id,settings)
  values (p_mess_id, p_name, greatest(1,p_max_members), nullif(p_address,''), p_start_date,
          coalesce(nullif(p_currency,''),'BDT'), p_code, v_uid, p_settings)
  returning * into v_mess;
  insert into public.members(id,mess_id,user_id,name,contact,role,active,avatar_color)
  values (p_member_id, p_mess_id, v_uid, coalesce(v_profile.full_name,''),
          v_profile.contact, 'owner', true, coalesce(v_profile.avatar_color,''));
  return v_mess;
end;
$$;

create or replace function public.join_mess_by_code(p_code text, p_member_id text)
returns public.messes language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_profile public.profiles; v_mess public.messes;
        v_existing public.members; v_active_count integer;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  select * into v_mess from public.messes where upper(code) = upper(trim(p_code)) limit 1;
  if v_mess.id is null then raise exception 'Invalid code. Please check and try again.'; end if;

  select * into v_existing from public.members where mess_id = v_mess.id and user_id = v_uid limit 1;
  if v_existing.id is not null then
    if not v_existing.active then
      update public.members set active = true, left_at = null where id = v_existing.id;
    end if;
    return v_mess;
  end if;

  select count(*) into v_active_count from public.members where mess_id = v_mess.id and active;
  if v_active_count >= v_mess.max_members then raise exception 'This mess is currently full.'; end if;

  select * into v_profile from public.profiles where id = v_uid;
  insert into public.members(id,mess_id,user_id,name,contact,role,active,avatar_color)
  values (p_member_id, v_mess.id, v_uid, coalesce(v_profile.full_name,''),
          v_profile.contact, 'member', true, coalesce(v_profile.avatar_color,''));
  return v_mess;
end;
$$;

create or replace function public.leave_mess(p_mess_id text)
returns void language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_role text;
begin
  select role into v_role from public.members
    where mess_id = p_mess_id and user_id = v_uid and active limit 1;
  if v_role is null then raise exception 'Not a member.'; end if;
  if v_role = 'owner' then raise exception 'Transfer ownership or delete the mess before leaving.'; end if;
  update public.members set active = false, left_at = now()
    where mess_id = p_mess_id and user_id = v_uid;
end;
$$;

-- ------------------------------- RLS ----------------------------------------
alter table public.profiles    enable row level security;
alter table public.messes      enable row level security;
alter table public.members     enable row level security;
alter table public.meals       enable row level security;
alter table public.guest_meals enable row level security;
alter table public.bazars      enable row level security;
alter table public.expenses    enable row level security;
alter table public.payments    enable row level security;
alter table public.settlements enable row level security;

-- profiles: own row only (members carry denormalized display fields)
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles for select using (id = auth.uid());
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles for update
  using (id = auth.uid()) with check (id = auth.uid());
-- insert is handled by handle_new_user() (definer); no client insert policy.

-- messes: members read; owner/manager update; owner delete; insert via RPC.
drop policy if exists messes_select on public.messes;
create policy messes_select on public.messes for select using (public.is_member_of(id));
drop policy if exists messes_update on public.messes;
create policy messes_update on public.messes for update
  using (public.mess_role(id) in ('owner','manager'))
  with check (public.mess_role(id) in ('owner','manager'));
drop policy if exists messes_delete on public.messes;
create policy messes_delete on public.messes for delete using (owner_id = auth.uid());

-- members: members read; owner/manager update; insert via RPC; delete via mess cascade only.
drop policy if exists members_select on public.members;
create policy members_select on public.members for select using (public.is_member_of(mess_id));
drop policy if exists members_update on public.members;
create policy members_update on public.members for update
  using (public.mess_role(mess_id) in ('owner','manager'))
  with check (public.mess_role(mess_id) in ('owner','manager'));

-- data tables: full CRUD for active members of the mess.
drop policy if exists meals_all on public.meals;
create policy meals_all on public.meals for all
  using (public.is_member_of(mess_id)) with check (public.is_member_of(mess_id));
drop policy if exists guest_meals_all on public.guest_meals;
create policy guest_meals_all on public.guest_meals for all
  using (public.is_member_of(mess_id)) with check (public.is_member_of(mess_id));
drop policy if exists bazars_all on public.bazars;
create policy bazars_all on public.bazars for all
  using (public.is_member_of(mess_id)) with check (public.is_member_of(mess_id));
drop policy if exists expenses_all on public.expenses;
create policy expenses_all on public.expenses for all
  using (public.is_member_of(mess_id)) with check (public.is_member_of(mess_id));
drop policy if exists payments_all on public.payments;
create policy payments_all on public.payments for all
  using (public.is_member_of(mess_id)) with check (public.is_member_of(mess_id));
drop policy if exists settlements_all on public.settlements;
create policy settlements_all on public.settlements for all
  using (public.is_member_of(mess_id)) with check (public.is_member_of(mess_id));

-- ------------------------------- GRANTS -------------------------------------
grant usage on schema public to authenticated;
grant select, insert, update, delete on
  public.profiles, public.messes, public.members, public.meals, public.guest_meals,
  public.bazars, public.expenses, public.payments, public.settlements
to authenticated;
grant execute on function public.is_member_of(text)  to authenticated;
grant execute on function public.mess_role(text)     to authenticated;
grant execute on function public.leave_mess(text)     to authenticated;
grant execute on function public.create_mess(text,text,text,integer,text,date,text,text,jsonb) to authenticated;
grant execute on function public.join_mess_by_code(text,text) to authenticated;

-- ----------------------------- REALTIME -------------------------------------
-- Publish INSERT/UPDATE/DELETE on the shared data tables so members receive
-- live changes (see src/lib/realtime.ts). RLS still applies to realtime, so a
-- client only receives rows for messes it belongs to. Idempotent: only adds a
-- table if it isn't already in Supabase's default `supabase_realtime` publication.
do $$
declare t text;
begin
  foreach t in array array['bazars','expenses','payments','meals','guest_meals'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

