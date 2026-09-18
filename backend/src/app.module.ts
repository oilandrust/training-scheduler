import { existsSync } from 'fs';
import { join } from 'path';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { PrismaModule } from './prisma/prisma.module';
import { WeekendsModule } from './weekends/weekends.module';
import { DaysModule } from './days/days.module';
import { ActivitiesModule } from './activities/activities.module';
import { HealthController } from './health.controller';

const publicPath = join(__dirname, '..', 'public');
const staticImports = existsSync(join(publicPath, 'index.html'))
  ? [
      ServeStaticModule.forRoot({
        rootPath: publicPath,
        exclude: ['/api/(.*)'],
      }),
    ]
  : [];

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ...staticImports,
    PrismaModule,
    WeekendsModule,
    DaysModule,
    ActivitiesModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
