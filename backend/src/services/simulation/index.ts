import { ISimulationService } from './ISimulationService';
import { MockSimulationService } from './MockSimulationService';
import { MatlabSimulinkService } from './MatlabSimulinkService';
import { config } from '../../config';

let simulationServiceInstance: ISimulationService | null = null;

export function getSimulationService(): ISimulationService {
  if (!simulationServiceInstance) {
    if (config.simulationServiceType === 'matlab') {
      console.log(`[Simulation Engine] Initializing MATLAB Simulink Service at ${config.matlabSimulinkServiceUrl}`);
      simulationServiceInstance = new MatlabSimulinkService();
    } else {
      console.log('[Simulation Engine] Initializing Mock Simulink / SimEvents Service');
      simulationServiceInstance = new MockSimulationService();
    }
  }
  return simulationServiceInstance;
}

export * from './ISimulationService';
export * from './MockSimulationService';
export * from './MatlabSimulinkService';
