create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger departments_set_updated_at
before update on public.departments
for each row execute function public.set_updated_at();

create trigger categories_set_updated_at
before update on public.categories
for each row execute function public.set_updated_at();

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger tickets_set_updated_at
before update on public.tickets
for each row execute function public.set_updated_at();

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
    'requestor',
    null,
    true
  );

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = ''
as $$
  select role from public.profiles where id = auth.uid() and is_active;
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(public.current_user_role() = 'admin', false);
$$;

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

create trigger profiles_protect_fields
before update on public.profiles
for each row execute function public.protect_profile_fields();

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
      if public.current_user_role() <> 'requestor' then
        raise exception 'Only requestors and administrators may create tickets';
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

create trigger tickets_prepare
before insert or update on public.tickets
for each row execute function public.prepare_ticket();

create or replace function public.record_ticket_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  activity_actor uuid := auth.uid();
begin
  if tg_op = 'INSERT' then
    insert into public.ticket_activity (ticket_id, activity_type, actor_id, new_status)
    values (new.id, 'created', coalesce(activity_actor, new.requestor_id), new.status);
    return new;
  end if;

  if new.assigned_to is distinct from old.assigned_to then
    insert into public.ticket_activity (
      ticket_id, activity_type, actor_id, old_assignee_id, new_assignee_id
    ) values (
      new.id,
      case
        when old.assigned_to is null then 'assigned'::public.ticket_activity_type
        when new.assigned_to is null then 'unassigned'::public.ticket_activity_type
        else 'reassigned'::public.ticket_activity_type
      end,
      activity_actor,
      old.assigned_to,
      new.assigned_to
    );
  end if;

  if new.status is distinct from old.status then
    insert into public.ticket_activity (
      ticket_id, activity_type, actor_id, old_status, new_status
    ) values (
      new.id, 'status_changed', activity_actor, old.status, new.status
    );
  end if;

  return new;
end;
$$;

create trigger tickets_record_activity
after insert or update on public.tickets
for each row execute function public.record_ticket_activity();

create or replace function public.create_ticket_notifications()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.notifications (recipient_id, ticket_id, title, body)
    select p.id, new.id, 'New ticket submitted',
      '#' || new.ticket_number || ' has been submitted and is awaiting assignment.'
    from public.profiles p
    where p.role = 'admin' and p.is_active;
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
  end if;

  return new;
end;
$$;

create trigger tickets_create_notifications
after insert or update on public.tickets
for each row execute function public.create_ticket_notifications();

create or replace function public.protect_notification_fields()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is not null and (
    new.id is distinct from old.id
    or new.recipient_id is distinct from old.recipient_id
    or new.ticket_id is distinct from old.ticket_id
    or new.title is distinct from old.title
    or new.body is distinct from old.body
    or new.created_at is distinct from old.created_at
  ) then
    raise exception 'Only notification read state may be changed';
  end if;

  return new;
end;
$$;

create trigger notifications_protect_fields
before update on public.notifications
for each row execute function public.protect_notification_fields();
