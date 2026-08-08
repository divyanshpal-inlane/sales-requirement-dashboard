# Deployment

How this app ships, and the non-obvious gotchas that have bitten us.

## Frontend (Vercel)

The web app auto-deploys to **Vercel** when a commit lands on `main`.

- Production project: **`inlane-web-app`** → `inlane-web-app.vercel.app` (the domain baked into payment links).
- Build command: `vite build`. Install: `pnpm install --frozen-lockfile`.

### ⚠️ Vercel gates deploys on the git *commit author*

`inlane-web-app` is configured so a deploy only runs if the **author of the
merged commit** is a member of the Vercel team. A merge authored by an account
that isn't on the team fails with:

> **"Git author &lt;name&gt; must have access to the project on Vercel to create deployments"**

This looks like a build/CI failure but is purely an **access** issue — the code
merged fine; only the deploy is blocked. Pulling / rebasing / re-merging does
**not** fix it. To ship:

1. **Merge with an authorized account** — a GitHub "Create a merge commit" is
   authored by whoever clicks *Merge*, so merging as a Vercel-team member
   produces an authorized commit.
2. Or have a teammate click **Redeploy** on the commit in the Vercel dashboard
   (redeploys are attributed to the clicker, not the git author).
3. Or relax **Settings → Git → "Git author must have access"** on the project.

## Supabase Edge Functions — deploy manually (no CI)

There is **no pipeline** that deploys `supabase/functions/*`. A Vercel deploy
only ships the frontend. After changing any edge function you must run:

```bash
supabase functions deploy                       # all
supabase functions deploy <name>                # one, e.g. process-payment
```

`supabase functions deploy` bundles from your **local working directory**, so
make sure you're on an up-to-date `main` first — deploying a stale checkout
ships old code even though the fix is merged.

## pnpm build-scripts gate

pnpm 10/11 blocks dependency build scripts by default; Vercel treats the
unresolved gate as fatal (`ERR_PNPM_IGNORED_BUILDS`). Decisions live in
[`pnpm-workspace.yaml`](./pnpm-workspace.yaml) under `allowBuilds` — only
`esbuild` is built (needed for the Vite build); the dev-only tools are skipped.
Add a new entry there if a dependency with a build script is introduced.
