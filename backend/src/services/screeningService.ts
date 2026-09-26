import { v4 as uuidv4 } from 'uuid';
import { DatabaseStore } from '../db/store';
import { getAIService } from './ai';
import { Screening, ImageRecord, ScreeningStatus } from '../types';

export class ScreeningService {
  private store: DatabaseStore;

  constructor() {
    this.store = DatabaseStore.getInstance();
  }

  public getScreenings(filters?: any) {
    return this.store.getScreenings(filters);
  }

  public getScreeningById(id: string): Screening | undefined {
    return this.store.getScreeningById(id);
  }

  public async createScreening(data: {
    patientId: string;
    facilityId: string;
    eye: 'left' | 'right';
    notes?: string;
    userId?: string;
    userName?: string;
    imageStorageUrl?: string;
    originalFilename?: string;
    deviceId?: string;
  }): Promise<Screening> {
    const now = new Date().toISOString();
    const screeningId = uuidv4();

    const newScreening: Screening = {
      id: screeningId,
      patient_id: data.patientId,
      facility_id: data.facilityId,
      status: 'pending',
      eye: data.eye,
      notes: data.notes || '',
      created_at: now,
      processing_time_ms: 0
    };

    this.store.addScreening(newScreening);

    // Add Timeline Event
    this.store.addScreeningEvent({
      id: uuidv4(),
      screening_id: screeningId,
      event_type: 'Screening Session Initialized',
      status: 'completed',
      user_id: data.userId,
      user_name: data.userName || 'Healthcare Worker',
      timestamp: now,
      metadata: { eye: data.eye }
    });

    // Create Image Record if URL provided
    if (data.imageStorageUrl) {
      const imgId = uuidv4();
      const imageRecord: ImageRecord = {
        id: imgId,
        screening_id: screeningId,
        storage_url: data.imageStorageUrl,
        original_filename: data.originalFilename || 'fundus_capture.jpg',
        eye: data.eye,
        device_id: data.deviceId || '',
        captured_at: now,
        width: 2048,
        height: 1536,
        format: 'image/jpeg'
      };
      this.store.addImage(imageRecord);

      this.store.addScreeningEvent({
        id: uuidv4(),
        screening_id: screeningId,
        event_type: 'Fundus Image Acquired & Registered',
        status: 'completed',
        user_id: data.userId,
        user_name: data.userName || 'Healthcare Worker',
        timestamp: new Date().toISOString(),
        metadata: { image_id: imgId, device_id: imageRecord.device_id }
      });
    }

    return this.store.getScreeningById(screeningId)!;
  }

