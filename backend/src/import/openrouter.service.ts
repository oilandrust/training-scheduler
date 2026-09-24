import { BadGatewayException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EXTRACT_SYSTEM_PROMPT, extractUserPrompt, parseExtractedSchedule } from './extract-prompt';
import type { ExtractedSchedule } from './schedule-extract.schema';

@Injectable()
export class OpenRouterService {
  constructor(private readonly config: ConfigService) {}

  async extractSchedule(sourceText: string): Promise<ExtractedSchedule> {
    const apiKey = this.config.get<string>('OPENROUTER_API_KEY');
    if (!apiKey) {
      throw new BadGatewayException('OPENROUTER_API_KEY is not configured');
    }
    const model = this.config.get<string>('OPENROUTER_MODEL') || 'google/gemini-2.5-flash-lite';
    const origin = this.config.get<string>('FRONTEND_ORIGIN') ?? 'https://training-scheduler.lefolio.fr';

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': origin,
        'X-Title': 'Training Scheduler',
      },
      body: JSON.stringify({
        model,
        temperature: 0.1,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: EXTRACT_SYSTEM_PROMPT },
          { role: 'user', content: extractUserPrompt(sourceText) },
        ],
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new BadGatewayException(`OpenRouter error: ${body || response.status}`);
    }

    const payload = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    return parseExtractedSchedule(payload.choices?.[0]?.message?.content, 'OpenRouter');
  }
}
