-- Curated child sub-tags under main taxonomy tags.

create table if not exists public.taxonomy_subtags (
  slug text primary key,
  parent_slug text not null references public.taxonomy_tags(slug) on delete cascade,
  label text not null
);

create index if not exists idx_subtags_parent
  on public.taxonomy_subtags(parent_slug);

create table if not exists public.profile_subtags (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  subtag_slug text not null references public.taxonomy_subtags(slug) on delete cascade,
  created_at timestamptz not null default now(),
  unique (profile_id, subtag_slug)
);

create index if not exists idx_profile_subtags_slug
  on public.profile_subtags(subtag_slug);

alter table public.taxonomy_subtags enable row level security;
alter table public.profile_subtags enable row level security;

create policy "taxonomy_subtags_select" on public.taxonomy_subtags
  for select using (true);

create policy "taxonomy_subtags_insert_auth" on public.taxonomy_subtags
  for insert with check (auth.uid() is not null);

create policy "profile_subtags_select" on public.profile_subtags
  for select using (true);

create policy "profile_subtags_write_own" on public.profile_subtags
  for all using (auth.uid() = profile_id) with check (auth.uid() = profile_id);

-- Example sub-tags under a few main tags
insert into public.taxonomy_subtags (slug, parent_slug, label) values
  ('fortnite', 'video-games', 'Fortnite'),
  ('minecraft', 'video-games', 'Minecraft'),
  ('zelda', 'video-games', 'Zelda'),
  ('valorant', 'video-games', 'Valorant'),
  ('animal-crossing', 'video-games', 'Animal Crossing'),
  ('openings', 'chess', 'Openings'),
  ('endgames', 'chess', 'Endgames'),
  ('blitz', 'chess', 'Blitz'),
  ('classical', 'chess', 'Classical'),
  ('chess-puzzles', 'chess', 'Puzzles'),
  ('javascript', 'programming', 'JavaScript'),
  ('python', 'programming', 'Python'),
  ('rust', 'programming', 'Rust'),
  ('typescript', 'programming', 'TypeScript'),
  ('systems-go', 'programming', 'Go'),
  ('portrait', 'photography', 'Portrait'),
  ('landscape', 'photography', 'Landscape'),
  ('street-photo', 'photography', 'Street'),
  ('film-photography', 'photography', 'Film'),
  ('italian-cuisine', 'cooking', 'Italian'),
  ('sushi', 'cooking', 'Sushi'),
  ('meal-prep', 'cooking', 'Meal prep'),
  ('pastry', 'cooking', 'Pastry')
on conflict (slug) do update set
  parent_slug = excluded.parent_slug,
  label = excluded.label;
