create table if not exists public.family_member_locations (
  member_id uuid primary key references public.foyer_members(id) on delete cascade,
  foyer_id uuid not null references public.foyers(id) on delete cascade,
  latitude double precision,
  longitude double precision,
  location_status text,
  located_at timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists family_member_locations_foyer_id_idx
  on public.family_member_locations(foyer_id);

alter table public.family_member_locations enable row level security;

drop policy if exists "family members can read locations" on public.family_member_locations;
create policy "family members can read locations"
on public.family_member_locations
for select
to authenticated
using (
  exists (
    select 1
    from public.foyer_members membership
    where membership.foyer_id = family_member_locations.foyer_id
      and membership.user_id = auth.uid()
      and membership.approved is not false
  )
);

drop policy if exists "family members can write locations" on public.family_member_locations;
create policy "family members can write locations"
on public.family_member_locations
for all
to authenticated
using (
  exists (
    select 1
    from public.foyer_members membership
    where membership.foyer_id = family_member_locations.foyer_id
      and membership.user_id = auth.uid()
      and membership.approved is not false
  )
)
with check (
  exists (
    select 1
    from public.foyer_members membership
    where membership.foyer_id = family_member_locations.foyer_id
      and membership.user_id = auth.uid()
      and membership.approved is not false
  )
);

insert into public.family_member_locations (
  member_id,
  foyer_id,
  latitude,
  longitude,
  location_status,
  located_at,
  updated_at
)
select
  id,
  foyer_id,
  latitude,
  longitude,
  location_status,
  last_located_at,
  coalesce(last_located_at, now())
from public.foyer_members
where latitude is not null
   or longitude is not null
   or location_status is not null
on conflict (member_id) do nothing;

-- Legacy embedded avatars are never read by the application anymore. Clearing
-- them prevents full Base64 images from being emitted in Realtime payloads.
update public.foyer_members
set photo_url = null
where photo_url like 'data:%';

do $$
begin
  alter publication supabase_realtime add table public.family_member_locations;
exception
  when duplicate_object then null;
end $$;
