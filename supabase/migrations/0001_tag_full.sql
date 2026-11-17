-- Tag full schema (phases 1–4 + curated taxonomy)

create extension if not exists "pgcrypto";

-- Taxonomy
create table if not exists public.taxonomy_tags (
  slug text primary key,
  label text not null,
  category text not null
);

create table if not exists public.tag_suggestions (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  label text not null,
  category text,
  suggested_by uuid references auth.users(id) on delete set null,
  note text not null default '',
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now()
);

create index if not exists idx_taxonomy_category on public.taxonomy_tags(category);
create index if not exists idx_suggestions_status on public.tag_suggestions(status);

-- Profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  handle text not null unique,
  bio text not null default '',
  looking_for text not null default '',
  rank int not null default 0,
  season_points int not null default 0,
  streak_count int not null default 0,
  last_streak_date date,
  created_at timestamptz not null default now(),
  last_active_at timestamptz not null default now()
);

create unique index if not exists profiles_handle_lower
  on public.profiles (lower(handle));

create table if not exists public.profile_tags (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  tag text not null references public.taxonomy_tags(slug),
  level int not null check (level between 1 and 10),
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  unique (profile_id, tag)
);

create unique index if not exists idx_one_primary_per_profile
  on public.profile_tags (profile_id) where is_primary;

create index if not exists idx_tags_tag_level on public.profile_tags(tag, level);
create index if not exists idx_profiles_created on public.profiles(created_at desc);
create index if not exists idx_profiles_active on public.profiles(last_active_at desc);
create index if not exists idx_profiles_looking on public.profiles(looking_for);

create table if not exists public.endorsements (
  id uuid primary key default gen_random_uuid(),
  from_profile_id uuid not null references public.profiles(id) on delete cascade,
  to_profile_id uuid not null references public.profiles(id) on delete cascade,
  tag text not null,
  created_at timestamptz not null default now(),
  unique (from_profile_id, to_profile_id, tag),
  check (from_profile_id <> to_profile_id)
);

