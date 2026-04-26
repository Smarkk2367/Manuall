import { Injectable } from '@nestjs/common';
import { ProgressService } from '../progress/progress.service';

@Injectable()
export class StepService {
  constructor(private readonly progressService: ProgressService) { }

  processStepFile(jobId: string, file: Express.Multer.File) {
    //Simulating progress for now
    this.progressService.updateProgress({
      jobId,
      percentage: 10,
      stage: 'init',
      message: 'Starting processing...',
    });

    //TODO: Pyhton script
    setTimeout(() => {
      this.progressService.updateProgress({
        jobId,
        percentage: 100,
        stage: 'done',
        message: 'Processing finished',
      });
      this.progressService.completeProgress(jobId);
    }, 2000);
  }
}
