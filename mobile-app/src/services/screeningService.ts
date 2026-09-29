import { Platform } from "react-native";
import { api, getApiBaseUrl } from "./api";
import { storage } from "./storage";
import { STORAGE_KEYS } from "../utils/constants";
import type {
  Screening,
  PaginatedScreenings,
  UploadImageResponse,
  AnalyticsOverview,
} from "../types";

/**
 * Web-specific upload implementation using browser-native XMLHttpRequest and window.FormData.
 * Completely bypasses React Native's RCTNetworking, requestMultipart, and RN FormData.
 * This function is ONLY called when Platform.OS === 'web'.
 */
async function uploadScreeningImageWeb(
  imageUri: string,
  filename: string,
  mimeType: string,
  token: string | null
): Promise<UploadImageResponse> {
  const url = `${getApiBaseUrl()}/api/screenings/upload`;

  if (__DEV__) {
    console.log("[RETINOVA MOBILE FLOW] step=UPLOAD_START_WEB", { url, filename, mimeType });
  }

  // Fetch the blob URI to obtain the raw binary Blob
  const response = await fetch(imageUri);
  if (!response.ok) {
    throw new Error("Image upload failed: unable to read selected image data from browser memory.");
  }
  const blob = await response.blob();

  // Construct browser-native window.FormData
  const win = typeof window !== "undefined" ? window : (globalThis as any);
  const formData = new win.FormData();
  formData.append("image", blob, filename);

  return new Promise<UploadImageResponse>((resolve, reject) => {
    const xhr = new win.XMLHttpRequest();
    xhr.open("POST", url, true);

    if (token) {
      xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    }

    // Do NOT set Content-Type header manually - browser sets multipart boundary automatically
    xhr.timeout = 120000;

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const res = JSON.parse(xhr.responseText);
          const result = res.data || res;
          if (!result.storageUrl && res.storageUrl) {
            result.storageUrl = res.storageUrl;
          }
          if (!result.storageUrl) {
            reject(new Error("Image upload failed: no storage URL returned by server."));
            return;
          }
          if (__DEV__) {
            console.log("[RETINOVA MOBILE FLOW] step=UPLOAD_COMPLETE_WEB", { storageUrl: result.storageUrl });
          }
          resolve(result as UploadImageResponse);
        } catch (e: any) {
          reject(new Error(`Failed to parse upload response from server: ${e.message}`));
        }
      } else {
        let errorMsg = `Upload failed (HTTP ${xhr.status})`;
        try {
          const res = JSON.parse(xhr.responseText);
          errorMsg = res.error || res.message || errorMsg;
        } catch {
          if (xhr.responseText && xhr.responseText.length < 300) {
            errorMsg = `${errorMsg}: ${xhr.responseText}`;
          }
        }
        reject(new Error(errorMsg));
      }
    };

    xhr.onerror = () => {
      reject(new Error(`Network error during image upload to ${url}`));
    };

    xhr.ontimeout = () => {
      reject(new Error("Image upload request timed out after 120 seconds. Please try again."));
    };

    xhr.send(formData);
  });
}

/**
 * Native-specific upload implementation using React Native's FormData part format { uri, name, type }.
 * This is the ONLY path for Android/iOS Expo native apps.
 */
async function uploadScreeningImageNative(
  imageUri: string,
  filename: string,
  mimeType: string
): Promise<UploadImageResponse> {
  const cleanUri = Platform.OS === "android" ? imageUri : imageUri.replace("file://", "");

  if (__DEV__) {
    console.log("[RETINOVA MOBILE FLOW] step=UPLOAD_START_NATIVE", {
      platform: Platform.OS,
      uri: cleanUri.substring(0, 60),
      filename,
      mimeType,
      baseUrl: getApiBaseUrl(),
    });
  }

  const formData = new FormData();
  const part = {
    uri: cleanUri,
    name: filename,
    type: mimeType,
  };
  formData.append("image", part as any);

  const data = await api.postMultipart<UploadImageResponse>(
    "/screenings/upload",
    formData
  );

  if (!data.storageUrl) {
    throw new Error("Image upload failed: no storage URL returned by server.");
  }

  if (__DEV__) {
    console.log("[RETINOVA MOBILE FLOW] step=UPLOAD_COMPLETE_NATIVE", { storageUrl: data.storageUrl });
  }

  return data;
}

