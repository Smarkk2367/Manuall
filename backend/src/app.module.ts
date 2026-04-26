import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { StepModule } from './step/step.module';
import { ProgressModule } from './progress/progress.module';

@Module({
  imports: [StepModule, ProgressModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
