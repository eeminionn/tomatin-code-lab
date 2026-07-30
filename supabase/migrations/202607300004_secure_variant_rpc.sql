begin;

create or replace function public.get_mission_variant_secure(
  p_variant_id uuid
)
returns table (
  reference_solution text,
  hidden_tests jsonb
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'Service role required.' using errcode = '42501';
  end if;

  return query
  select
    secure.reference_solution,
    secure.hidden_tests
  from private.mission_variants_secure secure
  where secure.variant_id = p_variant_id;
end;
$$;

create or replace function public.upsert_mission_variant_secure(
  p_variant_id uuid,
  p_reference_solution text,
  p_hidden_tests jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'Service role required.' using errcode = '42501';
  end if;
  if p_reference_solution is null
    or octet_length(p_reference_solution) > 65536
  then
    raise exception 'Invalid reference solution.' using errcode = '22023';
  end if;
  if p_hidden_tests is null or jsonb_typeof(p_hidden_tests) <> 'array' then
    raise exception 'Hidden tests must be an array.' using errcode = '22023';
  end if;

  insert into private.mission_variants_secure (
    variant_id,
    reference_solution,
    hidden_tests,
    updated_at
  )
  values (
    p_variant_id,
    p_reference_solution,
    p_hidden_tests,
    now()
  )
  on conflict (variant_id) do update set
    reference_solution = excluded.reference_solution,
    hidden_tests = excluded.hidden_tests,
    updated_at = excluded.updated_at;
end;
$$;

revoke all on function public.get_mission_variant_secure(uuid)
from public, anon, authenticated;
revoke all on function public.upsert_mission_variant_secure(uuid, text, jsonb)
from public, anon, authenticated;

grant usage on schema public to service_role;
grant select, insert, update, delete on all tables in schema public
to service_role;
grant usage, select on all sequences in schema public
to service_role;

grant execute on function public.get_mission_variant_secure(uuid)
to service_role;
grant execute on function public.upsert_mission_variant_secure(uuid, text, jsonb)
to service_role;

commit;
