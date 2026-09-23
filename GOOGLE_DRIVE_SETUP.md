# Google Drive setup for Training Scheduler

Prototype mode: schedules are `.schedule` JSON files in the signed-in user’s Google Drive.
The browser talks to the Drive API with a Google Identity Services (GIS) access token.
No Nest/Drive proxy is required for this flow. The Postgres demo remains at `/db`.

## Document format

| Field | Value |
| --- | --- |
| Extension | `.schedule` |
| MIME type | `application/vnd.lefolio.schedule+json` |
| Sample file | [`samples/hakomi-weekend-1.schedule`](samples/hakomi-weekend-1.schedule) |

## 1. Google Cloud project

1. Open [Google Cloud Console](https://console.cloud.google.com/) and create or select a project.
2. Enable **Google Drive API** (APIs & Services → Library).
3. Configure the **OAuth consent screen**:
   - User type: **External**
   - App name: `Training Scheduler`
   - Publishing status: **Testing**
   - Add your Google account under **Test users**
4. Create credentials → **OAuth client ID** → Application type **Web application**:
   - Name: `Training Scheduler web`
   - **Authorized JavaScript origins**:
     - `http://localhost:5173`
     - `https://training-scheduler.lefolio.fr`
   - **Authorized redirect URIs** (same origins are enough for the GIS token client):
     - `http://localhost:5173`
     - `https://training-scheduler.lefolio.fr`
5. Copy the client ID into the frontend env:

```bash
cp frontend/.env.example frontend/.env
# edit VITE_GOOGLE_CLIENT_ID=….apps.googleusercontent.com
```

Restart Vite after changing env (`npm run dev` in `frontend/`).

## 2. Make Drive open schedules in this app

This is what registers Training Scheduler as an opener for `.schedule` files (Open with / default open).

### Configure Drive UI integration

In Cloud Console for your project (e.g. [hakomi-home](https://console.cloud.google.com/apis/api/drive.googleapis.com/drive_sdk?project=hakomi-home)):

1. Ensure **Google Drive API** is enabled.
2. Open **Google Drive API** → **Drive UI integration**.  
   If that page is missing: enable **Google Workspace Marketplace SDK**, then open its **App configuration** / **Drive UI** section.

Set:

| Setting | Value |
| --- | --- |
| Application name | `Training Scheduler` |
| Open URL | `https://training-scheduler.lefolio.fr/edit` |
| Create URL | `https://training-scheduler.lefolio.fr/new` |
| Default MIME types | `application/vnd.lefolio.schedule+json` |
| Default file extensions | `schedule` |

**Do not** put `?state={state}` in the Open URL. `{state}` is not a template variable Drive replaces — it stays literal and the app gets no file id. Drive [appends](https://developers.google.com/workspace/drive/api/guides/enable-sdk) `?state=…` (URL-encoded JSON with `ids`, `action`, etc.) for you.

Wrong: `https://training-scheduler.lefolio.fr/edit?state={state}`  
Right: `https://training-scheduler.lefolio.fr/edit`

### Application icons

Upload PNGs from [`assets/icons/`](assets/icons/) (transparent background, Hakomi logo):

| Size | File |
| --- | --- |
| 16×16 | `assets/icons/icon-16.png` |
| 32×32 | `assets/icons/icon-32.png` |
| 48×48 | `assets/icons/icon-48.png` |
| 64×64 | (if requested) `assets/icons/icon-64.png` |
| 96×96 | (if requested) `assets/icons/icon-96.png` |
| 128×128 | `assets/icons/icon-128.png` |
| 256×256 | `assets/icons/icon-256.png` |

Drive UI integration typically asks for **16, 32, 48, 128, and 256**. Source master: `assets/icons/icon-1024.png`.

**Use the deployed HTTPS URL** for Open-with from [drive.google.com](https://drive.google.com). `localhost` is not accepted for Open URL. The production frontend must be deployed so `/edit` exists on that host.

### Install the app once (required)

Registration alone is not enough. Your account must authorize the app:

1. Open the app (prod or local) → **Sign in with Google** → allow Drive access.
2. In Drive: ⚙ **Settings** → **Manage apps** — confirm **Training Scheduler** is listed.
3. Prefer files **created by the app** (**Create sample schedules** / **New schedule**) so MIME is exactly `application/vnd.lefolio.schedule+json`. Renaming a random file to `.schedule` often leaves MIME as text/JSON and Open with won’t match.

### Open from Drive

1. Right-click the file → **Open with** → **Training Scheduler**.  
   Drive navigates to `…/edit?state=…`; the app reads `state.ids[0]` and loads the file.
2. For **click / double-click** to open in the app: after the first Open with, choose Training Scheduler and set it as the default / “Always” for that type (wording varies in Drive). Until then, Drive may preview or download custom MIME files instead of launching your app.

State example:

```json
{ "ids": ["FILE_ID"], "action": "open", "userId": "…" }
```

In-app list uses `/edit?fileId=…` instead.

### If Open with doesn’t show Training Scheduler

- [ ] Drive UI integration saved with MIME + extension above  
- [ ] Open URL is reachable HTTPS (localhost is not accepted by Drive for Open URL)  
- [ ] You signed in with **both** `drive.file` and `drive.install` (re-consent after scope change)  
- [ ] App appears under Manage apps  
- [ ] Your account is an OAuth **Test user** (while consent status is Testing)  
- [ ] File MIME matches Default or Secondary types (create via the app)  
- [ ] Production build includes the `/edit` route  
- [ ] Application icons uploaded (optional; can take 24h; file list icons are often generic)  

**New → Training Schedule** needs Create URL + default MIME/extension in the same form.

## 3. Scopes

The app requests:

```text
https://www.googleapis.com/auth/drive.file
https://www.googleapis.com/auth/drive.install
```

- `drive.file` — read/write files the app creates or the user opens with the app  
- `drive.install` — **required** for Training Scheduler to appear in Drive’s **Open with** and **New** menus ([Google docs](https://developers.google.com/workspace/drive/api/guides/enable-sdk#drive.install))

After adding `drive.install`, sign out in the app (or revoke access at [Google Account → Third-party access](https://myaccount.google.com/permissions)), then **Sign in** again so Google shows the install consent. Only then does Open with list the app.

### Why files have no custom icon

Google’s Drive UI integration notes that **document icons are deprecated**. The application icon (upload 16–256 PNGs on the same Drive Integration page) shows in Manage apps / Open with; most binary files still use a generic icon. Icon uploads can take **up to 24 hours** to appear.

### MIME type tips

Prefer schedules **created by the app** so MIME is `application/vnd.lefolio.schedule+json`. A file you upload manually may be stored as `application/json` or `application/octet-stream`, and Open with may not match Default MIME types. You can add `application/json` under **Secondary MIME types** if you need uploaded JSON to open in the app.

Leave **Automatically show OAuth 2.0 consent screen** unchecked — Google marks that option deprecated; the app starts its own sign-in.

## 4. Manual test plan

1. Set `VITE_GOOGLE_CLIENT_ID`, run the frontend, sign in.
2. **Create sample schedules** → edit an activity → **Save** → confirm content in Drive.
3. From drive.google.com, **Open with** → Training Scheduler lands on `/edit?…`.
4. Visit `/new` (or Drive New menu if registered) → new file opens in the editor.
5. `/db` still loads the Prisma seed demo.

## Notes

- Access tokens are stored in `localStorage` for about an hour; silent refresh may extend the session.
- Production HTTPS origin must match the OAuth client exactly.
- Public Workspace Marketplace listing is out of scope for this prototype.
