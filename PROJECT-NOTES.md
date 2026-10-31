# 701 Kingsway: Concrete Dashboard and Pour Map. Project notes

Hand-off notes for Claude and for Eric. Upload this file, plus the current project folder, at the start of ANY new conversation about the dashboard or the pour map. Ask Claude at the end of each session to update it.

Last updated: Oct 27, 2026. Sources: the dashboard conversation and the pour map conversation (written up from what each produced).

## 1. What exists

- **Dashboard:** `concretelog.netlify.app` (`index.html`). Compares precon's estimated volumes with what has been poured, from the Concrete Log in Smartsheet.
- **Pour map:** `pour-map.html`. Draw pour polygons on structural drawings, linked to POs. Its **Dashboard** button goes back to `index.html`. The dashboard has a **Pour map** button (with an "under construction" pop-up) that goes to it.

## 2. Files in the project folder

| File | What it does | Used by |
|---|---|---|
| `index.html` | The whole dashboard page | Dashboard |
| `pour-map.html` | The pour map page | Pour map |
| `marcon-logo.png` | Logo | Both pages |
| `netlify/functions/sync-concrete.js` | Reads the Smartsheet Concrete Log, builds all figures | **Both** (see section 3) |
| `netlify/functions/estimate-data.js` | Precon estimate volumes by level and category, budget, location map | Dashboard |
| `netlify/functions/precon-crosswalk.js` | Precon mix lines, mix-to-group map, location-to-group map | Dashboard |
| `netlify/functions/level-status.js` | Saves which levels are marked complete | Dashboard |
| `netlify/functions/level-notes.js` | Saves and loads notes | Dashboard |
| `netlify/functions/load-pours.js`, `save-pour.js`, `delete-pour.js` | Store pours drawn on the map | Pour map |
| `netlify/functions/load-drawing.js`, `save-drawing.js` | Store the drawing uploaded for each level | Pour map |
| `netlify/functions/add-comment.js`, `load-comments.js`, `delete-comment.js` | Comments on pours | Pour map |
| `netlify/functions/save-report.js`, `load-reports.js`, `delete-report.js`, `get-report-file.js` | Lab test reports and their PDFs | Pour map |
| `netlify/functions/get-config.js`, `save-config.js`, `get-logo.js`, `save-logo.js` | Pour map "Site setup" (names, levels, pour types, locations) and logo | Pour map |
| `netlify/functions/verify-edit.js`, `change-password.js`, `lib/auth.js` | Edit-mode password | Pour map |
| `pdf-lib.min.js`, `P2_FDN_clean.png` | PDF reader for Import pours; built-in P2 drawing | Pour map |
| `netlify.toml`, `package.json` | Site settings; `@netlify/blobs` dependency (without `package.json` the storage functions fail with 500/502) | Both |

Netlify setting needed: `SMARTSHEET_API_TOKEN`.

## 3. Shared pieces: take care here

- `sync-concrete.js` feeds both pages. The dashboard reads `rows, levels, mixComparison, totals, pours`. The pour map reads `pos` (the PO list). Keep all of these fields when editing.
- The dashboard's **Pour map** button and the pour map's **Dashboard** button must keep pointing at each other (`pour-map.html` and `index.html`).
- The dashboard counts **P1a as P1**. The pour map's level list still has **P1a** as its own level, because the pour map keeps separate drawings per level. Decide whether that matters before changing either.
- Pasting a "snippet" into `index.html` is fragile: a later full replacement of the file wipes it. This is how the Pour map button disappeared once. Build everything into the real files.

## 4. Data rules (decisions made)

