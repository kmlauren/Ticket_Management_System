# Ticket Management Backend

Supabase-native backend for the ticket management frontend. It uses PostgreSQL, Supabase Auth, database triggers, and Row Level Security. There is no application server.

## Structure

```text
backend/
├── supabase/
│   ├── config.toml
│   ├── migrations/
│   │   ├── 0001_initial_schema.sql
│   │   ├── 0002_functions_and_triggers.sql
│   │   └── 0003_row_level_security.sql
│   └── seed.sql
├── .env.example
└── README.md
```

## Supabase setup

1. Create a Supabase project.
2. Install the Supabase CLI and authenticate it.
3. Initialize local CLI metadata (this creates `backend/supabase/config.toml`):

   ```sh
   supabase init --workdir backend
   ```

4. Link the project and apply the migrations in filename order:

   ```sh
   supabase link --workdir backend --project-ref YOUR_PROJECT_REF
   supabase db push --workdir backend
   ```

5. Seed the frontend-matching departments and categories by running
   `backend/supabase/seed.sql` in the Supabase SQL Editor. If you connect with
   `psql`, the equivalent command is `psql "$DATABASE_URL" -f
   backend/supabase/seed.sql`.

The seed is safe to rerun. It does not create Auth users or mock tickets.

For local Supabase development, initialize/link the `backend` directory as required by your installed CLI version, then use `supabase db reset --workdir backend` to rebuild and seed the local database.

## Environment variables

Copy `.env.example` to the appropriate local environment file and replace the placeholders.

- `SUPABASE_URL`: project API URL.
- `SUPABASE_ANON_KEY`: browser-safe public key; RLS still applies.
- `SUPABASE_SERVICE_ROLE_KEY`: trusted server/administration key only. Never place it in Vite variables, client code, or a browser bundle.

The future frontend integration will normally need only the URL and anon key, conventionally exposed by Vite as `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.

## Authentication and signup

Use Supabase email/password Auth. Send the signup name as `full_name` metadata:

```ts
await supabase.auth.signUp({
  email,
  password,
  options: { data: { full_name } },
})
```

The `auth.users` trigger creates the matching profile with:

- `role = user`
- `department_id = null`
- `is_active = true`

Client metadata cannot grant developer or admin privileges.

## Initial administrator

Create the first account through Supabase Auth, then promote it from the SQL editor while operating as the database owner:

```sql
update public.profiles
set role = 'admin', department_id = null
where email = 'admin@helpdesk.edu';
```

After the first promotion, administrators can manage roles and developer departments through authenticated application requests. Promote a developer and set the department atomically:

```sql
update public.profiles
set role = 'developer',
    department_id = (
      select id from public.departments where name = 'Network & Infrastructure'
    )
where email = 'developer@example.com';
```

Admin membership is intentionally bootstrap-only. Authenticated application
requests may switch accounts between `user` and `developer`, but cannot grant
or revoke the `admin` role. Additional admin changes must be performed by the
database owner through a trusted administrative process.

To revoke developer access, set both fields in one update:

```sql
update public.profiles
set role = 'user', department_id = null
where email = 'developer@example.com';
```

Active assigned tickets must be reassigned or unassigned before a developer can
be deactivated, moved to an incompatible department, or have the developer role
revoked.

## Authorization summary

- Users create and read their own tickets and see their activity and notifications.
- Developers see only tickets explicitly assigned to them and may advance their status from `open` to `in_progress` to `resolved`.
- A developer is eligible for assignment only when active, in the department belonging to the ticket category, and explicitly assigned to that category in `developer_categories`.
- Administrators manage tickets, assignments, users, departments, and categories.
- Activity and notifications are written by trusted triggers, not clients.

Every category has a department. `Other` is seeded under `Systems & Applications`.

## Ticket numbers and workflow

Ticket numbers are generated from a PostgreSQL sequence as `TKT-1042`, `TKT-1043`, and so on. Assigning a developer to an open ticket moves it to `in_progress` (displayed as **Assigned**). Unassigning an Assigned ticket returns it to `open`. Normal status progression is:

```text
open -> in_progress -> resolved
```

Administrators may reopen a resolved ticket to `open`. Resolving sets `resolved_at`; reopening clears it.

## Dashboard integration

Dashboard values should be queried from current rows rather than persisted. Examples include counts grouped by `tickets.status`, unassigned tickets where `assigned_to is null`, and developer workload grouped by `assigned_to`.

The frontend maps the database value `in_progress` to the display label **Assigned**. The database also requires an `in_progress` ticket to have a valid assigned developer.
