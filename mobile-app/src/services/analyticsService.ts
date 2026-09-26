// ============================================================
// RETINOVA     Analytics Service (Real Backend Integration)
// ============================================================
import { api } from './api';
import type { AnalyticsOverview } from '../types';

export const analyticsService = {
  /**
   * Fetches the real district analytics overview from GET /api/analytics/overview
   * Reuses the backend data computed from verified database screenings.
   */
  async getOverview(facilityId?: string): Promise<AnalyticsOverview> {
    const query = facilityId ? `?facilityId=${encodeURIComponent(facilityId)}` : '';
    return api.get<AnalyticsOverview>(`/analytics/overview${query}`);
  },
};
