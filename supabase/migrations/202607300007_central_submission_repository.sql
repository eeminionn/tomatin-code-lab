alter table public.student_repositories
  add column storage_mode text not null default 'legacy_per_student',
  add column student_path text;

alter table public.student_repositories
  add constraint student_repositories_storage_mode_check
    check (storage_mode in ('legacy_per_student', 'central')),
  add constraint student_repositories_student_path_check
    check (
      student_path is null
      or (
        char_length(student_path) between 1 and 100
        and student_path ~ '^[a-z0-9][a-z0-9._-]*$'
      )
    ),
  add constraint student_repositories_mode_path_check
    check (
      (storage_mode = 'legacy_per_student' and student_path is null)
      or (storage_mode = 'central' and student_path is not null)
    );

alter table public.student_repositories
  drop constraint if exists student_repositories_owner_login_repository_name_key,
  drop constraint if exists student_repositories_collaborator_status_check;

alter table public.student_repositories
  add constraint student_repositories_collaborator_status_check
    check (
      collaborator_status in (
        'pending',
        'invited',
        'active',
        'not_required',
        'error'
      )
    );

create unique index student_repositories_class_student_path_key
  on public.student_repositories(class_id, student_path)
  where student_path is not null;

create index student_repositories_physical_repository_idx
  on public.student_repositories(owner_login, repository_name);

comment on column public.student_repositories.storage_mode is
  'legacy_per_student for repositories created before 3.1; central for the shared private repository.';

comment on column public.student_repositories.student_path is
  'Server-derived folder for this student inside the central private repository.';
