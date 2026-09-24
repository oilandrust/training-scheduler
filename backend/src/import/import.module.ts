import { Module } from '@nestjs/common';
import { GroqService } from './groq.service';
import { ImportController } from './import.controller';
import { ImportService } from './import.service';
import { LlmExtractService } from './llm-extract.service';
import { OpenRouterService } from './openrouter.service';

@Module({
  controllers: [ImportController],
  providers: [ImportService, LlmExtractService, GroqService, OpenRouterService],
})
export class ImportModule {}
