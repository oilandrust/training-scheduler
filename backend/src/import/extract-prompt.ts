import { BadGatewayException } from '@nestjs/common';
import { ACTIVITY_KINDS, extractedScheduleSchema, type ExtractedSchedule } from './schedule-extract.schema';

export const EXTRACT_SYSTEM_PROMPT = `You convert psychotherapy training weekend lesson plans into a structured JSON schedule.

Return ONLY a JSON object with this shape:
{
  "trainingName": string,
  "title": string,
  "weekendNumber": number,
  "timezone": IANA timezone string (default America/Los_Angeles if the source is PDT/PST),
  "startDate": "YYYY-MM-DD",
  "endDate": "YYYY-MM-DD",
  "zoomTopic": string | null,
  "zoomMeetingId": string | null,
  "zoomPasscode": string | null,
  "days": [
    {
      "date": "YYYY-MM-DD",
      "weekday": "Friday",
      "startMinutes": 0-1440 minutes from midnight,
      "endMinutes": 0-1440,
      "activities": [
        {
          "title": string,
          "startMinutes": number,
          "endMinutes": number,
          "kind": one of ${ACTIVITY_KINDS.join(', ')},
          "room": string | null,
          "facilitator": string | null,
          "breakoutNotes": string | null,
          "notes": string | null
        }
      ]
    }
  ]
}

Rules:
- Times are wall-clock minutes from midnight in the training timezone (9:30 AM = 570, 1:15 PM = 795).
- Infer kind from the title: Staff/green room → STAFF, logistics/welcome → LOGISTICS, meditation → MEDITATION, talk/lecture → TALK, exercise → EXERCISE, homegroup/dyad/breakout → BREAKOUT, break/lunch → BREAK, demo → DEMO, practice → PRACTICE, game → GAME, sharing → SHARING, closing → CLOSING, else OTHER.
- Keep every timed block. Use notes for extra description from the source.
- startMinutes of a day is the first activity start; endMinutes is the last activity end.
- If a year is missing, use 2026.`;

export function extractUserPrompt(sourceText: string) {
  return `Extract the weekend schedule from this document:\n\n${sourceText.slice(0, 80_000)}`;
}

export function parseExtractedSchedule(content: string | undefined, provider: string): ExtractedSchedule {
  if (!content) throw new BadGatewayException(`${provider} returned an empty response`);

  const trimmed = content.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const jsonText = fenced?.[1]?.trim() ?? trimmed;

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new BadGatewayException(`${provider} did not return valid JSON`);
  }

  const result = extractedScheduleSchema.safeParse(parsed);
  if (!result.success) {
    throw new BadGatewayException(`Could not parse schedule: ${result.error.message}`);
  }
  return result.data;
}