export const screeningService = {
  async list(params?: {
    patientId?: string;
    facilityId?: string;
    status?: string;
    grade?: number;
    referralStatus?: string;
    decision?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
  }): Promise<PaginatedScreenings> {
    try {
      const qs = new URLSearchParams();
      if (params?.patientId) qs.set("patientId", params.patientId);
      if (params?.facilityId) qs.set("facilityId", params.facilityId);
      if (params?.status) qs.set("status", params.status);
      if (params?.grade !== undefined) qs.set("grade", String(params.grade));
      if (params?.referralStatus) qs.set("referralStatus", params.referralStatus);
      if (params?.decision) qs.set("decision", params.decision);
      if (params?.startDate) qs.set("startDate", params.startDate);
      if (params?.endDate) qs.set("endDate", params.endDate);
      qs.set("limit", String(params?.limit ?? 50));
      qs.set("offset", String(params?.offset ?? 0));
      const data = await api.get<PaginatedScreenings | Screening[]>(
        `/screenings?${qs.toString()}`
      );
      if (Array.isArray(data)) {
        return { screenings: data, total: data.length, limit: 50, offset: 0 };
      }
      return data;
    } catch {
      // Offline fallback: load events from local database
      const { localDatabase } = await import("./localDatabase");
      const localEvents = await localDatabase.getAllEvents();
      const localScreenings: Screening[] = localEvents.map((evt) => {
        const isRefer = evt.severity === "HIGH" || evt.severity === "CRITICAL";
        const grade = evt.metadata?.grade ?? (evt.severity === "CRITICAL" ? 4 : evt.severity === "HIGH" ? 2 : evt.severity === "MEDIUM" ? 1 : 0);
        return {
          id: evt.eventId,
          patient_id: evt.metadata?.patientId || "LOCAL_PATIENT",
          patient: {
            id: evt.metadata?.patientId || "LOCAL_PATIENT",
            name: evt.metadata?.patientName || "Field Screening Subject",
            age: evt.metadata?.patientAge || 48,
            gender: evt.metadata?.patientGender || "Other",
            location: evt.metadata?.location || "Edge Field Node",
            created_at: evt.createdAt,
            facility_id: "FACILITY_LOCAL",
          },
          facility_id: "FACILITY_LOCAL",
          eye: evt.metadata?.eye || "right",
          status: "completed",
          created_at: evt.createdAt,
          image: {
            id: `img_${evt.eventId}`,
            screening_id: evt.eventId,
            storage_url: evt.localImagePath,
            original_filename: "edge_capture.jpg",
            eye: evt.metadata?.eye || "right",
            captured_at: evt.createdAt,
          },
          quality: {
            accepted: true,
            quality_score: evt.metadata?.features?.sharpnessScore ?? 0.88,
            status: "accepted",
          },
          classification: {
            predicted_grade: grade,
            grade_label: evt.detectionType,
            calibrated_confidence: evt.confidence,
            decision: isRefer ? "REFER" : "SCREEN",
            recommendation: evt.metadata?.recommendation || "Field screening record.",
            model_version: evt.modelVersion,
          },
        } as unknown as Screening;
      });
      return { screenings: localScreenings, total: localScreenings.length, limit: 50, offset: 0 };
    }
  },

  async getById(id: string): Promise<Screening> {
    // If it's a local edge event, read directly from localDatabase
    if (id.startsWith("evt_")) {
      const { localDatabase } = await import("./localDatabase");
      const localEvents = await localDatabase.getAllEvents();
      const found = localEvents.find((e) => e.eventId === id);
      if (found) {
        const isRefer = found.severity === "HIGH" || found.severity === "CRITICAL";
        const grade = found.metadata?.grade ?? (found.severity === "CRITICAL" ? 4 : found.severity === "HIGH" ? 2 : found.severity === "MEDIUM" ? 1 : 0);
        return {
          id: found.eventId,
          patient_id: found.metadata?.patientId || "LOCAL_PATIENT",
          patient: {
            id: found.metadata?.patientId || "LOCAL_PATIENT",
            name: found.metadata?.patientName || "Field Screening Subject",
            age: found.metadata?.patientAge || 48,
            gender: found.metadata?.patientGender || "Other",
            location: found.metadata?.location || "Edge Field Node",
            created_at: found.createdAt,
            facility_id: "FACILITY_LOCAL",
          },
          facility_id: "FACILITY_LOCAL",
          eye: found.metadata?.eye || "right",
          status: "completed",
          created_at: found.createdAt,
          image: {
            id: `img_${found.eventId}`,
            screening_id: found.eventId,
            storage_url: found.localImagePath,
            original_filename: "edge_capture.jpg",
            eye: found.metadata?.eye || "right",
            captured_at: found.createdAt,
          },
          quality: {
            accepted: true,
            quality_score: found.metadata?.features?.sharpnessScore ?? 0.88,
            sharpness: found.metadata?.features?.sharpnessScore ?? 0.88,
            illumination: found.metadata?.features?.illuminationScore ?? 0.92,
            status: "accepted",
          },
          classification: {
            predicted_grade: grade,
            grade_label: found.detectionType,
            calibrated_confidence: found.confidence,
            g2plus_probability_calibrated: found.metadata?.referableProbability ?? (isRefer ? 0.95 : 0.08),
            referable: isRefer,
            decision: isRefer ? "REFER" : "SCREEN",
            recommendation: found.metadata?.recommendation || (isRefer ? "Specialist referral recommended." : "Routine surveillance."),
            model_version: found.modelVersion,
            raw_probabilities: found.metadata?.rawProbabilities,
          },
          referral: isRefer ? {
            status: "pending",
            recommended_action: found.metadata?.recommendation || "Specialist referral recommended.",
            priority: grade >= 3 ? "urgent" : "routine",
          } : undefined,
          segmentation: found.metadata?.segmentation || undefined,
          explainability: found.metadata?.explainability || undefined,
        } as unknown as Screening;
      }
    }

    try {
      const data = await api.get<{ screening: Screening }>(`/screenings/${id}`);
      if (!data.screening) throw new Error("Screening record not found.");
      return data.screening;
    } catch (e: any) {
      // Fallback to local DB check
      const { localDatabase } = await import("./localDatabase");
      const localEvents = await localDatabase.getAllEvents();
      const found = localEvents.find((evt) => evt.eventId === id);
      if (found) {
        const isRefer = found.severity === "HIGH" || found.severity === "CRITICAL";
        const grade = found.metadata?.grade ?? 0;
        return {
          id: found.eventId,
          patient_id: "LOCAL_PATIENT",
          eye: "right",
          status: "completed",
          created_at: found.createdAt,
          classification: {
            predicted_grade: grade,
            grade_label: found.detectionType,
            calibrated_confidence: found.confidence,
            decision: isRefer ? "REFER" : "SCREEN",
          }
        } as unknown as Screening;
      }
      throw e;
    }
  },

  async create(body: {
    patientId: string;
    eye: string;
    facilityId?: string;
    notes?: string;
    imageStorageUrl?: string;
    originalFilename?: string;
    deviceId?: string;
  }): Promise<Screening> {
    if (__DEV__) {
      console.log("[RETINOVA MOBILE FLOW] step=CREATE_SCREENING_RECORD", { patientId: body.patientId, eye: body.eye });
    }
    const data = await api.post<{ screening: Screening }>("/screenings", body);
    if (!data.screening?.id) throw new Error("Screening creation failed - no ID returned.");

    if (__DEV__) {
      console.log(`[RETINOVA UPLOAD] screeningId=${data.screening.id}`);
    }

    return data.screening;
  },

  /**
   * Upload a fundus image to the backend.
   * Dispatches explicitly between Web and Native execution paths.
   */
  async uploadImage(
    imageUri: string,
    filename: string,
    mimeType?: string,
    originalFileName?: string
  ): Promise<UploadImageResponse> {
    const effectiveMime = mimeType || "image/jpeg";
    const effectiveName = originalFileName || filename;

    if (Platform.OS === "web") {
      const token = await storage.getItem(STORAGE_KEYS.AUTH_TOKEN);
      return uploadScreeningImageWeb(imageUri, effectiveName, effectiveMime, token);
    } else {
      return uploadScreeningImageNative(imageUri, effectiveName, effectiveMime);
    }
  },

  async runAnalysis(screeningId: string): Promise<Screening> {
    if (__DEV__) {
      console.log(`[RETINOVA MOBILE FLOW] step=ANALYZE_START`);
      console.log(`[RETINOVA ANALYZE] screeningId=${screeningId} status=STARTING`);
    }

    const data = await api.post<{ screening: Screening; message?: string }>(
      `/screenings/${screeningId}/analyze`,
      {}
    );

    if (__DEV__) {
      console.log(`[RETINOVA ANALYZE] screeningId=${screeningId} status=COMPLETE`, data);
    }

    if (data.screening) return data.screening;
    return data as unknown as Screening;
  },

  async updateReferral(
    screeningId: string,
    action_taken: string,
    action_notes?: string
  ): Promise<{ referral: unknown; message?: string }> {
    return api.post<{ referral: unknown; message?: string }>(
      `/screenings/${screeningId}/referral`,
      { action_taken, action_notes }
    );
  },

  async getAnalytics(): Promise<AnalyticsOverview> {
    return api.get<AnalyticsOverview>("/analytics/overview");
  },

  fullImageUrl(urlOrPath?: string | null): string {
    if (!urlOrPath) return "";
    const trimmed = urlOrPath.trim();
    if (!trimmed) return "";

    // 1. Never prepend API base URL to browser blob, data, file, or absolute HTTP(S) URLs
    if (
      trimmed.startsWith("blob:") ||
      trimmed.startsWith("data:") ||
      trimmed.startsWith("file:") ||
      trimmed.startsWith("http://") ||
      trimmed.startsWith("https://")
    ) {
      return trimmed;
    }

    // 2. Resolve server-relative paths cleanly (e.g. "/uploads/img.png" -> "http://host:port/uploads/img.png")
    const baseUrl = getApiBaseUrl().replace(/\/+$/, "");
    const cleanPath = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
    return `${baseUrl}${cleanPath}`;
  },

  reportHtmlUrl(screeningId: string): string {
    return `${getApiBaseUrl()}/api/reports/${screeningId}/html`;
  },

  reportDataUrl(screeningId: string): string {
    return `${getApiBaseUrl()}/api/reports/${screeningId}/data`;
  },
};

export default screeningService;
