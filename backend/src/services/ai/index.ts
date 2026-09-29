import { IAIInferenceService } from './IAIService';
import { MatlabAIService } from './MatlabAIService';
import { MockAIService } from './MockAIService';
import { config } from '../../config';

let aiServiceInstance: IAIInferenceService | null = null;

export function getAIService(): IAIInferenceService {
  if (!aiServiceInstance) {
    if (config.aiServiceType === 'matlab') {
      console.log(`[AI Engine] Initializing Production MATLAB/Python Swin V2 Tiny AI Inference Service at ${config.matlabAiServiceUrl}`);
      const matlab = new MatlabAIService();
      matlab.getModuleStatus().then(modules => {
        const connected = modules.some(m => m.status === 'connected');
        if (connected) {
          console.log(`[AI Engine] Production MATLAB/Python AI Bridge connected and ready at ${config.matlabAiServiceUrl}`);
        } else {
          console.warn(`[AI Engine] ⚠️  MATLAB bridge at ${config.matlabAiServiceUrl} is not yet answering.`);
          console.warn(`[AI Engine] Ensure python backend/matlab_bridge.py is running to process real inference.`);
        }
      }).catch((err) => {
        console.warn(`[AI Engine] ⚠️  MATLAB bridge connectivity check error: ${err.message}`);
      });
      aiServiceInstance = matlab;
    } else {
      console.log('[AI Engine] Initializing Mock Heuristic AI Inference Service');
      aiServiceInstance = new MockAIService();
    }
  }
  return aiServiceInstance;
}

export * from './IAIService';
export * from './MatlabAIService';
export * from './MockAIService';

