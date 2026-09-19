// ============================================================
// RETINOVA     Simulink / SimEvents Resource Planning Service
// ============================================================
import { api } from './api';
import type { SimulationRun, SimulationParameters } from '../types';

export const simulationService = {
  /**
   * Fetches real SimEvents/Simulink Module 6 simulation runs from GET /api/simulation/runs
   */
  async listRuns(): Promise<SimulationRun[]> {
    const res = await api.get<{ runs: SimulationRun[] }>('/simulation/runs');
    return res.runs || [];
  },

  /**
   * Fetches details of a specific simulation run by ID
   */
  async getRunById(id: string): Promise<SimulationRun> {
    const res = await api.get<{ simulationRun: SimulationRun }>(`/simulation/runs/${id}`);
    return res.simulationRun;
  },

  /**
   * Fetches the status of the Simulink engine bridge
   */
  async getStatus(): Promise<{ status: string; engine?: string }> {
    return api.get<{ status: string; engine?: string }>('/simulation/status');
  },

  /**
   * Triggers a new SimEvents capacity simulation run
   */
  async runSimulation(params: SimulationParameters): Promise<SimulationRun> {
    const res = await api.post<{ simulationRun: SimulationRun }>('/simulation/run', params);
    return res.simulationRun;
  },
};
