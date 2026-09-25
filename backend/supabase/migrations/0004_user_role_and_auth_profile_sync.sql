-- Align the public role vocabulary with the application contract.
-- PostgreSQL preserves existing enum values and dependent rows when a label is renamed.
alter type public.user_role rename value 'requestor' to 'user';

alter table public.profiles
  alter column role set default 'user'::public.user_role;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  profile_name text;
begin
  profile_name := nullif(btrim(new.raw_user_meta_data ->> 'full_name'), '');

  insert into public.profiles (id, email, full_name, role, department_id, is_active)
  values (
    new.id,
    new.email,
    coalesce(profile_name, split_part(new.email, '@', 1)),
    'user',
    null,
    true
  );

  return new;
end;
$$;

create or replace function public.prepare_ticket()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  assignee_role public.user_role;
  assignee_department uuid;
  assignee_active boolean;
  category_department uuid;
  category_active boolean;
begin
  if tg_op = 'INSERT' then
    new.ticket_number := 'TKT-' || nextval('public.ticket_number_seq')::text;

    if auth.uid() is not null and not public.is_admin() then
      if public.current_user_role() <> 'user' then
        raise exception 'Only users and administrators may create tickets';
      end if;
      new.requestor_id := auth.uid();
      new.assigned_to := null;
      new.status := 'open';
      new.resolved_at := null;
    end if;
  else
    new.ticket_number := old.ticket_number;
    new.requestor_id := old.requestor_id;

    if auth.uid() is not null and public.current_user_role() = 'developer' then
      if old.assigned_to is distinct from auth.uid() then
        raise exception 'Developers may only update tickets assigned to them';
      end if;
      if new.subject is distinct from old.subject
        or new.description is distinct from old.description
        or new.category_id is distinct from old.category_id
        or new.priority is distinct from old.priority
        or new.assigned_to is distinct from old.assigned_to then
        raise exception 'Developers may only change ticket status';
      end if;
    end if;

    if new.status is distinct from old.status and not (
      (old.status = 'open' and new.status = 'in_progress')
      or (old.status = 'in_progress' and new.status = 'resolved')
      or (old.status = 'resolved' and new.status = 'open' and public.is_admin())
    ) then
      raise exception 'Invalid ticket status transition from % to %', old.status, new.status;
    end if;
  end if;

  select department_id, is_active
    into category_department, category_active
    from public.categories
    where id = new.category_id;

  if category_department is null then
    raise exception 'Ticket category does not exist';
  end if;

  if tg_op = 'INSERT'
    and auth.uid() is not null
    and not public.is_admin()
    and not category_active then
    raise exception 'New tickets require an active category';
  end if;

  if new.assigned_to is not null then
    select role, department_id, is_active
      into assignee_role, assignee_department, assignee_active
      from public.profiles
      where id = new.assigned_to;

    if assignee_role is distinct from 'developer'
      or not coalesce(assignee_active, false)
      or assignee_department is distinct from category_department then
      raise exception 'Assignee must be an active developer in the category department';
    end if;
  end if;

  if new.status = 'resolved' and (tg_op = 'INSERT' or old.status is distinct from 'resolved') then
    new.resolved_at := now();
  elsif new.status <> 'resolved' then
    new.resolved_at := null;
  end if;

  return new;
end;
$$;

drop policy tickets_requestor_or_admin_insert on public.tickets;

create policy tickets_user_or_admin_insert
on public.tickets for insert to authenticated
with check (
  public.is_admin()
  or (
    public.current_user_role() = 'user'
    and requestor_id = auth.uid()
    and assigned_to is null
    and status = 'open'
  )
);
