// ============================================================
// RETINOVA EDGE AI PLATFORM — Detection & AWS Sync API Routes
// Cloud Synchronization Gateway for Android Devices & Dashboard
// ============================================================
import { Router, Request, Response } from 'express';
import { awsService } from '../services/awsService';

const router = Router();

import { DatabaseStore } from '../db/store';

/**
 * POST /api/detections/sync
 * Idempotent batch/single detection sync endpoint for Android edge nodes.
 */
router.post('/sync', async (req: Request, res: Response) => {
  try {
    const body = req.body;
    if (!body || !body.event_id || !body.device_id) {
      return res.status(400).json({ error: "Missing required fields: event_id and device_id are mandatory." });
    }

    const store = DatabaseStore.getInstance();
    const registeredDevice = store.getRegisteredDevice(body.device_id);
    const orgId = 
      body.organization_id || 
      (req.headers['x-organization-id'] as string) || 
      registeredDevice?.organization_id || 
      "org_retinova_health";

    // Update telemetry in DatabaseStore if device exists
    if (registeredDevice) {
      store.updateDevice(body.device_id, {
        total_detections: (registeredDevice.total_detections || 0) + 1,
        last_seen: new Date().toISOString(),
        connectivity_status: 'ONLINE',
      });
    }

    const record = await awsService.putDetectionEvent({
      event_id: body.event_id,
      organization_id: orgId,
      device_id: body.device_id,
      timestamp: body.timestamp || new Date().toISOString(),
      detection_type: body.detection_type || "Normal",
      confidence: Number(body.confidence ?? 0.85),
      severity: body.severity || "LOW",
      latitude: Number(body.latitude ?? 13.0827),
      longitude: Number(body.longitude ?? 80.2707),
      model_version: body.model_version || "swinv2-tiny-edge-v1.0.4",
      s3_object_key: body.s3_object_key || `evidence/${body.device_id}/${body.event_id}.jpg`,
      cloud_image_url: body.cloud_image_url,
      metadata: body.metadata,
    });

    return res.status(200).json({
      status: "SYNCED",
      event_id: record.event_id,
      organization_id: record.organization_id,
      cloudImageUrl: record.cloud_image_url,
      sync_timestamp: record.sync_timestamp,
    });
  } catch (err: any) {
    console.error("[DETECTIONS ROUTE] Sync error:", err);
    return res.status(500).json({ error: err.message || "Failed to process detection event." });
  }
});

/**
 * GET /api/detections
 * Retrieve detection history for Cloud Dashboard (tenant scoped).
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { deviceId, severity, limit, organization_id } = req.query;
    const orgFilter = (organization_id as string) || (req.headers['x-organization-id'] as string);
    const records = await awsService.getDetections({
      organizationId: orgFilter,
      deviceId: deviceId as string,
      severity: severity as string,
      limit: limit ? parseInt(limit as string, 10) : 100,
    });

    return res.json({
      total: records.length,
      detections: records,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to fetch detections." });
  }
});

/**
 * GET /api/detections/overview
 * Real-time KPI summary for Command Center Dashboard.
 */
router.get('/overview', async (_req: Request, res: Response) => {
  try {
    const kpis = await awsService.getOverviewKPIs();
    return res.json(kpis);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to fetch KPIs." });
  }
});

/**
 * GET /api/devices
 * Live device health registry for Command Center.
 */
router.get('/devices', async (_req: Request, res: Response) => {
  try {
    const devices = await awsService.getDevices();
    return res.json({ devices });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to fetch devices." });
  }
});

/**
 * POST /api/detections/presigned-url
 * S3 presigned URL generation for evidence upload.
 */
router.post('/presigned-url', async (req: Request, res: Response) => {
  try {
    const { deviceId, filename } = req.body;
    if (!deviceId || !filename) {
      return res.status(400).json({ error: "deviceId and filename are required." });
    }
    const result = await awsService.generatePresignedUploadUrl(deviceId, filename);
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to generate presigned URL." });
  }
});

/**
 * GET /api/alerts
 * Critical detection alerts feed.
 */
router.get('/alerts', async (_req: Request, res: Response) => {
  try {
    const detections = await awsService.getDetections({ limit: 50 });
    const alerts = detections.filter((d) => d.severity === "CRITICAL" || d.severity === "HIGH");
    return res.json({ count: alerts.length, alerts });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to fetch alerts." });
  }
});

export default router;
