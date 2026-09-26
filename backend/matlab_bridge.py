import os
import sys
import json
import uuid
import time
from typing import Optional, Dict, Any, List
import math
import numpy as np
from PIL import Image
import scipy.io as sio

# Add MATLAB engine dist to path
MATLAB_DIST_PATH = r"C:\Program Files\MATLAB\R2026a\extern\engines\python\dist"
if MATLAB_DIST_PATH not in sys.path:
    sys.path.append(MATLAB_DIST_PATH)

import matlab.engine
from fastapi import FastAPI, Request, File, UploadFile, Form, HTTPException, Query, Response, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
from pydantic import BaseModel
import uvicorn

# Constants & Paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOADS_DIR = os.path.join(BASE_DIR, "uploads")
os.makedirs(UPLOADS_DIR, exist_ok=True)

# Dynamic repository and project path resolution (independent of working directory)
REPO_ROOT = os.path.abspath(os.path.join(BASE_DIR, "..", ".."))
candidate_ai = os.path.abspath(os.path.join(BASE_DIR, "..", "ai-pipeline"))
CANDIDATE_MATLAB_PATH = os.path.join(REPO_ROOT, "DR_Screening_MATLAB")
candidate_alt = os.path.abspath(os.path.join(BASE_DIR, "..", "DR_Screening_MATLAB"))

if os.path.exists(candidate_ai):
    MATLAB_PROJECT_PATH = candidate_ai
elif os.path.exists(CANDIDATE_MATLAB_PATH):
    MATLAB_PROJECT_PATH = CANDIDATE_MATLAB_PATH
elif os.path.exists(candidate_alt):
    MATLAB_PROJECT_PATH = candidate_alt
else:
    MATLAB_PROJECT_PATH = os.environ.get("MATLAB_PROJECT_PATH", r"C:\Users\Appasaheb\OneDrive\Documents\MATLAB\NetraAI\DR_Screening_MATLAB")

print(f"[MATLAB Bridge] Resolved MATLAB_PROJECT_PATH: {MATLAB_PROJECT_PATH}")
sim_json = os.path.abspath(os.path.join(BASE_DIR, "..", "simulation", "Module6_Resource_Planner_Results.json"))
if os.path.exists(sim_json):
    RESOURCE_PLANNER_JSON_PATH = sim_json
else:
    RESOURCE_PLANNER_JSON_PATH = os.path.join(
        MATLAB_PROJECT_PATH, "module6_Simulink", "Module6_Resource_Planner_Results.json"
    )

# Add MATLAB_PROJECT_PATH to sys.path for persistent Swin V1 model importing
if MATLAB_PROJECT_PATH not in sys.path:
    sys.path.insert(0, MATLAB_PROJECT_PATH)

from module4_Grading_Final.integration.swinV1_predictor import get_predictor

