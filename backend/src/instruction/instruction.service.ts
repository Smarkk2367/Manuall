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

    try {
      const generated = await this.generateWithRetries(partsData, apiKey);
      if (generated) {
        return generated;
      }
      this.logger.warn('All OpenRouter attempts failed or returned low quality output. Using mocked AI instructions.');
      return this.getMockInstructions(partsData);

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

  private extractAssistantContent(result: any): string {
    const message = result?.choices?.[0]?.message;
    const content = message?.content;

    if (typeof content === 'string') {
      return content;
    }

    if (Array.isArray(content)) {
      const text = content
        .map((item: any) => {
          if (typeof item === 'string') {
            return item;
          }
          if (item?.type === 'text' && typeof item?.text === 'string') {
            return item.text;
          }
          if (typeof item?.content === 'string') {
            return item.content;
          }
          return '';
        })
        .join('\n')
        .trim();

      if (text) {
        return text;
      }
    }

    if (typeof result?.choices?.[0]?.text === 'string' && result.choices[0].text.trim()) {
      return result.choices[0].text.trim();
    }

    throw new Error(`OpenRouter response has empty assistant content: ${JSON.stringify(result?.choices?.[0])}`);
  }

  private parseInstructionsPayload(content: string): any {
    const trimmed = content.trim();
    const withoutFence = trimmed
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/, '')
      .trim();

    try {
      return JSON.parse(withoutFence);
    } catch {
      const firstBrace = withoutFence.indexOf('{');
      const lastBrace = withoutFence.lastIndexOf('}');

      if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
        throw new Error(`Could not locate JSON object in model output: ${withoutFence}`);
      }

      const jsonSlice = withoutFence.slice(firstBrace, lastBrace + 1);
      return JSON.parse(jsonSlice);
    }
  }

  private normalizeInstructions(candidate: any, partsData: any): AssemblyInstructions | null {
    const rawSteps = this.extractStepsArray(candidate);
    if (!rawSteps) {
      return null;
    }

    const partIds = new Set<number>(
      (partsData?.parts ?? [])
        .map((part: any) => Number(part?.id))
        .filter((id: number) => Number.isInteger(id))
    );

    const normalizedSteps: AssemblyStep[] = rawSteps
      .map((step: any, index: number): AssemblyStep | null => {
        const rawInvolved = Array.isArray(step?.partsInvolved) ? step.partsInvolved : [];
        const partsInvolved = rawInvolved
          .map((value: any) => Number(value))
          .filter((id: number) => Number.isInteger(id))
          .filter((id: number) => partIds.size === 0 || partIds.has(id));

        const description = this.extractStepDescription(step, partsInvolved);
        if (!description.trim()) {
          return null;
        }

        return {
          stepNumber: index + 1,
          description: description.trim(),
          partsInvolved
        };
      })
      .filter((step: AssemblyStep | null): step is AssemblyStep => Boolean(step));

    if (normalizedSteps.length === 0) {
      return null;
    }

    if (this.isLowQualityInstructions(normalizedSteps, partsData)) {
      return null;
    }

    return { steps: normalizedSteps };
  }

  private extractStepsArray(candidate: any): any[] | null {
    if (!candidate || typeof candidate !== 'object') {
      return null;
    }

    if (Array.isArray(candidate.steps)) {
      return candidate.steps;
    }

    if (Array.isArray(candidate.instructions)) {
      return candidate.instructions;
    }

    if (Array.isArray(candidate.plan)) {
      return candidate.plan;
    }

    if (Array.isArray(candidate.data?.steps)) {
      return candidate.data.steps;
    }

    return null;
  }

  private extractStepDescription(step: any, partsInvolved: number[]): string {
    const directCandidates = [
      step?.description,
      step?.instruction,
      step?.text,
      step?.title,
      step?.summary
    ];

    for (const candidate of directCandidates) {
      if (typeof candidate === 'string' && candidate.trim()) {
        return candidate.trim();
      }
    }

    if (Array.isArray(step?.actions)) {
      const actionText = step.actions
        .filter((value: any) => typeof value === 'string')
        .join('. ')
        .trim();
      if (actionText) {
        return actionText;
      }
    }

    if (partsInvolved.length > 0) {
      const partLabels = partsInvolved.map((id) => `Part #${id + 1}`).join(' and ');
      return `Connect ${partLabels}.`;
    }

    return '';
  }

  private isLowQualityInstructions(steps: AssemblyStep[], partsData: any): boolean {
    const partsCount = Array.isArray(partsData?.parts) ? partsData.parts.length : 0;

    if (steps.length === 1 && partsCount > 2) {
      return true;
    }

    const placeholderPattern = /(according to step|step\s+\d+|assemble components)/i;
    const meaningfulSteps = steps.filter(
      (step) => step.description.trim().length >= 12 && !placeholderPattern.test(step.description)
    );

    return meaningfulSteps.length === 0;
  }

  private async generateWithRetries(partsData: any, apiKey: string): Promise<AssemblyInstructions | null> {
    const configuredModels = process.env.OPENROUTER_MODELS
      ? process.env.OPENROUTER_MODELS.split(',').map((model) => model.trim()).filter(Boolean)
      : [];
    const freeConfiguredModels = configuredModels.filter((model) => model.endsWith(':free'));
    const models = freeConfiguredModels.length > 0
      ? freeConfiguredModels
      : [
        'nvidia/nemotron-3-super-120b-a12b:free'
      ];

    if (configuredModels.length > 0 && freeConfiguredModels.length === 0) {
      this.logger.warn('OPENROUTER_MODELS contains no free models. Falling back to default free model list.');
    }

    for (const model of models) {
      for (const strictJson of [true, false]) {
        try {
          const prompt = this.buildPrompt(partsData, strictJson);
          const result = await this.callOpenRouter(apiKey, model, prompt, strictJson);
          const rawContent = this.extractAssistantContent(result);
          this.logger.log(`OpenRouter raw response (${model}, strict=${strictJson}): ${rawContent}`);

          const parsedContent = this.parseInstructionsPayload(rawContent);
          const normalized = this.normalizeInstructions(parsedContent, partsData);
          if (normalized) {
            this.logger.log(`OpenRouter response accepted (${model}, strict=${strictJson}).`);
            return normalized;
          }

          this.logger.warn(`OpenRouter response rejected as low-quality (${model}, strict=${strictJson}).`);
        } catch (error: any) {
          this.logger.warn(`OpenRouter attempt failed (${model}, strict=${strictJson}): ${error.message}`);
        }
      }
    }

    return null;
  }

  private buildPrompt(partsData: any, strictJson: boolean): string {
    const common = `
You are an expert technical writer for IKEA-style assembly instructions.
Use this parts metadata:
${JSON.stringify(partsData.parts, null, 2)}

Generate assembly steps in logical order.
Rules:
- every step must contain a concrete non-empty description (min 12 chars),
- do not output placeholders like "step 1" or generic filler,
- use only part IDs from provided metadata,
- if there are 4+ parts, produce at least 3 steps.
`;

    if (strictJson) {
      return `${common}
Respond ONLY with valid JSON:
{
  "steps": [
    {
      "stepNumber": 1,
      "description": "Short, concrete assembly instruction",
      "partsInvolved": [0, 1]
    }
  ]
}`;
    }

    return `${common}
Return JSON object with key "steps".`;
  }

  private async callOpenRouter(apiKey: string, model: string, prompt: string, strictJson: boolean): Promise<any> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45000);

    try {
      const body: any = {
        model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2
      };

      if (strictJson) {
        body.response_format = { type: 'json_object' };
      }

      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

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

      return result;
    } finally {
      clearTimeout(timeout);
    }
  }
}
