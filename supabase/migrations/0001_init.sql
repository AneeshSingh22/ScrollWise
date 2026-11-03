-- Scrollwise schema. Mirrors SPEC.md section 10.
--
-- Row-level security: every user-owned table is readable and writable only by
-- its owner. `cards` is readable by any signed-in user and writable only with
-- the service key, so the nightly pipeline can publish but the app cannot.

-- ---------------------------------------------------------------- profiles --
create table if not exists profiles (
  id            uuid primary key references auth.users on delete cascade,
  xp            int  not null default 0,
  level         int  not null default 1,
  streak        int  not null default 0,
  last_active   date,
  daily_goal    int  not null default 2,
  topic_weights jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now()
);

-- A profile row per signed-up user, created automatically.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- -------------------------------------------------------------- raw_items --
-- Ingested source material (Phase 3), before the LLM turns it into cards.
create table if not exists raw_items (
  id         uuid primary key default gen_random_uuid(),
  source     text,
  category   text,
  url        text unique,
  title      text,
  text       text,
  fetched_at timestamptz not null default now(),
  used       boolean not null default false
);

create index if not exists raw_items_unused_idx
  on raw_items (category, fetched_at desc) where not used;

-- ------------------------------------------------------------------ cards --
create table if not exists cards (
  id           uuid primary key default gen_random_uuid(),
  category     text not null,
  type         text not null,
  difficulty   int  not null default 1,
  payload      jsonb not null,          -- type-specific fields, SPEC section 5
  tags         text[] not null default '{}',
  source_url   text,
  source_title text,
  status       text not null default 'live',   -- draft | live | rejected | expired
  model        text,
  created_at   timestamptz not null default now(),
  expires_at   timestamptz,
  constraint cards_status_check
    check (status in ('draft', 'live', 'rejected', 'expired')),
  constraint cards_category_check
    check (category in ('ai', 'tech', 'life', 'world', 'math')),
  constraint cards_difficulty_check
    check (difficulty between 1 and 3)
);

-- The session builder's main query: live, unexpired, newest first.
create index if not exists cards_live_idx
  on cards (category, created_at desc)
  where status = 'live';

-- ------------------------------------------------------------- card_events --
-- card_id is text, not uuid: seed and procedural cards have string ids
-- ("ai-gpt", "math-sprint") and no row in `cards`. Pipeline cards store their
-- uuid as text here. Not a foreign key for the same reason.
create table if not exists card_events (
  id         bigserial primary key,
  user_id    uuid not null references auth.users on delete cascade,
  card_id    text,
  session_id uuid,
  kind       text not null,             -- view | skip | like | save | fewer | answer | challenge_accepted
  value      jsonb,                     -- {correct:true} / {dwell_ms:5400}
  created_at timestamptz not null default now()
);

create index if not exists card_events_user_idx
  on card_events (user_id, created_at desc);

-- ---------------------------------------------------------------- reviews --
-- Leitner spaced repetition (SPEC section 7).
create table if not exists reviews (
  user_id uuid not null references auth.users on delete cascade,
  card_id text not null,
  box     int  not null default 1,
  due_on  date not null,
  primary key (user_id, card_id),
  constraint reviews_box_check check (box between 1 and 5)
);

create index if not exists reviews_due_idx on reviews (user_id, due_on);

-- --------------------------------------------------------------- sessions --
create table if not exists sessions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users on delete cascade,
  started_at timestamptz not null default now(),
  ended_at   timestamptz,
  cards_seen int not null default 0,
  correct    int not null default 0,
  answered   int not null default 0,
  xp         int not null default 0
);

create index if not exists sessions_user_idx
  on sessions (user_id, started_at desc);

-- ------------------------------------------------------------------ saved --
create table if not exists saved (
  user_id    uuid not null references auth.users on delete cascade,
  card_id    text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, card_id)
);

-- ---------------------------------------------------------- pipeline_runs --
create table if not exists pipeline_runs (
  id         uuid primary key default gen_random_uuid(),
  started_at timestamptz not null default now(),
  provider   text,
  raw_count  int,
  drafted    int,
  published  int,
  rejected   int,
  rejections jsonb,
  cost_usd   numeric
);

-- ======================================================================= --
--                          Row-level security                             --
-- ======================================================================= --

alter table profiles      enable row level security;
alter table card_events   enable row level security;
alter table reviews       enable row level security;
alter table sessions      enable row level security;
alter table saved         enable row level security;
alter table cards         enable row level security;
alter table raw_items     enable row level security;
alter table pipeline_runs enable row level security;

-- Own-row access for the user-owned tables.
drop policy if exists "own profile" on profiles;
create policy "own profile" on profiles
  for all to authenticated
  using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "own events" on card_events;
create policy "own events" on card_events
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own reviews" on reviews;
create policy "own reviews" on reviews
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own sessions" on sessions;
create policy "own sessions" on sessions
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own saved" on saved;
create policy "own saved" on saved
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Cards: any signed-in user reads live ones. No insert/update/delete policy
-- exists, so only the service key (which bypasses RLS) can publish.
drop policy if exists "read live cards" on cards;
create policy "read live cards" on cards
  for select to authenticated
  using (status = 'live');

-- raw_items and pipeline_runs are pipeline-internal: RLS on with no policy
-- means no anon or authenticated access at all, service key only.