- Source: Smartsheet "665 - 701 Kingsway - Concrete Log - Log", sheet ID 1726632799719300. Rows are read by column title and, for the PO list, by column index (the API returns sparse rows).
- Only POs with **"Completed by Site Team" ticked** count as poured. POs not ticked are shown separately as "logged, not yet complete" and never added to poured totals.
- Level codes in the log (L1, L2 ... and P4 to P1) mean Level 1, Level 2 and so on. **P1a / P1A is counted as P1** because the log's Level list has no P1a. The log's Level list has no Roof.
- Location Used decides the category. A PO with two locations ticked lands in "Unmapped - review". The fix is to split it across Mix #1 and Mix #2 in Smartsheet, one location each.
- Estimates come from the takeoff workbook, "Breakdown-VOLUME" sheet, Project table (8,890.7 m3 total). Rules applied when the dashboard loads (in `sync-concrete.js`; `estimate-data.js` itself is untouched):
  - P1a is merged into P1.
  - Steps and Toppings are added into **Suspended slab**.
  - Stairs & landings, Housekeeping pads and Pedestals are added to the level's slab volume (Suspended slab, or Slabs on grade on P2, which has no suspended slab).
  - The 112 m3 **Blinding** line on P2 is kept as is, by decision (it may double-count part of Footings).
