// ============================================================
// RETINOVA ASHA Field App - Base API Client (Hardened)
// Target: Native Mobile App -> Express Backend (:5000)
// ============================================================
import { Platform } from "react-native";
import { storage } from "./storage";
import { STORAGE_KEYS } from "../utils/constants";

function resolveInitialApiBaseUrl(): string {
  const isNative = Platform.OS === "android" || Platform.OS === "ios";
  const envRaw = process.env.EXPO_PUBLIC_API_BASE_URL ?? "";
  const envUrl = envRaw.replace(/\/$/, "").trim();

  // 1. If configured in environment, use it
  if (envUrl && envUrl !== "undefined" && envUrl.startsWith("http")) {
    if (isNative && (envUrl.includes("localhost") || envUrl.includes("127.0.0.1"))) {
      if (__DEV__) {
        console.warn(
          "[RETINOVA NATIVE API] localhost is not reachable from physical devices. Please set server LAN IP in EXPO_PUBLIC_API_BASE_URL."
        );
      }
    }
    if (__DEV__) {
      console.log(`[RETINOVA API]\nplatform=${Platform.OS}\nbaseUrl=${envUrl}`);
    }
    return envUrl;
  }

  // 2. Web browser context: derive backend port 5000 from current hostname
  if (typeof window !== "undefined" && window.location?.hostname) {
    const host = window.location.hostname;
    const proto = window.location.protocol || "http:";
    const derived = `${proto}//${host}:5000`;
    if (__DEV__) {
      console.log(`[RETINOVA WEB API]\nplatform=web\nbaseUrl=${derived}`);
    }
    return derived;
  }

  return "";
}

let _apiBaseUrl: string = resolveInitialApiBaseUrl();

export function setApiBaseUrl(url: string) {
  _apiBaseUrl = url.replace(/\/$/, "");
}

export function getApiBaseUrl(): string {
  const isNative = Platform.OS === "android" || Platform.OS === "ios";

  // Native execution warning if pointing to localhost
  if (isNative && (_apiBaseUrl.includes("localhost") || _apiBaseUrl.includes("127.0.0.1"))) {
    const envRaw = process.env.EXPO_PUBLIC_API_BASE_URL ?? "";
    const envUrl = envRaw.replace(/\/$/, "").trim();
    if (envUrl && !envUrl.includes("localhost") && !envUrl.includes("127.0.0.1")) {
      _apiBaseUrl = envUrl;
    }
  }

  return _apiBaseUrl;
}

export async function loadApiBaseUrl() {
  const isNative = Platform.OS === "android" || Platform.OS === "ios";
  try {
    const stored = await storage.getItem(STORAGE_KEYS.API_BASE_URL);
    if (stored) {
      const cleaned = stored.replace(/\/$/, "");
      // On native: NEVER allow a stored localhost value to override the LAN IP.
      if (isNative && (cleaned.includes("localhost") || cleaned.includes("127.0.0.1"))) {
        if (__DEV__) {
          console.warn("[RETINOVA NATIVE API] Ignoring stale stored localhost URL:", cleaned);
        }
        return;
      }
      _apiBaseUrl = cleaned;
      if (__DEV__ && isNative) {
        console.log(`[RETINOVA NATIVE API]\nplatform=${Platform.OS}\nbaseUrl=${cleaned}`);
      }
    }
  } catch {}
}

async function getAuthHeader(): Promise<Record<string, string>> {
  try {
    const token = await storage.getItem(STORAGE_KEYS.AUTH_TOKEN);
    if (token) return { Authorization: `Bearer ${token}` };
  } catch {}
  return {};
}

// 120s timeout to allow full Swin V2 / Grad-CAM / vessel / candidate lesion analysis
const REQUEST_TIMEOUT_MS = 120000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error("Connection timed out. The server or AI pipeline took longer than expected to respond."));
    }, ms);
    promise.then(
      (v) => { clearTimeout(timer); resolve(v); },
      (e) => { clearTimeout(timer); reject(e); }
    );
  });
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const authHeader = await getAuthHeader();
  const currentBaseUrl = getApiBaseUrl();
  const url = `${currentBaseUrl}/api${path}`;
  const method = (options.method || "GET").toUpperCase();

  if (__DEV__) {
    // Exclude sensitive payload fields (tokens, passwords)
    let safeBody: any = undefined;
    if (options.body && typeof options.body === "string") {
      try {
        const parsed = JSON.parse(options.body);
        const copy = { ...parsed };
        if (copy.password) copy.password = "[REDACTED]";
        if (copy.token) copy.token = "[REDACTED]";
        safeBody = copy;
      } catch {
        safeBody = options.body;
      }
    }
    console.log(`[RETINOVA NATIVE API] method=${method} url=${url}`, safeBody !== undefined ? { body: safeBody } : "");
  }

  let response: Response;
  try {
    response = await withTimeout(
      fetch(url, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          ...authHeader,
          ...(options.headers || {}),
        },
      }),
      REQUEST_TIMEOUT_MS
    );
  } catch (e: any) {
    if (__DEV__) {
      console.error(`[RETINOVA NATIVE API ERROR] method=${method} url=${url} error=${e.message}`);
    }
    if (e.message?.includes("timed out")) throw e;
    throw new Error(
      `Cannot connect to RETINOVA server at ${currentBaseUrl}. ` +
      `Please check your network connection and ensure the server is running.`
    );
  }

  const contentType = response.headers.get("content-type") || "";

  if (__DEV__) {
    console.log(`[RETINOVA NATIVE API RESPONSE] method=${method} url=${url} status=${response.status} (${contentType})`);
  }

  // Handle 401 Unauthorized
  if (response.status === 401) {
    if (__DEV__) {
      console.error(`[RETINOVA NATIVE API ERROR] method=${method} url=${url} status=401 message=Unauthorized`);
    }
    try {
      await storage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
      await storage.removeItem(STORAGE_KEYS.USER_DATA);
    } catch {}
    throw new Error("Session expired. Please log in again.");
  }

  if (!response.ok) {
    const rawText = await response.text();
    let errorMsg = `Server error (HTTP ${response.status})`;
    try {
      const data = JSON.parse(rawText);
      errorMsg = data.error || data.message || errorMsg;
    } catch {
      if (rawText && rawText.length < 300) {
        errorMsg = `${errorMsg}: ${rawText}`;
      }
    }
    if (__DEV__) {
      console.error(`[RETINOVA NATIVE API ERROR] method=${method} url=${url} status=${response.status} message=${errorMsg}`);
    }
    throw new Error(errorMsg);
  }

  return response.json() as Promise<T>;
}

