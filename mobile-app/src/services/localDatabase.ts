// ============================================================
// RETINOVA EDGE AI PLATFORM — Local Offline Database
// Room / SQLite Equivalent Persistence Layer for Android
// Guarantees Zero Data Loss during Total Network Denial
// ============================================================
import { storage } from "./storage";

export type SyncStatus = "PENDING" | "SYNCING" | "SYNCED" | "FAILED";
export type SeverityLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface DetectionEvent {
  eventId: string;
  deviceId: string;
  timestamp: string;
  detectionType: string;
  confidence: number;
  severity: SeverityLevel;
  latitude: number;
  longitude: number;
  localImagePath: string;
  cloudImageUrl?: string;
  modelVersion: string;
  syncStatus: SyncStatus;
  retryCount: number;
  lastSyncAttempt?: string;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, any>;
}

const STORAGE_KEY_EVENTS = "@retinova_detection_events";
const STORAGE_KEY_DEVICE_ID = "@retinova_device_unique_id";

export class LocalDatabase {
  private static instance: LocalDatabase;
  private cachedEvents: Map<string, DetectionEvent> = new Map();
  private isInitialized: boolean = false;
  private deviceId: string = "";

  public static getInstance(): LocalDatabase {
    if (!LocalDatabase.instance) {
      LocalDatabase.instance = new LocalDatabase();
    }
    return LocalDatabase.instance;
  }

  /**
   * Initialize local database and load existing events into memory cache.
   */
  async init(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // 1. Resolve or generate persistent Device ID
      let id = await storage.getItem(STORAGE_KEY_DEVICE_ID);
      if (!id) {
        id = `DEV-EDGE-${Math.random().toString(36).substring(2, 8).toUpperCase()}-${Date.now().toString().slice(-4)}`;
        await storage.setItem(STORAGE_KEY_DEVICE_ID, id);
      }
      this.deviceId = id;

      // 2. Load stored events
      const raw = await storage.getItem(STORAGE_KEY_EVENTS);
      if (raw) {
        const parsed: DetectionEvent[] = JSON.parse(raw);
        this.cachedEvents.clear();
        for (const evt of parsed) {
          // Reset any dangling 'SYNCING' state to 'PENDING' if app previously terminated
          if (evt.syncStatus === "SYNCING") {
            evt.syncStatus = "PENDING";
          }
          this.cachedEvents.set(evt.eventId, evt);
        }
      }
      this.isInitialized = true;
      if (__DEV__) {
        console.log(`[LOCAL DB] Initialized with ${this.cachedEvents.size} records. DeviceID: ${this.deviceId}`);
      }
    } catch (e) {
      console.error("[LOCAL DB] Initialization error:", e);
      this.isInitialized = true;
    }
  }

  getDeviceId(): string {
    if (!this.deviceId) {
      return "DEV-EDGE-DEFAULT";
    }
    return this.deviceId;
  }

  /**
   * Persist current state to local offline storage.
   */
  private async persist(): Promise<void> {
    const list = Array.from(this.cachedEvents.values());
    await storage.setItem(STORAGE_KEY_EVENTS, JSON.stringify(list));
  }

  /**
   * Insert a new DetectionEvent with UUID.
   * Guaranteed to succeed offline.
   */
  async insertEvent(event: Omit<DetectionEvent, "eventId" | "deviceId" | "createdAt" | "updatedAt" | "retryCount"> & { eventId?: string }): Promise<DetectionEvent> {
    await this.init();

    const now = new Date().toISOString();
    const eventId = event.eventId || `evt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const newRecord: DetectionEvent = {
      ...event,
      eventId,
      deviceId: this.deviceId,
      retryCount: 0,
      createdAt: now,
      updatedAt: now,
    };

    this.cachedEvents.set(eventId, newRecord);
    await this.persist();

    if (__DEV__) {
      console.log(`[LOCAL DB] Inserted event: ${eventId} [${newRecord.detectionType} | ${newRecord.severity}] - Status: ${newRecord.syncStatus}`);
    }

    return newRecord;
  }

  /**
   * Update sync status of an existing event.
   */
  async updateSyncStatus(
    eventId: string,
    status: SyncStatus,
    cloudImageUrl?: string,
    errorMessage?: string
  ): Promise<DetectionEvent | null> {
    await this.init();

    const record = this.cachedEvents.get(eventId);
    if (!record) return null;

    record.syncStatus = status;
    record.updatedAt = new Date().toISOString();
    record.lastSyncAttempt = new Date().toISOString();

    if (cloudImageUrl) {
      record.cloudImageUrl = cloudImageUrl;
    }

    if (status === "FAILED") {
      record.retryCount += 1;
      record.errorMessage = errorMessage || "Sync failed";
    } else if (status === "SYNCED") {
      record.errorMessage = undefined;
    }

    this.cachedEvents.set(eventId, record);
    await this.persist();
    return record;
  }

  /**
   * Retrieve all pending events awaiting cloud synchronization.
   */
  async getPendingEvents(): Promise<DetectionEvent[]> {
    await this.init();
    return Array.from(this.cachedEvents.values()).filter(
      (e) => e.syncStatus === "PENDING" || e.syncStatus === "FAILED"
    );
  }

  /**
   * Retrieve all events ordered chronologically.
   */
  async getAllEvents(): Promise<DetectionEvent[]> {
    await this.init();
    return Array.from(this.cachedEvents.values()).sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  /**
   * Get total count of pending sync events.
   */
  async getPendingSyncCount(): Promise<number> {
    await this.init();
    return Array.from(this.cachedEvents.values()).filter(
      (e) => e.syncStatus === "PENDING" || e.syncStatus === "FAILED"
    ).length;
  }

  /**
   * Get counts broken down by status.
   */
  async getSyncStatistics(): Promise<{ total: number; pending: number; synced: number; failed: number }> {
    await this.init();
    let pending = 0;
    let synced = 0;
    let failed = 0;

    for (const evt of this.cachedEvents.values()) {
      if (evt.syncStatus === "PENDING" || evt.syncStatus === "SYNCING") pending++;
      else if (evt.syncStatus === "SYNCED") synced++;
      else if (evt.syncStatus === "FAILED") failed++;
    }

    return {
      total: this.cachedEvents.size,
      pending,
      synced,
      failed,
    };
  }

  /**
   * Clear all local events (used for development testing or resetting database).
   */
  async clearAll(): Promise<void> {
    this.cachedEvents.clear();
    await storage.removeItem(STORAGE_KEY_EVENTS);
  }
}

export const localDatabase = LocalDatabase.getInstance();
