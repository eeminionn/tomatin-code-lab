alter table public.profiles
  add column if not exists profile_image_path text;

alter table public.profiles
  drop constraint if exists profiles_profile_image_path_check,
  add constraint profiles_profile_image_path_check check (
    profile_image_path is null
    or (
      char_length(profile_image_path) between 1 and 500
      and profile_image_path !~ '(^|/)\.\.(/|$)'
      and split_part(profile_image_path, '/', 1) = id::text
    )
  );

create or replace function public.protect_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and (
    new.role is distinct from old.role
    or new.email is distinct from old.email
    or new.github_login is distinct from old.github_login
    or new.github_id is distinct from old.github_id
    or new.avatar_url is distinct from old.avatar_url
    or new.created_at is distinct from old.created_at
  ) then
    raise exception 'Profile identity fields cannot be changed by the user.';
  end if;
  return new;
end;
$$;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'profile-images',
  'profile-images',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Class members read profile images"
on storage.objects for select
to authenticated
using (
  bucket_id = 'profile-images'
  and exists (
    select 1
    from public.memberships viewer
    join public.memberships image_owner
      on image_owner.class_id = viewer.class_id
    where viewer.user_id = auth.uid()
      and viewer.status = 'active'
      and image_owner.user_id::text = (storage.foldername(name))[1]
      and image_owner.status = 'active'
  )
);

create policy "Users upload own profile images"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'profile-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Users update own profile images"
on storage.objects for update
to authenticated
using (
  bucket_id = 'profile-images'
  and owner_id = auth.uid()::text
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'profile-images'
  and owner_id = auth.uid()::text
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Users delete own profile images"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'profile-images'
  and owner_id = auth.uid()::text
  and (storage.foldername(name))[1] = auth.uid()::text
);
