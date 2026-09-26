import { SimulationParameters, SimulationResultData, ModuleStatus } from '../../types';

export interface ISimulationService {
  /**
   * Run district-level operational screening capacity simulation
   */
  runSimulation(params: SimulationParameters): Promise<SimulationResultData>;

  /**
   * Get operational status of Simulink / SimEvents engine
   */
  getStatus(): Promise<ModuleStatus>;
}
