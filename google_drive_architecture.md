Yes. You can get quite close to creating your own “Google Drive document type,” with one important distinction: you cannot create a new native Google Workspace type alongside Docs/Sheets/Slides. But you can create your own file format, store it in Drive, and register your web app so Drive can create/open those files through your custom UI. Google explicitly supports editor-style third-party apps this way.

For your calendar/schedule SaaS idea, this could actually be a very nice architecture:

Google Drive
│
├── Hakomi Pro1 Schedule.schedule
│     └── JSON / your own data model
│
├── Hakomi Pro2 Schedule.schedule
│
└── Teacher Training.schedule

            ↓ Open with

      yourapp.com/editor
            │
            ├── Calendar UI
            ├── Day/week views
            ├── Drag/drop events
            ├── Teacher assignments
            └── Editing logic

The Drive file itself could simply contain something like:

{
  "version": 1,
  "title": "Hakomi Pro1",
  "timezone": "America/Los_Angeles",
  "days": [
    {
      "date": "2026-10-17",
      "events": [
        {
          "id": "evt_123",
          "start": "09:00",
          "end": "10:30",
          "title": "Opening Circle",
          "teacher": "Rob"
        }
      ]
    }
  ]
}

You could give it an extension such as:

.hschedule
.training
.schedule

and a MIME type such as:

application/vnd.yourcompany.schedule+json

Drive lets an app register default MIME types and extensions that it is designed to open. Then the user can right-click the file → Open with → Your App. Your app receives the Drive file ID, downloads the file through the Drive API, presents your custom calendar UI, and writes the updated JSON back to that same Drive file.

Even better, your app can be integrated into Drive's New menu. So conceptually the user could have:

+ New
  ├── Google Docs
  ├── Google Sheets
  ├── Google Slides
  └── Training Schedule

Selecting your application launches your web app and lets it create the corresponding Drive-backed document.

You don't need your own database for the documents

You could make Drive the canonical storage layer:

React / Next.js editor
        │
        │ Google OAuth
        ▼
Google Drive API
        │
        ├── GET file
        ├── PATCH metadata
        └── UPDATE file contents

The user owns the file, it consumes their Drive storage, and ordinary Drive permissions/sharing apply to it. Files created through OAuth on behalf of a user are owned by that user.

That gives you quite a few things for free:

Drive provides

folders
filenames
sharing permissions
organization
search
ownership
file history/metadata infrastructure
Shared Drive compatibility
storage

Your application provides

the calendar/schedule data model
rendering
drag/drop
validation
duplication rules
instructor assignments
schedule-specific editing
public/presentation views

You can also attach small app-specific metadata using Drive's appProperties, for example:

{
  "appProperties": {
    "schemaVersion": "2",
    "documentType": "trainingSchedule",
    "organizationId": "embodywise"
  }
}

Those properties are private to your application and searchable through the API, although they're intended for small metadata rather than the document itself.

There is one major limitation

The actual editing UI does not run inside Google Drive.

Opening the file sends the user to something like:

https://scheduleapp.com/edit?fileId=1ABC...

Drive passes state identifying the selected file, and your site becomes the editor.

So it won't literally look like a Google Calendar embedded inside Drive:

drive.google.com/...  ❌ custom React UI here

Instead it's:

drive.google.com
      ↓
Open Training Schedule
      ↓
scheduleapp.com/document/xyz
      ↓
custom React UI
One architecture I'd seriously consider for your schedule app

Given the training-schedule product you've been exploring, I'd probably use:

                    Google Drive
                         │
                 training.schedule
                    JSON document
                         │
              ┌──────────┴─────────┐
              │                    │
         Drive sharing         Drive folders
              │
              ▼
       Your Next.js app
              │
     ┌────────┼──────────┐
     │        │          │
  Editor    Staff      Public
   view      view        view

And make the document schema something along these lines:

type ScheduleDocument = {
  version: number
  title: string
  timezone: string

  modules: Module[]
  people: Person[]
  events: ScheduleEvent[]

  settings: {
    startHour: number
    endHour: number
    slotMinutes: number
  }
}

This would make your application feel less like a conventional SaaS where the customer uploads all their information into your database, and more like:

“Google Drive, but with a purpose-built document editor for training schedules.”

That positioning could be particularly interesting for the Hakomi/Embodywise use case because their existing workflow is already essentially documents/spreadsheets representing schedules. Instead of asking them to migrate their organization into yet another SaaS database, they could have a .schedule document sitting right beside their existing Docs and Sheets.

There are some important implications around real-time collaboration, revision history, offline editing, OAuth scopes, and public share links that I'd think through before choosing this architecture. Those determine whether Drive-as-the-database is elegant or becomes limiting.