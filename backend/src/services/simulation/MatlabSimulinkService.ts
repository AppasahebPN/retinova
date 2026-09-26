import { ISimulationService } from './ISimulationService';
import { MockSimulationService } from './MockSimulationService';
import { SimulationParameters, SimulationResultData, ModuleStatus } from '../../types';
import { config } from '../../config';

/**
 * MATLAB Simulink / SimEvents Integration Adapter
 * Connects to the MATLAB Engine / Simulink service boundary via HTTP.
 * Automatically falls back to MockSimulationService when MATLAB instance is offline.
 */
export class MatlabSimulinkService implements ISimulationService {
  private fallbackService: MockSimulationService;
  private endpointUrl: string;

  constructor() {
    this.fallbackService = new MockSimulationService();
    this.endpointUrl = config.matlabSimulinkServiceUrl;
  }

  public async runSimulation(params: SimulationParameters): Promise<SimulationResultData> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const response = await fetch(`${this.endpointUrl}/simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = (await response.json()) as SimulationResultData;
        return data;
      }
      const errorText = await response.text();
      console.warn(`[MATLAB Simulink] Service returned status ${response.status} (${errorText}). Falling back to simulation engine.`);
      return this.fallbackService.runSimulation(params);
    } catch (err: any) {
      console.warn(`[MATLAB Simulink] Simulink runtime unreachable (${err.message}). Seamlessly engaging simulation engine.`);
      return this.fallbackService.runSimulation(params);
    }
  }

  public async getStatus(): Promise<ModuleStatus> {
    let isConnected = false;
    let latency = 0;
    const t0 = Date.now();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      const res = await fetch(`${this.endpointUrl}/health`, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (res.ok) {
        isConnected = true;
        latency = Date.now() - t0;
      }
    } catch {
      isConnected = false;
    }

    const base = await this.fallbackService.getStatus();
    return {
      ...base,
      status: isConnected ? 'connected' : 'not_connected',
      latencyMs: isConnected ? latency : 0,
      description: isConnected ? `Connected to MATLAB Simulink runtime at ${this.endpointUrl}` : `${base.description} (Simulink instance currently offline)`
    };
  }
}