- Whole-building budget is $2,726,165. Category-level estimated cost uses the blended actual $/m3 per category (no per-category precon budget), so the volume comparison is the reliable one.
- **LPM mixes (45 MPa):** estimating did not expect them. They were used in lieu of puddle mix. LPM logged against Columns is a data-entry error, fixed manually in Smartsheet. The dashboard shows a note on the LPM line.
- Precon mix lines are combined where one mix serves several lines (for example #12 + #17). Group volumes add up to 8,890.7 m3.

## 5. Dashboard features

- Summary tiles (volume and cost, active and whole building, plus "logged, not yet complete").
- Level cards by category with ring, colours (green under 85%, amber 85 to 100%, red over 100%), large poured-of-estimate figure. Level is a checkbox multi-select. Type and Mix are dropdowns.
- Level balance tile (when levels are ticked): net over/under across all categories, "So far" or "Final", Logged column, Projected over/under (hidden once a level is marked complete), fixed note about back-up pours, category and level tables.
- Level completion section: Mark complete and Reopen, each with a confirmation step. Completed levels are final.
- Notes (in the balance tile): add and delete (delete needs confirmation); the first note also shows on the matching card.
- Mix-line list (whole project, or for the selection), Schedule of Values panel, Help panel, collapsible sections, Pour map button with warning pop-up.
- **Tower progress** section (added Oct 27, placed first on the page so it is visible when the page opens; it loads the completion marks on its own, without waiting for the Smartsheet sync): the tower model photo is embedded in `index.html` (a JPEG as a data URI, so no extra file to upload). The photo is always in full colour; the tower and the front pavilion are laid over with a pale grey copy wherever a level is not complete, and are left in colour once it is. The photo shows 24 storeys under the roof deck (the timber-clad ground storey plus 23 glazed floors), the roof deck, and a two-block penthouse, matching L1 to L27 plus Roof in the takeoff. Each band is the storey whose floor is that level's slab (L1 = ground storey, L25 = roof deck, L26 and L27 = penthouse blocks, Roof = cap). The pavilion goes with the lowest levels (ground storey with L1, upper storey with L2, roof with L3). P2 and P1 are below ground and not in the photo: they count in the total (out of 30: P2, P1, L1 to L27, Roof) but are not drawn. The slab-line positions were measured on the photo (`TOWER_SLABS` in `index.html`); the penthouse, roof-deck and pavilion outlines are estimated by eye. To change the photo, the numbers need re-measuring.

## 6. Pour map features (as built in the other conversation)

- Draw pour polygons on a structural drawing; each is linked to a PO from the live sync and fills in details from that row (including the delivery date). Optional materials-test PO number. Several shapes can belong to one PO.
- Viewer and editor modes. A drawing (PDF or image) can be uploaded per level and is stored in Netlify Blobs.
- Side panel lists the level's pours, with Focus and Delete. Donut badges show area-based percentages. Level list: P2, P1, P1a, Levels 1 to 25.
- Pours are stored in Netlify Blobs through the save, load and delete functions.
- Status: under construction. The next stage of work (settings) was being planned; details are not recorded here.

## 7. Technical things learned (do not repeat these mistakes)

- **The pour map's comment, report, Site setup and logo functions had asked for strong consistency**, which fails on this site ("BlobsConsistencyError ... uncachedEdgeURL"). Fixed Oct 27: none of them request it now. Comments and reports are never overwritten (a deleted one leaves a small "del" record that wins if newer); Site setup saves as `config__<time>` and the logo as `logo__<version>` (newest wins). The page also remembers recent changes in this browser for 5 minutes (`pm-recent-comments`, `pm-recent-reports`, `pm-recent-config`). Tests that use a stand-in for storage must make the stand-in refuse strong consistency, or they will pass while the live site fails.
- Netlify Blobs here is only eventually consistent: a new record can be read at once, but an overwrite or delete can show the old value for about a minute, and the listing can lag. **Strong consistency does not work** in these functions (it needs a setting they are not given). So level marks and notes are stored as new records (never overwritten), and the page lays recent changes made in the same browser over the server's list for 5 minutes.
- If the server cannot be reached, marks and notes are kept in the browser (localStorage) and shown with an amber banner. Notes are sent to the server automatically when it is back.
- Browser storage keys: `concretelog.levelStatus.v1`, `concretelog.levelRecent.v1`, `concretelog.notesLocal.v1`, `concretelog.notesRecent.v1`, `concretelog.noteName.v1`, `concretelog.collapsed.v1`.
- Deploying: the site's Deploys page has no drag-and-drop area, so it may be linked to a Git repository. Confirm how updates are published, and always replace whole files (never paste partial code).

## 8. Open decisions

1. **Roof (15.8 m3):** which level code will roof pours be logged under (the log has no Roof)?
2. **Perimeter / shotcrete walls (400.9 m3):** the takeoff books all of it to P2, but shotcrete is poured on P2, P1 and L1. Options: track shotcrete walls as one all-levels group.
3. **Columns vs shear walls:** crews log wall pours as Columns. Option: one combined "Columns & shear walls" category.
4. **Crane pad (120 m3, PO 3001C):** counted in P2 Footings. Is it in the takeoff? If not, give it its own category.
5. **PO 3083C:** blinding on L1 (10 m3). Correct level?
6. **PO 3047C:** Level is P1 but the note says P2.
7. **Rounding:** the estimate file rounds Walls down on 25 levels (net about 2.1 m3 low). Optional fix: regenerate from exact takeoff values.
8. Whether the pour map should also merge P1a into P1. (The pour map conversation added a per-level note instead: "The volumes for Level P1a are factored into the Level P1 volume counts".)
9. **Edit password changes:** `lib/auth.js` overwrites one record, so for up to about a minute after a change the old password may still work and the new one may be refused. The master code is unaffected. Not changed yet.
10. Pours and drawings (`save-pour`, `delete-pour`, `save-drawing`) use the normal setting and overwrite or delete records, so a reload within about a minute of an edit can show the older state. They work; they have not been given the same treatment as comments.

## 9. Working agreement for conversations

- The files on the live site are the single source of truth. Start every conversation by uploading the current project folder (zipped) and this file.
- One conversation edits a given file at a time. Dashboard work: `index.html` and the dashboard functions. Pour map work: `pour-map.html` and the pour/drawing functions. Anything touching `sync-concrete.js` or the two pages' links needs both sides checked.
- Before replacing a file on the site, save the old one (for example `index-OLD.html`). After each change, download the new files and make them the new master copy.
- At the end of a session ask Claude to update this file.


## Cost uplift (added)
`sync-concrete.js` `pourCost(p)` = (concrete + admixtures + fuel $50 per truck at m3/10 + environmental $14/m3) x 1.07 PST. Applied to actual, logged/pending and mix-line costs. Pour map PO costs unchanged. Open question: does the $2,726,165 budget already include these?
