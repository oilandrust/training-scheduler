import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { WeekendsModule } from './weekends/weekends.module';
import { DaysModule } from './days/days.module';
import { ActivitiesModule } from './activities/activities.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    WeekendsModule,
    DaysModule,
    ActivitiesModule,
  ],
})
export class AppModule {}
