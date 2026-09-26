// ============================================================
// RETINOVA     Referral Lifecycle Service (Real Backend Integration)
// ============================================================
import { api } from './api';
import type { Referral, ReferralActionTaken, PaginatedScreenings } from '../types';

export const referralService = {
  /**
   * Records a clinical review outcome on a referral (Doctor / Clinical Reviewer)
   * Calls real backend: POST /api/screenings/:id/referral
   */
  async updateAction(
    screeningId: string,
    data: {
      action_taken: ReferralActionTaken;
      action_notes?: string;
    }
  ): Promise<{ referral: Referral; message: string }> {
    return api.post<{ referral: Referral; message: string }>(
      `/screenings/${encodeURIComponent(screeningId)}/referral`,
      data
    );
  },

  /**
   * Fetches screenings filtered by referral criteria
   */
  async listReferrals(params?: {
    facilityId?: string;
    referralStatus?: string;
    grade?: number;
    limit?: number;
    offset?: number;
  }): Promise<PaginatedScreenings> {
    const q = new URLSearchParams();
    if (params?.facilityId) q.append('facilityId', params.facilityId);
    if (params?.referralStatus) q.append('referralStatus', params.referralStatus);
    if (params?.grade !== undefined) q.append('grade', String(params.grade));
    if (params?.limit) q.append('limit', String(params.limit));
    if (params?.offset) q.append('offset', String(params.offset));

    const qs = q.toString() ? `?${q.toString()}` : '';
    return api.get<PaginatedScreenings>(`/screenings${qs}`);
  },
};
