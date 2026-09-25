# Ticket Management System — Bug Fix Notes

This copy includes fixes for BUG-001 through BUG-004 from the defect log.

## What was fixed

### BUG-001 — Developer/category assignment

- Added `developer_categories` so developers can be assigned to specific ticket categories instead of being eligible for every category in the same department.
- Admin **Users** now lets you choose the developer department and one or more supported ticket categories.
- The ticket assignment dropdown now lists only active developers explicitly assigned to that ticket category.
- The database also validates the category assignment, so an invalid developer cannot be assigned through a direct API call.
- Assigning a developer to an open ticket automatically changes the user-facing status to **Assigned** (`in_progress` in the database).
- Unassigning an Assigned ticket returns it to **Open**.
- An Assigned ticket is no longer allowed to exist without an assigned developer.

### BUG-002 — Notifications

- Ticket submission now creates notifications for the requestor, admins, and eligible developers for the category.
- Ticket status changes/resolution now notify the requestor, assigned developer, and admins.
- Added an unread notification count in the sidebar.
- Added an unread notification banner in the application shell/dashboard area.
- `Mark all as read` now immediately refreshes the unread indicator.

### BUG-003 — Refresh returns Vercel 404

- Added SPA rewrite configuration in both `vercel.json` and `frontend/vercel.json`.
- Refreshing routes such as `/admin/tickets`, `/developer/tickets`, and `/requestor/tickets` now falls back to `index.html` so React Router can restore the route and Supabase session.

### BUG-004 — Refresh on create-ticket page

- The same Vercel rewrite fixes the 404 on `/requestor/create`.
- Added a standard browser warning when refreshing/closing with an unfinished ticket.
- The unfinished ticket draft is also stored in `sessionStorage`, so it is restored if the user confirms a refresh.
- Cancel now asks before discarding an unfinished draft.

## Required deployment steps

### Apply the Supabase migration

The new migration is:

`backend/supabase/migrations/0007_fix_assignment_notifications.sql`

For a linked Supabase project:

```sh
supabase db push --workdir backend
```

For a local Supabase environment that may be safely rebuilt:

```sh
supabase db reset --workdir backend
```

Do not skip this step. BUG-001 and BUG-002 depend on the database migration.

### Configure developer categories

After the migration:

1. Log in as Admin.
2. Open **Users**.
3. Set a user to **Developer**.
4. Select the developer's department.
5. Select one or more ticket categories that the developer is allowed to handle.
6. Click **Save**.

Existing developers who already have assigned tickets keep eligibility for the categories used by those existing assignments.

### Redeploy the frontend

Redeploy the project to Vercel after including the new `vercel.json` file. The ZIP contains a copy at both the repository root and the `frontend` folder so it works whether Vercel is configured with the repository root or `frontend` as the Root Directory.

## Verification checklist

- A developer assigned only to **Software** must not appear on an **Account & Access** ticket.
- Assigning a valid developer to an open ticket changes it to **Assigned**.
- Ticket submission produces an unread notification for the requestor and relevant support users.
- Resolving a ticket produces notifications for the requestor, assigned developer, and admin.
- `Mark all as read` removes the unread count/banner.
- Refreshing `/admin/...`, `/developer/...`, and `/requestor/...` routes no longer shows Vercel 404.
- Refreshing an unfinished create-ticket form warns the user and preserves the draft if the refresh proceeds.
