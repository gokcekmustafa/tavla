-- Postgres-first schema for Nhost now, Supabase later.
-- Keep tables vendor-neutral so migration stays simple.

create extension if not exists pgcrypto;

create table if not exists profiles (
  id uuid primary key,
  email text unique,
  display_name text not null,
  avatar_url text,
  created_at timestamptz not null default now()
);

create table if not exists game_rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  status text not null default 'waiting' check (status in ('waiting', 'active', 'finished')),
  created_by uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists game_room_members (
  room_id uuid not null references game_rooms(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  seat text not null check (seat in ('white', 'black', 'spectator')),
  joined_at timestamptz not null default now(),
  primary key (room_id, user_id)
);

create unique index if not exists game_room_members_unique_seat
  on game_room_members (room_id, seat)
  where seat in ('white', 'black');

create table if not exists chat_messages (
  id bigserial primary key,
  room_id uuid not null references game_rooms(id) on delete cascade,
  sender_id uuid not null references profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists chat_messages_room_created_idx
  on chat_messages (room_id, created_at desc);
