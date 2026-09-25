-- BUG-001 / BUG-002 fixes
-- Adds category-level developer eligibility and completes notification delivery.

create table if not exists public.developer_categories (
  developer_id uuid not null references public.profiles(id) on update cascade on delete cascade,
  category_id uuid not null references public.categories(id) on update cascade on delete cascade,
  created_at timestamptz not null default now(),
  primary key (developer_id, category_id)
);

create index if not exists developer_categories_category_idx
  on public.developer_categories (category_id, developer_id);

-- Preserve category eligibility needed by tickets that are already assigned.
insert into public.developer_categories (developer_id, category_id)
select distinct t.assigned_to, t.category_id
from public.tickets t
join public.profiles p on p.id = t.assigned_to
join public.categories c on c.id = t.category_id
where t.assigned_to is not null
  and p.role = 'developer'
  and p.department_id = c.department_id
on conflict do nothing;

alter table public.developer_categories enable row level security;

grant select, insert, delete on public.developer_categories to authenticated;

create policy developer_categories_read
on public.developer_categories for select to authenticated
using (public.is_admin() or developer_id = auth.uid());

create policy developer_categories_admin_insert
on public.developer_categories for insert to authenticated
with check (public.is_admin());

create policy developer_categories_admin_delete
on public.developer_categories for delete to authenticated
using (public.is_admin());

create or replace function public.validate_developer_category_assignment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  developer_role public.user_role;
  developer_department uuid;
  developer_active boolean;
  category_department uuid;
begin
  if tg_op = 'DELETE' then
    if exists (
      select 1
      from public.tickets t
      where t.assigned_to = old.developer_id
        and t.category_id = old.category_id
        and t.status <> 'resolved'
    ) then
      raise exception 'Reassign or resolve active tickets before removing this developer category';
    end if;
    return old;
  end if;

  select role, department_id, is_active
    into developer_role, developer_department, developer_active
    from public.profiles
    where id = new.developer_id;

  select department_id
    into category_department
    from public.categories
    where id = new.category_id;

  if developer_role is distinct from 'developer'
    or not coalesce(developer_active, false)
    or developer_department is null
    or category_department is null
    or developer_department is distinct from category_department then
    raise exception 'Developer category must belong to the active developer''s department';
  end if;

  return new;
end;
$$;

create trigger developer_categories_validate
before insert or update or delete on public.developer_categories
for each row execute function public.validate_developer_category_assignment();

revoke execute on function public.validate_developer_category_assignment() from public, authenticated;

-- Enforce category-level eligibility in addition to department eligibility.
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
  category_allowed boolean;
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

    select exists (
      select 1
      from public.developer_categories dc
      where dc.developer_id = new.assigned_to
        and dc.category_id = new.category_id
    ) into category_allowed;

    if assignee_role is distinct from 'developer'
      or not coalesce(assignee_active, false)
      or assignee_department is distinct from category_department
      or not coalesce(category_allowed, false) then
      raise exception 'Assignee must be an active developer assigned to this ticket category';
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

-- Keep role/department/category changes atomic from the Admin Users screen.
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
  requested_count integer;
  valid_count integer;
begin
  if not public.is_admin() then
    raise exception 'Only administrators may manage user access';
  end if;

  parsed_role := target_role::public.user_role;

  if parsed_role = 'admin' then
    raise exception 'Admin roles cannot be granted through the application';
  end if;

  if parsed_role = 'developer' then
    if target_department_id is null then
      raise exception 'Choose a department before granting the developer role';
    end if;

    if target_is_active then
      requested_count := coalesce(cardinality(target_category_ids), 0);
      if requested_count = 0 then
        raise exception 'Choose at least one category for an active developer';
      end if;

      select count(distinct c.id)
        into valid_count
        from public.categories c
        where c.id = any(target_category_ids)
          and c.department_id = target_department_id
          and c.is_active;

      if valid_count <> requested_count then
        raise exception 'All developer categories must be active and belong to the selected department';
      end if;
    end if;
  else
    target_department_id := null;
    target_category_ids := '{}'::uuid[];
  end if;

  update public.profiles
  set role = parsed_role,
      department_id = target_department_id,
      is_active = target_is_active
  where id = target_user_id;

  if not found then
    raise exception 'User not found';
  end if;

  if parsed_role = 'developer' and target_is_active then
    -- Remove only categories that were actually deselected. Keeping unchanged
    -- rows prevents active-ticket protection from blocking harmless saves.
    delete from public.developer_categories
    where developer_id = target_user_id
      and not (category_id = any(target_category_ids));

    insert into public.developer_categories (developer_id, category_id)
    select target_user_id, category_id
    from unnest(target_category_ids) as category_id
    on conflict do nothing;
  else
    delete from public.developer_categories
    where developer_id = target_user_id;
  end if;
end;
$$;

revoke execute on function public.admin_update_user_access(uuid, text, uuid, boolean, uuid[]) from public;
grant execute on function public.admin_update_user_access(uuid, text, uuid, boolean, uuid[]) to authenticated;

-- Deliver submission and status notifications to all roles that need them.
create or replace function public.create_ticket_notifications()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    -- Requestor confirmation.
    insert into public.notifications (recipient_id, ticket_id, title, body)
    values (
      new.requestor_id,
      new.id,
      'Ticket submitted',
      '#' || new.ticket_number || ' was submitted successfully.'
    );

    -- Admin notification.
    insert into public.notifications (recipient_id, ticket_id, title, body)
    select p.id, new.id, 'New ticket submitted',
      '#' || new.ticket_number || ' has been submitted and is awaiting assignment.'
    from public.profiles p
    where p.role = 'admin'
      and p.is_active
      and p.id <> new.requestor_id;

    -- Eligible developers for the selected category can see that work is waiting.
    insert into public.notifications (recipient_id, ticket_id, title, body)
    select p.id, new.id, 'New ticket awaiting assignment',
      '#' || new.ticket_number || ' was submitted in one of your assigned categories.'
    from public.developer_categories dc
    join public.profiles p on p.id = dc.developer_id
    where dc.category_id = new.category_id
      and p.role = 'developer'
      and p.is_active
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
    -- Requestor status confirmation.
    insert into public.notifications (recipient_id, ticket_id, title, body)
    values (
      new.requestor_id,
      new.id,
      case when new.status = 'resolved' then 'Ticket resolved' else 'Ticket status updated' end,
      '#' || new.ticket_number || ' is now ' || replace(new.status::text, '_', ' ') || '.'
    );

    -- Assigned developer also receives the status confirmation, including resolution.
    if new.assigned_to is not null and new.assigned_to <> new.requestor_id then
      insert into public.notifications (recipient_id, ticket_id, title, body)
      values (
        new.assigned_to,
        new.id,
        case when new.status = 'resolved' then 'Assigned ticket resolved' else 'Assigned ticket status updated' end,
        '#' || new.ticket_number || ' is now ' || replace(new.status::text, '_', ' ') || '.'
      );
    end if;

    -- Admins are informed of status changes/resolutions as well.
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
