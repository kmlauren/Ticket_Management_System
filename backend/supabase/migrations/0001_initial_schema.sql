create extension if not exists pgcrypto;

create type public.user_role as enum ('requestor', 'developer', 'admin');
create type public.ticket_priority as enum ('low', 'medium', 'high', 'critical');
create type public.ticket_status as enum ('open', 'in_progress', 'resolved');
create type public.ticket_activity_type as enum (
  'created',
  'assigned',
  'reassigned',
  'unassigned',
  'status_changed'
);
create type public.department_status as enum ('active', 'at_capacity', 'inactive');

create table public.departments (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (btrim(name) <> ''),
  email text not null check (btrim(email) <> ''),
  status public.department_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index departments_email_lower_key on public.departments (lower(email));

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (btrim(name) <> ''),
  description text not null check (btrim(description) <> ''),
  department_id uuid not null references public.departments(id) on update cascade on delete restrict,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index categories_department_id_idx on public.categories (department_id);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null check (btrim(email) <> ''),
  full_name text not null check (btrim(full_name) <> ''),
  role public.user_role not null default 'requestor',
  department_id uuid references public.departments(id) on update cascade on delete restrict,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_developer_department_check check (
    (role = 'developer' and department_id is not null)
    or (role <> 'developer' and department_id is null)
  )
);

create unique index profiles_email_lower_key on public.profiles (lower(email));
create index profiles_role_department_active_idx
  on public.profiles (role, department_id, is_active);

create sequence public.ticket_number_seq start with 1042;

create table public.tickets (
  id uuid primary key default gen_random_uuid(),
  ticket_number text not null unique,
  subject text not null check (btrim(subject) <> ''),
  description text not null check (btrim(description) <> ''),
  category_id uuid not null references public.categories(id) on update cascade on delete restrict,
  priority public.ticket_priority not null,
  status public.ticket_status not null default 'open',
  requestor_id uuid not null references public.profiles(id) on update cascade on delete restrict,
  assigned_to uuid references public.profiles(id) on update cascade on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz,
  constraint tickets_resolved_at_check check (
    (status = 'resolved' and resolved_at is not null)
    or (status <> 'resolved' and resolved_at is null)
  )
);

create index tickets_requestor_created_idx on public.tickets (requestor_id, created_at desc);
create index tickets_assignee_status_updated_idx on public.tickets (assigned_to, status, updated_at desc);
create index tickets_status_priority_idx on public.tickets (status, priority);
create index tickets_category_id_idx on public.tickets (category_id);

create table public.ticket_activity (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets(id) on delete cascade,
  activity_type public.ticket_activity_type not null,
  actor_id uuid references public.profiles(id) on delete set null,
  old_status public.ticket_status,
  new_status public.ticket_status,
  old_assignee_id uuid references public.profiles(id) on delete set null,
  new_assignee_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index ticket_activity_ticket_created_idx
  on public.ticket_activity (ticket_id, created_at desc);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  ticket_id uuid not null references public.tickets(id) on delete cascade,
  title text not null check (btrim(title) <> ''),
  body text not null check (btrim(body) <> ''),
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_recipient_unread_created_idx
  on public.notifications (recipient_id, read_at, created_at desc);
