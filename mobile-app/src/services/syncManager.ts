// ============================================================
// RETINOVA EDGE AI PLATFORM — Autonomous Synchronization Manager
// Decoupled Background Cloud Synchronization Engine
// Idempotent AWS Sync with Zero Disruption to AI Inference
// ============================================================
import { localDatabase, DetectionEvent, SyncStatus } from "./localDatabase";
import { getApiBaseUrl } from "./api";

export interface SyncState {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  syncedCount: number;
  failedCount: number;
  lastSyncTime: string | null;
  lastError: string | null;
}

type SyncListener = (state: SyncState) => void;

export class SyncManager {
  private static instance: SyncManager;
  private isRunning: boolean = false;
  private pollTimer: any = null;
  private listeners: Set<SyncListener> = new Set();
  
  private currentState: SyncState = {
    isOnline: true,
    isSyncing: false,
    pendingCount: 0,
    syncedCount: 0,
    failedCount: 0,
    lastSyncTime: null,
    lastError: null,
  };

  public static getInstance(): SyncManager {
    if (!SyncManager.instance) {
      SyncManager.instance = new SyncManager();
    }
    return SyncManager.instance;
  }

  /**
   * Start the autonomous background synchronization loop.
   * Runs independently of AI inference thread.
   */
  start(intervalMs: number = 8000): void {
    if (this.isRunning) return;
    this.isRunning = true;

    if (__DEV__) {
      console.log("[SYNC MANAGER] Started background sync daemon.");
    }

    // Immediate initial sync attempt
    this.checkAndSync();

    // Start background recurring sync
    this.pollTimer = setInterval(() => {
      this.checkAndSync();
    }, intervalMs);
  }

  /**
   * Stop background loop.
   */
  stop(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    this.isRunning = false;
  }

  /**
   * Register state change listener.
   */
  subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener);
    listener({ ...this.currentState });
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    for (const listener of this.listeners) {
      try {
        listener({ ...this.currentState });
      } catch (e) {
        console.error("[SYNC MANAGER] Listener error:", e);
      }
    }
  }

  /**
   * Check real network connectivity by pinging the cloud health endpoint.
   */
  async checkNetwork(): Promise<boolean> {
    try {
      const baseUrl = getApiBaseUrl();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      const res = await fetch(`${baseUrl}/health`, {
        method: "GET",
        signal: controller.signal,
      }).catch(() => null);

      clearTimeout(timeoutId);
      const isOnline = res !== null && res.status >= 200 && res.status < 400;
      
      if (this.currentState.isOnline !== isOnline) {
        this.currentState.isOnline = isOnline;
        if (__DEV__) {
          console.log(`[SYNC MANAGER] Network state changed: ${isOnline ? "ONLINE" : "OFFLINE"}`);
        }
        this.notify();
      }
      return isOnline;
    } catch {
      if (this.currentState.isOnline !== false) {
        this.currentState.isOnline = false;
        this.notify();
      }
      return false;
    }
  }

  /**
   * Main idempotent sync execution.
   */
  async checkAndSync(): Promise<{ synced: number; failed: number }> {
    // Refresh stats from local DB first
    const stats = await localDatabase.getSyncStatistics();
    this.currentState.pendingCount = stats.pending;
    this.currentState.syncedCount = stats.synced;
    this.currentState.failedCount = stats.failed;
    this.notify();

    if (this.currentState.isSyncing) {
      return { synced: 0, failed: 0 };
    }

    // 1. Check network connectivity
    const online = await this.checkNetwork();
    if (!online) {
      return { synced: 0, failed: 0 };
    }

    // 2. Fetch pending events
    const pendingEvents = await localDatabase.getPendingEvents();
    if (pendingEvents.length === 0) {
      return { synced: 0, failed: 0 };
    }

    // 3. Mark state as syncing
    this.currentState.isSyncing = true;
    this.notify();

    if (__DEV__) {
      console.log(`[SYNC MANAGER] Initiating sync for ${pendingEvents.length} events...`);
    }

    let syncedCount = 0;
    let failedCount = 0;
    const baseUrl = getApiBaseUrl();

    // 4. Process each pending event idempotently
    for (const evt of pendingEvents) {
      try {
        await localDatabase.updateSyncStatus(evt.eventId, "SYNCING");

        // Format event payload for AWS API Gateway / DynamoDB ingestion
        const payload = {
          event_id: evt.eventId,
          device_id: evt.deviceId,
          timestamp: evt.timestamp,
          detection_type: evt.detectionType,
          confidence: evt.confidence,
          severity: evt.severity,
          latitude: evt.latitude || 13.0827,
          longitude: evt.longitude || 80.2707,
          model_version: evt.modelVersion,
          s3_object_key: `evidence/${evt.deviceId}/${evt.eventId}.jpg`,
          local_image_path: evt.localImagePath,
          metadata: evt.metadata,
        };

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);

        const response = await fetch(`${baseUrl}/api/detections/sync`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-device-id": evt.deviceId,
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const resJson = await response.json();
          const cloudUrl = resJson.cloudImageUrl || `https://s3.amazonaws.com/retinova-evidence/${payload.s3_object_key}`;
          await localDatabase.updateSyncStatus(evt.eventId, "SYNCED", cloudUrl);
          syncedCount++;
        } else {
          const errText = await response.text().catch(() => "Unknown HTTP error");
          await localDatabase.updateSyncStatus(evt.eventId, "FAILED", undefined, `HTTP ${response.status}: ${errText}`);
          failedCount++;
        }
      } catch (err: any) {
        await localDatabase.updateSyncStatus(evt.eventId, "FAILED", undefined, err.message || "Network timeout");
        failedCount++;
      }
    }

    // 5. Finalize state
    this.currentState.isSyncing = false;
    this.currentState.lastSyncTime = new Date().toLocaleTimeString();
    const updatedStats = await localDatabase.getSyncStatistics();
    this.currentState.pendingCount = updatedStats.pending;
    this.currentState.syncedCount = updatedStats.synced;
    this.currentState.failedCount = updatedStats.failed;
    this.notify();

    if (__DEV__) {
      console.log(`[SYNC MANAGER] Sync complete: ${syncedCount} synced, ${failedCount} failed.`);
    }

    return { synced: syncedCount, failed: failedCount };
  }

  /**
   * Trigger immediate manual sync on user demand.
   */
  async syncNow(): Promise<{ synced: number; failed: number }> {
    return this.checkAndSync();
  }

  getState(): SyncState {
    return { ...this.currentState };
  }
}

export const syncManager = SyncManager.getInstance();
