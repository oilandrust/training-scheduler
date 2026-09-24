import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GroqService } from './groq.service';
import { OpenRouterService } from './openrouter.service';
import type { ExtractedSchedule } from './schedule-extract.schema';

@Injectable()
export class LlmExtractService {
  constructor(
    private readonly config: ConfigService,
    private readonly groq: GroqService,
    private readonly openrouter: OpenRouterService,
  ) {}

  extractSchedule(sourceText: string): Promise<ExtractedSchedule> {
    const provider = (this.config.get<string>('LLM_PROVIDER') || 'openrouter').toLowerCase();
    if (provider === 'groq') {
      return this.groq.extractSchedule(sourceText);
    }
    return this.openrouter.extractSchedule(sourceText);
  }
}
