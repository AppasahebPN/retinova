import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getSimulationService } from '../services/simulation';
import { DatabaseStore } from '../db/store';
import { AuthenticatedRequest } from '../middleware/auth';
import { SimulationParameters } from '../types';

export class SimulationController {
  public static async run(req: AuthenticatedRequest, res: Response): Promise<void> {
    const params: SimulationParameters = req.body;

    if (!params.patientArrivalRate || !params.cameras || !params.imageAcquisitionTime) {
      res.status(400).json({
        error: 'Missing required simulation parameters: patientArrivalRate, cameras, and imageAcquisitionTime'
      });
      return;
    }

    const store = DatabaseStore.getInstance();
    const runId = uuidv4();
    const facilityId = params.facilityId || req.user?.facility_id;

    const simulationService = getSimulationService();

    // Create initial run entry
    store.addSimulationRun({
      id: runId,
      facility_id: facilityId,
      title: params.title || `Operational Capacity Simulation (${new Date().toLocaleDateString()})`,
      parameters: params,
      status: 'running',
      created_by: req.user?.id,
      created_at: new Date().toISOString()
    });

    try {
      const resultData = await simulationService.runSimulation(params);
      resultData.simulationRunId = runId;

      const completedRun = store.updateSimulationRun(runId, {
        status: 'completed',
        completed_at: new Date().toISOString(),
        result: resultData
      });

      store.addAuditLog({
        user_id: req.user?.id,
        action: 'SIMULATION_EXECUTED',
        entity: 'SimulationRun',
        entity_id: runId,
        metadata: {
          throughput: resultData.throughput,
          bottleneck: resultData.bottleneck
        }
      });

      res.status(201).json({
        message: 'Simulation completed successfully',
        simulationRun: completedRun,
        result: resultData
      });
    } catch (err: any) {
      store.updateSimulationRun(runId, {
        status: 'failed',
        completed_at: new Date().toISOString()
      });

      res.status(500).json({
        error: 'Simulation execution failed',
        details: err.message
      });
    }
  }

  public static async listRuns(_req: AuthenticatedRequest, res: Response): Promise<void> {
    const store = DatabaseStore.getInstance();
    const runs = store.getSimulationRuns();
    res.json({ runs });
  }

  public static async getRunById(req: AuthenticatedRequest, res: Response): Promise<void> {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const store = DatabaseStore.getInstance();
    const run = store.getSimulationRunById(id);

    if (!run) {
      res.status(404).json({ error: 'Simulation run not found' });
      return;
    }

    res.json({ simulationRun: run });
  }

  public static async getStatus(_req: AuthenticatedRequest, res: Response): Promise<void> {
    const simService = getSimulationService();
    const status = await simService.getStatus();
    res.json({ status });
  }
}
