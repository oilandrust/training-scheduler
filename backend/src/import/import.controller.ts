import {
  Body,
  Controller,
  Get,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { IsString, MinLength } from 'class-validator';
import { memoryStorage } from 'multer';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthedUser } from '../auth/auth.types';
import { ImportService } from './import.service';

class DriveImportDto {
  @IsString()
  @MinLength(1)
  fileId!: string;
}

@Controller('import')
export class ImportController {
  constructor(private readonly imports: ImportService) {}

  @Post('pdf')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 15 * 1024 * 1024 },
    }),
  )
  importPdf(@CurrentUser() user: AuthedUser, @UploadedFile() file: Express.Multer.File) {
    return this.imports.importPdf(user.id, file);
  }

  @Get('drive/files')
  listDrive(@CurrentUser() user: AuthedUser) {
    return this.imports.listDriveDocs(user.id);
  }

  @Post('drive')
  importDrive(@CurrentUser() user: AuthedUser, @Body() dto: DriveImportDto) {
    return this.imports.importDrive(user.id, dto.fileId);
  }
}
