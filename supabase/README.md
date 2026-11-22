# Progress sync setup

Everything here is optional. With no Supabase project configured the site
works exactly as it did before: progress is saved per browser, there is no
sign in button, and the Supabase library is never even downloaded by visitors.

These are the steps only you can do, because they need your Google and
Supabase accounts.

## 1. Create the Supabase project

1. Sign up at [supabase.com](https://supabase.com) and create a project.
2. Pick a region near most of your readers.
3. Save the database password somewhere safe. You will not need it for this,
   but you will not be shown it again.

The free tier allows 50,000 monthly active users and 500 MB of database. One
user's entire history is a few tens of kilobytes, so the database limit is not
the one you would ever hit.

## 2. Create the table

Open **SQL Editor -> New query**, paste the whole of [`schema.sql`](schema.sql)
and run it. It is safe to run more than once.

Then check it took: **Table Editor -> progress** should exist and show
**RLS enabled**. If it does not say that, stop and fix it before going
further. Row level security is the only thing separating one user's data from
another's, because the key in the browser bundle is public by design.

## 3. Set up Google sign in

In the [Google Cloud Console](https://console.cloud.google.com):

1. Create a project, then **APIs & Services -> OAuth consent screen**. Choose
   **External**, fill in the app name and your support email, and publish it.
   While it is in testing mode only accounts you list can sign in.
2. **APIs & Services -> Credentials -> Create credentials -> OAuth client ID**,
   type **Web application**.
3. Under **Authorized redirect URIs** add exactly:

   ```
   https://<your-project-ref>.supabase.co/auth/v1/callback
   ```

   The project ref is in your Supabase project URL. This is Supabase's
   callback, not your site's: the redirect goes to Supabase first, which then
   sends the user back to you.
4. Copy the **client ID** and **client secret**.

Back in Supabase, **Authentication -> Sign In / Providers -> Google**: enable
it and paste both values in.

Then **Authentication -> URL Configuration**:

- **Site URL**: `https://topdowncs.com`
- **Redirect URLs**: add `https://topdowncs.com/progress`, and
  `http://localhost:3000/progress` if you want sign in to work while
  developing.

If a redirect URL is missing, sign in completes and then dumps the user on an
error page, which is the most common way this goes wrong.

## 4. Give the site the keys

From **Project Settings -> API** copy:

- the **Project URL**
- the **anon / public** key

Set them as environment variables wherever the site is built (Netlify, Vercel,
GitHub Actions, whatever you use):

```
SUPABASE_URL=https://<your-project-ref>.supabase.co
SUPABASE_ANON_KEY=<the anon public key>
```

They are read at build time by `site/docusaurus.config.js` and baked into the
client bundle, so **you must rebuild after setting them**.

To try it locally, set them in the same shell that runs the dev server:

```powershell
$env:SUPABASE_URL = "https://<your-project-ref>.supabase.co"; $env:SUPABASE_ANON_KEY = "<the anon public key>"; npm start
```

### Never use the service role key

Project Settings also offers a **service_role** key. It bypasses row level
security completely. Putting it in `SUPABASE_ANON_KEY`, or anywhere else that
reaches the browser, would hand every visitor full read and write access to
every user's data. The anon key is the only one that belongs here.

## 5. Check it works

1. Rebuild and open `/progress`. An **Account** card should appear.
2. Sign in with Google. You should land back on `/progress`, signed in.
3. **Table Editor -> progress** should now hold one row, with your user id.
4. Sign in on a second browser. Whatever you had done there should merge with
   what you had done in the first, and neither should lose anything.

Step 4 is the one worth actually doing. Merging is covered by tests, but it is
your data and it is worth seeing with your own eyes once.

## Keeping the project awake

Supabase pauses Free plan projects after **7 days of low activity**, and a
paused project must be restored by hand from the dashboard. The symptom is
specific: sign in and sync stop working while everyone's local progress
carries on fine, so it looks like an account problem rather than an outage.
Supabase emails the project owner a warning roughly a week beforehand, and a
paused project stays restorable for 90 days.

Until enough readers sign in to generate steady traffic, a scheduled job
covers the gap:

1. Run [`keepalive.sql`](keepalive.sql) in the SQL editor, the same way as
   `schema.sql`. It adds a one row table that anyone may read and nobody may
   write. It exists so the ping does not need access to `progress`, where
   anonymous access is deliberately revoked.
2. Add two repository secrets on GitHub, under
   **Settings -> Secrets and variables -> Actions**:

   ```
   SUPABASE_URL       https://<project-ref>.supabase.co
   SUPABASE_ANON_KEY  the anon / publishable key
   ```

   These are the same two values Cloudflare has. Still not the service role
   key.
3. The workflow at `.github/workflows/supabase-keepalive.yml` then reads that
   row once a day. Run it by hand first, from the **Actions** tab, rather than
   waiting a day to find out whether it works.

It runs daily rather than weekly because GitHub makes no promise about when a
scheduled job fires and may skip runs under load. Daily means several misses
in a row still leave the project awake.

The job fails loudly if the secrets are missing or the request does not return
200, so GitHub emails you. A keepalive that had quietly stopped would be worse
than none at all, because you would believe you were covered.

Two things worth knowing:

- GitHub disables scheduled workflows in a repository with no commits for 60
  days. An active repository is fine.
- Delete the workflow once real traffic keeps the project awake by itself.

## How syncing behaves

- Local first. The browser copy is the one being read and written as you
  study; syncing adds a second copy, it does not take over.
- A sync merges rather than overwrites, and the merge is commutative and
  idempotent, so it does not matter which device syncs first or how often.
  See `site/src/lib/mergeStores.js`.
- A completion present on either side survives. Un-ticking a page on one
  device does not propagate to others, which is the deliberate price of never
  destroying anything.
- Reading time for a day takes the larger of the two values, not the sum.
  Summing would double on every repeat sync. Studying on two devices in one
  day therefore undercounts.
- Syncing happens on sign in, two minutes after a local change settles, when a
  page is closed, and when **Sync now** is pressed.
- Signing out leaves this device's progress alone. **Delete stored copy**
  removes the server's copy only.
