import type { ActivityKind } from '../types';
import { createEmptyDocument } from './document';
import type { ScheduleActivity, ScheduleDocument } from './types';

const t = (hours: number, minutes = 0) => hours * 60 + minutes;

type SeedAct = {
  title: string;
  start: number;
  end: number;
  kind: ActivityKind;
  room?: string;
  facilitator?: string;
  breakoutNotes?: string;
  notes?: string;
};

function act(a: SeedAct, index: number, dayKey: string): ScheduleActivity {
  return {
    id: `${dayKey}-a${index}`,
    title: a.title,
    startMinutes: a.start,
    endMinutes: a.end,
    kind: a.kind,
    room: a.room ?? null,
    facilitator: a.facilitator ?? null,
    breakoutNotes: a.breakoutNotes ?? null,
    notes: a.notes ?? null,
  };
}

/** Hakomi weekend #1 — same content as the Prisma seed, as a Drive document. */
export function createHakomiWeekend1Document(): ScheduleDocument {
  const friday: SeedAct[] = [
    { title: 'Staff Meeting', start: t(11, 30), end: t(12, 30), kind: 'STAFF', room: 'Staff / Green Room' },
    {
      title: 'Staff log onto the training Zoom',
      start: t(12, 45),
      end: t(13, 0),
      kind: 'LOGISTICS',
      room: 'Main Room',
      notes: 'Staff log onto the training Zoom link and take a short break before participants arrive.',
    },
    {
      title: 'Welcome and overview of the weekend',
      start: t(13, 0),
      end: t(13, 15),
      kind: 'LOGISTICS',
      room: 'Main Room',
      notes: 'Welcome, overview of the weekend, and logistics.',
    },
    { title: 'Heart Meditation', start: t(13, 15), end: t(13, 45), kind: 'MEDITATION', room: 'Main Room' },
    {
      title: 'Homegroups',
      start: t(13, 45),
      end: t(14, 15),
      kind: 'BREAKOUT',
      room: 'Breakout',
      breakoutNotes: 'Homegroups (4s)',
      notes:
        'Each person talks about their intentions for the training, what is most important to know about them, and any fears they have.',
    },
    {
      title: 'Large group — therapeutic superpower',
      start: t(14, 15),
      end: t(14, 20),
      kind: 'SHARING',
      room: 'Main Room',
    },
    { title: 'Logistics', start: t(14, 20), end: t(14, 30), kind: 'LOGISTICS', room: 'Main Room' },
    {
      title: 'Mindfulness',
      start: t(14, 30),
      end: t(14, 40),
      kind: 'MEDITATION',
      room: 'Main Room',
      breakoutNotes: 'Main, then groups of two',
    },
    { title: 'Break', start: t(14, 40), end: t(14, 55), kind: 'BREAK', room: 'N/A' },
    {
      title: 'Organicity',
      start: t(14, 55),
      end: t(15, 10),
      kind: 'TALK',
      room: 'Main Room',
      facilitator: 'Tara?',
      breakoutNotes: 'Main, then dyads',
    },
    {
      title: 'Body–mind holism',
      start: t(15, 10),
      end: t(15, 30),
      kind: 'EXERCISE',
      room: 'Main Room',
      facilitator: 'Rob',
      notes:
        'Exercises like jaw forward, shoulder burdened, slow breathing. Prompts: I am unsafe. It’s all my fault. I am loved for who I am.',
    },
    { title: 'Non-violence discussion', start: t(15, 30), end: t(15, 45), kind: 'TALK', room: 'Main Room' },
    {
      title: 'Unity',
      start: t(15, 45),
      end: t(16, 0),
      kind: 'EXERCISE',
      room: 'Main Room',
      facilitator: 'Rob',
      notes: 'Imagine a table with all your parts and how they get along. Write dialogue.',
    },
    { title: 'Break', start: t(16, 0), end: t(16, 15), kind: 'BREAK', room: 'N/A' },
    {
      title: 'Talk: Being a therapist, client, and observer',
      start: t(16, 15),
      end: t(16, 25),
      kind: 'TALK',
      room: 'Main Room',
    },
    {
      title: 'Talk and exercise: Barriers of the Heart',
      start: t(16, 25),
      end: t(17, 0),
      kind: 'EXERCISE',
      room: 'Main Room',
    },
    { title: 'Sharing on Perfect Therapist', start: t(17, 0), end: t(17, 15), kind: 'SHARING', room: 'Main Room' },
    { title: 'Poem: Kindness', start: t(17, 25), end: t(17, 30), kind: 'CLOSING', room: 'Main Room' },
    {
      title: 'Staff check-in',
      start: t(17, 30),
      end: t(18, 0),
      kind: 'STAFF',
      room: 'Staff / Green Room',
      notes: 'Stay logged into the Zoom link and move to the staff room.',
    },
  ];

  const saturday: SeedAct[] = [
    {
      title: 'Meditation on finding an ally or Heart Lotus',
      start: t(9, 0),
      end: t(9, 30),
      kind: 'MEDITATION',
      room: 'Main Room',
    },
    {
      title: 'Talk about upsets',
      start: t(9, 30),
      end: t(9, 45),
      kind: 'TALK',
      room: 'Main Room',
      facilitator: 'Tara',
      notes:
        'If germane, add in a principle or two that might be useful with upsets. Tara reads a poem and talks about how to get support to process ruptures and upsets. How accountability looks and how to be in the principles with it. How to attend and be aware of the dynamics of social location in upsets.',
    },
    {
      title: 'Exercise: How do you organize around upsets',
      start: t(9, 45),
      end: t(10, 0),
      kind: 'EXERCISE',
      room: 'Main Room',
      facilitator: 'Rob',
    },
    {
      title: 'Share with partner',
      start: t(10, 0),
      end: t(10, 30),
      kind: 'BREAKOUT',
      room: 'Breakout',
      breakoutNotes: 'Dyads',
    },
    { title: 'Break', start: t(10, 30), end: t(10, 45), kind: 'BREAK', room: 'N/A' },
    {
      title: 'Talk — Review of Tracking',
      start: t(10, 45),
      end: t(11, 0),
      kind: 'TALK',
      room: 'Main Room',
      facilitator: 'Tara',
    },
    {
      title: 'Exercise: name, origin, or a children’s song',
      start: t(11, 0),
      end: t(11, 30),
      kind: 'EXERCISE',
      room: 'Main Room',
      facilitator: 'Tara?',
      notes:
        'A few people say their name and where they are from. Or: Mary had a little lamb, or another culture’s children’s song.',
    },
    {
      title: 'Demo: tracking',
      start: t(11, 30),
      end: t(12, 15),
      kind: 'DEMO',
      room: 'Main Room',
      facilitator: 'Rob',
      notes: 'Karen to annotate in the chat.',
    },
    { title: 'Debrief', start: t(12, 15), end: t(12, 30), kind: 'SHARING', room: 'Main Room' },
    { title: 'Game: I’ve Got the Orange', start: t(12, 30), end: t(12, 45), kind: 'GAME', room: 'Main Room' },
    {
      title: 'Practice sessions — tracking',
      start: t(12, 45),
      end: t(13, 30),
      kind: 'PRACTICE',
      room: 'Breakout',
      breakoutNotes: 'Groups of 4 or 5',
      notes:
        'One person talks for five minutes to the group. Observers write what they track other than content.',
    },
    { title: 'Debrief and Q&A', start: t(13, 30), end: t(13, 45), kind: 'SHARING', room: 'Main Room' },
    {
      title: 'Talk: Organization of Experience',
      start: t(13, 45),
      end: t(14, 0),
      kind: 'TALK',
      room: 'Main Room',
    },
    {
      title: 'Staff meeting if needed',
      start: t(14, 0),
      end: t(14, 30),
      kind: 'STAFF',
      room: 'Staff / Green Room',
      notes: 'This is often the longest debrief meeting — leave time for that.',
    },
  ];

  const sunday: SeedAct[] = [
    {
      title: 'Meditation: Organization of Experience',
      start: t(9, 0),
      end: t(9, 15),
      kind: 'MEDITATION',
      room: 'Main Room',
      notes:
        'Looking at others, noticing sensations, body, attitude, contractions, energy, memories, etc. Or: Just Like Me.',
    },
    {
      title: 'Sharing in dyads',
      start: t(9, 15),
      end: t(9, 25),
      kind: 'BREAKOUT',
      room: 'Breakout',
      breakoutNotes: 'Dyads',
    },
    { title: 'Form practice groups', start: t(9, 25), end: t(9, 30), kind: 'LOGISTICS', room: 'Main Room' },
    { title: 'Review of contact', start: t(9, 30), end: t(9, 45), kind: 'TALK', room: 'Main Room' },
    {
      title: 'Demo of contact',
      start: t(9, 45),
      end: t(10, 30),
      kind: 'DEMO',
      room: 'Main Room',
      notes: 'Karen to annotate in chat.',
    },
    { title: 'Break', start: t(10, 30), end: t(10, 45), kind: 'BREAK', room: 'N/A' },
    {
      title: 'Practice',
      start: t(10, 45),
      end: t(12, 0),
      kind: 'PRACTICE',
      room: 'Breakout',
      breakoutNotes: 'Groups of three plus assistant',
      notes:
        'Client talks about a real life issue. The observer writes down potential contact statements. Therapist makes contact with non-content elements. Assistant helps refine and stay away from content.',
    },
    { title: 'Debriefing', start: t(12, 0), end: t(12, 15), kind: 'SHARING', room: 'Main Room' },
    { title: 'Q&A', start: t(12, 15), end: t(12, 30), kind: 'TALK', room: 'Main Room' },
    {
      title: 'Homegroups',
      start: t(12, 30),
      end: t(12, 50),
      kind: 'BREAKOUT',
      room: 'Breakout',
      breakoutNotes: 'Same homegroups as Friday',
      notes:
        'Participants talk about what they need to feel complete, what was difficult, and what inspired them.',
    },
    {
      title: 'Closing remarks / preview next month',
      start: t(12, 50),
      end: t(13, 0),
      kind: 'CLOSING',
      room: 'Main Room',
      notes:
        'Name the upcoming trainer. Remind students of the online learning platform and keeping up.',
    },
    {
      title: 'Staff debrief',
      start: t(13, 0),
      end: t(13, 30),
      kind: 'STAFF',
      room: 'Staff / Green Room',
    },
  ];

  return {
    version: 1,
    title: 'Zoom Weekend #1',
    timezone: 'America/Los_Angeles',
    weekendNumber: 1,
    startDate: '2026-09-18',
    endDate: '2026-09-20',
    days: [
      {
        id: 'day-fri',
        date: '2026-09-18',
        weekday: 'Friday',
        startMinutes: t(11, 30),
        endMinutes: t(18, 0),
        activities: friday.map((a, i) => act(a, i, 'fri')),
      },
      {
        id: 'day-sat',
        date: '2026-09-19',
        weekday: 'Saturday',
        startMinutes: t(9, 0),
        endMinutes: t(14, 30),
        activities: saturday.map((a, i) => act(a, i, 'sat')),
      },
      {
        id: 'day-sun',
        date: '2026-09-20',
        weekday: 'Sunday',
        startMinutes: t(9, 0),
        endMinutes: t(13, 30),
        activities: sunday.map((a, i) => act(a, i, 'sun')),
      },
    ],
  };
}

export function createBlankWeekendDocument(): ScheduleDocument {
  return createEmptyDocument({ title: 'New training weekend' });
}
