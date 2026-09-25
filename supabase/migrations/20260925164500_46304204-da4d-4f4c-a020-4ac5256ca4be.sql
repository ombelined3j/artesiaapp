create or replace function public.most_viewed_exhibitions(result_limit integer default 1)
returns table (exhibition_id uuid, view_count bigint)
language sql
stable
security definer
set search_path = public
as $$
  select exhibition_id, count(*) as view_count
  from public.exhibition_views
  group by exhibition_id
  order by view_count desc
  limit result_limit
$$;

grant execute on function public.most_viewed_exhibitions(integer) to authenticated;
