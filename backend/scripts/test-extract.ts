#!/usr/bin/env tsx
/**
 * LLM extraction test bench.
 *
 * Sends the Hakomi weekend PDF through Groq or OpenRouter, checks that the
 * response is valid JSON/schema, then scores it against the seed schedule.
 *
 * Usage:
 *   npm run test:extract --prefix backend -- --preset groq
 *   npm run test:extract --prefix backend -- --preset openrouter
 *   npm run test:extract --prefix backend -- --list
 *   npm run test:extract --prefix backend -- --model qwen/qwen3.8-27b
 *   npm run test:extract --prefix backend -- --provider openrouter --model openai/gpt-4.1-mini
 *   npm run test:extract --prefix backend -- --save tmp/last-extract.json --threshold 0.7
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { config as loadEnv } from 'dotenv';
import pdfParse from 'pdf-parse';
import {
  EXTRACT_SYSTEM_PROMPT,
  extractUserPrompt,
  parseExtractedSchedule,
} from '../src/import/extract-prompt';
import {
  extractedScheduleSchema,
  type ExtractedSchedule,
} from '../src/import/schedule-extract.schema';

loadEnv({ path: join(__dirname, '..', '.env') });

const MODELS_FILE = resolve(__dirname, 'extract-models.txt');

type Provider = 'groq' | 'openrouter';

type Run = { provider: Provider; model: string };

type Args = {
  runs: Run[];
  pdf: string;
  expected: string;
  save?: string;
  threshold: number;
  timeTolerance: number;
  help?: boolean;
  list?: boolean;
};

function loadPreset(name: string): Run[] {
  if (!existsSync(MODELS_FILE)) throw new Error(`Models file not found: ${MODELS_FILE}`);
  const text = readFileSync(MODELS_FILE, 'utf8');
  const sections: Record<string, string[]> = { groq: [], openrouter: [] };
  let current: Provider | null = null;
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const section = line.match(/^\[(groq|openrouter)\]$/i);
    if (section) {
      current = section[1].toLowerCase() as Provider;
      continue;
    }
    if (current) sections[current].push(line);
  }

  const runs: Run[] = [];
  if (name === 'groq' || name === 'all') {
    for (const model of sections.groq) runs.push({ provider: 'groq', model });
  }
  if (name === 'openrouter' || name === 'all') {
    for (const model of sections.openrouter) runs.push({ provider: 'openrouter', model });
  }
  if (!runs.length) throw new Error(`Unknown or empty preset "${name}" (use groq|openrouter|all)`);
  return runs;
}

function parseArgs(argv: string[]): Args {
  const defaultProvider = ((process.env.LLM_PROVIDER as Provider) || 'openrouter') as Provider;
  let provider = defaultProvider;
  let models: string[] = [];
  let preset: string | undefined;
  const args: Args = {
    runs: [],
    pdf: resolve(
      __dirname,
      '../../Lesson plan for zoom weekend #1 professional training 2026-2027.pdf',
    ),
    expected: resolve(__dirname, '../src/import/fixtures/hakomi-weekend-1.expected.json'),
    threshold: 0.75,
    timeTolerance: 5,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const next = argv[i + 1];
    if (arg === '--help' || arg === '-h') args.help = true;
    else if (arg === '--list') args.list = true;
    else if (arg === '--provider' && next) {
      provider = next as Provider;
      i++;
    } else if (arg === '--preset' && next) {
      preset = next;
      i++;
    } else if (arg === '--model' && next) {
      models = [next];
      i++;
    } else if (arg === '--models' && next) {
      models = next.split(',').map((m) => m.trim()).filter(Boolean);
      i++;
    } else if (arg === '--pdf' && next) {
      args.pdf = resolve(next);
      i++;
    } else if (arg === '--expected' && next) {
      args.expected = resolve(next);
      i++;
    } else if (arg === '--save' && next) {
      args.save = resolve(next);
      i++;
    } else if (arg === '--threshold' && next) {
      args.threshold = Number(next);
      i++;
    } else if (arg === '--time-tolerance' && next) {
      args.timeTolerance = Number(next);
      i++;
    }
  }

  if (preset) {
    args.runs = loadPreset(preset);
  } else if (models.length) {
    args.runs = models.map((model) => ({ provider, model }));
  } else if (args.list || args.help) {
    args.runs = [];
  } else {
    const model =
      provider === 'openrouter'
        ? process.env.OPENROUTER_MODEL || 'google/gemini-2.5-flash-lite'
        : process.env.GROQ_MODEL || 'openai/gpt-oss-120b';
    args.runs = [{ provider, model }];
  }

  return args;
}

function printHelp() {
  console.log(`LLM extraction test bench

Options:
  --provider groq|openrouter   Provider for --model/--models (default: env LLM_PROVIDER or groq)
  --preset groq|openrouter|all Run curated list from scripts/extract-models.txt
  --list                       Print curated model lists and exit
  --model <id>                 Single model id
  --models a,b,c               Compare several models (same provider)
  --pdf <path>                 Source PDF
  --expected <path>            Golden ExtractedSchedule JSON (seed schedule)
  --save <path>                Write extraction JSON here (one file per model if many)
  --threshold <0-1>            Pass bar for activity recall (default 0.75)
  --time-tolerance <minutes>   Start/end match window (default 5)

Examples:
  npm run test:extract -- --preset groq
  npm run test:extract -- --preset openrouter --threshold 0.6
  npm run test:extract -- --list
`);
}

function printModelList() {
  const text = readFileSync(MODELS_FILE, 'utf8');
  console.log(text.trimEnd());
}

function normalizeTitle(title: string) {
  return title
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function titleSimilarity(a: string, b: string) {
  const left = normalizeTitle(a);
  const right = normalizeTitle(b);
  if (!left || !right) return 0;
  if (left === right) return 1;
  if (left.includes(right) || right.includes(left)) return 0.85;
  const leftTokens = new Set(left.split(' ').filter((t) => t.length > 2));
  const rightTokens = new Set(right.split(' ').filter((t) => t.length > 2));
  if (!leftTokens.size || !rightTokens.size) return 0;
  let overlap = 0;
  for (const token of leftTokens) if (rightTokens.has(token)) overlap++;
  return overlap / Math.max(leftTokens.size, rightTokens.size);
}

function formatTime(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

async function callProvider(
  provider: Provider,
  model: string,
  sourceText: string,
  jsonMode = true,
): Promise<{ raw: string; parsed: ExtractedSchedule; ms: number }> {
  const started = Date.now();
  const messages = [
    { role: 'system', content: EXTRACT_SYSTEM_PROMPT },
    { role: 'user', content: extractUserPrompt(sourceText) },
  ];

  const requestBody: Record<string, unknown> = {
    model,
    temperature: 0.1,
    messages,
  };
  if (jsonMode) requestBody.response_format = { type: 'json_object' };

  let content: string | undefined;

  if (provider === 'groq') {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) throw new Error('GROQ_API_KEY is not set in backend/.env');
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });
    const body = await response.text();
    if (!response.ok) {
      if (jsonMode && body.includes('json_validate_failed')) {
        console.warn(`  json_object mode failed for ${model}; retrying without it…`);
        return callProvider(provider, model, sourceText, false);
      }
      throw new Error(`Groq ${response.status}: ${body}`);
    }
    content = (JSON.parse(body) as { choices?: { message?: { content?: string } }[] }).choices?.[0]
      ?.message?.content;
  } else {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) throw new Error('OPENROUTER_API_KEY is not set in backend/.env');
    const origin = process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173';
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': origin,
        'X-Title': 'Training Scheduler extract bench',
      },
      body: JSON.stringify(requestBody),
    });
    const body = await response.text();
    if (!response.ok) {
      if (jsonMode && /json/i.test(body)) {
        console.warn(`  json_object mode failed for ${model}; retrying without it…`);
        return callProvider(provider, model, sourceText, false);
      }
      throw new Error(`OpenRouter ${response.status}: ${body}`);
    }
    content = (JSON.parse(body) as { choices?: { message?: { content?: string } }[] }).choices?.[0]
      ?.message?.content;
  }

  const ms = Date.now() - started;
  if (!content) throw new Error('Empty model response');
  try {
    const parsed = parseExtractedSchedule(content, provider);
    return { raw: content, parsed, ms };
  } catch (err) {
    const preview = content.slice(0, 400).replace(/\s+/g, ' ');
    throw new Error(
      `${err instanceof Error ? err.message : err}\n--- raw preview ---\n${preview}\n---`,
    );
  }
}

type MatchReport = {
  expectedCount: number;
  gotCount: number;
  matched: number;
  kindMatches: number;
  missing: { day: string; title: string; startMinutes: number; endMinutes: number }[];
  extras: { day: string; title: string; startMinutes: number; endMinutes: number }[];
  kindMisses: { expected: string; got: string; title: string }[];
  meta: { field: string; expected: string; got: string }[];
  dayCountOk: boolean;
  recall: number;
  kindAccuracy: number;
};

function alignDays(expected: ExtractedSchedule['days'], got: ExtractedSchedule['days']) {
  const pairs: { exp: (typeof expected)[number] | null; got: (typeof got)[number] | null; label: string }[] =
    [];
  const usedGot = new Set<number>();

  for (const exp of expected) {
    const dateKey = exp.date.slice(0, 10);
    let idx = got.findIndex((d, i) => !usedGot.has(i) && d.date.slice(0, 10) === dateKey);
    if (idx < 0 && exp.weekday) {
      const weekday = exp.weekday.toLowerCase();
      idx = got.findIndex(
        (d, i) => !usedGot.has(i) && (d.weekday ?? '').toLowerCase() === weekday,
      );
    }
    if (idx < 0) {
      pairs.push({ exp, got: null, label: dateKey });
      continue;
    }
    usedGot.add(idx);
    pairs.push({ exp, got: got[idx], label: dateKey });
  }

  for (let i = 0; i < got.length; i++) {
    if (usedGot.has(i)) continue;
    pairs.push({ exp: null, got: got[i], label: got[i].date.slice(0, 10) });
  }

  // If date/weekday matching left many orphans but counts match, pair by order.
  const unmatchedExp = pairs.filter((p) => p.exp && !p.got).length;
  const unmatchedGot = pairs.filter((p) => !p.exp && p.got).length;
  if (unmatchedExp && unmatchedExp === unmatchedGot && expected.length === got.length) {
    return expected.map((exp, i) => ({
      exp,
      got: got[i],
      label: exp.date.slice(0, 10),
    }));
  }

  return pairs;
}

function compareSchedules(
  expected: ExtractedSchedule,
  got: ExtractedSchedule,
  timeTolerance: number,
): MatchReport {
  const meta: MatchReport['meta'] = [];
  const check = (field: string, a: string | number | null | undefined, b: string | number | null | undefined) => {
    const left = String(a ?? '');
    const right = String(b ?? '');
    if (left !== right) meta.push({ field, expected: left, got: right });
  };
  check('trainingName', expected.trainingName, got.trainingName);
  check('title', expected.title, got.title);
  check('weekendNumber', expected.weekendNumber, got.weekendNumber);
  check('timezone', expected.timezone, got.timezone);
  check('startDate', expected.startDate.slice(0, 10), got.startDate.slice(0, 10));
  check('endDate', expected.endDate.slice(0, 10), got.endDate.slice(0, 10));

  const missing: MatchReport['missing'] = [];
  const extras: MatchReport['extras'] = [];
  const kindMisses: MatchReport['kindMisses'] = [];
  let matched = 0;
  let kindMatches = 0;
  let expectedCount = 0;
  let gotCount = 0;

  for (const pair of alignDays(expected.days, got.days)) {
    const expActs = [...(pair.exp?.activities ?? [])];
    const gotActs = [...(pair.got?.activities ?? [])];
    expectedCount += expActs.length;
    gotCount += gotActs.length;
    const label = pair.label;

    const used = new Set<number>();
    for (const exp of expActs) {
      let bestIdx = -1;
      let bestScore = 0;
      for (let i = 0; i < gotActs.length; i++) {
        if (used.has(i)) continue;
        const cand = gotActs[i];
        const startDelta = Math.abs(cand.startMinutes - exp.startMinutes);
        const endDelta = Math.abs(cand.endMinutes - exp.endMinutes);
        if (startDelta > timeTolerance || endDelta > timeTolerance) continue;
        const score = titleSimilarity(exp.title, cand.title);
        if (score > bestScore) {
          bestScore = score;
          bestIdx = i;
        }
      }
      // Fallback: title-only match within the day if times drifted a lot
      if (bestIdx < 0) {
        for (let i = 0; i < gotActs.length; i++) {
          if (used.has(i)) continue;
          const score = titleSimilarity(exp.title, gotActs[i].title);
          if (score >= 0.7 && score > bestScore) {
            bestScore = score;
            bestIdx = i;
          }
        }
      }
      if (bestIdx >= 0 && bestScore >= 0.45) {
        used.add(bestIdx);
        matched++;
        const gotAct = gotActs[bestIdx];
        if ((gotAct.kind ?? 'OTHER') === (exp.kind ?? 'OTHER')) kindMatches++;
        else {
          kindMisses.push({
            expected: String(exp.kind ?? 'OTHER'),
            got: String(gotAct.kind ?? 'OTHER'),
            title: exp.title,
          });
        }
      } else {
        missing.push({
          day: label,
          title: exp.title,
          startMinutes: exp.startMinutes,
          endMinutes: exp.endMinutes,
        });
      }
    }

    for (let i = 0; i < gotActs.length; i++) {
      if (used.has(i)) continue;
      const act = gotActs[i];
      extras.push({
        day: label,
        title: act.title,
        startMinutes: act.startMinutes,
        endMinutes: act.endMinutes,
      });
    }
  }

  return {
    expectedCount,
    gotCount,
    matched,
    kindMatches,
    missing,
    extras,
    kindMisses,
    meta,
    dayCountOk: expected.days.length === got.days.length,
    recall: expectedCount === 0 ? 0 : matched / expectedCount,
    kindAccuracy: matched === 0 ? 0 : kindMatches / matched,
  };
}

function printReport(
  label: string,
  report: MatchReport,
  ms: number,
  threshold: number,
) {
  const pass = report.dayCountOk && report.recall >= threshold;
  console.log(`\n=== ${label} (${ms}ms) ${pass ? 'PASS' : 'FAIL'} ===`);
  console.log(
    `days: expected ${report.dayCountOk ? 'ok' : 'mismatch'} | activities: ${report.matched}/${report.expectedCount} matched (recall ${(report.recall * 100).toFixed(1)}%) | got ${report.gotCount} | kind accuracy ${(report.kindAccuracy * 100).toFixed(1)}%`,
  );
  if (report.meta.length) {
    console.log('meta diffs:');
    for (const row of report.meta) {
      console.log(`  - ${row.field}: expected "${row.expected}" got "${row.got}"`);
    }
  }
  if (report.missing.length) {
    console.log(`missing (${report.missing.length}):`);
    for (const row of report.missing.slice(0, 12)) {
      console.log(
        `  - ${row.day} ${formatTime(row.startMinutes)}-${formatTime(row.endMinutes)} ${row.title}`,
      );
    }
    if (report.missing.length > 12) console.log(`  … +${report.missing.length - 12} more`);
  }
  if (report.extras.length) {
    console.log(`extras (${report.extras.length}):`);
    for (const row of report.extras.slice(0, 8)) {
      console.log(
        `  - ${row.day} ${formatTime(row.startMinutes)}-${formatTime(row.endMinutes)} ${row.title}`,
      );
    }
    if (report.extras.length > 8) console.log(`  … +${report.extras.length - 8} more`);
  }
  if (report.kindMisses.length) {
    console.log(`kind misses (${report.kindMisses.length}):`);
    for (const row of report.kindMisses.slice(0, 8)) {
      console.log(`  - ${row.title}: ${row.expected} → ${row.got}`);
    }
  }
  return pass;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }
  if (args.list) {
    printModelList();
    return;
  }

  if (!existsSync(args.pdf)) throw new Error(`PDF not found: ${args.pdf}`);
  if (!existsSync(args.expected)) throw new Error(`Expected fixture not found: ${args.expected}`);

  const expectedJson = JSON.parse(readFileSync(args.expected, 'utf8'));
  const expectedParsed = extractedScheduleSchema.safeParse(expectedJson);
  if (!expectedParsed.success) {
    throw new Error(`Expected fixture failed schema: ${expectedParsed.error.message}`);
  }
  const expected = expectedParsed.data;

  console.log(`PDF: ${args.pdf}`);
  console.log(
    `Expected: ${args.expected} (${expected.days.reduce((n, d) => n + d.activities.length, 0)} activities)`,
  );
  console.log(
    `Runs: ${args.runs.map((r) => `${r.provider}/${r.model}`).join(', ')}`,
  );
  console.log(`Threshold: ${(args.threshold * 100).toFixed(0)}% recall`);

  const pdfBuffer = readFileSync(args.pdf);
  const pdf = await pdfParse(pdfBuffer);
  const text = pdf.text?.trim();
  if (!text) throw new Error('Could not extract text from PDF');
  console.log(`Extracted ${text.length} chars of PDF text`);

  let failed = 0;
  for (const run of args.runs) {
    const label = `${run.provider}:${run.model}`;
    try {
      const { raw, parsed, ms } = await callProvider(run.provider, run.model, text);
      const recheck = extractedScheduleSchema.safeParse(parsed);
      if (!recheck.success) throw new Error(`Schema validation failed: ${recheck.error.message}`);

      if (args.save) {
        mkdirSync(dirname(args.save), { recursive: true });
        const outPath =
          args.runs.length > 1
            ? args.save.replace(
                /(\.json)?$/,
                `-${run.provider}-${run.model.replace(/[^\w.-]+/g, '_')}.json`,
              )
            : args.save;
        writeFileSync(outPath, JSON.stringify(parsed, null, 2));
        console.log(`Wrote ${outPath}`);
        writeFileSync(outPath.replace(/\.json$/, '.raw.txt'), raw);
      }

      const report = compareSchedules(expected, parsed, args.timeTolerance);
      const pass = printReport(label, report, ms, args.threshold);
      if (!pass) failed++;
    } catch (err) {
      failed++;
      console.error(`\n=== ${label} ERROR ===`);
      console.error(err instanceof Error ? err.message : err);
    }
  }

  if (failed > 0) {
    console.error(`\n${failed}/${args.runs.length} model run(s) failed`);
    process.exit(1);
  }
  console.log(`\nAll ${args.runs.length} model run(s) passed`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