/**
 * Native multipart request (Android / iOS)
 * Uses React Native FormData with fetch.
 */
async function requestMultipartNative<T>(path: string, formData: FormData): Promise<T> {
  const authHeader = await getAuthHeader();
  const currentBaseUrl = getApiBaseUrl();
  const url = `${currentBaseUrl}/api${path}`;

  if (__DEV__) {
    console.log(`[RETINOVA NATIVE API] multipart=true url=${url}`);
  }

  let response: Response;
  try {
    response = await withTimeout(
      fetch(url, {
        method: "POST",
        headers: { ...authHeader },
        body: formData,
      }),
      REQUEST_TIMEOUT_MS
    );
  } catch (e: any) {
    if (__DEV__) {
      console.error(`[RETINOVA NATIVE API ERROR] multipart POST ${url}: ${e.message}`);
    }
    if (e.message?.includes("timed out")) throw e;
    if (e.message?.includes("Network request failed") || e.message?.includes("fetch")) {
      throw new Error(
        `Connection unavailable. Please check your network and ensure the RETINOVA server is running at ${currentBaseUrl}`
      );
    }
    throw e;
  }

  if (!response.ok) {
    const rawText = await response.text();
    let errorMsg = `Server error (HTTP ${response.status})`;
    try {
      const data = JSON.parse(rawText);
      errorMsg = data.error || data.message || errorMsg;
    } catch {
      if (rawText && rawText.length < 300) {
        errorMsg = `${errorMsg}: ${rawText}`;
      }
    }
    throw new Error(errorMsg);
  }

  return response.json() as Promise<T>;
}

/**
 * Web multipart request (Browser / PWA)
 * Uses browser-native XMLHttpRequest and window.FormData.
 */
async function requestMultipartWeb<T>(path: string, formData: any): Promise<T> {
  const authHeader = await getAuthHeader();
  const currentBaseUrl = getApiBaseUrl();
  const url = `${currentBaseUrl}/api${path}`;

  return new Promise<T>((resolve, reject) => {
    const xhr = new (window as any).XMLHttpRequest();
    xhr.open("POST", url, true);
    if (authHeader["Authorization"]) {
      xhr.setRequestHeader("Authorization", authHeader["Authorization"]);
    }
    xhr.timeout = REQUEST_TIMEOUT_MS;
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText) as T);
        } catch (e: any) {
          reject(new Error(`Failed to parse multipart response: ${e.message}`));
        }
      } else {
        let errorMsg = `Server error (HTTP ${xhr.status})`;
        try {
          const data = JSON.parse(xhr.responseText);
          errorMsg = data.error || data.message || errorMsg;
        } catch {
          if (xhr.responseText && xhr.responseText.length < 300) {
            errorMsg = `${errorMsg}: ${xhr.responseText}`;
          }
        }
        reject(new Error(errorMsg));
      }
    };
    xhr.onerror = () => reject(new Error(`Connection unavailable. Ensure server is running at ${currentBaseUrl}`));
    xhr.ontimeout = () => reject(new Error("Connection timed out. The server took longer than expected to respond."));
    xhr.send(formData);
  });
}

export const api = {
  get: <T>(path: string) => request<T>(path, { method: "GET" }),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "POST", body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "PUT", body: JSON.stringify(body) }),
  postMultipart: <T>(path: string, formData: any) =>
    Platform.OS === "web"
      ? requestMultipartWeb<T>(path, formData)
      : requestMultipartNative<T>(path, formData),
};

// Connection health check - used by Settings screen
export async function pingServer(): Promise<{ ok: boolean; latencyMs?: number; error?: string }> {
  const start = Date.now();
  try {
    const currentBaseUrl = getApiBaseUrl();
    const resp = await withTimeout(
      fetch(`${currentBaseUrl}/api/auth/demo-users`),
      8000
    );
    const latencyMs = Date.now() - start;
    if (resp.ok) return { ok: true, latencyMs };
    return { ok: false, error: `HTTP ${resp.status}` };
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}
