import { BadGatewayException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EXTRACT_SYSTEM_PROMPT, extractUserPrompt, parseExtractedSchedule } from './extract-prompt';
import type { ExtractedSchedule } from './schedule-extract.schema';

@Injectable()
export class GroqService {
  constructor(private readonly config: ConfigService) {}

  async extractSchedule(sourceText: string): Promise<ExtractedSchedule> {
    const apiKey = this.config.get<string>('GROQ_API_KEY');
    if (!apiKey) {
      throw new BadGatewayException('GROQ_API_KEY is not configured');
    }
    const model = this.config.get<string>('GROQ_MODEL') || 'openai/gpt-oss-120b';
    return this.chat(apiKey, model, sourceText, true);
  }

  private async chat(
    apiKey: string,
    model: string,
    sourceText: string,
    jsonMode: boolean,
  ): Promise<ExtractedSchedule> {
    const body: Record<string, unknown> = {
      model,
      temperature: 0.1,
      messages: [
        { role: 'system', content: EXTRACT_SYSTEM_PROMPT },
        { role: 'user', content: extractUserPrompt(sourceText) },
      ],
    };
    if (jsonMode) body.response_format = { type: 'json_object' };

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errBody = await response.text();
      if (jsonMode && errBody.includes('json_validate_failed')) {
        return this.chat(apiKey, model, sourceText, false);
      }
      throw new BadGatewayException(`Groq error: ${errBody || response.status}`);
    }

    const payload = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    return parseExtractedSchedule(payload.choices?.[0]?.message?.content, 'Groq');
  }
}
