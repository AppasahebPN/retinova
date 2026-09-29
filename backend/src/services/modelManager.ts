// ============================================================
// RETINOVA PLATFORM — Model Lifecycle & OTA Update Manager
// Robust Version Verification, Checksum Integrity, and Safe Rollback
// ============================================================

import crypto from 'crypto';
import { ModelRegistryRecord, RegisteredDevice } from '../types/platform';
import { DatabaseStore } from '../db/store';

export interface ModelUpdateCheckResult {
  updateAvailable: boolean;
  currentVersion: string;
  latestVersion?: string;
  modelRecord?: ModelRegistryRecord;
  requiresAppUpgrade: boolean;
  message: string;
}

export interface ModelActivationRequest {
  deviceId: string;
  targetModelId: string;
  targetVersion: string;
  computedChecksum: string;
  dryRunInferenceSuccess: boolean;
  failureReason?: string;
}

export interface ModelActivationResponse {
  success: boolean;
  activeModelVersion: string;
  previousModelVersion: string;
  status: 'ACTIVATED' | 'REVERTED_TO_PREVIOUS' | 'REJECTED';
  message: string;
  auditId: string;
}

export class ModelLifecycleManager {
  private static instance: ModelLifecycleManager;

  private constructor() {}

  public static getInstance(): ModelLifecycleManager {
    if (!ModelLifecycleManager.instance) {
      ModelLifecycleManager.instance = new ModelLifecycleManager();
    }
    return ModelLifecycleManager.instance;
  }

  /**
   * Evaluates if a registered device is running the latest active model
   * for its assigned AI workflow.
   */
  public checkForModelUpdate(deviceId: string): ModelUpdateCheckResult {
    const store = DatabaseStore.getInstance();
    const device = store.getRegisteredDevice(deviceId);

    if (!device) {
      throw new Error(`Device '${deviceId}' not found in registry.`);
    }

    const availableModels = store.getModelRegistry(device.assigned_workflow_id);
    const activeModels = availableModels.filter(m => m.status === 'ACTIVE');

    if (activeModels.length === 0) {
      return {
        updateAvailable: false,
        currentVersion: device.model_version,
        requiresAppUpgrade: false,
        message: 'No newer active model release found for this workflow.',
      };
    }

    // Sort by created_at descending to get latest
    activeModels.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    const latest = activeModels[0];

    const isDifferent = latest.version !== device.model_version;
    const requiresAppUpgrade = this.isAppVersionBelowMinimum(device.app_version, latest.min_app_version);

    return {
      updateAvailable: isDifferent && !requiresAppUpgrade,
      currentVersion: device.model_version,
      latestVersion: latest.version,
      modelRecord: latest,
      requiresAppUpgrade,
      message: requiresAppUpgrade
        ? `Model ${latest.version} requires App version >= ${latest.min_app_version}. Current app is ${device.app_version}.`
        : isDifferent
        ? `Newer model ${latest.version} available for download.`
        : 'Device is running the latest certified model.',
    };
  }

  /**
   * Device reports back after download and local validation.
   * If checksum fails or dry-run inference fails, the system enforces safe fallback.
   */
  public verifyAndActivate(
    request: ModelActivationRequest,
    actorEmail = 'device.agent@edge.retinova.ai'
  ): ModelActivationResponse {
    const store = DatabaseStore.getInstance();
    const device = store.getRegisteredDevice(request.deviceId);

    if (!device) {
      throw new Error(`Device '${request.deviceId}' not found.`);
    }

    const targetModel = store.getModelRecord(request.targetModelId);
    if (!targetModel) {
      throw new Error(`Model '${request.targetModelId}' not found in platform registry.`);
    }

    const previousVersion = device.model_version;

    // 1. Verify SHA-256 Checksum Integrity
    const checksumMatches =
      request.computedChecksum.toLowerCase() === targetModel.checksum_sha256.toLowerCase();

    // 2. Validate Edge Inference Health (Dry run execution)
    const inferenceHealthy = request.dryRunInferenceSuccess === true;

    if (!checksumMatches || !inferenceHealthy) {
      const reason = !checksumMatches
        ? `Checksum verification failed. Expected: ${targetModel.checksum_sha256.substring(0, 12)}..., Received: ${request.computedChecksum.substring(0, 12)}...`
        : `On-device dry-run inference test failed: ${request.failureReason || 'Tensor execution error'}`;

      // Revert / Keep previous working model intact
      const audit = store.addPlatformAuditEvent({
        actor_id: device.device_id,
        actor_email: actorEmail,
        actor_role: 'OPERATOR',
        organization_id: device.organization_id,
        action: 'MODEL_UPDATED',
        target_type: 'DEVICE',
        target_id: device.device_id,
        metadata: {
          status: 'UPDATE_FAILED_FALLBACK_TRIGGERED',
          targetVersion: request.targetVersion,
          retainedVersion: previousVersion,
          reason,
        },
      });

      return {
        success: false,
        activeModelVersion: previousVersion,
        previousModelVersion: previousVersion,
        status: 'REVERTED_TO_PREVIOUS',
        message: `Model update aborted. ${reason}. Device safely operating on previous model ${previousVersion}.`,
        auditId: audit.id,
      };
    }

    // 3. Success: Activate New Model on Device
    store.updateDevice(
      device.device_id,
      {
        model_version: targetModel.version,
        last_seen: new Date().toISOString(),
      },
      device.organization_id
    );

    const audit = store.addPlatformAuditEvent({
      actor_id: device.device_id,
      actor_email: actorEmail,
      actor_role: 'OPERATOR',
      organization_id: device.organization_id,
      action: 'MODEL_UPDATED',
      target_type: 'DEVICE',
      target_id: device.device_id,
      metadata: {
        status: 'UPDATE_SUCCESSFUL',
        newVersion: targetModel.version,
        previousVersion,
        checksum: targetModel.checksum_sha256,
      },
    });

    return {
      success: true,
      activeModelVersion: targetModel.version,
      previousModelVersion: previousVersion,
      status: 'ACTIVATED',
      message: `Model ${targetModel.version} successfully verified, validated, and activated on device '${device.device_name}'.`,
      auditId: audit.id,
    };
  }

  /**
   * Compare semver strings (e.g. "2.3.1" < "2.4.0")
   */
  private isAppVersionBelowMinimum(currentApp: string, minApp: string): boolean {
    const curParts = currentApp.replace(/[^0-9.]/g, '').split('.').map(Number);
    const minParts = minApp.replace(/[^0-9.]/g, '').split('.').map(Number);

    for (let i = 0; i < Math.max(curParts.length, minParts.length); i++) {
      const c = curParts[i] || 0;
      const m = minParts[i] || 0;
      if (c < m) return true;
      if (c > m) return false;
    }
    return false;
  }
}
