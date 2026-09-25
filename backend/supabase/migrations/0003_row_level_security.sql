alter table public.departments enable row level security;
alter table public.categories enable row level security;
alter table public.profiles enable row level security;
alter table public.tickets enable row level security;
alter table public.ticket_activity enable row level security;
alter table public.notifications enable row level security;

revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
revoke all on all functions in schema public from anon;

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.departments, public.categories to authenticated;
grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.tickets to authenticated;
grant select on public.ticket_activity to authenticated;
grant select, update on public.notifications to authenticated;

revoke all on sequence public.ticket_number_seq from authenticated;
revoke execute on function public.set_updated_at() from public, authenticated;
revoke execute on function public.handle_new_user() from public, authenticated;
revoke execute on function public.protect_profile_fields() from public, authenticated;
revoke execute on function public.prepare_ticket() from public, authenticated;
revoke execute on function public.record_ticket_activity() from public, authenticated;
revoke execute on function public.create_ticket_notifications() from public, authenticated;
revoke execute on function public.protect_notification_fields() from public, authenticated;
revoke execute on function public.current_user_role() from public;
revoke execute on function public.is_admin() from public;
grant execute on function public.current_user_role() to authenticated;
grant execute on function public.is_admin() to authenticated;

create policy departments_read_authenticated
on public.departments for select to authenticated
using (true);

create policy departments_admin_insert
on public.departments for insert to authenticated
with check (public.is_admin());

create policy departments_admin_update
on public.departments for update to authenticated
using (public.is_admin()) with check (public.is_admin());

create policy departments_admin_delete
on public.departments for delete to authenticated
using (public.is_admin());

create policy categories_read
on public.categories for select to authenticated
using (is_active or public.is_admin());

create policy categories_admin_insert
on public.categories for insert to authenticated
with check (public.is_admin());

create policy categories_admin_update
on public.categories for update to authenticated
using (public.is_admin()) with check (public.is_admin());

create policy categories_admin_delete
on public.categories for delete to authenticated
using (public.is_admin());

create policy profiles_read_allowed
on public.profiles for select to authenticated
using (
  id = auth.uid()
  or public.is_admin()
  or exists (
    select 1 from public.tickets t
    where (public.current_user_role() = 'developer' and t.assigned_to = auth.uid() and t.requestor_id = profiles.id)
       or (t.requestor_id = auth.uid() and t.assigned_to = profiles.id)
  )
);

create policy profiles_update_self_or_admin
on public.profiles for update to authenticated
using (id = auth.uid() or public.is_admin())
with check (id = auth.uid() or public.is_admin());

create policy tickets_read_allowed
on public.tickets for select to authenticated
using (
  public.is_admin()
  or requestor_id = auth.uid()
  or (public.current_user_role() = 'developer' and assigned_to = auth.uid())
);

create policy tickets_requestor_or_admin_insert
on public.tickets for insert to authenticated
with check (
  public.is_admin()
  or (
    public.current_user_role() = 'requestor'
    and requestor_id = auth.uid()
    and assigned_to is null
    and status = 'open'
  )
);

create policy tickets_developer_or_admin_update
on public.tickets for update to authenticated
using (
  public.is_admin()
  or (public.current_user_role() = 'developer' and assigned_to = auth.uid())
)
with check (
  public.is_admin()
  or (public.current_user_role() = 'developer' and assigned_to = auth.uid())
);

create policy tickets_admin_delete
on public.tickets for delete to authenticated
using (public.is_admin());

create policy ticket_activity_read_allowed
on public.ticket_activity for select to authenticated
using (
  public.is_admin()
  or exists (
    select 1 from public.tickets t
    where t.id = ticket_activity.ticket_id
      and (
        t.requestor_id = auth.uid()
        or (public.current_user_role() = 'developer' and t.assigned_to = auth.uid())
      )
  )
);

create policy notifications_read_own
on public.notifications for select to authenticated
using (recipient_id = auth.uid());

create policy notifications_update_own
on public.notifications for update to authenticated
using (recipient_id = auth.uid())
with check (recipient_id = auth.uid());
