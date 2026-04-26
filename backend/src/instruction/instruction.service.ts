import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

export interface AssemblyStep {
  stepNumber: number;
  description: string;
  partsInvolved: number[];
}

export interface AssemblyInstructions {
  steps: AssemblyStep[];
}

@Injectable()
export class InstructionService {
  private readonly logger = new Logger(InstructionService.name);

  async generateInstructions(partsFile: string): Promise<AssemblyInstructions> {
    const backendDir = process.cwd();
    const filePath = path.join(backendDir, 'uploads', partsFile);

    if (!fs.existsSync(filePath)) {
      throw new Error(`Parts file not found: ${partsFile}`);
    }

    const partsData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
      this.logger.warn('OPENROUTER_API_KEY not set. Using mocked AI instructions.');
      return this.getMockInstructions(partsData);
    }

    this.logger.log('Calling OpenRouter API for instruction generation...');

    const prompt = `
      You are an expert technical writer for IKEA assembly instructions.
      I have a furniture CAD model with the following parts metadata:
      ${JSON.stringify(partsData.parts, null, 2)}
      
      Analyze the parts (number of parts, their sizes) and generate logical assembly steps.
      Assume basic connectors like screws and dowels.
      
      Respond ONLY with a valid JSON matching this schema:
      {
        "steps": [
          {
            "stepNumber": 1,
            "description": "Short, clear instruction",
            "partsInvolved": [0, 1] // array of part IDs
          }
        ]
      }
    `;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000); //30s timeout

      let response: Response;
      try {
        response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'nvidia/nemotron-3-super-120b-a12b:free',
            messages: [
              { role: 'user', content: prompt }
            ],
            response_format: { type: 'json_object' }
          }),
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeout);
      }

      const result = await response.json();

      if (result.error) {
        throw new Error(`OpenRouter provider error: ${result.error.message} (code: ${result.error.code})`);
      }

      if (!response.ok) {
        throw new Error(`OpenRouter API error: ${response.status} ${response.statusText}`);
      }

      if (!result.choices || result.choices.length === 0) {
        throw new Error(`Invalid response from OpenRouter: ${JSON.stringify(result)}`);
      }

      let content = result.choices[0].message.content;
      this.logger.log(`OpenRouter raw response: ${content}`);

      if (content.startsWith('```json')) {
        content = content.replace(/^```json\n/, '').replace(/\n```$/, '');
      } else if (content.startsWith('```')) {
        content = content.replace(/^```\n/, '').replace(/\n```$/, '');
      }

      const parsedContent = JSON.parse(content);
      this.logger.log(`OpenRouter response parsed successfully.`);
      return parsedContent;

    } catch (error: any) {
      this.logger.error(`Failed to generate instructions: ${error.message}`);
      if (error.stack) {
        this.logger.error(error.stack);
      }
      return this.getMockInstructions(partsData);
    }
  }

  private getMockInstructions(partsData: any): AssemblyInstructions {
    const partsCount = partsData.parts?.length || 0;
    const steps: AssemblyStep[] = [];

    let stepNum = 1;
    for (let i = 0; i < partsCount; i += 2) {
      const involved = [i];
      if (i + 1 < partsCount) {
        involved.push(i + 1);
      }

      steps.push({
        stepNumber: stepNum++,
        description: `Connect Part #${i + 1}${involved.length > 1 ? ` and Part #${i + 2}` : ''} together using standard wooden dowels.`,
        partsInvolved: involved
      });
    }

    if (steps.length === 0) {
      steps.push({
        stepNumber: 1,
        description: "Verify the single part.",
        partsInvolved: [0]
      });
    }

    return { steps };
  }
}
