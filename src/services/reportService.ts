// ============================================================
// RETINOVA     Clinical Report Service
// ============================================================
import { api, getApiBaseUrl } from './api';

export const reportService = {
  /**
   * Returns URL for printable HTML clinical screening report
   */
  getReportHtmlUrl(screeningId: string): string {
    const base = getApiBaseUrl();
    return `${base}/api/reports/${encodeURIComponent(screeningId)}/html`;
  },

  /**
   * Returns URL for printable clinical report card PNG
   */
  getReportCardUrl(screeningId: string): string {
    const base = getApiBaseUrl();
    return `${base}/api/reports/${encodeURIComponent(screeningId)}/card`;
  },

  /**
   * Fetches structured report data JSON
   */
  async getReportData(screeningId: string): Promise<Record<string, unknown>> {
    return api.get<Record<string, unknown>>(`/reports/${encodeURIComponent(screeningId)}/data`);
  },
};
