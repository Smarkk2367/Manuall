import { Injectable } from '@nestjs/common';
import { Subject, Observable } from 'rxjs';

export interface ProgressEvent {
  jobId: string;
  percentage: number;
  stage: string;
  message: string;
  error?: string;
  data?: any;
}

@Injectable()
export class ProgressService {
  private progressSubjects = new Map<string, Subject<ProgressEvent>>();

  getOrCreateSubject(jobId: string): Subject<ProgressEvent> {
    if (!this.progressSubjects.has(jobId)) {
      this.progressSubjects.set(jobId, new Subject<ProgressEvent>());
    }
    return this.progressSubjects.get(jobId)!;
  }

  getObservable(jobId: string): Observable<ProgressEvent> {
    return this.getOrCreateSubject(jobId).asObservable();
  }

  updateProgress(event: ProgressEvent) {
    const subject = this.getOrCreateSubject(event.jobId);
    subject.next(event);
  }

  completeProgress(jobId: string) {
    const subject = this.progressSubjects.get(jobId);
    if (subject) {
      subject.complete();
      this.progressSubjects.delete(jobId);
    }
  }

  errorProgress(jobId: string, error: string) {
    const subject = this.getOrCreateSubject(jobId);
    subject.next({
      jobId,
      percentage: 0,
      stage: 'error',
      message: error,
      error,
    });
    subject.error(new Error(error));
    this.progressSubjects.delete(jobId);
  }
}
