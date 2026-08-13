create table public.review_rubrics (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 80),
  criteria jsonb not null default '[]'::jsonb,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint review_rubrics_criteria_check check (
    jsonb_typeof(criteria) = 'array'
    and jsonb_array_length(criteria) between 1 and 10
    and octet_length(criteria::text) <= 4000
  )
);

alter table public.assignments
  add column rubric_id uuid references public.review_rubrics(id) on delete set null;

create index review_rubrics_class_idx on public.review_rubrics(class_id);
create index assignments_rubric_idx on public.assignments(rubric_id)
  where rubric_id is not null;

alter table public.review_rubrics enable row level security;

create policy "Staff view review rubrics"
on public.review_rubrics for select
to authenticated
using (public.is_class_staff(class_id));

create policy "Staff manage review rubrics"
on public.review_rubrics for all
to authenticated
using (public.is_class_staff(class_id))
with check (
  public.is_class_staff(class_id)
  and created_by = (select auth.uid())
);

grant select, insert, update, delete on public.review_rubrics to authenticated;
