-- Presentation hotfix: department-based developer routing
-- A developer assigned to a department can handle every active ticket category
-- that belongs to that department. Category-by-category developer selection is
-- no longer required.

-- Enforce department-level eligibility when assigning tickets.
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
      or (old.status = 'in_progress' and new.status = 'open' and public.is_admin() and new.assigned_to is null)
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
      raise exception 'Assignee must be an active developer from the ticket department';
    end if;
  end if;

  if new.status = 'in_progress' and new.assigned_to is null then
    raise exception 'Assigned status requires an assigned developer';
  end if;

  if new.status = 'resolved' and (tg_op = 'INSERT' or old.status is distinct from 'resolved') then
    new.resolved_at := now();
  elsif new.status <> 'resolved' then
    new.resolved_at := null;
  end if;

  return new;
end;
$$;

-- Keep the existing function signature so the deployed frontend can call the
-- same RPC, but ignore category IDs. Department membership is now sufficient.
create or replace function public.admin_update_user_access(
  target_user_id uuid,
  target_role text,
  target_department_id uuid,
  target_is_active boolean,
  target_category_ids uuid[] default '{}'::uuid[]
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  parsed_role public.user_role;
begin
  if not public.is_admin() then
    raise exception 'Only administrators may manage user access';
  end if;

  parsed_role := target_role::public.user_role;

  if parsed_role = 'admin' then
    raise exception 'Admin roles cannot be granted through the application';
  end if;

  if parsed_role = 'developer' and target_department_id is null then
    raise exception 'Choose a department before granting the developer role';
  end if;

  if parsed_role <> 'developer' then
    target_department_id := null;
  end if;

  update public.profiles
  set role = parsed_role,
      department_id = target_department_id,
      is_active = target_is_active
  where id = target_user_id;

  if not found then
    raise exception 'User not found';
  end if;
end;
$$;

revoke execute on function public.admin_update_user_access(uuid, text, uuid, boolean, uuid[]) from public;
grant execute on function public.admin_update_user_access(uuid, text, uuid, boolean, uuid[]) to authenticated;

-- Notify every active developer in the department that owns the ticket category.
create or replace function public.create_ticket_notifications()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.notifications (recipient_id, ticket_id, title, body)
    values (
      new.requestor_id,
      new.id,
      'Ticket submitted',
      '#' || new.ticket_number || ' was submitted successfully.'
    );

    insert into public.notifications (recipient_id, ticket_id, title, body)
    select p.id, new.id, 'New ticket submitted',
      '#' || new.ticket_number || ' has been submitted and is awaiting assignment.'
    from public.profiles p
    where p.role = 'admin'
      and p.is_active
      and p.id <> new.requestor_id;

    insert into public.notifications (recipient_id, ticket_id, title, body)
    select p.id, new.id, 'New ticket awaiting assignment',
      '#' || new.ticket_number || ' was submitted to your department.'
    from public.profiles p
    join public.categories c on c.id = new.category_id
    where p.role = 'developer'
      and p.is_active
      and p.department_id = c.department_id
      and p.id <> new.requestor_id;

    return new;
  end if;

  if new.assigned_to is distinct from old.assigned_to then
    if new.assigned_to is not null then
      insert into public.notifications (recipient_id, ticket_id, title, body)
      values (
        new.assigned_to,
        new.id,
        'New ticket assigned to you',
        '#' || new.ticket_number || ' has been assigned to you.'
      );

      if new.requestor_id <> new.assigned_to then
        insert into public.notifications (recipient_id, ticket_id, title, body)
        select new.requestor_id, new.id, 'Your ticket has been assigned',
          '#' || new.ticket_number || ' has been assigned to ' || p.full_name || '.'
        from public.profiles p where p.id = new.assigned_to;
      end if;
    else
      insert into public.notifications (recipient_id, ticket_id, title, body)
      values (
        new.requestor_id,
        new.id,
        'Your ticket is unassigned',
        '#' || new.ticket_number || ' is awaiting assignment.'
      );
    end if;
  end if;

  if new.status is distinct from old.status then
    insert into public.notifications (recipient_id, ticket_id, title, body)
    values (
      new.requestor_id,
      new.id,
      case when new.status = 'resolved' then 'Ticket resolved' else 'Ticket status updated' end,
      '#' || new.ticket_number || ' is now ' || replace(new.status::text, '_', ' ') || '.'
    );

    if new.assigned_to is not null and new.assigned_to <> new.requestor_id then
      insert into public.notifications (recipient_id, ticket_id, title, body)
      values (
        new.assigned_to,
        new.id,
        case when new.status = 'resolved' then 'Assigned ticket resolved' else 'Assigned ticket status updated' end,
        '#' || new.ticket_number || ' is now ' || replace(new.status::text, '_', ' ') || '.'
      );
    end if;

    insert into public.notifications (recipient_id, ticket_id, title, body)
    select p.id,
      new.id,
      case when new.status = 'resolved' then 'Ticket resolved' else 'Ticket status updated' end,
      '#' || new.ticket_number || ' is now ' || replace(new.status::text, '_', ' ') || '.'
    from public.profiles p
    where p.role = 'admin'
      and p.is_active
      and p.id <> new.requestor_id
      and (new.assigned_to is null or p.id <> new.assigned_to);
  end if;

  return new;
end;
$$;