  public async runAnalysis(screeningId: string, userId?: string, userName?: string): Promise<Screening> {
    const screening = this.store.getScreeningById(screeningId);
    if (!screening) {
      throw new Error(`Screening with ID ${screeningId} not found`);
    }

    const image = this.store.getImageByScreeningId(screeningId) || (screening.image?.id ? this.store.getImageById(screening.image.id) : undefined);
    const imageId = image?.id || uuidv4();
    if (!image) {
      // Create a fallback image record if not already created
      this.store.addImage({
        id: imageId,
        screening_id: screeningId,
        storage_url: `/uploads/fundus_g1_${screening.eye}_original.svg`,
        original_filename: `fundus_capture_${screening.eye}.jpg`,
        eye: screening.eye,
        device_id: '',
        captured_at: new Date().toISOString(),
        width: 2048,
        height: 1536,
        format: 'image/jpeg'
      });
    }

    // Update status to processing
    this.store.updateScreening(screeningId, { status: 'processing' });

    this.store.addScreeningEvent({
      id: uuidv4(),
      screening_id: screeningId,
      event_type: 'AI Inference Pipeline Triggered',
      status: 'processing',
      user_id: userId,
      user_name: userName || 'System Operator',
      timestamp: new Date().toISOString()
    });

    try {
      const aiService = getAIService();
      const analysis = await aiService.analyzeImage({
        screeningId,
        imageId,
        patientId: screening.patient_id,
        eye: screening.eye,
        imageUrl: image?.storage_url
      });

      // Ensure IDs are properly attached and batch-persist to db.json in one atomic operation
      const updated = this.store.batch(() => {
        if (analysis.quality) {
          analysis.quality.image_id = imageId;
          this.store.addImageQuality(analysis.quality);
        }
        if (analysis.enhancement) {
          analysis.enhancement.image_id = imageId;
          this.store.addEnhancement(analysis.enhancement);
        }
        if (analysis.segmentation) {
          analysis.segmentation.image_id = imageId;
          this.store.addSegmentation(analysis.segmentation);
        }
        if (analysis.classification) {
          analysis.classification.screening_id = screeningId;
          if ((analysis as any).decision) analysis.classification.decision = (analysis as any).decision;
          if ((analysis as any).referable !== undefined) analysis.classification.referable = (analysis as any).referable;
          if ((analysis as any).g2plus_probability_raw !== undefined) analysis.classification.g2plus_probability_raw = (analysis as any).g2plus_probability_raw;
          if ((analysis as any).g2plus_probability_calibrated !== undefined) analysis.classification.g2plus_probability_calibrated = (analysis as any).g2plus_probability_calibrated;
          if ((analysis as any).temperature !== undefined) analysis.classification.temperature = (analysis as any).temperature;
          if ((analysis as any).threshold !== undefined) analysis.classification.threshold = (analysis as any).threshold;
          if ((analysis as any).model_name) analysis.classification.model_name = (analysis as any).model_name;
          if ((analysis as any).model_version) analysis.classification.model_version = (analysis as any).model_version;
          this.store.addClassification(analysis.classification);
        }
        if (analysis.explainability) {
          analysis.explainability.screening_id = screeningId;
          this.store.addExplainability(analysis.explainability);
        }
        if (analysis.referral) {
          analysis.referral.screening_id = screeningId;
          this.store.addReferral(analysis.referral);
        }

        // Check IQA status
        const isRejected = (
          analysis.quality?.status === 'rejected' ||
          analysis.quality?.quality_gate === 'reject' ||
          (analysis as any).finalDecision === 'RECAPTURE' ||
          (analysis as any).decision === 'RECAPTURE'
        );
        const screeningStatus: ScreeningStatus = isRejected ? 'rejected' : 'completed';
        const decisionStr = isRejected
          ? 'RECAPTURE'
          : (analysis.classification?.decision || (analysis as any).finalDecision || (analysis as any).decision || (analysis.referral?.status === 'Referral Recommended' ? 'REFER' : 'SCREEN'));

        // Update patient's latest screening metadata
        this.store.updatePatient(screening.patient_id, {
          last_screening_date: new Date().toISOString(),
          latest_dr_grade: isRejected ? undefined : analysis.classification?.predicted_grade,
          latest_referral_status: isRejected ? 'Recapture Recommended' : (decisionStr === 'REFER' ? 'Referral Recommended' : 'Routine Screening Complete')
        });

        // Mark screening completed with all direct references attached
        const updatedScreening = this.store.updateScreening(screeningId, {
          status: screeningStatus,
          completed_at: new Date().toISOString(),
          processing_time_ms: analysis.pipelineTimings?.totalProcessingTimeMs || ((analysis as any).totalTimeSec ? Math.round(((analysis as any).totalTimeSec || 0) * 1000) : 0),
          quality: analysis.quality,
          enhancement: analysis.enhancement,
          segmentation: analysis.segmentation,
          classification: analysis.classification,
          explainability: analysis.explainability,
          referral: analysis.referral,
          final_decision: decisionStr
        });

        // Log success event
        this.store.addScreeningEvent({
          id: uuidv4(),
          screening_id: screeningId,
          event_type: isRejected ? 'Image Quality Gate: Recapture Required' : `AI Multi-Stage Analysis Complete (${decisionStr})`,
          status: 'completed',
          user_name: 'MATLAB AI Engine (Swin V2 Tiny)',
          timestamp: new Date().toISOString(),
          metadata: {
            decision: decisionStr,
            grade: analysis.classification?.predicted_grade,
            calibrated_confidence: analysis.classification?.calibrated_confidence,
            g2plus_probability_calibrated: analysis.classification?.g2plus_probability_calibrated,
            threshold: analysis.classification?.threshold,
            referral: analysis.referral?.status
          }
        });

        return updatedScreening!;
      });

      return updated;
    } catch (err: any) {
      this.store.updateScreening(screeningId, { status: 'failed' });
      this.store.addScreeningEvent({
        id: uuidv4(),
        screening_id: screeningId,
        event_type: 'AI Analysis Error',
        status: 'failed',
        timestamp: new Date().toISOString(),
        metadata: { error: err.message }
      });
      throw err;
    }
  }

  public updateReferralAction(screeningId: string, data: {
    action_taken: 'referral_pending' | 'referral_completed' | 'patient_advised' | 'followup_scheduled';
    action_notes?: string;
    userId?: string;
    userName?: string;
  }) {
    const updated = this.store.updateReferral(screeningId, {
      action_taken: data.action_taken,
      action_notes: data.action_notes,
      completed_at: new Date().toISOString()
    });

    if (updated) {
      this.store.addScreeningEvent({
        id: uuidv4(),
        screening_id: screeningId,
        event_type: `Referral Action Recorded (${data.action_taken.replace('_', ' ')})`,
        status: 'completed',
        user_id: data.userId,
        user_name: data.userName || 'Doctor / Clinician',
        timestamp: new Date().toISOString(),
        metadata: { action_taken: data.action_taken, notes: data.action_notes }
      });
    }

    return updated;
  }
}
