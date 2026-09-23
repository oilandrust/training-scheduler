I wand to create an app that allows to edit schedules for a psychotherapy training that happens live on zoom over the course of a few weekends, each weekend is a module.

We should be able to create a schedule for each module, chose the begin and end date, and open a edit view for the weekend.

It should show a calendar like view of the weekend with all the activities showed as blocks with a label.

Whe should be able to select a particular day, then it would show a calendar-like view for this specific day, and we should be able to add activities, like "Intro", "Talk about loving presence", "break", "Breakout Room". It should work a bit like google calendar, where you can click somewhere in the schedule and it will create an activity, and we can drag activities, resize them to adjust their length, and when we select them, the details should be show on the right panel.

I have included a pdf of such schedule made in a google sheet, please use this data to settup the schema and populate base data. We can use vite and react for frontend

Prisma schema for the db, nodejs backend
NestJS 10 + TypeScript
Express (@nestjs/platform-express)
Prisma 6 ORM
PostgreSQL

Don't worry about users an authentication yet, whoever is browsing can edit everything

Right now just build the day detail page, on the left we have a panel with the days "friday, saturday, Sunday", we can chose one, and it displays the schedule on the center panel, and if we click an activity there is the details view that we can edit, make it look user friendly like google calendar, with rounded cards for the events and relatively warm saturated colors