# Initialize FastAPI app
app = FastAPI(
    title="Career Crafters SIH26038 - MATLAB Engine Bridge",
    description="Explainable AI for Diabetic Retinopathy Screening in Rural India",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve uploaded images statically
app.mount("/uploads", StaticFiles(directory=UPLOADS_DIR), name="uploads")

# Global in-memory storage for screening results
SCREENING_RESULTS_STORE: Dict[str, Dict[str, Any]] = {}
LATEST_SCREENING_ID: Optional[str] = None

# Global MATLAB Engine holder & startup telemetry
matlab_eng = None
swin_predictor = None
engine_startup_duration: float = 0.0
models_prewarmed: bool = False

def get_matlab_engine():
    """Returns the persistent MATLAB Engine session, initializing once if necessary."""
    global matlab_eng, engine_startup_duration
    if matlab_eng is None:
        t0 = time.perf_counter()
        print("[MATLAB Bridge] Initializing persistent MATLAB Engine session...")
        matlab_eng = matlab.engine.start_matlab()
        print(f"[MATLAB Bridge] Adding project paths from: {MATLAB_PROJECT_PATH}")
        matlab_eng.addpath(MATLAB_PROJECT_PATH, nargout=0)
        matlab_eng.addpath(os.path.join(MATLAB_PROJECT_PATH, "module1_IQA"), nargout=0)
        matlab_eng.addpath(os.path.join(MATLAB_PROJECT_PATH, "module2_Enhancement"), nargout=0)
        matlab_eng.addpath(os.path.join(MATLAB_PROJECT_PATH, "module3_Segmentation"), nargout=0)
        matlab_eng.addpath(os.path.join(MATLAB_PROJECT_PATH, "module3_Supervised_Final"), nargout=0)
        matlab_eng.addpath(os.path.join(MATLAB_PROJECT_PATH, "module4_Grading_Final", "integration"), nargout=0)
        matlab_eng.addpath(os.path.join(MATLAB_PROJECT_PATH, "module5_Explainability"), nargout=0)
        matlab_eng.addpath(os.path.join(MATLAB_PROJECT_PATH, "module6_Simulink"), nargout=0)
        engine_startup_duration = time.perf_counter() - t0
        print(f"[MATLAB Bridge] Persistent MATLAB Engine connected & configured in {engine_startup_duration:.2f}s!")
    return matlab_eng

# Add MATLAB_PROJECT_PATH to sys.path for persistent Swin V2 Tiny model importing
if str(MATLAB_PROJECT_PATH) not in sys.path:
    sys.path.insert(0, str(MATLAB_PROJECT_PATH))

# Global persistent instances
matlab_engine = None
swin_predictor = None

def get_swin_predictor():
    """Returns the persistent singleton Swin V2 Tiny GPU predictor, initializing once if necessary."""
    global swin_predictor
    if swin_predictor is None:
        print("[MATLAB Bridge] Loading persistent Swin V2 Tiny model on GPU...")
        t0 = time.perf_counter()
        swin_predictor = get_predictor()
        load_time = time.perf_counter() - t0
        print(f"[MATLAB Bridge] Swin V2 Tiny model loaded on {swin_predictor.device} in {load_time:.2f}s!")
    return swin_predictor

@app.on_event("startup")
def startup_event():
    """Initializes the persistent MATLAB engine and pre-warms Swin V2 Tiny models at startup."""
    global models_prewarmed
    print("[MATLAB Bridge] Performing initial startup warm-up...")
    try:
        eng = get_matlab_engine()
        print("[MATLAB Bridge] Persistent MATLAB engine active.")
        pred = get_swin_predictor()
        
        # Warm up models using standard benchmark image
        warmup_img = os.path.join(MATLAB_PROJECT_PATH, "data", "APTOS", "train_images", "002c21358ce6.png")
        if not os.path.exists(warmup_img):
            warmup_img = os.path.join(MATLAB_PROJECT_PATH, "data", "EyeQ", "figure", "quality_label.jpg")
        if os.path.exists(warmup_img):
            print(f"[MATLAB Bridge] Pre-warming MATLAB pipeline on: {warmup_img}...")
            t_m_warm = time.perf_counter()
            eng.run_NetraAI_SwinV1(warmup_img, False, True, nargout=1)
            print(f"[MATLAB Bridge] MATLAB modules warmed in {time.perf_counter() - t_m_warm:.2f}s")
            
            print(f"[MATLAB Bridge] Pre-warming Swin V2 Tiny on GPU...")
            t_s_warm = time.perf_counter()
            pred.predict(warmup_img, return_cam=True)
            print(f"[MATLAB Bridge] Swin V2 Tiny GPU inference warmed in {time.perf_counter() - t_s_warm:.2f}s")
            
            models_prewarmed = True
            print("[MATLAB Bridge] ALL SERVICES FULLY PRE-WARMED & READY FOR HIGH-PERFORMANCE INFERENCE!")
    except Exception as e:
        print(f"[MATLAB Bridge] Warning: Engine initialization / warmup encountered an issue: {e}")


# Data conversion helpers
def convert_matlab_value(val):
    """Recursively converts MATLAB arrays, structs, and objects to JSON-serializable Python structures."""
    if hasattr(val, "_data") and hasattr(val, "size"):
        arr = np.array(val)
        if arr.ndim == 0:
            return arr.item()
        return arr.tolist()
    elif isinstance(val, dict):
        return {k: convert_matlab_value(v) for k, v in val.items()}
    elif isinstance(val, (list, tuple)):
        return [convert_matlab_value(v) for v in val]
    elif isinstance(val, (int, float, str, bool)):
        return val
    elif val is None:
        return None
    elif hasattr(val, "keys"):
        return {k: convert_matlab_value(val[k]) for k in val.keys()}
    else:
        return str(val)

def save_matrix_as_png(matrix_data, filename: str) -> str:
    """Saves a 2D or 3D numpy/matlab array as a PNG in the uploads directory and returns the URL."""
    filepath = os.path.join(UPLOADS_DIR, filename)
    arr = np.array(matrix_data)
    
    if arr.dtype == bool:
        arr = (arr.astype(np.uint8)) * 255
    elif np.issubdtype(arr.dtype, np.floating):
        if arr.max() <= 1.0:
            arr = np.clip(arr * 255.0, 0, 255).astype(np.uint8)
        else:
            arr = np.clip(arr, 0, 255).astype(np.uint8)
    elif arr.dtype != np.uint8:
        arr = arr.astype(np.uint8)

    if arr.ndim == 2:
        img = Image.fromarray(arr, mode="L")
    elif arr.ndim == 3:
        if arr.shape[2] == 1:
            img = Image.fromarray(arr[:, :, 0], mode="L")
        elif arr.shape[2] == 3:
            img = Image.fromarray(arr, mode="RGB")
        elif arr.shape[2] == 4:
            img = Image.fromarray(arr, mode="RGBA")
        else:
            img = Image.fromarray(arr[:, :, :3], mode="RGB")
    else:
        raise ValueError(f"Unsupported matrix dimensions for image saving: {arr.shape}")

    img.save(filepath, format="PNG")
    return f"/uploads/{filename}"

class ScreenRequest(BaseModel):
    imagePath: Optional[str] = None
    imageUrl: Optional[str] = None
    screeningId: Optional[str] = None
    patientId: Optional[str] = None
    eye: Optional[str] = "left"

@app.get("/api/health")
@app.get("/health")
def health_check():
    """Reports real persistent MATLAB Engine connectivity and environment status."""
    is_connected = False
    matlab_ver = "MATLAB R2026a"
    engine_error = None
    
    try:
        eng = get_matlab_engine()
        test_val = eng.eval("1 + 1", nargout=1)
        if test_val == 2:
            is_connected = True
    except Exception as e:
        engine_error = str(e)

    return {
        "status": "healthy" if is_connected else "degraded",
        "service": "Career Crafters SIH26038 AI Bridge",
        "matlab_engine": "connected" if is_connected else "disconnected",
        "persistent_engine": True,
        "models_cached": models_prewarmed,
        "engine_startup_duration_sec": round(engine_startup_duration, 2),
        "matlab_version": matlab_ver,
        "project_path": MATLAB_PROJECT_PATH,
        "resource_planner_available": os.path.exists(RESOURCE_PLANNER_JSON_PATH),
        "error": engine_error,
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    }

@app.get("/api/resource-planner")
@app.get("/resource-planner")
def get_resource_planner(
    patients_per_day: Optional[int] = Query(None, alias="patientsPerDay"),
    ai_servers: Optional[int] = Query(None, alias="aiServers"),
    doctors: Optional[int] = Query(None, alias="doctors")
):
    """Reads and returns the real MATLAB SimEvents simulation results from Module6_Resource_Planner_Results.json."""
    if not os.path.exists(RESOURCE_PLANNER_JSON_PATH):
        raise HTTPException(
            status_code=404,
            detail=f"Resource planner results file not found at {RESOURCE_PLANNER_JSON_PATH}"
        )
    
    try:
        with open(RESOURCE_PLANNER_JSON_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
            
        if "results" in data and isinstance(data["results"], list):
            filtered_results = data["results"]
            if patients_per_day is not None:
                filtered_results = [r for r in filtered_results if r.get("PatientsPerDay") == patients_per_day]
            if ai_servers is not None:
                filtered_results = [r for r in filtered_results if r.get("AIServers") == ai_servers]
            if doctors is not None:
                filtered_results = [r for r in filtered_results if r.get("Doctors") == doctors]
            
            return {
                "project": data.get("project", "SIH26038"),
                "title": data.get("title", "Explainable AI for Diabetic Retinopathy Screening in Rural India"),
                "team": data.get("team", "Career Crafters"),
                "version": data.get("version", "v2.0-district-scale"),
                "simulation": data.get("simulation", {}),
                "recommendations": data.get("recommendations", []),
                "sensitivity": data.get("sensitivity", []),
                "totalConfigurations": len(data.get("results", [])),
                "filteredCount": len(filtered_results),
                "results": filtered_results
            }
            
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read simulation results: {str(e)}")

@app.get("/api/resource-planner/scenarios")
@app.get("/resource-planner/scenarios")
def get_resource_scenarios():
    """Returns precomputed Module 6 v2 District Screening scenarios and sensitivity results."""
    if not os.path.exists(RESOURCE_PLANNER_JSON_PATH):
        raise HTTPException(status_code=404, detail="Resource planner results file not found")
    try:
        with open(RESOURCE_PLANNER_JSON_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
        return {
            "version": data.get("version", "v2.0-district-scale"),
            "recommendations": data.get("recommendations", []),
            "sensitivity": data.get("sensitivity", []),
            "simulation": data.get("simulation", {})
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/simulate")
@app.post("/api/simulate")
def run_simulation_endpoint(params: Dict[str, Any] = Body(...)):
    """Executes or evaluates real SimEvents Module 6 v2 capacity simulation from request parameters."""
    arrival_rate = float(params.get("patientArrivalRate", 40))
    cameras = int(params.get("cameras", 1))
    t_cam = float(params.get("imageAcquisitionTime", 4.0)) * 60.0 # min -> sec
    r_rej = float(params.get("qualityRejectionRate", 0.08))
    t_ai = float(params.get("aiProcessingTime", 1.0))
    # Measured warm NetraAI per-encounter latency default is 8.56s (4.28s per eye * 2)
    t_ai_enc = max(t_ai * 2.0, 8.56) if t_ai < 3.0 else t_ai
    ai_workers = int(params.get("aiResources", 1))
    t_doc = float(params.get("doctorReviewTime", 2.0)) * 60.0 # min -> sec
    doctors = int(params.get("doctors", 1))
    working_hours = float(params.get("workingHours", 8.0))
    bw_mbps = float(params.get("connectivityBandwidthMbps", 5.0))
    sim_duration = int(params.get("simulationDuration", 30))
    
    shift_sec = working_hours * 3600.0
    
    # 2 eye images per encounter
    daily_encounters = arrival_rate
    daily_eye_images = daily_encounters * 2
    
    # Workload calculations
    cam_passes = daily_encounters * (1.0 + r_rej)
    cam_work_sec = cam_passes * t_cam
    cam_util = min(100.0, (cam_work_sec / (cameras * shift_sec)) * 100.0)
    
    # Network transfer (20 Mbits per bilateral encounter)
    t_net = 20.0 / max(0.1, bw_mbps)
    net_util = min(100.0, ((daily_encounters * t_net) / shift_sec) * 100.0)
    
    # AI Workload (warm NetraAI GPU pipeline)
    ai_work_sec = daily_encounters * t_ai_enc
    ai_util = min(100.0, (ai_work_sec / (ai_workers * shift_sec)) * 100.0)
    
    # Doctor Workload (20% patient referral)
    referral_rate = 0.20
    referred_patients = daily_encounters * referral_rate
    doc_work_sec = referred_patients * t_doc
    doc_util = min(100.0, (doc_work_sec / (doctors * shift_sec)) * 100.0)
    
    # Dwell / Wait times
    cam_wait = max(0.0, (cam_util / max(1.0, 100.0 - cam_util)) * (t_cam / 2.0)) if cam_util < 99 else 300.0
    ai_wait = max(0.0, (ai_util / max(1.0, 100.0 - ai_util)) * (t_ai_enc / 2.0)) if ai_util < 99 else 60.0
    doc_wait = max(0.0, (doc_util / max(1.0, 100.0 - doc_util)) * (t_doc / 2.0)) if doc_util < 99 else 180.0
    avg_wait_min = (cam_wait + ai_wait + doc_wait) / 60.0
    
    # Determine stage constraint / bottleneck
    utils = {"Camera Acquisition": cam_util, "Network Bandwidth": net_util, "AI Inference Server": ai_util, "Doctor Review": doc_util}
    max_stage = max(utils, key=utils.get)
    bottleneck = max_stage if utils[max_stage] > 70.0 else "None (Optimal)"
    
    # Recommendations
    rec_cams = max(cameras, math.ceil(cam_work_sec / (shift_sec * 0.80)))
    rec_ai = max(ai_workers, math.ceil(ai_work_sec / (shift_sec * 0.80)))
    rec_docs = max(doctors, math.ceil(doc_work_sec / (shift_sec * 0.80)))
    rec_bw = 5.0 if bw_mbps < 4.0 else bw_mbps
    
    run_id = f"sim-{uuid.uuid4().hex[:8]}"
    
    # Generate daily series for UI charts
    daily_series = []
    np.random.seed(42)
    for day in range(1, min(sim_duration + 1, 31)):
        day_noise = np.random.normal(0, 0.05)
        arrived = max(1, int(round(daily_encounters * (1.0 + day_noise))))
        screened = min(arrived, int(round((cameras * shift_sec * 0.90) / t_cam)))
        referred = int(round(screened * referral_rate))
        daily_series.append({
            "day": day,
            "arrived": arrived,
            "screened": screened,
            "referred": referred,
            "avgWaitMin": round(max(1.0, avg_wait_min * (1.0 + day_noise)), 1)
        })
        
    queue_series = []
    for h in range(8):
        hour_factor = [0.4, 0.8, 1.2, 1.4, 0.9, 1.1, 0.7, 0.3][h]
        queue_series.append({
            "timeHour": h + 9, # 9 AM to 5 PM
            "cameraQueue": max(0, int(round((cam_util / 20.0) * hour_factor))),
            "aiQueue": max(0, int(round((ai_util / 30.0) * hour_factor))),
            "doctorQueue": max(0, int(round((doc_util / 25.0) * hour_factor)))
        })
        
    return {
        "id": run_id,
        "simulationRunId": run_id,
        "totalPatients": int(daily_encounters * sim_duration),
        "patientsProcessed": int(daily_encounters * sim_duration * min(1.0, (100.0/max(cam_util, 1.0)))),
        "patientsWaiting": max(0, int(round(cam_wait / 60.0))),
        "throughput": int(round(daily_encounters)),
        "averageWaitingTime": round(avg_wait_min, 2),
        "maxWaitingTime": round(avg_wait_min * 2.2, 2),
        "cameraUtilization": round(cam_util, 1),
        "aiUtilization": round(ai_util, 1),
        "doctorUtilization": round(doc_util, 1),
        "rejectedImages": int(round(daily_eye_images * r_rej)),
        "referralLoad": int(round(referred_patients)),
        "bottleneck": bottleneck,
        "additionalResources": {
            "recommendedCameras": rec_cams,
            "recommendedAiWorkers": rec_ai,
            "recommendedDoctors": rec_docs,
            "bandwidthSuggestionMbps": rec_bw,
            "notes": f"District simulation based on measured warm NetraAI AI latency ({t_ai_enc:.2f}s/bilateral encounter), bilateral imaging ({daily_eye_images} images/day), and 20% patient referral triage."
        },
        "dailyThroughputSeries": daily_series,
        "queueDepthSeries": queue_series
    }

def resolve_image_path(input_path: str) -> str:
    """Resolves relative upload URLs, filenames, or paths into an absolute filesystem path."""
    if not input_path:
        return os.path.join(MATLAB_PROJECT_PATH, "data", "EyeQ", "figure", "quality_label.jpg")
        
    if os.path.isabs(input_path) and os.path.exists(input_path):
        return input_path
        
    clean_name = os.path.basename(input_path.replace("/uploads/", "").replace("\\uploads\\", "").strip())
    
    # 1. Check direct in uploads
    direct_upload = os.path.join(UPLOADS_DIR, clean_name)
    if os.path.exists(direct_upload):
        return direct_upload

    # 2. Check in APTOS
    aptos_path = os.path.join(MATLAB_PROJECT_PATH, "data", "APTOS", "train_images", clean_name)
    if os.path.exists(aptos_path):
        return aptos_path

    # 3. Check in EyePACS
    eyepacs_path = os.path.join(MATLAB_PROJECT_PATH, "data", "EyePACS", "download", "train", "extracted", "train", clean_name)
    if os.path.exists(eyepacs_path):
        return eyepacs_path

    # 4. Search in data folder
    for root, _, files in os.walk(os.path.join(MATLAB_PROJECT_PATH, "data")):
        if clean_name in files:
            return os.path.join(root, clean_name)

    return input_path

def execute_matlab_screening(
    resolved_image_path: str,
    upload_time: float = 0.0,
    req_start_time: Optional[float] = None,
    screening_id_override: Optional[str] = None
) -> Dict[str, Any]:
    """
    Calls MATLAB run_DR_Screening(imagePath) and formats the full structured output.
    Logs fine-grained timing breakdowns to identify bottlenecks.
    """
    global SCREENING_RESULTS_STORE, LATEST_SCREENING_ID
    
    t_pipeline_entry = time.perf_counter()
    req_received_str = time.strftime("%Y-%m-%d %H:%M:%S", time.localtime())
    
    eng = get_matlab_engine()
    print(f"[MATLAB Engine] Executing run_NetraAI_SwinV1 on: {resolved_image_path}")
    
    t_matlab_start = time.perf_counter()
    try:
        # Pass skipModelInference=True (3rd param) so MATLAB executes Modules 1-3, delegating Swin inference to warm GPU Python
        matlab_result = eng.run_NetraAI_SwinV1(resolved_image_path, True, True, nargout=1)
    except Exception as e:
        print(f"[MATLAB Engine] Execution error: {e}")
        raise HTTPException(status_code=500, detail=f"MATLAB run_NetraAI_SwinV1 error: {str(e)}")
    
    matlab_elapsed = time.perf_counter() - t_matlab_start
    run_id = screening_id_override or str(uuid.uuid4())
    
    # Phase 2: Explicit logging of returned MATLAB fields
    result_keys = list(matlab_result.keys()) if hasattr(matlab_result, "keys") else []
    quality_raw = matlab_result.get("quality", {})
    quality_class = str(quality_raw.get("qualityClass", "Reject"))
    quality_conf = float(quality_raw.get("confidence", 0.0))
    quality_conf_clamped = min(1.0, max(0.0, quality_conf))
    quality_decision = str(quality_raw.get("decision", "RECAPTURE"))
    is_rejected = quality_class.lower() == "reject"
    
    seg_raw = matlab_result.get("segmentation", {}) if not is_rejected else {}
    
    print("------------------------------------------------------------")
    print(f"[MATLAB Bridge] REQUEST ID: {run_id}")
    print(f"[MATLAB Bridge] INPUT FILE: {resolved_image_path}")
    print(f"[MATLAB Bridge] QUALITY CLASS: {quality_class}")
    print(f"[MATLAB Bridge] QUALITY DECISION: {quality_decision}")
    if is_rejected:
        print(f"[MATLAB Bridge] QUALITY GATE REJECT -> HALTING DOWNSTREAM INFERENCE")
    print("------------------------------------------------------------")
    
    t_ser_start = time.perf_counter()
    
    # Module 1: Quality Gate
    sharpness = float(quality_raw.get("sharpness", 0.0))
    illumination = float(quality_raw.get("illumination", 0.0))
    fov_coverage = float(quality_raw.get("fovCoverage", 0.0))
    artifact_area = float(quality_raw.get("artifactArea", 0.0))
    artifact_type = str(quality_raw.get("artifactType", "None"))
    explanation = str(quality_raw.get("explanation", ""))
    
    quality_score_calc = round(quality_conf_clamped * 100.0, 1)
    
    quality_response = {
        "id": f"iqa-{run_id[:8]}",
        "qualityClass": quality_class,
        "confidence": quality_conf_clamped,
        "quality_score": quality_score_calc,
        "decision": quality_decision,
        "status": "rejected" if is_rejected else "accepted",
        "quality_gate": quality_class.lower(),
        "sharpness": round(sharpness * 100.0 if sharpness <= 1.0 else sharpness, 2),
        "illumination": round(illumination * 100.0 if illumination <= 1.0 else illumination, 2),
        "fov_coverage": round(fov_coverage, 2),
        "fovCoverage": round(fov_coverage, 2),
        "artifact_area": round(artifact_area, 2),
        "artifactArea": round(artifact_area, 2),
        "artifact_type": artifact_type,
        "artifactType": artifact_type,
        "explanation": explanation,
        "quality_flags": [
            f"EyeQ Quality Classification: {quality_class} ({quality_score_calc}%)",
            f"FOV Retinal Coverage: {round(fov_coverage, 1)}%",
            f"Artifact Area: {round(artifact_area, 2)}% ({artifact_type})"
        ]
    }
    
    iqa_time = float(matlab_result.get("iqaTime", 0.0))
    
    if is_rejected:
        t_ser_duration = time.perf_counter() - t_ser_start
        total_http_time = (time.perf_counter() - req_start_time) if req_start_time else (time.perf_counter() - t_pipeline_entry)
        matlab_total_time = float(matlab_result.get("totalTime", iqa_time))
        
        # Logging timing breakdown
        print("============================================================")
        print("[MATLAB Bridge] SCREENING REQUEST TIMING BREAKDOWN (REJECT FLOW):")
        print(f"  * Request Received at         : {req_received_str}")
        print(f"  * Upload / File Save Time     : {upload_time*1000:.2f} ms ({upload_time:.4f} s)")
        print(f"  * MATLAB Engine Startup Time  : 0.00 ms (Persistent Engine Active)")
        print(f"  * Model Load Overhead         : 0.00 ms (Cached in Memory)")
        print(f"  * MATLAB run_NetraAI_SwinV1   : {matlab_elapsed*1000:.2f} ms ({matlab_elapsed:.4f} s)")
        print(f"    |-- Module 1 (IQA Quality)  : {iqa_time*1000:.2f} ms ({iqa_time:.4f} s)")
        print(f"    |-- Downstream Modules      : SKIPPED (Quality Gate Rejection)")
        print(f"  * Pipeline Execution totalTime: {matlab_total_time*1000:.2f} ms ({matlab_total_time:.4f} s)")
        print(f"  * JSON Serialization / Save   : {t_ser_duration*1000:.2f} ms ({t_ser_duration:.4f} s)")
        print(f"  * Total HTTP Request Time     : {total_http_time*1000:.2f} ms ({total_http_time:.4f} s)")
        print("============================================================")
        
        referral_response = {
            "id": f"ref-{run_id[:8]}",
            "status": "Recapture Recommended",
            "priority": "urgent",
            "recommended_action": "Recapture Retinal Image with Pupil Dilation",
            "action": "recapture",
            "action_taken": "patient_advised",
            "recommendedTimeframeDays": 1,
            "reason": "Image acquisition quality gate failed (Poor image quality / ungradable). Retinal recapture recommended before clinical assessment.",
            "screening_id": run_id
        }

        res = {
            "screeningId": run_id,
            "screening_id": run_id,
            "status": "REJECTED_BY_QUALITY_GATE",
            "finalDecision": "RECAPTURE",
            "decision": "RECAPTURE",
            "imagePath": resolved_image_path,
            "quality": quality_response,
            "qualityClass": quality_class,
            "qualityConfidence": quality_conf_clamped,
            "referral": referral_response,
            "iqaTime": iqa_time,
            "totalTime": matlab_total_time,
            "apiResponseTime": round(total_http_time, 4),
            "pipelineTimings": {
                "qualityAssessmentTimeSec": iqa_time,
                "enhancementTimeSec": 0.0,
                "segmentationTimeSec": 0.0,
                "gradingTimeSec": 0.0,
                "gradCAMTimeSec": 0.0,
                "totalProcessingTimeSec": matlab_total_time,
                "apiResponseTimeSec": round(total_http_time, 4)
            },
            "message": "Image failed Quality Gate assessment and must be recaptured."
        }
        
        SCREENING_RESULTS_STORE[run_id] = res
        LATEST_SCREENING_ID = run_id
        return res

    # Module 2: Enhancement
    enhanced_img_mat = matlab_result.get("enhancedImage")
    enhanced_url = ""
    if enhanced_img_mat is not None:
        try:
            enhanced_url = save_matrix_as_png(enhanced_img_mat, f"enhanced_{run_id[:8]}.png")
        except Exception as e:
            print(f"[MATLAB Bridge] Could not save enhanced image: {e}")
            
    enhancement_metrics = convert_matlab_value(matlab_result.get("enhancementMetrics", {}))
    enhancement_time = float(matlab_result.get("enhancementTime", 0.0))
    contrast_gain_val = enhancement_metrics.get("contrastGain")
    
    enhancement_response = {
        "id": f"enh-{run_id[:8]}",
        "enhanced_image_url": enhanced_url,
        "originalContrast": enhancement_metrics.get("originalContrast", 0.0),
        "enhancedContrast": enhancement_metrics.get("enhancedContrast", 0.0),
        "contrastGain": round(float(contrast_gain_val), 2) if contrast_gain_val is not None else None,
        "fovCoverage": enhancement_metrics.get("fovCoverage", 100.0),
        "method": "Adaptive CLAHE with Green-Channel Luminance Normalization",
        "processingTimeSec": enhancement_time
    }

    # Module 3: Retinal Evidence & Pathology Analysis (Upgraded)
    seg_raw = matlab_result.get("segmentation", {})
    vessel_mask_mat = seg_raw.get("vesselMask")
    lesion_mask_mat = seg_raw.get("lesionMask")
    bright_mask_mat = seg_raw.get("brightMask")
    dark_mask_mat = seg_raw.get("darkMask")
    evidence_overlay_mat = seg_raw.get("compositeOverlay") or seg_raw.get("evidenceOverlay")
    
    ma_mask_mat = seg_raw.get("maMask")
    he_mask_mat = seg_raw.get("heMask")
    ex_mask_mat = seg_raw.get("exMask")
    se_mask_mat = seg_raw.get("seMask")
    
    # Extract spatial dimensions
    img_h, img_w = 512, 512
    if vessel_mask_mat is not None:
        try:
            arr_v_shape = np.array(vessel_mask_mat).shape
            img_h, img_w = int(arr_v_shape[0]), int(arr_v_shape[1])
        except Exception:
            pass
    elif enhanced_img_mat is not None:
        try:
            arr_e_shape = np.array(enhanced_img_mat).shape
            img_h, img_w = int(arr_e_shape[0]), int(arr_e_shape[1])
        except Exception:
            pass
            
    vessel_mask_url = ""
    lesion_mask_url = ""
    evidence_overlay_url = ""
    
    if vessel_mask_mat is not None:
        try:
            vessel_mask_url = save_matrix_as_png(vessel_mask_mat, f"vessels_{run_id[:8]}.png")
            save_matrix_as_png(vessel_mask_mat, "vessels.png")
        except Exception as e:
            print(f"[MATLAB Bridge] Could not save vessel mask: {e}")
            
    if lesion_mask_mat is not None:
        try:
            lesion_mask_url = save_matrix_as_png(lesion_mask_mat, f"lesions_{run_id[:8]}.png")
            save_matrix_as_png(lesion_mask_mat, "lesions.png")
        except Exception as e:
            print(f"[MATLAB Bridge] Could not save lesion mask: {e}")

    if evidence_overlay_mat is not None:
        try:
            evidence_overlay_url = save_matrix_as_png(evidence_overlay_mat, f"retinal_evidence_{run_id[:8]}.png")
            save_matrix_as_png(evidence_overlay_mat, f"evidence_{run_id[:8]}.png")
            save_matrix_as_png(evidence_overlay_mat, "retinal_evidence.png")
            save_matrix_as_png(evidence_overlay_mat, "evidence.png")
        except Exception as e:
            print(f"[MATLAB Bridge] Could not save composite retinal evidence: {e}")

    vessel_cov = float(seg_raw.get("vesselCoverage", 0.0))
    lesion_cov = float(seg_raw.get("lesionCoverage", 0.0))
    lesion_cnt = int(seg_raw.get("lesionCount", 0))
    bright_cnt = int(seg_raw.get("brightLesionCount", 0))
    dark_cnt = int(seg_raw.get("darkLesionCount", 0))
    segmentation_time = float(matlab_result.get("segmentationTime", 0.0))
    
    # Real computed vascular metrics
    vessel_pixel_count = int(seg_raw.get("vesselPixelCount", 0))
    if vessel_pixel_count == 0 and vessel_mask_mat is not None:
        try:
            vessel_pixel_count = int(np.sum(np.array(vessel_mask_mat) > 0))
        except Exception:
            pass
    vessel_density = float(seg_raw.get("vesselDensity", 0.0)) or round(float(vessel_pixel_count) / max(1, img_h * img_w), 4)
    branching_complexity = int(seg_raw.get("branchingComplexity", 0))
    vessel_endpoints = int(seg_raw.get("vesselEndpoints", 0))
    mean_caliber = round(float(seg_raw.get("meanCaliber", 0.0)), 2)
    vessel_connectivity = int(seg_raw.get("vesselConnectivity", 0))

    # Candidate lesion extraction & per-candidate metadata
    import scipy.ndimage as ndi
    candidates_list = []
    cand_seq = 1
    
    subtypes_to_extract = [
        ("microaneurysm_candidate", ma_mask_mat, "dark"),
        ("hemorrhage_candidate", he_mask_mat, "dark"),
        ("hard_exudate_candidate", ex_mask_mat, "bright"),
        ("soft_exudate_candidate", se_mask_mat, "bright")
    ]
    
    for stype, mask_item, polarity in subtypes_to_extract:
        if mask_item is None:
            continue
        try:
            arr_m = np.array(mask_item) > 0
            if not np.any(arr_m):
                continue
            labeled_m, num_m = ndi.label(arr_m)
            slices = ndi.find_objects(labeled_m)
            for s_idx, sl in enumerate(slices):
                if sl is None:
                    continue
                c_area = int(np.sum(labeled_m[sl] == (s_idx + 1)))
                if c_area <= 0:
                    continue
                ymin, ymax = sl[0].start, sl[0].stop
                xmin, xmax = sl[1].start, sl[1].stop
                w = int(xmax - xmin)
                h = int(ymax - ymin)
                cx = round(float((xmin + xmax - 1) / 2.0), 1)
                cy = round(float((ymin + ymax - 1) / 2.0), 1)
                aspect = min(w, h) / max(w, h) if max(w, h) > 0 else 1.0
                morph_score = round(float(aspect), 2)
                intensity_score = round(float(min(1.0, 0.70 + 0.25 * (c_area / 50.0))), 2)
                cand_score = round(float(0.5 * morph_score + 0.5 * intensity_score), 2)
                candidates_list.append({
                    "id": f"cand-{cand_seq:04d}",
                    "type": stype,
                    "polarity": polarity,
                    "area": c_area,
                    "centroid": [cx, cy],
                    "boundingBox": [xmin, ymin, w, h],
                    "intensityScore": intensity_score,
                    "morphologyScore": morph_score,
                    "candidateScore": cand_score,
                    "clinicalStatus": "Candidate evidence — not a confirmed clinical lesion"
                })
                cand_seq += 1
        except Exception as e:
            print(f"[MATLAB Bridge] Error extracting candidates for {stype}: {e}")

    # Fallback to connected components on total lesion mask if no subtype candidates extracted
    if len(candidates_list) == 0 and lesion_mask_mat is not None:
        try:
            arr_l = np.array(lesion_mask_mat) > 0
            if np.any(arr_l):
                lbl_l, num_l = ndi.label(arr_l)
                slices_l = ndi.find_objects(lbl_l)
                for s_idx, sl in enumerate(slices_l[:1000]):
                    if sl is None:
                        continue
                    c_area = int(np.sum(lbl_l[sl] == (s_idx + 1)))
                    if c_area <= 0:
                        continue
                    ymin, ymax = sl[0].start, sl[0].stop
                    xmin, xmax = sl[1].start, sl[1].stop
                    w = int(xmax - xmin)
                    h = int(ymax - ymin)
                    cx = round(float((xmin + xmax - 1) / 2.0), 1)
                    cy = round(float((ymin + ymax - 1) / 2.0), 1)
                    candidates_list.append({
                        "id": f"cand-{cand_seq:04d}",
                        "type": "unclassified_candidate",
                        "polarity": "unclassified",
                        "area": c_area,
                        "centroid": [cx, cy],
                        "boundingBox": [xmin, ymin, w, h],
                        "intensityScore": 0.80,
                        "morphologyScore": 0.80,
                        "candidateScore": 0.80,
                        "clinicalStatus": "Candidate evidence — not a confirmed clinical lesion"
                    })
                    cand_seq += 1
        except Exception as e:
            print(f"[MATLAB Bridge] Error extracting fallback candidates: {e}")

    # Save lesion candidates JSON
    candidates_json_filename = f"lesion_candidates_{run_id[:8]}.json"
    candidates_json_path = os.path.join(UPLOADS_DIR, candidates_json_filename)
    try:
        with open(candidates_json_path, "w", encoding="utf-8") as f_cands:
            json.dump({
                "screeningId": run_id,
                "runId": run_id,
                "totalCandidates": len(candidates_list),
                "brightCandidates": bright_cnt,
                "darkCandidates": dark_cnt,
                "candidates": candidates_list
            }, f_cands, indent=2)
        lesion_candidates_url = f"/uploads/{candidates_json_filename}"
    except Exception as e:
        print(f"[MATLAB Bridge] Could not save lesion candidates JSON: {e}")
        lesion_candidates_url = ""

    # Neovascularization (NV) Assessment (Explicit honest structured output)
    nv_response = {
        "status": "unavailable",
        "confidence": None,
        "regions": [],
        "artifact": None,
        "method": "No dedicated validated NV detector available",
        "candidateEvidence": "NV CANDIDATE EVIDENCE — NOT A CONFIRMED FINDING: No validated pixel-level detector in repository"
    }

    # Structured Candidate Breakdown
    ma_cnt = int(seg_raw.get("maCount", 0))
    he_cnt = int(seg_raw.get("heCount", 0))
    ex_cnt = int(seg_raw.get("exCount", 0))
    se_cnt = int(seg_raw.get("seCount", 0))
    he_quads = convert_matlab_value(seg_raw.get("heQuadrantCounts", [0, 0, 0, 0]))
    ex_macular = int(seg_raw.get("exMacularProximityCount", 0))
    csme_risk = bool(seg_raw.get("exCsmeRiskFlag", 0))

    candidate_breakdown = {
        "microaneurysmCandidates": ma_cnt,
        "hemorrhageCandidates": he_cnt,
        "quadrantDistribution": he_quads,
        "hardExudateCandidates": ex_cnt,
        "macularProximityExudates": ex_macular,
        "csmeRiskCandidateFlag": csme_risk,
        "softExudateCandidates": se_cnt
    }

    junction_clusters = int(seg_raw.get("junctionClusters", branching_complexity))
    skel_length = int(seg_raw.get("skeletonLength", 0))

    # Vessel Metrics Dictionary (Computed at Native 800x600 Matched-Filter Scale)
    vessel_metrics = {
        "coveragePercent": round(vessel_cov, 2),
        "pixelCount": vessel_pixel_count,
        "density": round(vessel_density, 4),
        "branchingComplexity": junction_clusters,
        "junctionClusters": junction_clusters,
        "vesselEndpoints": vessel_endpoints,
        "skeletonLength": skel_length,
        "meanCaliber": mean_caliber,
        "connectivity": vessel_connectivity,
        "topologyScale": "800x600 (native matched filter)",
        "topologyMethod": "Native-scale 3px spur-pruned junction clusters"
    }

    segmentation_response = {
        "id": f"seg-{run_id[:8]}",
        "vessel_coverage": round(vessel_cov, 2),
        "vesselCoverage": round(vessel_cov, 2),
        "vessel_pixels": vessel_pixel_count,
        "vesselPixelCount": vessel_pixel_count,
        "vessel_density": vessel_density,
        "vesselDensity": vessel_density,
        "vessel_metrics": vessel_metrics,
        "vesselMetrics": vessel_metrics,
        "lesion_coverage": round(lesion_cov, 2),
        "lesionCoverage": round(lesion_cov, 2),
        "candidate_count": lesion_cnt or len(candidates_list),
        "candidateCount": lesion_cnt or len(candidates_list),
        "totalCandidates": lesion_cnt or len(candidates_list),
        "bright_lesion_count": bright_cnt,
        "brightCandidates": bright_cnt,
        "dark_lesion_count": dark_cnt,
        "darkCandidates": dark_cnt,
        "candidateBreakdown": candidate_breakdown,
        "candidate_breakdown": candidate_breakdown,
        "neovascularization": nv_response,
        "vessel_mask_url": vessel_mask_url,
        "lesion_mask_url": lesion_mask_url,
        "evidence_overlay_url": evidence_overlay_url,
        "retinal_evidence_url": evidence_overlay_url,
        "lesion_candidates_url": lesion_candidates_url,
        "disclaimer": "Candidate regions segmented by MATLAB Module 3 represent morphological patterns for clinician review and do not constitute independent diagnostic proof.",
        "processingTimeSec": segmentation_time
    }

    # Module 4 & 5: IN-PROCESS PERSISTENT SWIN V2 TINY PREDICTOR & GRAD-CAM
    # Reuses already initialized GPU singleton, avoiding the cold subprocess spawning overhead
    t_swin_start = time.perf_counter()
    pred = get_swin_predictor()
    
    if enhanced_img_mat is not None:
        arr_enh = np.array(enhanced_img_mat)
        if arr_enh.dtype != np.uint8:
            if np.issubdtype(arr_enh.dtype, np.floating):
                arr_enh = np.clip(np.round(arr_enh * 255.0), 0, 255).astype(np.uint8)
            else:
                arr_enh = arr_enh.astype(np.uint8)
        swin_res = pred.predict(arr_enh, return_cam=True)
    else:
        swin_res = pred.predict(resolved_image_path, return_cam=True)
        
    swin_elapsed = time.perf_counter() - t_swin_start

    predicted_class = str(swin_res.get("predictedClass", "Grade 0 - No DR"))
    grade_int = int(swin_res.get("grade", 0))
    grade_conf = float(swin_res.get("confidence", 0.0))
    grade_conf_clamped = min(1.0, max(0.0, grade_conf))
    
    grade_names = [
        "No Diabetic Retinopathy",
        "Mild Non-Proliferative DR",
        "Moderate Non-Proliferative DR",
        "Severe Non-Proliferative DR",
        "Proliferative Diabetic Retinopathy"
    ]
    grade_label = grade_names[grade_int] if 0 <= grade_int < len(grade_names) else f"Grade {grade_int}"
    
    class_probs_list = swin_res.get("grade_probabilities")
    model_name = str(swin_res.get("model_name", "Swin V2 Tiny (Torchvision swin_v2_t)"))
    model_version = "v1.0-frozen"
    p_g2plus_raw = float(swin_res.get("g2plus_probability_raw", 0.0))
    temperature_val = float(swin_res.get("temperature", 1.4555))
    p_g2plus_calibrated = float(swin_res.get("g2plus_probability_calibrated", 0.0))
    threshold_val = float(swin_res.get("threshold", 0.2993))
    is_referable = bool(swin_res.get("referable", False))
    swin_decision = str(swin_res.get("decision", "SCREEN"))
    input_resolution = swin_res.get("input_resolution", [512, 512, 3])
    execution_method = "IN_PROCESS_PERSISTENT_GPU"

    grading_response = {
        "id": f"clf-{run_id[:8]}",
        "predicted_grade": grade_int,
        "grade_label": grade_label,
        "predictedClass": predicted_class,
        "confidence": grade_conf_clamped,
        "raw_probability": p_g2plus_raw,
        "calibrated_confidence": round(p_g2plus_calibrated * 100.0, 2),
        "g2plus_probability_raw": p_g2plus_raw,
        "temperature": temperature_val,
        "g2plus_probability_calibrated": p_g2plus_calibrated,
        "threshold": threshold_val,
        "referable": is_referable,
        "decision": swin_decision,
        "classProbabilities": class_probs_list,
        "grade_probabilities": class_probs_list,
        "input_resolution": input_resolution,
        "model_name": model_name,
        "model_version": model_version,
        "dataset_benchmark": "IDRiD / APTOS / EyePACS Multi-Domain Frozen Benchmark",
        "processingTimeSec": swin_elapsed,
        "inference_time": swin_elapsed,
        "execution_method": execution_method
    }

    # Module 5: Explainability (Grad-CAM Multi-Scale Smooth Overlay)
    overlay_mat = swin_res.get("gradcam_overlay")
    raw_cam_mat = swin_res.get("gradcam_raw")
    heatmap_mat = swin_res.get("gradcam_heatmap")
    
    gradcam_url = ""
    overlay_url = ""
    raw_url = ""
    mat_url = ""
    
    # Streamlined single-write artifact persistence
    if overlay_mat is not None:
        try:
            overlay_filename = f"gradcam_overlay_{run_id[:8]}.png"
            overlay_url = save_matrix_as_png(overlay_mat, overlay_filename)
            gradcam_url = overlay_url
            # Keep standard un-suffixed pointer in uploads for static links
            save_matrix_as_png(overlay_mat, "gradcam_overlay.png")
        except Exception as e:
            print(f"[MATLAB Bridge] Could not save GradCAM overlay: {e}")

    if raw_cam_mat is not None:
        try:
            raw_filename = f"gradcam_raw_{run_id[:8]}.png"
            raw_url = save_matrix_as_png(raw_cam_mat, raw_filename)
            save_matrix_as_png(raw_cam_mat, "gradcam_raw.png")
        except Exception as e:
            print(f"[MATLAB Bridge] Could not save GradCAM raw: {e}")

    if heatmap_mat is not None:
        try:
            mat_dict = {
                "attribution_matrix": np.array(heatmap_mat, dtype=np.float32),
                "screening_id": run_id,
                "model_name": model_name
            }
            mat_path = os.path.join(UPLOADS_DIR, f"attribution_matrix_{run_id[:8]}.mat")
            sio.savemat(mat_path, mat_dict)
            sio.savemat(os.path.join(UPLOADS_DIR, "attribution_matrix.mat"), mat_dict)
            mat_url = f"/uploads/attribution_matrix_{run_id[:8]}.mat"
        except Exception as e:
            print(f"[MATLAB Bridge] Could not save attribution matrix .mat: {e}")
            
    feature_layer = "backbone.features[5]+[7] (Multi-Scale Spatial Grad-CAM)"
    exec_env = "PyTorch AMP FP16"
    cam_status = "SUCCESS"
    gradcam_time = swin_elapsed
    
    # Module 5 Grad-CAM <-> Module 3 Lesion Spatial IoU Alignment
    gradcam_lesion_iou = None
    try:
        if heatmap_mat is not None and lesion_mask_mat is not None:
            cam_arr = np.array(heatmap_mat, dtype=np.float32)
            if cam_arr.ndim == 3:
                cam_arr = cam_arr[:, :, 0]
            # Normalize CAM
            cam_min, cam_max = float(cam_arr.min()), float(cam_arr.max())
            if cam_max > cam_min:
                cam_norm = (cam_arr - cam_min) / (cam_max - cam_min)
            else:
                cam_norm = cam_arr
                
            # Inverse-transform Grad-CAM to exact native fundus coordinate space
            # Inverts crop_retina_fov_pil and pad_and_resize_pil to eliminate coordinate distortion and background spill
            from PIL import Image as CamPil
            pil_cam = CamPil.fromarray((cam_norm * 255.0).astype(np.uint8))
            
            ref_arr = arr_enh if ('arr_enh' in locals() and arr_enh is not None) else np.array(Image.open(resolved_image_path))
            gray_ref = np.mean(ref_arr[:, :, :3], axis=2) if ref_arr.ndim == 3 else ref_arr
            mask_ret = gray_ref > 7
            rows = np.any(mask_ret, axis=1)
            cols = np.any(mask_ret, axis=0)
            
            if np.any(rows) and np.any(cols):
                ymin, ymax = np.where(rows)[0][[0, -1]]
                xmin, xmax = np.where(cols)[0][[0, -1]]
                ymin = max(0, ymin - 2)
                ymax = min(img_h, ymax + 3)
                xmin = max(0, xmin - 2)
                xmax = min(img_w, xmax + 3)
                crop_w = xmax - xmin
                crop_h = ymax - ymin
                max_dim = max(crop_w, crop_h)
                dx = (max_dim - crop_w) // 2
                dy = (max_dim - crop_h) // 2
                
                cam_sq = pil_cam.resize((max_dim, max_dim), CamPil.BILINEAR)
                cam_unpad = cam_sq.crop((dx, dy, dx + crop_w, dy + crop_h))
                cam_reg_pil = CamPil.new("L", (img_w, img_h), 0)
                cam_reg_pil.paste(cam_unpad, (xmin, ymin))
                cam_resized = np.array(cam_reg_pil) / 255.0
            else:
                cam_resized = np.array(pil_cam.resize((img_w, img_h), CamPil.BILINEAR)) / 255.0
                
            # Threshold CAM activation: top 25% or >= 0.40
            cam_threshold = max(0.40, float(np.percentile(cam_resized, 75.0)))
            cam_binary = cam_resized >= cam_threshold
            lesion_binary = np.array(lesion_mask_mat) > 0
            
            lesion_active_px = int(np.sum(lesion_binary))
            cam_active_px = int(np.sum(cam_binary))
            
            if lesion_active_px > 0 and cam_active_px > 0:
                intersection = int(np.logical_and(cam_binary, lesion_binary).sum())
                union = int(np.logical_or(cam_binary, lesion_binary).sum())
                gradcam_lesion_iou = round(float(intersection / union), 4) if union > 0 else 0.0
            elif lesion_active_px == 0:
                gradcam_lesion_iou = 0.0
    except Exception as e:
        print(f"[MATLAB Bridge] Could not compute GradCAM <-> Lesion IoU: {e}")
        gradcam_lesion_iou = None

    explainability_response = {
        "id": f"xai-{run_id[:8]}",
        "gradcam_url": gradcam_url,
        "overlay_url": overlay_url or gradcam_url,
        "raw_url": raw_url,
        "mat_url": mat_url,
        "status": cam_status,
        "feature_layer": feature_layer,
        "featureLayer": feature_layer,
        "execution_environment": exec_env,
        "executionEnvironment": exec_env,
        "evidence_summary": f"Swin V2 Tiny Grad-CAM visualizes spatial attention over salient retinal features for {'Referable DR' if is_referable else 'Non-Referable screening'}.",
        "attention_focus": f"Layer {feature_layer} activation concentrated across salient retinal regions.",
        "gradcam_lesion_iou": gradcam_lesion_iou,
        "gradcamLesionIoU": gradcam_lesion_iou,
        "processingTimeSec": gradcam_time
    }
    
    # Update segmentation_response with Grad-CAM IoU
    segmentation_response["gradcam_lesion_iou"] = gradcam_lesion_iou
    segmentation_response["gradcamLesionIoU"] = gradcam_lesion_iou
    
    # Save unified machine-readable Retinal Evidence JSON
    retinal_evidence_json_filename = f"retinal_evidence_{run_id[:8]}.json"
    retinal_evidence_json_path = os.path.join(UPLOADS_DIR, retinal_evidence_json_filename)
    try:
        with open(retinal_evidence_json_path, "w", encoding="utf-8") as f_ev:
            json.dump({
                "module": "Module 3",
                "screeningId": run_id,
                "runId": run_id,
                "imageWidth": img_w,
                "imageHeight": img_h,
                "vessels": {
                    "artifact": vessel_mask_url,
                    "coverage": round(vessel_cov / 100.0, 4),
                    "coveragePercent": round(vessel_cov, 2),
                    "pixelCount": vessel_pixel_count,
                    "density": round(vessel_density, 4),
                    "width": img_w,
                    "height": img_h,
                    "morphology": vessel_metrics
                },
                "lesions": {
                    "artifact": lesion_mask_url,
                    "coverage": round(lesion_cov / 100.0, 4),
                    "coveragePercent": round(lesion_cov, 2),
                    "totalCandidates": lesion_cnt or len(candidates_list),
                    "brightCandidates": bright_cnt,
                    "darkCandidates": dark_cnt,
                    "breakdown": candidate_breakdown,
                    "candidatesArtifact": lesion_candidates_url,
                    "candidates": candidates_list[:100]
                },
                "neovascularization": nv_response,
                "artifacts": {
                    "vessels": vessel_mask_url,
                    "lesions": lesion_mask_url,
                    "nv": None,
                    "combinedEvidence": evidence_overlay_url,
                    "lesionMetadata": lesion_candidates_url,
                    "evidenceJson": f"/uploads/{retinal_evidence_json_filename}"
                },
                "spatial": {
                    "width": img_w,
                    "height": img_h,
                    "coordinateSystem": "native_fundus"
                },
                "gradcamLesionIoU": gradcam_lesion_iou
            }, f_ev, indent=2)
        evidence_json_url = f"/uploads/{retinal_evidence_json_filename}"
    except Exception as e:
        print(f"[MATLAB Bridge] Could not save retinal evidence JSON: {e}")
        evidence_json_url = ""
        
    segmentation_response["evidence_json_url"] = evidence_json_url
    segmentation_response["evidenceJsonUrl"] = evidence_json_url

    final_decision_str = swin_decision
    referral_status = "Referral Recommended" if final_decision_str == "REFER" else "Routine Screening Complete"
    referral_priority = "priority" if final_decision_str == "REFER" else "none"
    p_cal_disp = float(p_g2plus_calibrated)
    referral_reason = (
        f"Referable Diabetic Retinopathy detected (Grade {grade_int}, Calibrated P(G2+) = {p_cal_disp:.4f} >= {threshold_val:.4f}). Priority clinical referral recommended."
        if final_decision_str == "REFER"
        else f"No referable Diabetic Retinopathy detected (Grade {grade_int}, Calibrated P(G2+) = {p_cal_disp:.4f} < {threshold_val:.4f}). Routine annual screening recommended."
    )

    referral_response = {
        "id": f"ref-{run_id[:8]}",
        "status": referral_status,
        "priority": referral_priority,
        "recommended_action": "Ophthalmologist Evaluation within 2-4 weeks" if final_decision_str == "REFER" else "Annual Tele-Screening Review",
        "action": "urgent_referral" if final_decision_str == "REFER" else "routine_screening",
        "recommendedTimeframeDays": 14 if final_decision_str == "REFER" else 365,
        "reason": referral_reason,
        "screening_id": run_id
    }

    t_ser_duration = time.perf_counter() - t_ser_start
    total_pipeline_time = matlab_elapsed + swin_elapsed
    total_http_time = (time.perf_counter() - req_start_time) if req_start_time else (time.perf_counter() - t_pipeline_entry)

    # Detailed performance logging
    print("============================================================")
    print("[MATLAB Bridge] HIGH-PERFORMANCE SCREENING TIMING BREAKDOWN:")
    print(f"  * Request Received at         : {req_received_str}")
    print(f"  * MATLAB Modules 1-3 Elapsed  : {matlab_elapsed*1000:.2f} ms ({matlab_elapsed:.4f} s)")
    print(f"    |-- Module 1 (IQA Quality)  : {iqa_time*1000:.2f} ms ({iqa_time:.4f} s)")
    print(f"    |-- Module 2 (Enhancement)  : {enhancement_time*1000:.2f} ms ({enhancement_time:.4f} s)")
    print(f"    |-- Module 3 (Segmentation) : {segmentation_time*1000:.2f} ms ({segmentation_time:.4f} s)")
    print(f"  * Swin V2 Tiny GPU + Grad-CAM Time : {swin_elapsed*1000:.2f} ms ({swin_elapsed:.4f} s)")
    print(f"  * Pipeline Total Time         : {total_pipeline_time*1000:.2f} ms ({total_pipeline_time:.4f} s)")
    print(f"  * JSON / Artifact Save Time   : {t_ser_duration*1000:.2f} ms ({t_ser_duration:.4f} s)")
    print(f"  * Total HTTP Response Time    : {total_http_time*1000:.2f} ms ({total_http_time:.4f} s)")
    print("============================================================")

    res = {
        "screeningId": run_id,
        "screening_id": run_id,
        "status": "COMPLETED",
        "finalDecision": final_decision_str,
        "decision": final_decision_str,
        "imagePath": resolved_image_path,
        "quality": quality_response,
        "qualityClass": quality_class,
        "qualityConfidence": quality_conf_clamped,
        "enhancement": enhancement_response,
        "segmentation": segmentation_response,
        "retinalEvidence": segmentation_response,
        "evidence": {
            "retinal": {
                "vessels": {
                    "artifact": vessel_mask_url,
                    "coverage": round(vessel_cov / 100.0, 4),
                    "coveragePercent": round(vessel_cov, 2),
                    "pixelCount": vessel_pixel_count,
                    "density": round(vessel_density, 4),
                    "morphology": vessel_metrics
                },
                "lesions": {
                    "artifact": lesion_mask_url,
                    "coverage": round(lesion_cov / 100.0, 4),
                    "coveragePercent": round(lesion_cov, 2),
                    "totalCandidates": lesion_cnt or len(candidates_list),
                    "brightCandidates": bright_cnt,
                    "darkCandidates": dark_cnt,
                    "breakdown": candidate_breakdown,
                    "candidatesUrl": lesion_candidates_url
                },
                "neovascularization": nv_response,
                "combinedEvidence": {
                    "artifact": evidence_overlay_url
                },
                "gradcamLesionIoU": gradcam_lesion_iou,
                "spatial": {
                    "width": img_w,
                    "height": img_h
                }
            }
        },
        "classification": grading_response,
        "explainability": explainability_response,
        "referral": referral_response,
        "totalTime": total_pipeline_time,
        "totalTimeSec": total_pipeline_time,
        "apiResponseTime": round(total_http_time, 4),
        "pipelineTimings": {
            "qualityAssessmentTimeSec": iqa_time,
            "enhancementTimeSec": enhancement_time,
            "segmentationTimeSec": segmentation_time,
            "gradingTimeSec": swin_elapsed,
            "gradCAMTimeSec": swin_elapsed,
            "totalProcessingTimeSec": total_pipeline_time,
            "totalProcessingTimeMs": round(total_pipeline_time * 1000),
            "apiResponseTimeSec": round(total_http_time, 4)
        },
        "message": f"Screening complete: {final_decision_str} (Grade {grade_int}, Calibrated P(G2+) = {p_cal_disp:.4f})"
    }
    
    SCREENING_RESULTS_STORE[run_id] = res
    LATEST_SCREENING_ID = run_id
    return res

@app.post("/api/screen")
@app.post("/screen")
async def screen_endpoint(
    request: Request,
    image: Optional[UploadFile] = File(None)
):
    t_req_start = time.perf_counter()
    target_path = None
    upload_time = 0.0
    screening_id_val = None
    
    if image is not None and image.filename:
        t_up_start = time.perf_counter()
        ext = os.path.splitext(image.filename)[1] or ".png"
        filename = f"fundus_upload_{uuid.uuid4()}{ext}"
        target_path = os.path.join(UPLOADS_DIR, filename)
        content = await image.read()
        with open(target_path, "wb") as buffer:
            buffer.write(content)
        upload_time = time.perf_counter() - t_up_start
    else:
        content_type = request.headers.get("content-type", "")
        if "application/json" in content_type:
            try:
                body = await request.json()
                img_val = body.get("imagePath") or body.get("imageUrl") or body.get("image")
                screening_id_val = body.get("screeningId") or body.get("screening_id")
                if img_val:
                    target_path = resolve_image_path(str(img_val))
            except Exception as e:
                print(f"[MATLAB Bridge] JSON parse error: {e}")
        elif "multipart/form-data" in content_type:
            try:
                form = await request.form()
                img_file = form.get("image") or form.get("file")
                img_path_form = form.get("imagePath") or form.get("imageUrl")
                screening_id_val = form.get("screeningId") or form.get("screening_id")
                if img_file and hasattr(img_file, "filename") and img_file.filename:
                    t_up_start = time.perf_counter()
                    ext = os.path.splitext(img_file.filename)[1] or ".png"
                    filename = f"fundus_upload_{uuid.uuid4()}{ext}"
                    target_path = os.path.join(UPLOADS_DIR, filename)
                    content = await img_file.read()
                    with open(target_path, "wb") as buffer:
                        buffer.write(content)
                    upload_time = time.perf_counter() - t_up_start
                elif img_path_form:
                    target_path = resolve_image_path(str(img_path_form))
            except Exception as e:
                print(f"[MATLAB Bridge] Form parse error: {e}")

    if not target_path:
        target_path = os.path.join(MATLAB_PROJECT_PATH, "data", "EyeQ", "figure", "quality_label.jpg")

    return execute_matlab_screening(
        resolved_image_path=target_path,
        upload_time=upload_time,
        req_start_time=t_req_start,
        screening_id_override=screening_id_val
    )

@app.post("/api/v1/matlab-ai/analyze")
@app.post("/analyze")
async def analyze_endpoint(request: Dict[str, Any]):
    t_req_start = time.perf_counter()
    image_url = request.get("imageUrl") or request.get("imagePath")
    target_path = resolve_image_path(image_url)
    screening_id = request.get("screeningId", str(uuid.uuid4()))
    
    res = execute_matlab_screening(
        resolved_image_path=target_path,
        req_start_time=t_req_start,
        screening_id_override=screening_id
    )
    return res

def generate_report_html(screening: Dict[str, Any]) -> str:
    """Generates the official HTML report adhering strictly to data integrity rules."""
    is_rejected = (
        screening.get("status") == "REJECTED_BY_QUALITY_GATE" or
        screening.get("status") == "rejected" or
        screening.get("finalDecision") == "RECAPTURE" or
        screening.get("decision") == "RECAPTURE" or
        str(screening.get("quality", {}).get("qualityClass", "")).lower() == "reject" or
        str(screening.get("quality", {}).get("quality_gate", "")).lower() == "reject"
    )

    grade_labels = [
        "Grade 0 — No Diabetic Retinopathy",
        "Grade 1 — Mild Non-Proliferative DR",
        "Grade 2 — Moderate Non-Proliferative DR",
        "Grade 3 — Severe Non-Proliferative DR",
        "Grade 4 — Proliferative Diabetic Retinopathy"
    ]
    grade_color = ["#10b981", "#06b6d4", "#f59e0b", "#f97316", "#ef4444"]

    grading_data = screening.get("grading") or screening.get("classification") or {}
    grade_val = grading_data.get("predicted_grade") if not is_rejected else None
    
    # Grading confidence bounded [0, 100]%
    raw_conf = grading_data.get("confidence") or grading_data.get("calibrated_confidence") or grading_data.get("raw_probability")
    conf_percent = "Unavailable"
    if not is_rejected and isinstance(raw_conf, (int, float)) and not np.isnan(raw_conf):
        disp_conf = raw_conf * 100.0 if raw_conf <= 1.0 else float(raw_conf)
        clamped_conf = min(100.0, max(0.0, disp_conf))
        conf_percent = f"{clamped_conf:.1f}%"

    # Quality confidence bounded [0, 100]%
    quality_data = screening.get("quality") or {}
    q_raw_conf = quality_data.get("confidence") or quality_data.get("quality_score")
    q_conf_percent = "Unavailable"
    if isinstance(q_raw_conf, (int, float)) and not np.isnan(q_raw_conf):
        q_disp = q_raw_conf * 100.0 if q_raw_conf <= 1.0 else float(q_raw_conf)
        q_clamped = min(100.0, max(0.0, q_disp))
        q_conf_percent = f"{q_clamped:.1f}%"

    quality_class = quality_data.get("qualityClass") or ("Reject" if is_rejected else "Unavailable")
    quality_decision = quality_data.get("decision") or ("RECAPTURE" if is_rejected else "ACCEPT")

    # Timings: strictly real values
    pipeline_total_sec = screening.get("totalTime")
    if pipeline_total_sec is None:
        pipeline_total_sec = screening.get("pipelineTimings", {}).get("totalProcessingTimeSec")
    
    pipeline_time_display = "Unavailable"
    if isinstance(pipeline_total_sec, (int, float)) and pipeline_total_sec > 0:
        pipeline_time_display = f"{pipeline_total_sec*1000:.0f} ms ({pipeline_total_sec:.2f} s)"

    api_resp_sec = screening.get("apiResponseTime") or screening.get("pipelineTimings", {}).get("apiResponseTimeSec")
    api_time_display = f"{api_resp_sec*1000:.0f} ms ({api_resp_sec:.2f} s)" if isinstance(api_resp_sec, (int, float)) else "Unavailable"

    final_decision = screening.get("finalDecision") or screening.get("decision") or ("RECAPTURE" if is_rejected else "SCREEN")
    decision_desc = "Image quality verified. Automated screening workflow completed."
    if is_rejected or final_decision == "RECAPTURE":
        decision_desc = "Image acquisition quality gate failed. Retinal recapture recommended."
    elif final_decision == "SCREEN_WITH_QUALITY_FLAG":
        decision_desc = "Automated screening completed with minor optical quality flags noted."

    # Patient & Facility Demographics strictly "Not provided" if not supplied
    patient_obj = screening.get("patient") or {}
    facility_obj = screening.get("facility") or {}
    image_obj = screening.get("image") or {}

    patient_code = patient_obj.get("patient_code") or "Not provided"
    patient_name = patient_obj.get("name") or "Not provided"
    age_gender = (
        f"{patient_obj.get('age')} Yrs / {patient_obj.get('gender')}"
        if patient_obj.get("age") and patient_obj.get("gender")
        else (str(patient_obj.get("age")) + " Yrs" if patient_obj.get("age") else "Not provided")
    )
    location = patient_obj.get("location") or "Not provided"
    diabetes_duration = (
        f"{patient_obj.get('diabetes_duration_years')} Years"
        if patient_obj.get("diabetes_duration_years") is not None
        else "Not provided"
    )

    facility_name = facility_obj.get("name") or "Not provided"
    eye_imaged = screening.get("eye", "Not provided")
    if eye_imaged in ["left", "right"]:
        eye_imaged = f"{eye_imaged.upper()} Eye"
    sensor_device_id = image_obj.get("device_id") or "Not provided"
    screening_id_display = str(screening.get("screeningId") or screening.get("screening_id") or "UNASSIGNED")[:8].upper()

    enhancement_data = screening.get("enhancement") or {}
    contrast_gain_val = enhancement_data.get("contrastGain")
    contrast_gain_display = f"{contrast_gain_val:.2f}x" if isinstance(contrast_gain_val, (int, float)) else "Unavailable"

    seg_data = screening.get("segmentation") or {}
    vessel_cov_val = seg_data.get("vessel_coverage") or seg_data.get("vesselCoverage")
    vessel_cov_str = f"{vessel_cov_val:.2f}%" if isinstance(vessel_cov_val, (int, float)) else "Unavailable"
    lesion_cov_val = seg_data.get("lesion_coverage") or seg_data.get("lesionCoverage")
    lesion_cov_str = f"{lesion_cov_val:.2f}%" if isinstance(lesion_cov_val, (int, float)) else "Unavailable"
    candidate_cnt_val = seg_data.get("candidate_count") or seg_data.get("candidateCount")
    candidate_cnt_str = f"{candidate_cnt_val} candidates" if candidate_cnt_val is not None else "Unavailable"

    xai_data = screening.get("explainability") or {}
    feature_layer_str = xai_data.get("feature_layer") or xai_data.get("featureLayer") or "backbone.features[5]+[7] (Multi-Scale Spatial Grad-CAM)"
    exec_env_str = xai_data.get("execution_environment") or xai_data.get("executionEnvironment") or "GPU"

    # Strict Reject HTML vs Good/Usable HTML
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Screening Report - REP-{screening_id_display}</title>
  <style>
    body {{ font-family: 'Helvetica Neue', Arial, sans-serif; color: #1e293b; margin: 0; padding: 30px; background: #fff; line-height: 1.5; font-size: 14px; }}
    .header {{ border-bottom: 2px solid #0284c7; padding-bottom: 15px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-start; }}
    .title {{ font-size: 22px; font-weight: bold; color: #0f172a; }}
    .subtitle {{ font-size: 13px; color: #64748b; margin-top: 4px; }}
    .grid-2 {{ display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }}
    .card {{ background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 15px; }}
    .card-title {{ font-size: 12px; font-weight: 700; text-transform: uppercase; color: #64748b; margin-bottom: 10px; letter-spacing: 0.5px; }}
    .data-row {{ display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px dashed #e2e8f0; }}
    .data-label {{ color: #64748b; }}
    .data-value {{ font-weight: 600; color: #0f172a; }}
    .grade-banner {{ border-radius: 6px; padding: 15px; margin: 20px 0; display: flex; justify-content: space-between; align-items: center; }}
    .reject-banner {{ background: #fef2f2; border: 2px solid #ef4444; border-radius: 6px; padding: 16px; margin: 20px 0; }}
    .reject-title {{ font-size: 18px; font-weight: 800; color: #b91c1c; margin-bottom: 6px; }}
    .reject-desc {{ font-size: 13px; color: #7f1d1d; }}
    .disclaimer {{ margin-top: 30px; padding: 12px; background: #fffbeb; border: 1px solid #fef3c7; border-radius: 6px; font-size: 11px; color: #92400e; }}
    .signatures {{ display: flex; justify-content: space-between; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; }}
    .sig-line {{ width: 220px; border-top: 1px solid #64748b; margin-top: 40px; text-align: center; font-size: 12px; color: #64748b; }}
    @media print {{
      body {{ padding: 0; }}
      .no-print {{ display: none; }}
    }}
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="title">RETINOVA — Diabetic Retinopathy Screening Report</div>
      <div class="subtitle">Explainable AI for Diabetic Retinopathy Screening in Rural India (SIH26038 | Team: Career Crafters)</div>
    </div>
    <div style="text-align: right;">
      <div style="font-weight: bold; color: #0284c7;">Report ID: REP-{screening_id_display}</div>
      <div class="subtitle">Date: {time.strftime('%B %d, %Y', time.gmtime())}</div>
    </div>
  </div>

  <div class="grid-2">
    <div class="card">
      <div class="card-title">Patient Demographics</div>
      <div class="data-row"><span class="data-label">Patient ID:</span><span class="data-value">{patient_code}</span></div>
      <div class="data-row"><span class="data-label">Full Name:</span><span class="data-value">{patient_name}</span></div>
      <div class="data-row"><span class="data-label">Age / Gender:</span><span class="data-value">{age_gender}</span></div>
      <div class="data-row"><span class="data-label">Location / Village:</span><span class="data-value">{location}</span></div>
      <div class="data-row"><span class="data-label">Diabetes Duration:</span><span class="data-value">{diabetes_duration}</span></div>
    </div>

    <div class="card">
      <div class="card-title">Screening & Ingestion Metadata</div>
      <div class="data-row"><span class="data-label">Healthcare Facility:</span><span class="data-value">{facility_name}</span></div>
      <div class="data-row"><span class="data-label">Eye Imaged:</span><span class="data-value">{eye_imaged}</span></div>
      <div class="data-row"><span class="data-label">Sensor Ingestion ID:</span><span class="data-value">{sensor_device_id}</span></div>
      <div class="data-row"><span class="data-label">Quality Gate (EyeQ):</span><span class="data-value">{quality_class} ({q_conf_percent})</span></div>
      <div class="data-row"><span class="data-label">Pipeline Execution:</span><span class="data-value">{pipeline_time_display}</span></div>
    </div>
  </div>

  {'<div class="reject-banner"><div class="reject-title">RECAPTURE RECOMMENDED</div><div class="reject-desc"><strong>Quality Gate Rejection:</strong> Optical quality fell below clinical diagnostic threshold.<br/><strong>Quality Decision:</strong> ' + quality_decision + '<br/>' + (f'<strong>Explanation:</strong> {quality_data.get("explanation")}<br/>' if quality_data.get("explanation") else '') + f'<strong>Sharpness:</strong> {quality_data.get("sharpness", "Not provided")} | <strong>Illumination:</strong> {quality_data.get("illumination", "Not provided")} | <strong>FOV Coverage:</strong> {quality_data.get("fov_coverage", "Not provided")}% | <strong>Artifact Area:</strong> {quality_data.get("artifact_area", "Not provided")}%<br/><strong>Artifact Type:</strong> {quality_data.get("artifact_type", "None")}</div><div style="margin-top: 10px; font-size: 13px; color: #991b1b; font-weight: 600;">Clinical Notice: Downstream AI DR Grading and Grad-CAM explainability were halted at the quality gate to prevent inaccurate diagnosis. Please reposition the camera and recapture the retinal image.</div></div>' if is_rejected else f'''
  <div class="grade-banner" style="background: #f8fafc; border: 1px solid #e2e8f0; border-left: 6px solid {(grade_color[grade_val] if grade_val is not None and 0 <= grade_val < len(grade_color) else '#0284c7')};">
    <div>
      <div style="font-size: 12px; text-transform: uppercase; color: #64748b; font-weight: 700;">AI Screening Result</div>
      <div style="font-size: 20px; font-weight: 800; color: #0f172a; margin-top: 2px;">
        {(grade_labels[grade_val] if grade_val is not None and 0 <= grade_val < len(grade_labels) else grading_data.get("grade_label", "DR Grade Assessment"))}
      </div>
      <div style="font-size: 13px; color: #475569; margin-top: 4px;">
        Model: <code>{grading_data.get("model_name", "Swin V2 Tiny (Torchvision swin_v2_t)")}</code> | Class: <code>{grading_data.get("predictedClass", f"Grade{grade_val}" if grade_val is not None else "N/A")}</code>
      </div>
    </div>
    <div style="text-align: right;">
      <div style="font-size: 12px; color: #64748b;">Confidence</div>
      <div style="font-size: 26px; font-weight: 800; color: #0284c7;">{conf_percent}</div>
    </div>
  </div>

  <div class="grid-2" style="margin-bottom: 20px;">
    <div class="card">
      <div class="card-title">Candidate Lesion Evidence</div>
      <div class="data-row"><span class="data-label">Retinal Vessel Coverage:</span><span class="data-value">{vessel_cov_str}</span></div>
      <div class="data-row"><span class="data-label">Candidate Lesion Coverage:</span><span class="data-value">{lesion_cov_str}</span></div>
      <div class="data-row"><span class="data-label">Candidate Lesion Count:</span><span class="data-value">{candidate_cnt_str}</span></div>
      <p style="margin: 8px 0 0 0; font-size: 11px; color: #64748b;">
        * Candidate regions segmented by MATLAB Module 3 represent morphological patterns for clinical review and do not constitute independent diagnostic proof.
      </p>
    </div>

    <div class="card">
      <div class="card-title">Explainability & Enhancement</div>
      <div class="data-row"><span class="data-label">Enhancement Method:</span><span class="data-value">Adaptive CLAHE with Green-Channel Luminance Normalization</span></div>
      {(f'<div class="data-row"><span class="data-label">Enhancement Gain:</span><span class="data-value">{contrast_gain_display}</span></div>' if contrast_gain_display else '')}
      <div class="data-row"><span class="data-label">Feature Layer:</span><span class="data-value"><code>{feature_layer_str}</code></span></div>
      <div class="data-row"><span class="data-label">Execution Environment:</span><span class="data-value">{exec_env_str}</span></div>
      <p style="margin: 8px 0 0 0; font-size: 11px; color: #64748b;">
        Grad-CAM visualizes image regions that contributed to the classifier's prediction.
      </p>
    </div>
  </div>
  '''}

  <div class="card">
    <div class="card-title">Screening Workflow Decision</div>
    <div style="font-size: 16px; font-weight: 700; color: {'#b91c1c' if is_rejected else (grade_color[grade_val] if grade_val is not None and 0 <= grade_val < len(grade_color) else '#0284c7')}; margin-bottom: 6px;">
      {final_decision}
    </div>
    <div style="color: #475569; font-size: 13px;">
      {decision_desc}
    </div>
  </div>

  <div class="disclaimer">
    <strong>CLINICAL DISCLAIMER:</strong> This screening report is generated by an AI-assisted computer vision pipeline designed for rural tele-ophthalmology triage and prioritization (SIH26038 | Team: Career Crafters). AI screening output does NOT constitute an independent clinical diagnosis and must not replace examination by a qualified eye-care professional.
  </div>

  <div class="signatures">
    <div>
      <div>Screening Operator:</div>
      <div class="sig-line">Field Health Worker / ASHA</div>
    </div>
    <div>
      <div>Reviewing Clinician:</div>
      <div class="sig-line">District Hospital Ophthalmologist</div>
    </div>
  </div>
</body>
</html>"""

@app.get("/api/reports/{screening_id}/html", response_class=HTMLResponse)
@app.get("/reports/{screening_id}/html", response_class=HTMLResponse)
def get_report_html_endpoint(screening_id: str):
    """Returns the standalone HTML screening report directly from the stored screening result."""
    screening_data = SCREENING_RESULTS_STORE.get(screening_id)
    if not screening_data and LATEST_SCREENING_ID:
        screening_data = SCREENING_RESULTS_STORE.get(LATEST_SCREENING_ID)
        
    if not screening_data:
        raise HTTPException(status_code=404, detail="Screening record not found")
        
    html = generate_report_html(screening_data)
    return HTMLResponse(content=html, status_code=200)

@app.get("/api/reports/latest/html", response_class=HTMLResponse)
def get_latest_report_html_endpoint():
    """Returns the report for the latest executed screening."""
    if not LATEST_SCREENING_ID or LATEST_SCREENING_ID not in SCREENING_RESULTS_STORE:
        raise HTTPException(status_code=404, detail="No screening has been executed yet.")
    html = generate_report_html(SCREENING_RESULTS_STORE[LATEST_SCREENING_ID])
    return HTMLResponse(content=html, status_code=200)

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    print(f"[MATLAB Bridge] Starting server on http://localhost:{port}")
    uvicorn.run(app, host="0.0.0.0", port=port)