create table if not exists public.rank_events (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  rank int not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_rank_events_profile_time
  on public.rank_events(profile_id, created_at);

create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  a_id uuid not null references public.profiles(id) on delete cascade,
  b_id uuid not null references public.profiles(id) on delete cascade,
  status text not null check (status in ('pending', 'accepted')),
  requested_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (a_id, b_id),
  check (a_id < b_id)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index if not exists idx_messages_pair
  on public.messages(sender_id, recipient_id, created_at);

create table if not exists public.waves (
  id uuid primary key default gen_random_uuid(),
  from_id uuid not null references public.profiles(id) on delete cascade,
  to_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (from_id, to_id),
  check (from_id <> to_id)
);

create table if not exists public.blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create table if not exists public.mutes (
  muter_id uuid not null references public.profiles(id) on delete cascade,
  muted_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (muter_id, muted_id),
  check (muter_id <> muted_id)
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reported_id uuid not null references public.profiles(id) on delete cascade,
  reason text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.seasons (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  is_current boolean not null default false
);

create table if not exists public.season_baselines (
  season_id uuid not null references public.seasons(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  rank int not null,
  primary key (season_id, profile_id)
);

create table if not exists public.spotlight_votes (
  season_id uuid not null references public.seasons(id) on delete cascade,
  voter_id uuid not null references public.profiles(id) on delete cascade,
  candidate_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (season_id, voter_id),
  check (voter_id <> candidate_id)
);

-- Rank rollup from tag levels
create or replace function public.recompute_profile_rank()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  pid uuid;
begin
  pid := coalesce(new.profile_id, old.profile_id);
  update public.profiles
  set
    rank = coalesce((select sum(level) from public.profile_tags where profile_id = pid), 0),
    last_active_at = now()
  where id = pid;
  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_tags_ai_rank on public.profile_tags;
drop trigger if exists trg_tags_au_rank on public.profile_tags;
drop trigger if exists trg_tags_ad_rank on public.profile_tags;

create trigger trg_tags_ai_rank
after insert on public.profile_tags
for each row execute function public.recompute_profile_rank();

create trigger trg_tags_au_rank
after update of level, profile_id on public.profile_tags
for each row execute function public.recompute_profile_rank();

create trigger trg_tags_ad_rank
after delete on public.profile_tags
for each row execute function public.recompute_profile_rank();

create or replace function public.on_profile_rank_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.rank is distinct from new.rank then
    insert into public.rank_events (profile_id, rank)
    values (new.id, new.rank);
    update public.profiles
    set season_points = greatest(0, season_points + (new.rank - old.rank))
    where id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_profiles_au_rank_event on public.profiles;
create trigger trg_profiles_au_rank_event
after update of rank on public.profiles
for each row execute function public.on_profile_rank_change();

-- RLS
alter table public.profiles enable row level security;
alter table public.profile_tags enable row level security;
alter table public.endorsements enable row level security;
alter table public.rank_events enable row level security;
alter table public.friendships enable row level security;
alter table public.messages enable row level security;
alter table public.waves enable row level security;
alter table public.blocks enable row level security;
alter table public.mutes enable row level security;
alter table public.reports enable row level security;
alter table public.taxonomy_tags enable row level security;
alter table public.tag_suggestions enable row level security;
alter table public.seasons enable row level security;
alter table public.season_baselines enable row level security;
alter table public.spotlight_votes enable row level security;

-- Public read profiles/tags/taxonomy
create policy "profiles_select" on public.profiles for select using (true);
create policy "profile_tags_select" on public.profile_tags for select using (true);
create policy "endorsements_select" on public.endorsements for select using (true);
create policy "rank_events_select" on public.rank_events for select using (true);
create policy "taxonomy_select" on public.taxonomy_tags for select using (true);
create policy "seasons_select" on public.seasons for select using (true);
create policy "season_baselines_select" on public.season_baselines for select using (true);
create policy "spotlight_select" on public.spotlight_votes for select using (true);
create policy "waves_select" on public.waves for select using (true);
create policy "friendships_select" on public.friendships for select using (true);

create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

create policy "profile_tags_write_own" on public.profile_tags
  for all using (auth.uid() = profile_id) with check (auth.uid() = profile_id);

create policy "endorsements_insert" on public.endorsements
  for insert with check (auth.uid() = from_profile_id);

create policy "messages_select_own" on public.messages
  for select using (auth.uid() = sender_id or auth.uid() = recipient_id);
create policy "messages_insert" on public.messages
  for insert with check (auth.uid() = sender_id);
create policy "messages_update_own" on public.messages
  for update using (auth.uid() = recipient_id);

create policy "friendships_insert" on public.friendships
  for insert with check (auth.uid() = requested_by);
create policy "friendships_update" on public.friendships
  for update using (auth.uid() = a_id or auth.uid() = b_id);

create policy "waves_insert" on public.waves
  for insert with check (auth.uid() = from_id);
create policy "waves_update" on public.waves
  for update using (auth.uid() = from_id);

create policy "blocks_all_own" on public.blocks
  for all using (auth.uid() = blocker_id) with check (auth.uid() = blocker_id);
create policy "mutes_all_own" on public.mutes
  for all using (auth.uid() = muter_id) with check (auth.uid() = muter_id);

create policy "reports_insert" on public.reports
  for insert with check (auth.uid() = reporter_id);
create policy "reports_select_own" on public.reports
  for select using (auth.uid() = reporter_id);

create policy "suggestions_select" on public.tag_suggestions for select using (true);
create policy "suggestions_insert" on public.tag_suggestions
  for insert with check (auth.uid() = suggested_by or suggested_by is null);
create policy "suggestions_update_auth" on public.tag_suggestions
  for update using (auth.uid() is not null);

create policy "spotlight_upsert" on public.spotlight_votes
  for all using (auth.uid() = voter_id) with check (auth.uid() = voter_id);

create policy "taxonomy_insert_auth" on public.taxonomy_tags
  for insert with check (auth.uid() is not null);

create policy "seasons_write_auth" on public.seasons
  for all using (auth.uid() is not null) with check (auth.uid() is not null);
create policy "season_baselines_write_auth" on public.season_baselines
  for all using (auth.uid() is not null) with check (auth.uid() is not null);
create policy "rank_events_insert_auth" on public.rank_events
  for insert with check (auth.uid() is not null);
