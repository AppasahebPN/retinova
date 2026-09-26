import { Response } from 'express';
import { getAIService } from '../services/ai';
import { getSimulationService } from '../services/simulation';
import { AuthenticatedRequest } from '../middleware/auth';
import { ModuleStatus } from '../types';

export class ModelStatusController {
  public static async getStatus(_req: AuthenticatedRequest, res: Response): Promise<void> {
    const aiService = getAIService();
    const simService = getSimulationService();

    const aiModules = await aiService.getModuleStatus();
    const simModule = await simService.getStatus();

    const modules: ModuleStatus[] = [
      ...aiModules,
      simModule,
      {
        name: 'Relational Database Store',
        code: 'DB-RELATIONAL-MOD0',
        category: 'database',
        status: 'connected',
        version: 'PostgreSQL 16 / Engine v2.0',
        latencyMs: 12,
        lastChecked: new Date().toISOString(),
        description: 'Persistent relational records for patients, screenings, and audit logs.',
        endpoints: ['All CRUD APIs']
      }
    ];

    res.json({
      system: 'RETINOVA Screening Platform v1.0 (SIH26038)',
      aiServiceType: process.env.AI_SERVICE_TYPE || 'mock',
      simulationServiceType: process.env.SIMULATION_SERVICE_TYPE || 'mock',
      timestamp: new Date().toISOString(),
      modules
    });
  }
}
