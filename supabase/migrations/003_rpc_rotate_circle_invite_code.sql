create or replace function public.rotate_circle_invite_code(p_circle_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new_code text;
  v_attempts int := 0;
begin
  -- Require caller to be an approved admin of this circle
  if not exists (
    select 1 from public.circle_members
    where circle_id = p_circle_id
      and user_id = auth.uid()
      and role = 'admin'
      and status = 'approved'
  ) then
    raise exception 'not_authorized';
  end if;

  -- Attempt to generate unique 8-char A-Z0-9 code
  loop
    v_attempts := v_attempts + 1;
    v_new_code := (
      select string_agg(substr(chars, ((trunc(random()*length(chars))+1)::int), 1), '')
      from generate_series(1, 8),
           (select 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789' as chars) t
    );

    begin
      update public.circles
         set invite_code = v_new_code,
             invite_code_rotated_at = now(),
             invite_code_rotated_by = auth.uid()
       where id = p_circle_id;
      if found then
        return v_new_code;
      end if;
    exception when unique_violation then
      if v_attempts >= 5 then
        raise exception 'failed_to_generate_unique_code';
      end if;
      -- retry
    end;
  end loop;
end;
$$;


