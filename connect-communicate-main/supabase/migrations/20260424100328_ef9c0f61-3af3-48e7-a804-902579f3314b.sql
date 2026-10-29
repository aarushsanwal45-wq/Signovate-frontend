
-- Roles enum
create type public.app_role as enum ('admin', 'user');

-- Community type enum
create type public.community_type as enum ('deaf', 'mute', 'blind', 'multiple');

-- Device type / connection / status enums
create type public.device_type as enum ('camera', 'gloves', 'goggles', 'microphone');
create type public.connection_type as enum ('usb', 'bluetooth', 'wifi');
create type public.device_status as enum ('connected', 'offline', 'pairing');

-- Profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  community_type public.community_type,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Profiles are viewable by owner"
on public.profiles for select to authenticated
using (auth.uid() = id);

create policy "Profiles insertable by owner"
on public.profiles for insert to authenticated
with check (auth.uid() = id);

create policy "Profiles updatable by owner"
on public.profiles for update to authenticated
using (auth.uid() = id);

-- User roles
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  )
$$;

create policy "Users can view their own roles"
on public.user_roles for select to authenticated
using (auth.uid() = user_id);

-- Auto-create profile + default role on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email));
  insert into public.user_roles (user_id, role)
  values (new.id, 'user');
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Devices
create table public.devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  nickname text,
  device_type public.device_type not null,
  connection_type public.connection_type not null,
  status public.device_status not null default 'offline',
  battery integer,
  signal_strength integer,
  last_seen timestamptz,
  config jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.devices enable row level security;

create policy "Devices viewable by owner"
on public.devices for select to authenticated
using (auth.uid() = user_id);

create policy "Devices insertable by owner"
on public.devices for insert to authenticated
with check (auth.uid() = user_id);

create policy "Devices updatable by owner"
on public.devices for update to authenticated
using (auth.uid() = user_id);

create policy "Devices deletable by owner"
on public.devices for delete to authenticated
using (auth.uid() = user_id);

-- Translation logs
create table public.translation_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  device_id uuid references public.devices(id) on delete set null,
  detected_sign text not null,
  confidence numeric(5,2),
  output_text text,
  created_at timestamptz not null default now()
);

alter table public.translation_logs enable row level security;

create policy "Logs viewable by owner"
on public.translation_logs for select to authenticated
using (auth.uid() = user_id);

create policy "Logs insertable by owner"
on public.translation_logs for insert to authenticated
with check (auth.uid() = user_id);

create index idx_devices_user on public.devices(user_id);
create index idx_logs_user on public.translation_logs(user_id, created_at desc);
