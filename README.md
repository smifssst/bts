# BTS Program — Netlify Deployment

This package is ready for Netlify with central cross-device storage.

## Included

- `public/index.html` — BTS frontend
- `public/OutletBTS.xlsx` — initial outlet master / fallback copy
- `netlify/functions/auth.js` — server-side login/session
- `netlify/functions/card-entries.js` — central Card Entry CRUD
- `netlify/functions/outlet-data.js` — central OutletBTS.xlsx read/upload
- `netlify/lib/auth.js` — shared server-side authorization
- `netlify.toml` — Netlify build/functions configuration
- `package.json` — Netlify Blobs dependency

## Login

### User
- Username: `delibts`
- Password: `bts4321#`
- Menu: Outlets / Card Entry List / Logout
- Protected Edit / Reset / Export password: `edit4321#`

### Admin
- Username: `admin1986`
- Password: `bts4321#`
- Menu: Outlets / Card Entry List / Data Upload / Logout
- Edit / Reset / Export: no extra password

## What is central now

1. Card entries are stored in Netlify Blobs and shared across devices.
2. Admin Edit/Reset updates the central record.
3. Users and Admin refresh Card Entry data every 30 seconds.
4. Admin Data Upload publishes the merged `OutletBTS.xlsx` to Netlify Blobs — no GitHub token is required.
5. The initial `public/OutletBTS.xlsx` is used as a fallback until the first central Admin upload.
6. Existing browser-local card entries are migrated to central storage once per browser when possible.

## Deploy (recommended: Git repository)

1. Create a new GitHub repository and upload the **contents of this folder** (not only `public`).
2. In Netlify choose **Add new project → Import an existing project** and select that repository.
3. Netlify reads `netlify.toml` automatically.
4. Publish directory: `public`.
5. Functions directory: `netlify/functions`.
6. Deploy the project.
7. Open the Netlify URL and login as Admin.
8. Open **Data Upload**, upload your latest outlet Excel and click **PUBLISH OUTLET MASTER** once. This seeds/updates the central outlet master.

## Optional: change credentials without editing code

In Netlify: **Project configuration → Environment variables**, you may set:

- `BTS_USER_USERNAME`
- `BTS_USER_PASSWORD`
- `BTS_ADMIN_USERNAME`
- `BTS_ADMIN_PASSWORD`
- `BTS_EDIT_PASSWORD`

If these variables are not set, the credentials listed above are used.

## Notes

- Login sessions last 12 hours per browser session.
- Card entries and the uploaded outlet master use site-wide Netlify Blobs, so normal redeploys do not erase them.
- Storage uses the Singapore (`ap-southeast-1`) Blobs region and strong consistency for the shared operational data.
- Do not deploy only `index.html`; Functions and `package.json` are required for central sync.

## Upload parser fix
This package includes the Excel upload parser required by the Data Upload page. It accepts the BTS outlet workbook structure, ignores blank/extra columns, auto-detects Jan-Dec month columns, uses Outlet ID as the unique key, and enables PUBLISH OUTLET MASTER after a valid workbook is parsed.

## Large Excel / 413 fix
This build writes generated XLSX files with ZIP compression enabled before uploading to the Netlify Function. This keeps the current OutletBTS master safely below the Netlify buffered binary request limit. The UI also checks the generated payload size before upload and reports a clear message if a future workbook grows beyond the safe single-request size.
