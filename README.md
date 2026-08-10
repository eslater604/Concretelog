# 701 Kingsway Concrete Dashboard

A dashboard that compares the precon concrete estimate against actual pours
logged in the "665 - 701 Kingsway - Concrete Log" Smartsheet. Click "Sync now"
to pull the latest data live from Smartsheet.

## Why this needs a real deploy (not drag-and-drop)

This site has two parts:

- `index.html` - the page you see, static HTML/CSS/JS.
- `netlify/functions/sync-concrete.js` - a small serverless function that
  calls the Smartsheet API using a private token, so the token never appears
  in the page itself.

Netlify's drag-and-drop deploy (the "Netlify Drop" page) only publishes
static files - it does not run serverless functions. To get the Sync button
working, deploy this via a Git repository connected to Netlify instead.
Netlify builds it automatically; you don't need Node.js or npm installed
locally for this.

## One-time setup

**1. Put this folder in a GitHub repository**
   - Create a new repository on github.com (can be private).
   - Upload these files to it (GitHub's web UI has an "Add file > Upload
     files" option - no git command line needed).

**2. Connect it to Netlify**
   - In Netlify: **Add new site > Import an existing project > Deploy with
     GitHub**.
   - Pick the repository you just created.
   - Build settings: leave the build command blank, publish directory `.`
     (Netlify will read `netlify.toml` and pick up the function
     automatically).
   - Click **Deploy**.

**3. Add your Smartsheet token**
   - In the new Netlify site: **Site configuration > Environment variables >
     Add a variable**.
   - Key: `SMARTSHEET_API_TOKEN`
   - Value: your existing Smartsheet API access token (Smartsheet ->
     Account > Personal Settings > API Access). Reuse the one you already
     have - it does not expire unless you set an expiration or revoke it.
   - Save, then go to **Deploys > Trigger deploy > Clear cache and deploy
     site** so the function picks up the new variable.

**4. Test it**
   - Open the site URL Netlify gives you.
   - Click **Sync now**. If it fails, check **Site configuration >
     Environment variables** for typos, and confirm the token still has
     access to the sheet in Smartsheet (Sheet ID `1726632799719300`).

## Updating the precon estimate

The precon estimate volumes are embedded in
`netlify/functions/estimate-data.js` (not pulled from Smartsheet, since the
takeoff lives in a separate Excel file). If the precon estimate ever
changes, ask Claude to regenerate this file from the updated takeoff and
re-upload it to the GitHub repo - Netlify will redeploy automatically.

## If a new "Location Used" wording shows up in the log

`LOCATION_MAP` in `estimate-data.js` maps each Smartsheet "Location Used"
value to a dashboard category. If a pour ever shows up as "Unmapped -
review" on the dashboard, add its exact wording to that map.
