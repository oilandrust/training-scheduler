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
| Open URL | `https://training-scheduler.lefolio.fr/edit?state={state}` |
| Create URL | `https://training-scheduler.lefolio.fr/new` |
| Default MIME types | `application/vnd.lefolio.schedule+json` |
| Default file extensions | `schedule` |

Keep `{state}` literally in the Open URL — Drive replaces it with URL-encoded JSON that includes the file id(s).

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

**Use the deployed HTTPS URL** for Open-with from [drive.google.com](https://drive.google.com). Localhost only works if you temporarily set:

`http://localhost:5173/edit?state={state}`

…and you open the file on the same machine where Vite is running. The production frontend must be deployed so `/edit` exists on that host.

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

- Drive UI integration saved with MIME + extension above  
- Open URL is reachable HTTPS (or intentional localhost)  
- You signed in once → app appears under Manage apps  
- Your account is an OAuth **Test user** (while consent status is Testing)  
- File MIME is `application/vnd.lefolio.schedule+json` (create via the app)  
- Production build includes the `/edit` route  

**New → Training Schedule** needs Create URL + default MIME/extension in the same form.

## 3. Scopes

The prototype requests only:

```text
https://www.googleapis.com/auth/drive.file
```

That covers files the user opens with the app or that the app creates. It does not list arbitrary Drive files.

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
