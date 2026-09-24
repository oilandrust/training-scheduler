import { existsSync } from 'fs';
import { join } from 'path';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { WeekendsModule } from './weekends/weekends.module';
import { DaysModule } from './days/days.module';
import { ActivitiesModule } from './activities/activities.module';
import { SchedulesModule } from './schedules/schedules.module';
import { ShareModule } from './share/share.module';
import { ImportModule } from './import/import.module';
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
    AuthModule,
    WeekendsModule,
    DaysModule,
    ActivitiesModule,
    SchedulesModule,
    ShareModule,
    ImportModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
