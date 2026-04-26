import { Controller, Get, Param, Sse, MessageEvent } from '@nestjs/common';
import { ProgressService } from './progress.service';
import { Observable, map } from 'rxjs';

@Controller('api/progress')
export class ProgressController {
  constructor(private readonly progressService: ProgressService) {}

  @Sse(':jobId/stream')
  stream(@Param('jobId') jobId: string): Observable<MessageEvent> {
    return this.progressService.getObservable(jobId).pipe(
      map((event) => ({
        data: event,
      })),
    );
  }
}
