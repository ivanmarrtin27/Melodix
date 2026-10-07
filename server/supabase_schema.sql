-- Ejecutar en Supabase → SQL Editor

create table if not exists listening_history (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  media_id text not null,
  title text,
  artist text,
  played_at timestamptz default now()
);

create table if not exists playlists (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  description text,
  cover_url text,
  created_at timestamptz default now()
);

create table if not exists playlist_tracks (
  id uuid default gen_random_uuid() primary key,
  playlist_id uuid references playlists(id) on delete cascade,
  media_id text not null,
  title text,
  artist text,
  cover text,
  duration integer,
  added_at timestamptz default now()
);

create table if not exists favorites (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  media_id text not null,
  title text,
  artist text,
  cover text,
  created_at timestamptz default now(),
  unique(user_id, media_id)
);

alter table listening_history enable row level security;
alter table playlists enable row level security;
alter table playlist_tracks enable row level security;
alter table favorites enable row level security;

create policy "own data" on listening_history for all using (auth.uid() = user_id);
create policy "own data" on playlists for all using (auth.uid() = user_id);
create policy "own data" on favorites for all using (auth.uid() = user_id);
create policy "playlist access" on playlist_tracks for all
  using (playlist_id in (select id from playlists where user_id = auth.uid()));

-- Listas compartidas por código de invitación (colaboración)
create table if not exists playlist_shares (
  id uuid default gen_random_uuid() primary key,
  owner_id uuid references auth.users(id) on delete cascade not null,
  invite_code text unique not null,
  name text not null,
  cover_url text,
  tracks jsonb not null default '[]',
  updated_at timestamptz default now()
);

alter table playlist_shares enable row level security;

create policy "owner manages shares" on playlist_shares for all
  using (auth.uid() = owner_id);

-- NO permitir SELECT de todos los shares autenticados.
-- Acceso por código vía RPC security definer:
drop policy if exists "authenticated read shares" on playlist_shares;

create or replace function public.get_playlist_share_by_code(code text)
returns setof playlist_shares
language sql
security definer
set search_path = public
as $$
  select * from playlist_shares
  where invite_code = code
  limit 1;
$$;

revoke all on function public.get_playlist_share_by_code(text) from public;
grant execute on function public.get_playlist_share_by_code(text) to authenticated;
grant execute on function public.get_playlist_share_by_code(text) to anon;
