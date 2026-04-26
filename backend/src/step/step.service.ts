import { Injectable, Logger } from '@nestjs/common';
import { ProgressService } from '../progress/progress.service';
import { InstructionService } from '../instruction/instruction.service';
import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class StepService {
  private readonly logger = new Logger(StepService.name);

  constructor(
    private readonly progressService: ProgressService,
    private readonly instructionService: InstructionService
  ) { }

  async processStepFile(jobId: string, file: Express.Multer.File) {
    const backendDir = process.cwd();
    const filePath = path.join(backendDir, file.path);
    const partsFile = `${file.filename}_parts.json`;
    const instructionsFile = `${file.filename}_instructions.json`;

    try {
      this.progressService.updateProgress({
        jobId,
        percentage: 0,
        stage: 'tessellation',
        message: 'Starting 3D tessellation...',
      });

      const tessellateScript = path.join(backendDir, '../cad/tessellate.py');
      await this.runPythonScript(tessellateScript, filePath, jobId, 0, 40);

      this.progressService.updateProgress({
        jobId,
        percentage: 40,
        stage: 'hlr',
        message: 'Starting 2D part extraction...',
      });

      const hlrScript = path.join(backendDir, '../cad/hlr.py');
      await this.runPythonScript(hlrScript, filePath, jobId, 40, 40);

      this.progressService.updateProgress({
        jobId,
        percentage: 80,
        stage: 'ai_analysis',
        message: 'Generating AI assembly instructions...',
      });

      const instructions = await this.instructionService.generateInstructions(partsFile);

      const instructionsFilePath = path.join(backendDir, 'uploads', instructionsFile);
      fs.writeFileSync(instructionsFilePath, JSON.stringify(instructions, null, 2));

      this.progressService.updateProgress({
        jobId,
        percentage: 100,
        stage: 'done',
        message: 'All CAD processing finished successfully.',
        data: {
          resultFile: `${file.filename}.json`,
          partsFile: partsFile,
          instructionsFile: instructionsFile
        }
      });
      this.progressService.completeProgress(jobId);

    } catch (error: any) {
      this.logger.error(`Processing failed: ${error.message}`);
      this.progressService.errorProgress(jobId, error.message);
    }
  }

  private runPythonScript(scriptPath: string, filePath: string, jobId: string, baseProgress: number, progressWeight: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
      const child = spawn(pythonCmd, [scriptPath, filePath]);

      child.stdout.on('data', (data) => {
        const output = data.toString();
        const lines = output.split('\n');

        for (const line of lines) {
          if (line.startsWith('PROGRESS:')) {
            const parts = line.split(':');
            if (parts.length >= 3) {
              const scriptPercentage = parseInt(parts[1], 10);
              const message = parts.slice(2).join(':').trim();

              const overallPercentage = Math.round(baseProgress + (scriptPercentage / 100) * progressWeight);

              this.progressService.updateProgress({
                jobId,
                percentage: overallPercentage,
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
          resolve();
        } else {
          reject(new Error(`Python script ${path.basename(scriptPath)} exited with code ${code}`));
        }
      });
    });
  }
}
