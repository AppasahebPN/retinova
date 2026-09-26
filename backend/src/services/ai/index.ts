import { IAIInferenceService } from './IAIService';
import { MatlabAIService } from './MatlabAIService';
import { MockAIService } from './MockAIService';
import { config } from '../../config';

let aiServiceInstance: IAIInferenceService | null = null;

export function getAIService(): IAIInferenceService {
  if (!aiServiceInstance) {
    if (config.aiServiceType === 'mock') {
      console.log('[AI Engine] Initializing Mock Heuristic AI Inference Service');
      aiServiceInstance = new MockAIService();
    } else {
      console.log(`[AI Engine] Initializing Production MATLAB/Python AI Inference Service at ${config.matlabAiServiceUrl}`);
      aiServiceInstance = new MatlabAIService();
    }
  }
  return aiServiceInstance;
}

export * from './IAIService';
export * from './MatlabAIService';
export * from './MockAIService';

