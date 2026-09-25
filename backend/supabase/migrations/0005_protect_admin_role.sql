create or replace function public.protect_profile_fields()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is not null then
    if new.id is distinct from old.id
      or new.email is distinct from old.email
      or new.created_at is distinct from old.created_at then
      raise exception 'Profile identity fields cannot be changed directly';
    end if;

    if not public.is_admin() and auth.uid() <> old.id then
      raise exception 'Users may only update their own profile';
    end if;

    if not public.is_admin() and (
      new.role is distinct from old.role
      or new.department_id is distinct from old.department_id
      or new.is_active is distinct from old.is_active
    ) then
      raise exception 'Only administrators may change protected profile fields';
    end if;

    -- Admin membership is bootstrap-only. Authenticated application requests
    -- may manage user/developer roles but cannot promote or demote admins.
    if new.role is distinct from old.role
      and (new.role = 'admin' or old.role = 'admin') then
      raise exception 'Admin roles cannot be granted or revoked through the application API';
    end if;

    if public.is_admin()
      and exists (
        select 1
        from public.tickets t
        join public.categories c on c.id = t.category_id
        where t.assigned_to = old.id
          and t.status <> 'resolved'
          and (
            new.role <> 'developer'
            or not new.is_active
            or new.department_id is distinct from c.department_id
          )
      ) then
      raise exception 'Reassign or unassign active tickets before changing this developer';
    end if;
  end if;

  return new;
end;
$$;
