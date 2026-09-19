# Sales Dashboard Access Control

How to make the Sales Availability Dashboard (`/admin/sales-dashboard`) visible to more accounts — either everyone, or a specific list of people.

## How it currently works

- `sales_dashboard` is one entry in `ADMIN_PERMISSIONS` (`src/queries/adminPermissions.ts`) — the same permission list used for every other admin feature tile.
- Whether an account sees the "Sales Availability Dashboard" tile on the admin home page depends on their permission list:
  - **Super admins** (`Admin.is_super_admin = true`) automatically get *every* permission, including `sales_dashboard`. This is why it already shows up for super-admin accounts with no extra setup.
  - **Regular admins** need an explicit row in the `admin_permissions` table (`admin_id`, `permission: 'sales_dashboard'`).
  - **Team members** (the separate Go/RDS-backed `User` accounts) have their own `permissions` array, granted the same way via a UI.
- There's already a working UI for granting permissions per account — no SQL required:
  - **Admin Management** (`/admin/admin-management`, super-admins only) — for `Admin` rows.
  - **User Management** (`/admin/user-management`, admins + super admins) — for team members.
  - Both already list "Sales Availability Dashboard" as a checkbox, since it's just another entry in the same shared `ADMIN_PERMISSIONS` list.

### Caveat — and it's systemic, not specific to this feature

The permission system currently only controls whether the *tile* shows up on the admin home page. The route itself (`/admin/sales-dashboard`) is **not** gated by the `sales_dashboard` permission — any logged-in admin/team-member account could reach it directly by URL even without the tile.

Checked how widespread this is across the rest of the admin app:

- `ProtectedAdminRoute` (the wrapper around *every* `/admin/*` route) only checks the account's **role** (`admin` / `user` / `super_admin`). It has no idea about the granular `ADMIN_PERMISSIONS` list at all.
- Searched for actual uses of the permission-check hook (`useHasPermission`) across every admin page: **zero results, anywhere.**
- Broadened the search to any inline `permissions.includes(...)` pattern used to gate a whole page's content. Only **one page in the entire app does this: `GameAnalytics.tsx`**. It genuinely checks the `game_analytics` permission and blocks its content if missing — the sole exception.
- A couple of other pages (`InstructorLessonLog.tsx`, `NotificationManagement.tsx`) check `view_unmasked_phone_numbers`, but only to decide whether to show masked or unmasked phone numbers *within* an already-open page, not to gate the page itself.
- `AdminManagement.tsx` and `UserManagement.tsx` (the pages that manage everyone's permissions) do lock themselves down, but via **role** checks (`is_super_admin`, `is_admin`), not the granular permission list.

**Bottom line:** every other tile-gated admin feature — No-Show Management, Leave Management, Control Tower, Instructor Performance, Compliance Forms, Car Commerce Leads, and so on — has exactly the same gap as Sales Dashboard. The permission checkbox controls discoverability, not access. `GameAnalytics` is the only feature actually locked down at the page level. This is a pre-existing gap in the app's access-control design, not something introduced by the Sales Dashboard work.

**Possible fix (not yet implemented):** a reusable `<RequirePermission permission="sales_dashboard">` wrapper component (or a small hook used at the top of each page) that redirects/blocks when the current account lacks that permission — applied to Sales Dashboard first, and optionally rolled out to the other tile-gated pages that have the same gap.

---

## Option A — Make it public (every admin account sees it, no per-account work)

1. Code change: in `AdminHome.tsx`, make `sales_dashboard` always included in the tile list, bypassing the permission filter for just this one key.
2. Commit and deploy.
3. Done — every current *and future* admin/team-member account sees it automatically, with zero per-account setup.

**Trade-off:** you lose the ability to later restrict it per-account without reverting this change.

## Option B — Roll out to selected users only (no code change needed)

1. Log in as a super admin.
2. For an **Admin** account: go to **Admin Management** → open that admin → check "Sales Availability Dashboard" in their permissions list → Save.
3. For a **team member** account: go to **User Management** → open that user → check the same box → Save.
4. Repeat per person you want to grant access to. To *revoke* later, uncheck the same box.

If clicking through the UI for many accounts isn't practical, the alternative is a batch `INSERT` into `admin_permissions` for a specific list of `admin_id`s — written up for manual review/approval rather than run directly, per the project's DB-change policy.
