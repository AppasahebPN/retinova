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
  },

  async getById(id: string): Promise<Screening> {
    const data = await api.get<{ screening: Screening }>(`/screenings/${id}`);
    if (!data.screening) throw new Error("Screening record not found.");

    if (__DEV__) {
      const s = data.screening;
      const cls = s.classification;
      const xai = s.explainability;
      const seg = s.segmentation;
      console.log(`[RETINOVA RESULT] screeningId=${s.id} grade=${cls?.predicted_grade} risk=${cls?.g2plus_probability_calibrated ?? cls?.calibrated_confidence} decision=${cls?.decision || s.status}`);
      console.log(`[RETINOVA EVIDENCE] screeningId=${s.id} gradcam=${xai?.gradcam_url} vessels=${seg?.vessel_mask_url} lesions=${seg?.lesion_mask_url}`);
    }

    return data.screening;
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

  fullImageUrl(relativePath?: string | null): string {
    if (!relativePath) return "";
    if (relativePath.startsWith("http")) return relativePath;
    return `${getApiBaseUrl()}${relativePath}`;
  },

  reportHtmlUrl(screeningId: string): string {
    return `${getApiBaseUrl()}/api/reports/${screeningId}/html`;
  },

  reportDataUrl(screeningId: string): string {
    return `${getApiBaseUrl()}/api/reports/${screeningId}/data`;
  },
};

export default screeningService;
