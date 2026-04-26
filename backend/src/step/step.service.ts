import { Injectable, Logger } from '@nestjs/common';
import { ProgressService } from '../progress/progress.service';
import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class StepService {
  private readonly logger = new Logger(StepService.name);

  constructor(private readonly progressService: ProgressService) { }

  processStepFile(jobId: string, file: Express.Multer.File) {
    this.progressService.updateProgress({
      jobId,
      percentage: 0,
      stage: 'init',
      message: 'Starting Python CAD processor...',
    });

    //Resolve paths
    const backendDir = process.cwd();
    const scriptPath = path.join(backendDir, '../cad/tessellate.py');
    const filePath = path.join(backendDir, file.path); //file.path is 'uploads\filename'

    //Check if python is available
    const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';

    const child = spawn(pythonCmd, [scriptPath, filePath]);

    child.stdout.on('data', (data) => {
      const output = data.toString();
      const lines = output.split('\n');

      for (const line of lines) {
        if (line.startsWith('PROGRESS:')) {
          const parts = line.split(':');
          if (parts.length >= 3) {
            const percentage = parseInt(parts[1], 10);
            const message = parts.slice(2).join(':').trim();

            this.progressService.updateProgress({
              jobId,
              percentage,
              stage: 'processing',
              message,
            });
          }
        } else if (line.trim()) {
          this.logger.debug(`[CAD] ${line.trim()}`);
        }
      }
    });

    child.stderr.on('data', (data) => {
      this.logger.error(`[CAD Error] ${data.toString()}`);
    });

    child.on('close', (code) => {
      if (code === 0) {
        this.progressService.updateProgress({
          jobId,
          percentage: 100,
          stage: 'done',
          message: 'Processing finished successfully.',
        });
        this.progressService.completeProgress(jobId);
      } else {
        this.progressService.errorProgress(jobId, `CAD process exited with code ${code}`);
      }
    });
  }
}
