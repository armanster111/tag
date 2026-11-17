-- Remove unused pending-tag suggestion queue (curated taxonomy only).
drop policy if exists "suggestions_select" on public.tag_suggestions;
drop policy if exists "suggestions_insert" on public.tag_suggestions;
drop policy if exists "suggestions_update_auth" on public.tag_suggestions;
drop index if exists public.idx_suggestions_status;
drop table if exists public.tag_suggestions;
